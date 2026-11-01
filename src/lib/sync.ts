import { useSyncExternalStore } from 'react'
import { createClient, type RealtimeChannel, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { db, SYNCED_TABLES, type SyncedTableName } from '../db/db'
import { enqueueAll, setLocalChangeListener } from '../db/repo'
import { getSyncConfig } from './syncConfig'

export type SyncStatus = 'unconfigured' | 'signed-out' | 'idle' | 'syncing' | 'offline' | 'error'
export interface SyncState {
  status: SyncStatus
  email?: string
  lastSync?: number
  error?: string
  pending: number
}

interface RemoteRow {
  user_id: string
  collection: string
  id: string
  data: Record<string, unknown> | null
  deleted: boolean
  updated_at: number
  synced_at?: string
}

const CURSOR_KEY = 'sync.cursor'
let state: SyncState = { status: 'unconfigured', pending: 0 }
const listeners = new Set<() => void>()
const setState = (patch: Partial<SyncState>) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}
export const useSyncState = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )

let client: SupabaseClient | null = null
let session: Session | null = null
let channel: RealtimeChannel | null = null
let pushTimer: ReturnType<typeof setTimeout> | null = null
let running: Promise<void> | null = null
let queued = false

export function getClient() {
  if (client) return client
  const { url, anonKey } = getSyncConfig()
  if (!url || !anonKey) return null
  client = createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  return client
}

/** À appeler une fois au démarrage. */
export async function startSync() {
  const c = getClient()
  if (!c) {
    setState({ status: 'unconfigured' })
    return
  }
  const { data } = await c.auth.getSession()
  session = data.session
  c.auth.onAuthStateChange((_e, s) => {
    const was = session?.user.id
    session = s
    if (s && s.user.id !== was) onSignedIn()
    if (!s) onSignedOut()
  })
  setLocalChangeListener(schedulePush)
  window.addEventListener('online', () => syncNow())
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && syncNow())
  await refreshPending()
  if (session) {
    setState({ status: navigator.onLine ? 'idle' : 'offline', email: session.user.email, lastSync: Number(localStorage.getItem('sync.last') || 0) || undefined })
    subscribeRealtime()
    syncNow()
  } else {
    setState({ status: 'signed-out' })
  }
}

async function refreshPending() {
  setState({ pending: await db.outbox.count() })
}

function schedulePush() {
  refreshPending()
  if (!session) return
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => syncNow(), 1200)
}

function subscribeRealtime() {
  const c = getClient()
  if (!c || !session || channel) return
  channel = c
    .channel('records-' + session.user.id)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'records', filter: `user_id=eq.${session.user.id}` }, () => {
      // Une modification venue d'un autre appareil : on tire.
      syncNow()
    })
    .subscribe()
}

function unsubscribeRealtime() {
  if (channel) {
    getClient()?.removeChannel(channel)
    channel = null
  }
}

async function onSignedIn() {
  const c = getClient()
  if (!c || !session) return
  setState({ status: 'syncing', email: session.user.email, error: undefined })
  try {
    const { count, error } = await c.from('records').select('id', { count: 'exact', head: true })
    if (error) throw error
    const localTx = await db.transactions.count()
    if ((count ?? 0) > 0 && localTx === 0) {
      // Appareil neuf : on remplace les catégories par défaut par les données du cloud.
      await db.transaction('rw', [...SYNCED_TABLES.map((t) => db[t]), db.outbox], async () => {
        for (const t of SYNCED_TABLES) await db[t].clear()
        await db.outbox.clear()
      })
      localStorage.removeItem(CURSOR_KEY)
    } else {
      // Premier envoi (ou fusion) : tout le contenu local part dans la file.
      await enqueueAll()
      localStorage.removeItem(CURSOR_KEY)
    }
    subscribeRealtime()
    await syncNow()
  } catch (e) {
    setState({ status: 'error', error: (e as Error).message })
  }
}

function onSignedOut() {
  unsubscribeRealtime()
  localStorage.removeItem(CURSOR_KEY)
  localStorage.removeItem('sync.last')
  setState({ status: 'signed-out', email: undefined, lastSync: undefined, error: undefined })
}

export async function signIn(email: string, password: string) {
  const c = getClient()
  if (!c) throw new Error('Synchronisation non configurée')
  const { error } = await c.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signUp(email: string, password: string) {
  const c = getClient()
  if (!c) throw new Error('Synchronisation non configurée')
  const { data, error } = await c.auth.signUp({ email, password })
  if (error) throw error
  return { needsConfirmation: !data.session }
}

export async function signOut() {
  await getClient()?.auth.signOut()
}

export function resetClient() {
  unsubscribeRealtime()
  client = null
  session = null
  setState({ status: 'unconfigured', email: undefined })
}

/** Pousse la file locale, puis tire les changements distants. Sérialisé. */
export function syncNow(): Promise<void> {
  if (running) {
    queued = true
    return running
  }
  running = (async () => {
    try {
      do {
        queued = false
        await doSync()
      } while (queued)
    } finally {
      running = null
    }
  })()
  return running
}

async function doSync() {
  const c = getClient()
  if (!c || !session) return
  if (!navigator.onLine) {
    setState({ status: 'offline' })
    return
  }
  setState({ status: 'syncing', error: undefined })
  try {
    await push(c)
    await pull(c)
    const now = Date.now()
    localStorage.setItem('sync.last', String(now))
    setState({ status: 'idle', lastSync: now, pending: await db.outbox.count() })
  } catch (e) {
    setState({ status: 'error', error: (e as Error).message, pending: await db.outbox.count() })
  }
}

async function push(c: SupabaseClient) {
  const entries = await db.outbox.orderBy('seq').toArray()
  if (entries.length === 0) return
  const maxSeq = entries[entries.length - 1].seq ?? 0
  const latest = new Map<string, (typeof entries)[number]>()
  for (const e of entries) latest.set(`${e.table}/${e.id}`, e)
  const rows: RemoteRow[] = []
  for (const e of latest.values()) {
    if (e.op === 'del') {
      rows.push({ user_id: session!.user.id, collection: e.table, id: e.id, data: null, deleted: true, updated_at: e.ts })
    } else {
      const rec = (await db[e.table].get(e.id)) as Record<string, unknown> | undefined
      if (!rec) continue
      rows.push({ user_id: session!.user.id, collection: e.table, id: e.id, data: rec, deleted: false, updated_at: Number(rec.updatedAt ?? e.ts) })
    }
  }
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await c.from('records').upsert(rows.slice(i, i + 500), { onConflict: 'user_id,collection,id' })
    if (error) throw error
  }
  await db.outbox.where('seq').belowOrEqual(maxSeq).delete()
}

async function pull(c: SupabaseClient) {
  const since = localStorage.getItem(CURSOR_KEY) ?? '1970-01-01T00:00:00Z'
  const pending = new Set((await db.outbox.toArray()).map((e) => `${e.table}/${e.id}`))
  let cursor = since
  let from = 0
  const PAGE = 1000
  for (;;) {
    const { data, error } = await c.from('records').select('*').gte('synced_at', since).order('synced_at', { ascending: true }).range(from, from + PAGE - 1)
    if (error) throw error
    const rows = (data ?? []) as RemoteRow[]
    if (rows.length === 0) break
    await db.transaction('rw', SYNCED_TABLES.map((t) => db[t]), async () => {
      for (const r of rows) {
        if (!SYNCED_TABLES.includes(r.collection as SyncedTableName)) continue
        if (pending.has(`${r.collection}/${r.id}`)) continue
        const table = db[r.collection as SyncedTableName]
        if (r.deleted) await table.delete(r.id)
        else if (r.data) {
          const local = (await table.get(r.id)) as { updatedAt?: number } | undefined
          if (!local || (local.updatedAt ?? 0) <= r.updated_at) await table.put({ ...r.data, id: r.id } as never)
        }
      }
    })
    const last = rows[rows.length - 1].synced_at
    if (last && last > cursor) cursor = last
    if (rows.length < PAGE) break
    from += PAGE
  }
  localStorage.setItem(CURSOR_KEY, cursor)
}
