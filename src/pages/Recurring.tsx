import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Repeat, Trash2 } from 'lucide-react'
import { db, uid, type Recurring as Rec, type TxType } from '../db/db'
import { remove as removeRow, save as saveRow } from '../db/repo'
import { Card, CategoryBadge, Empty, PageHeader, Segmented, Sheet, StatTile } from '../components/ui'
import { useCategories, useCategoryMap } from '../lib/hooks'
import { money, money0 } from '../lib/format'

export default function Recurring() {
  const items = useLiveQuery(() => db.recurring.toArray(), []) ?? []
  const cats = useCategoryMap()
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Rec | undefined>()

  const monthlyOut = useMemo(() => items.filter((r) => r.active && r.type === 'expense').reduce((a, r) => a + r.amount, 0), [items])
  const monthlyIn = useMemo(() => items.filter((r) => r.active && r.type === 'income').reduce((a, r) => a + r.amount, 0), [items])
  const sorted = [...items].sort((a, b) => a.day - b.day)
  const today = new Date().getDate()

  return (
    <>
      <PageHeader title="Abonnements et récurrents" subtitle="Ajoutés automatiquement chaque mois à la date prévue." action={<button className="btn btn-primary" onClick={() => { setEdit(undefined); setOpen(true) }}><Plus size={18} /><span className="hidden sm:inline">Ajouter</span></button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Charges fixes / mois" value={money0(monthlyOut)} />
        <StatTile label="Par an" value={money0(monthlyOut * 12)} hint="charges fixes" />
        <StatTile label="Revenus fixes / mois" value={money0(monthlyIn)} tone="good" />
        <StatTile label="Reste à vivre" value={money0(monthlyIn - monthlyOut)} tone={monthlyIn - monthlyOut >= 0 ? 'accent' : 'bad'} hint="revenus − charges fixes" />
      </div>
      <Card className="mt-4">
        {items.length === 0 && <Empty icon={Repeat} title="Aucun récurrent" text="Loyer, Netflix, licence de tennis, salaire… tout ce qui revient chaque mois." action={<button className="btn btn-primary" onClick={() => setOpen(true)}>Ajouter</button>} />}
        <ul className="divide-y divide-line">
          {sorted.map((r) => {
            const c = cats.get(r.categoryId)
            const upcoming = r.day >= today
            return (
              <li key={r.id}>
                <button className="flex w-full items-center gap-3 py-3 text-left" onClick={() => { setEdit(r); setOpen(true) }}>
                  <CategoryBadge category={c} />
                  <div className="min-w-0 flex-1">
                    <div className={`font-medium truncate ${r.active ? '' : 'text-ink-3 line-through'}`}>{r.name}</div>
                    <div className="text-xs text-ink-3">{c?.name}{r.sub ? ` · ${r.sub}` : ''} · le {r.day} {upcoming && r.active ? '· à venir' : ''}</div>
                  </div>
                  <div className={`tabular font-semibold ${r.type === 'income' ? 'text-good' : ''}`}>{r.type === 'income' ? '+' : '−'}{money(r.amount)}</div>
                </button>
              </li>
            )
          })}
        </ul>
      </Card>
      <Sheet open={open} onClose={() => setOpen(false)} title={edit ? 'Modifier' : 'Nouveau récurrent'}>
        {open && <RecForm initial={edit} onDone={() => setOpen(false)} />}
      </Sheet>
    </>
  )
}

function RecForm({ initial, onDone }: { initial?: Rec; onDone: () => void }) {
  const cats = useCategories()
  const [type, setType] = useState<TxType>(initial?.type ?? 'expense')
  const visible = cats.filter((c) => c.kind === type)
  const [name, setName] = useState(initial?.name ?? '')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '')
  const [sub, setSub] = useState(initial?.sub ?? '')
  const [day, setDay] = useState(String(initial?.day ?? 1))
  const [active, setActive] = useState(initial?.active ?? true)
  const catId = visible.find((c) => c.id === categoryId) ? categoryId : visible[0]?.id ?? ''
  const a = Number(amount.replace(',', '.'))
  const d = Math.min(28, Math.max(1, Number(day) || 1))
  const valid = name.trim() && a > 0 && catId

  const save = async () => {
    if (!valid) return
    await saveRow('recurring', { id: initial?.id ?? uid(), name: name.trim(), amount: a, type, categoryId: catId, sub: sub.trim() || undefined, day: d, active, lastApplied: initial?.lastApplied })
    onDone()
  }
  const remove = async () => {
    if (!initial || !confirm('Supprimer ce récurrent ? Les transactions déjà créées sont conservées.')) return
    await removeRow('recurring', initial.id)
    onDone()
  }

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save() }}>
      <div className="flex justify-center"><Segmented value={type} onChange={setType} options={[{ value: 'expense', label: 'Charge' }, { value: 'income', label: 'Revenu' }]} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><label className="block text-xs font-medium text-ink-3 mb-1" htmlFor="r-name">Nom</label><input id="r-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Netflix, Loyer, Licence…" autoFocus required /></div>
        <div><label className="block text-xs font-medium text-ink-3 mb-1" htmlFor="r-amount">Montant (€)</label><input id="r-amount" className="field" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
        <div><label className="block text-xs font-medium text-ink-3 mb-1" htmlFor="r-day">Jour du mois</label><input id="r-day" className="field" inputMode="numeric" value={day} onChange={(e) => setDay(e.target.value)} /></div>
        <div><label className="block text-xs font-medium text-ink-3 mb-1" htmlFor="r-cat">Espace</label><select id="r-cat" className="field" value={catId} onChange={(e) => setCategoryId(e.target.value)}>{visible.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className="block text-xs font-medium text-ink-3 mb-1" htmlFor="r-sub">Sous-catégorie</label><input id="r-sub" className="field" value={sub} onChange={(e) => setSub(e.target.value)} placeholder="Optionnel" list="r-subs" /><datalist id="r-subs">{(visible.find((c) => c.id === catId)?.subs ?? []).map((s) => <option key={s} value={s} />)}</datalist></div>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-accent h-4 w-4" /> Actif</label>
      <div className="flex gap-2">
        {initial && <button type="button" className="btn btn-danger" onClick={remove} aria-label="Supprimer"><Trash2 size={18} /></button>}
        <button type="submit" className="btn btn-primary flex-1" disabled={!valid}>{initial ? 'Enregistrer' : 'Ajouter'}</button>
      </div>
    </form>
  )
}
