import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Download, Upload, FileSpreadsheet, Sparkles, Trash2, Moon, Sun, Monitor, Smartphone } from 'lucide-react'
import { db } from '../db/db'
import { Card, PageHeader, Segmented } from '../components/ui'
import { useTheme, type Theme } from '../lib/hooks'
import { exportCSV, exportJSON, importJSON, wipeAll } from '../lib/backup'
import { seedDemo } from '../db/seed'
import { ensureDefaults } from '../db/defaults'

export default function SettingsPage() {
  const [theme, setTheme] = useTheme()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const counts = useLiveQuery(async () => ({ tx: await db.transactions.count(), cats: await db.categories.count(), items: await db.wardrobe.count() }), [])

  const onImport = async (f?: File) => {
    if (!f) return
    if (!confirm('Importer ce fichier remplacera toutes les données actuelles. Continuer ?')) return
    try {
      await importJSON(f)
      setMsg('Import réussi.')
    } catch (e) {
      setMsg(`Échec de l'import : ${(e as Error).message}`)
    }
  }
  const reset = async () => {
    if (!confirm('Effacer définitivement toutes les données ? Pense à exporter avant.')) return
    await wipeAll()
    await ensureDefaults()
    setMsg('Données effacées.')
  }

  return (
    <>
      <PageHeader title="Réglages" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Apparence">
          <Segmented<Theme> value={theme} onChange={setTheme} options={[{ value: 'system', label: 'Auto' }, { value: 'light', label: 'Clair' }, { value: 'dark', label: 'Sombre' }]} />
          <div className="mt-3 flex items-center gap-2 text-xs text-ink-3">
            {theme === 'dark' ? <Moon size={14} /> : theme === 'light' ? <Sun size={14} /> : <Monitor size={14} />}
            {theme === 'system' ? 'Suit le réglage de ton appareil.' : theme === 'dark' ? 'Thème sombre forcé.' : 'Thème clair forcé.'}
          </div>
        </Card>

        <Card title="Installer l'application">
          <div className="flex items-start gap-3 text-sm text-ink-2">
            <Smartphone size={18} className="mt-0.5 shrink-0 text-accent" />
            <div>
              <p><strong className="text-ink">iPhone / iPad :</strong> Safari → Partager → « Sur l'écran d'accueil ».</p>
              <p className="mt-1"><strong className="text-ink">Android :</strong> Chrome → menu ⋮ → « Installer l'application ».</p>
              <p className="mt-1"><strong className="text-ink">Ordinateur :</strong> Chrome ou Edge → icône d'installation dans la barre d'adresse.</p>
              <p className="mt-2 text-ink-3">Fonctionne hors ligne. Les données restent sur l'appareil.</p>
            </div>
          </div>
        </Card>

        <Card title="Sauvegarde">
          <p className="text-sm text-ink-2 mb-3">{counts ? `${counts.tx} transactions · ${counts.cats} espaces · ${counts.items} pièces` : '…'}</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-ghost" onClick={exportJSON}><Download size={16} /> Exporter (JSON)</button>
            <button className="btn btn-ghost" onClick={exportCSV}><FileSpreadsheet size={16} /> Transactions (CSV)</button>
            <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}><Upload size={16} /> Importer</button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => onImport(e.target.files?.[0])} />
          </div>
          <p className="mt-3 text-xs text-ink-3">Pour synchroniser deux appareils : exporte sur l'un, importe sur l'autre.</p>
        </Card>

        <Card title="Données">
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-ghost" onClick={async () => { await seedDemo(); setMsg('Données d\'exemple ajoutées.') }}><Sparkles size={16} /> Ajouter des données d'exemple</button>
            <button className="btn btn-danger" onClick={reset}><Trash2 size={16} /> Tout effacer</button>
          </div>
        </Card>
      </div>
      {msg && <p className="mt-4 text-sm text-accent">{msg}</p>}
      <p className="mt-8 text-center text-xs text-ink-3">Finances · v0.1 · données stockées localement (IndexedDB)</p>
    </>
  )
}
