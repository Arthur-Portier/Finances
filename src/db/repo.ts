/**
 * Écritures locales qui alimentent la file de synchronisation (outbox).
 * Toute modification de données passe par ici ; la synchro cloud lit l'outbox
 * pour savoir quoi pousser. Les écritures venant du cloud, elles, écrivent
 * directement dans Dexie (voir lib/sync.ts) pour ne pas re-pousser.
 */
import type { Table } from 'dexie'
import { db, SYNCED_TABLES, type SyncedTable, type SyncedTableName } from './db'

let onLocalChange: (() => void) | null = null
export const setLocalChangeListener = (fn: (() => void) | null) => {
  onLocalChange = fn
}
const notify = () => onLocalChange?.()

type Row<T extends SyncedTableName> = SyncedTable<T>
const tbl = <T extends SyncedTableName>(table: T) => db[table] as unknown as Table<Row<T>, string>

export async function save<T extends SyncedTableName>(table: T, obj: Row<T>) {
  const ts = Date.now()
  await db.transaction('rw', [db[table], db.outbox], async () => {
    await tbl(table).put({ ...obj, updatedAt: ts })
    await db.outbox.add({ table, id: obj.id, op: 'put', ts })
  })
  notify()
}

export async function saveMany<T extends SyncedTableName>(table: T, objs: Row<T>[]) {
  if (objs.length === 0) return
  const ts = Date.now()
  await db.transaction('rw', [db[table], db.outbox], async () => {
    await tbl(table).bulkPut(objs.map((o) => ({ ...o, updatedAt: ts })))
    await db.outbox.bulkAdd(objs.map((o) => ({ table, id: o.id, op: 'put' as const, ts })))
  })
  notify()
}

export async function patch<T extends SyncedTableName>(table: T, id: string, changes: Partial<Row<T>>) {
  const ts = Date.now()
  await db.transaction('rw', [db[table], db.outbox], async () => {
    const n = await tbl(table).update(id, { ...changes, updatedAt: ts } as never)
    if (n) await db.outbox.add({ table, id, op: 'put', ts })
  })
  notify()
}

export async function remove<T extends SyncedTableName>(table: T, id: string) {
  await removeMany(table, [id])
}

export async function removeMany<T extends SyncedTableName>(table: T, ids: string[]) {
  if (ids.length === 0) return
  const ts = Date.now()
  await db.transaction('rw', [db[table], db.outbox], async () => {
    await tbl(table).bulkDelete(ids)
    await db.outbox.bulkAdd(ids.map((id) => ({ table, id, op: 'del' as const, ts })))
  })
  notify()
}

/** Met tout le contenu local dans la file (première connexion, fusion). */
export async function enqueueAll() {
  const ts = Date.now()
  await db.transaction('rw', [...SYNCED_TABLES.map((t) => db[t]), db.outbox], async () => {
    for (const t of SYNCED_TABLES) {
      const ids = await db[t].toCollection().primaryKeys()
      await db.outbox.bulkAdd(ids.map((id) => ({ table: t, id: String(id), op: 'put' as const, ts })))
    }
  })
}
