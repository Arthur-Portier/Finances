import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { db, uid, type Category, type TxType } from '../db/db'
import { patch, remove as removeRow, removeMany, save as saveRow } from '../db/repo'
import { ICONS } from '../lib/icons'
import { SLOTS, slotVar } from '../lib/colors'
import { Segmented } from './ui'

export function CategoryForm({ initial, onDone }: { initial?: Category; onDone: () => void }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? 'Tag')
  const [slot, setSlot] = useState(initial?.slot ?? 1)
  const [kind, setKind] = useState<TxType>(initial?.kind ?? 'expense')
  const [budget, setBudget] = useState(initial?.budget ? String(initial.budget) : '')
  const [subs, setSubs] = useState((initial?.subs ?? []).join(', '))

  const save = async () => {
    if (!name.trim()) return
    const count = await db.categories.count()
    const cat: Category = {
      id: initial?.id ?? uid(),
      name: name.trim(),
      icon,
      slot,
      kind,
      budget: kind === 'expense' && Number(budget) > 0 ? Number(budget) : undefined,
      module: initial?.module ?? null,
      subs: subs.split(',').map((s) => s.trim()).filter(Boolean),
      order: initial?.order ?? count + 1,
    }
    await saveRow('categories', cat)
    onDone()
  }

  const remove = async () => {
    if (!initial) return
    const n = await db.transactions.where('categoryId').equals(initial.id).count()
    if (!confirm(`Supprimer « ${initial.name} » ? ${n ? `${n} transaction(s) seront déplacées vers « Divers ».` : ''}`)) return
    const divers = (await db.categories.filter((c) => c.name === 'Divers').first()) ?? null
    const ids = (await db.transactions.where('categoryId').equals(initial.id).primaryKeys()) as string[]
    if (divers) for (const id of ids) await patch('transactions', id, { categoryId: divers.id })
    else await removeMany('transactions', ids)
    await removeRow('categories', initial.id)
    onDone()
  }

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save() }}>
      {!initial && (
        <div className="flex justify-center">
          <Segmented value={kind} onChange={setKind} options={[{ value: 'expense', label: 'Dépense' }, { value: 'income', label: 'Revenu' }]} />
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-ink-3 mb-1" htmlFor="cat-name">Nom</label>
        <input id="cat-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Tennis, Voyages, Chien…" required autoFocus />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-3 mb-2">Couleur</label>
        <div className="flex flex-wrap gap-2">
          {[0, ...SLOTS].map((s) => (
            <button type="button" key={s} onClick={() => setSlot(s)} aria-label={`Couleur ${s}`} className="h-8 w-8 rounded-full transition" style={{ background: slotVar(s), boxShadow: slot === s ? `0 0 0 2px var(--surface), 0 0 0 4px ${slotVar(s)}` : undefined }} />
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-3 mb-2">Icône</label>
        <div className="grid grid-cols-8 gap-1.5">
          {Object.entries(ICONS).map(([n, I]) => (
            <button type="button" key={n} onClick={() => setIcon(n)} aria-label={n} className={`flex h-9 items-center justify-center rounded-xl ${icon === n ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-ink-2 hover:bg-surface-3'}`}>
              <I size={18} />
            </button>
          ))}
        </div>
      </div>
      {kind === 'expense' && (
        <div>
          <label className="block text-xs font-medium text-ink-3 mb-1" htmlFor="cat-budget">Budget mensuel (€)</label>
          <input id="cat-budget" className="field" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Optionnel" />
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-ink-3 mb-1" htmlFor="cat-subs">Sous-catégories</label>
        <input id="cat-subs" className="field" value={subs} onChange={(e) => setSubs(e.target.value)} placeholder="Séparées par des virgules" />
      </div>
      <div className="flex gap-2 pt-1">
        {initial && (
          <button type="button" className="btn btn-danger" onClick={remove} aria-label="Supprimer"><Trash2 size={18} /></button>
        )}
        <button type="submit" className="btn btn-primary flex-1" disabled={!name.trim()}>{initial ? 'Enregistrer' : 'Créer'}</button>
      </div>
    </form>
  )
}
