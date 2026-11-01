import { useState } from 'react'
import { Cloud, CloudOff, LogOut, RefreshCw, AlertCircle, Check } from 'lucide-react'
import { Card } from './ui'
import { getClient, resetClient, signIn, signOut, signUp, startSync, syncNow, useSyncState } from '../lib/sync'
import { getSyncConfig, setSyncConfig } from '../lib/syncConfig'

export function SyncCard() {
  const s = useSyncState()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [showConfig, setShowConfig] = useState(false)
  const cfg = getSyncConfig()
  const [url, setUrl] = useState(cfg.url)
  const [key, setKey] = useState(cfg.anonKey)

  const submit = async () => {
    setBusy(true)
    setMsg('')
    try {
      if (mode === 'in') await signIn(email.trim(), pw)
      else {
        const r = await signUp(email.trim(), pw)
        if (r.needsConfirmation) setMsg('Compte créé. Confirme ton adresse via l\'e-mail reçu, puis connecte-toi ici.')
      }
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const saveConfig = async () => {
    setSyncConfig(url.trim() && key.trim() ? { url: url.trim(), anonKey: key.trim() } : null)
    resetClient()
    setShowConfig(false)
    if (getClient()) await startSync()
  }

  const last = s.lastSync ? new Date(s.lastSync).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : null

  return (
    <Card title="Synchronisation entre appareils" action={<StatusPill />}>
      {s.status === 'unconfigured' || showConfig ? (
        <div className="space-y-3">
          <p className="text-sm text-ink-2">Renseigne l'URL du projet Supabase et sa clé publique « anon ». Le fichier <code className="text-xs bg-surface-2 px-1 rounded">supabase/schema.sql</code> du dépôt crée la table nécessaire.</p>
          <input className="field" placeholder="https://xxxx.supabase.co" value={url} onChange={(e) => setUrl(e.target.value)} />
          <input className="field" placeholder="Clé anon (eyJ…)" value={key} onChange={(e) => setKey(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={saveConfig}>Enregistrer</button>
            {showConfig && <button className="btn btn-ghost" onClick={() => setShowConfig(false)}>Annuler</button>}
          </div>
        </div>
      ) : s.status === 'signed-out' ? (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit() }}>
          <p className="text-sm text-ink-2">Connecte-toi avec le même compte sur chaque appareil : tes données se retrouvent partout, et chaque modification est répercutée en direct.</p>
          <input className="field" type="email" autoComplete="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="field" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} placeholder="Mot de passe (8 caractères min.)" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} />
          <div className="flex items-center gap-2">
            <button type="submit" className="btn btn-primary" disabled={busy}>{mode === 'in' ? 'Se connecter' : 'Créer le compte'}</button>
            <button type="button" className="text-sm text-accent" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>{mode === 'in' ? 'Créer un compte' : 'J\'ai déjà un compte'}</button>
          </div>
          {msg && <p className="text-sm text-ink-2">{msg}</p>}
          <button type="button" className="text-xs text-ink-3 hover:text-ink" onClick={() => setShowConfig(true)}>Modifier la configuration Supabase</button>
        </form>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent"><Cloud size={18} /></span>
            <div className="min-w-0">
              <div className="font-medium truncate">{s.email}</div>
              <div className="text-xs text-ink-3">{last ? `Dernière synchro : ${last}` : 'Pas encore synchronisé'}{s.pending ? ` · ${s.pending} modification${s.pending > 1 ? 's' : ''} en attente` : ''}</div>
            </div>
          </div>
          {s.error && <p className="text-sm text-bad flex items-start gap-1.5"><AlertCircle size={16} className="mt-0.5 shrink-0" /> {s.error}</p>}
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-ghost" onClick={() => syncNow()} disabled={s.status === 'syncing'}><RefreshCw size={16} className={s.status === 'syncing' ? 'animate-spin' : ''} /> Synchroniser maintenant</button>
            <button className="btn btn-ghost" onClick={() => signOut()}><LogOut size={16} /> Se déconnecter</button>
          </div>
          <p className="text-xs text-ink-3">Les données restent aussi sur l'appareil : l'app fonctionne hors ligne et rattrape au retour du réseau.</p>
        </div>
      )}
    </Card>
  )
}

export function StatusPill() {
  const s = useSyncState()
  const map: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
    unconfigured: { icon: <CloudOff size={12} />, label: 'Non configuré', cls: 'bg-surface-2 text-ink-3' },
    'signed-out': { icon: <CloudOff size={12} />, label: 'Déconnecté', cls: 'bg-surface-2 text-ink-3' },
    idle: { icon: <Check size={12} />, label: 'À jour', cls: 'bg-accent-soft text-accent' },
    syncing: { icon: <RefreshCw size={12} className="animate-spin" />, label: 'Synchro…', cls: 'bg-accent-soft text-accent' },
    offline: { icon: <CloudOff size={12} />, label: 'Hors ligne', cls: 'bg-surface-2 text-ink-2' },
    error: { icon: <AlertCircle size={12} />, label: 'Erreur', cls: 'text-bad bg-[color-mix(in_oklab,var(--bad)_14%,transparent)]' },
  }
  const m = map[s.status]
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${m.cls}`}>{m.icon} {m.label}</span>
}
