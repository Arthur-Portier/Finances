import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Shirt, Trash2 } from 'lucide-react'
import { db, uid, type WardrobeItem } from '../db/db'
import { Card, Empty, PageHeader, Segmented, Sheet, StatTile } from '../components/ui'
import { RankedBars } from '../components/charts'
import { groupBy, useCategories } from '../lib/hooks'
import { fmtDay, money, money0, todayISO } from '../lib/format'

const TYPES = ['Haut', 'Bas', 'Chaussures', 'Veste', 'Accessoire', 'Sport', 'Sous-vêtements']
type Sort = 'recent' | 'cpw' | 'price'

export default function Wardrobe() {
  const items = useLiveQuery(() => db.wardrobe.filter((w) => !w.archived).toArray(), []) ?? []
  const cats = useCategories()
  const vetCat = cats.find((c) => c.module === 'wardrobe') ?? cats.find((c) => c.name === 'Vêtements')
  const [open, setOpen] = useState(false)
  const [sort, setSort] = useState<Sort>('recent')
  const [typeFilter, setTypeFilter] = useState('')

  const total = items.reduce((a, i) => a + i.price, 0)
  const wears = items.reduce((a, i) => a + i.wears, 0)
  const cpw = wears ? total / wears : 0

  const byType = useMemo(() => {
    const g = groupBy(items, (i) => i.type)
    return [...g.entries()].map(([name, list]) => ({ name, value: list.reduce((a, i) => a + i.price, 0), slot: vetCat?.slot ?? 5 })).sort((a, b) => b.value - a.value)
  }, [items, vetCat])

  const sorted = useMemo(() => {
    const list = items.filter((i) => !typeFilter || i.type === typeFilter)
    if (sort === 'recent') return list.sort((a, b) => (a.date < b.date ? 1 : -1))
    if (sort === 'price') return list.sort((a, b) => b.price - a.price)
    return list.sort((a, b) => a.price / Math.max(1, a.wears) - b.price / Math.max(1, b.wears))
  }, [items, sort, typeFilter])

  const wear = (it: WardrobeItem) => db.wardrobe.update(it.id, { wears: it.wears + 1 })
  const remove = async (it: WardrobeItem) => {
    if (!confirm(`Retirer « ${it.name} » de la garde-robe ?`)) return
    await db.wardrobe.update(it.id, { archived: true })
  }

  return (
    <>
      <PageHeader title="Garde-robe" subtitle="Ce que coûtent vraiment tes vêtements, port après port." action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={18} /><span className="hidden sm:inline">Nouvelle pièce</span></button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Valeur totale" value={money0(total)} hint={`${items.length} pièce${items.length > 1 ? 's' : ''}`} />
        <StatTile label="Coût par port" value={cpw ? money(cpw) : '—'} hint="moyenne" tone="accent" />
        <StatTile label="Ports enregistrés" value={String(wears)} />
        <StatTile label="Prix moyen" value={items.length ? money0(total / items.length) : '—'} />
      </div>

      {items.length === 0 ? (
        <Card className="mt-4"><Empty icon={Shirt} title="Garde-robe vide" text="Ajoute tes pièces avec leur prix. À chaque fois que tu les portes, appuie sur « Porté » : le coût par port baisse." action={<button className="btn btn-primary" onClick={() => setOpen(true)}>Ajouter une pièce</button>} /></Card>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Card title="Valeur par type">
            <RankedBars data={byType} />
          </Card>
          <Card className="lg:col-span-2" title="Pièces" action={<Segmented value={sort} onChange={setSort} options={[{ value: 'recent', label: 'Récent' }, { value: 'cpw', label: '€/port' }, { value: 'price', label: 'Prix' }]} />}>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-3">
              <button onClick={() => setTypeFilter('')} className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${!typeFilter ? 'bg-ink text-page' : 'bg-surface-2 text-ink-2'}`}>Tout</button>
              {TYPES.filter((t) => items.some((i) => i.type === t)).map((t) => (
                <button key={t} onClick={() => setTypeFilter(typeFilter === t ? '' : t)} className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${typeFilter === t ? 'bg-ink text-page' : 'bg-surface-2 text-ink-2'}`}>{t}</button>
              ))}
            </div>
            <ul className="divide-y divide-line">
              {sorted.map((it) => {
                const c = it.price / Math.max(1, it.wears)
                return (
                  <li key={it.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{it.name}</div>
                      <div className="text-xs text-ink-3 truncate">{[it.brand, it.type, fmtDay(it.date)].filter(Boolean).join(' · ')}</div>
                    </div>
                    <div className="text-right">
                      <div className="tabular font-semibold">{money(it.price)}</div>
                      <div className="text-xs text-ink-3 tabular">{it.wears} port{it.wears > 1 ? 's' : ''} · {money(c)}/port</div>
                    </div>
                    <button className="btn btn-ghost !py-1.5 !px-3 text-sm" onClick={() => wear(it)}>Porté</button>
                    <button onClick={() => remove(it)} className="text-ink-3 hover:text-bad" aria-label="Retirer"><Trash2 size={16} /></button>
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Nouvelle pièce">
        <WardrobeForm onDone={() => setOpen(false)} categoryId={vetCat?.id} />
      </Sheet>
    </>
  )
}

function WardrobeForm({ onDone, categoryId }: { onDone: () => void; categoryId?: string }) {
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [type, setType] = useState(TYPES[0])
  const [price, setPrice] = useState('')
  const [date, setDate] = useState(todayISO())
  const [addTx, setAddTx] = useState(true)
  const p = Number(price.replace(',', '.'))
  const valid = name.trim() && p > 0

  const save = async () => {
    if (!valid) return
    let transactionId: string | undefined
    if (addTx && categoryId) {
      transactionId = uid()
      await db.transactions.add({ id: transactionId, date, amount: p, type: 'expense', categoryId, sub: type, note: [brand.trim(), name.trim()].filter(Boolean).join(' '), createdAt: Date.now() })
    }
    await db.wardrobe.add({ id: uid(), name: name.trim(), brand: brand.trim() || undefined, type, price: p, date, wears: 0, transactionId })
    onDone()
  }

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save() }}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><label className="block text-xs font-medium text-ink-3 mb-1" htmlFor="w-name">Nom</label><input id="w-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Jean brut" autoFocus required /></div>
        <div><label className="block text-xs font-medium text-ink-3 mb-1" htmlFor="w-brand">Marque</label><input id="w-brand" className="field" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Optionnel" /></div>
        <div><label className="block text-xs font-medium text-ink-3 mb-1" htmlFor="w-type">Type</label><select id="w-type" className="field" value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
        <div><label className="block text-xs font-medium text-ink-3 mb-1" htmlFor="w-price">Prix (€)</label><input id="w-price" className="field" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} required /></div>
        <div><label className="block text-xs font-medium text-ink-3 mb-1" htmlFor="w-date">Achat</label><input id="w-date" type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </div>
      {categoryId && (
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={addTx} onChange={(e) => setAddTx(e.target.checked)} className="accent-accent h-4 w-4" /> Créer aussi la dépense « Vêtements »</label>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={!valid}>Ajouter</button>
    </form>
  )
}
