import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Plus, Trash2, ShoppingBasket, Receipt, ListPlus, Archive } from 'lucide-react'
import { db, uid, type ShoppingItem } from '../db/db'
import { patch, remove, removeMany, save } from '../db/repo'
import { Card, Empty, PageHeader, Progress, Sheet } from '../components/ui'
import { money, todayISO } from '../lib/format'
import { useCategories } from '../lib/hooks'

export default function Shopping() {
  const lists = useLiveQuery(() => db.shoppingLists.orderBy('createdAt').filter((l) => !l.archived).toArray(), []) ?? []
  const [active, setActive] = useState<string | null>(null)
  const listId = active ?? lists[0]?.id ?? null
  const items = useLiveQuery<ShoppingItem[]>(() => (listId ? db.shoppingItems.where('listId').equals(listId).sortBy('createdAt') : Promise.resolve([] as ShoppingItem[])), [listId]) ?? []
  const cats = useCategories()
  const coursesCat = cats.find((c) => c.module === 'shopping') ?? cats.find((c) => c.name === 'Courses')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [newList, setNewList] = useState(false)
  const [listName, setListName] = useState('')
  const [checkout, setCheckout] = useState(false)
  const [total, setTotal] = useState('')

  const est = useMemo(() => items.reduce((a, i) => a + (i.price ?? 0) * i.qty, 0), [items])
  const done = items.filter((i) => i.checked)
  const doneTotal = done.reduce((a, i) => a + (i.price ?? 0) * i.qty, 0)

  const add = async () => {
    if (!name.trim() || !listId) return
    const p = Number(price.replace(',', '.'))
    await save('shoppingItems', { id: uid(), listId, name: name.trim(), qty: 1, price: p > 0 ? p : undefined, checked: false, createdAt: Date.now() })
    setName('')
    setPrice('')
  }
  const toggle = (id: string, checked: boolean) => patch('shoppingItems', id, { checked: !checked })
  const removeItem = (id: string) => remove('shoppingItems', id)
  const setQty = (id: string, qty: number) => qty >= 1 && patch('shoppingItems', id, { qty })
  const clearChecked = () => removeMany('shoppingItems', done.map((i) => i.id))

  const createList = async () => {
    if (!listName.trim()) return
    const id = uid()
    await save('shoppingLists', { id, name: listName.trim(), createdAt: Date.now() })
    setActive(id)
    setListName('')
    setNewList(false)
  }
  const archiveList = async () => {
    if (!listId || !confirm('Archiver cette liste ?')) return
    await patch('shoppingLists', listId, { archived: true })
    setActive(null)
  }

  const finish = async () => {
    if (!coursesCat || !listId) return
    const amount = Number(total.replace(',', '.')) || doneTotal
    if (amount <= 0) return
    const list = lists.find((l) => l.id === listId)
    await save('transactions', { id: uid(), date: todayISO(), amount: Math.round(amount * 100) / 100, type: 'expense', categoryId: coursesCat.id, sub: 'Supermarché', note: `${list?.name ?? 'Courses'} · ${done.length} article${done.length > 1 ? 's' : ''}`, createdAt: Date.now() })
    await clearChecked()
    setCheckout(false)
    setTotal('')
  }

  return (
    <>
      <PageHeader title="Courses" subtitle="Coche au fur et à mesure, puis enregistre le ticket en une dépense." action={<button className="btn btn-ghost" onClick={() => setNewList(true)}><ListPlus size={18} /><span className="hidden sm:inline">Nouvelle liste</span></button>} />

      {lists.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 mb-4">
          {lists.map((l) => (
            <button key={l.id} onClick={() => setActive(l.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${l.id === listId ? 'bg-ink text-page' : 'bg-surface-2 text-ink-2'}`}>{l.name}</button>
          ))}
        </div>
      )}

      {!listId ? (
        <Card><Empty icon={ShoppingBasket} title="Aucune liste" text="Crée une liste pour commencer." action={<button className="btn btn-primary" onClick={() => setNewList(true)}>Créer une liste</button>} /></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2" title={lists.find((l) => l.id === listId)?.name} action={<button onClick={archiveList} className="text-xs text-ink-3 hover:text-ink flex items-center gap-1"><Archive size={14} /> Archiver</button>}>
            <form className="flex gap-2 mb-3" onSubmit={(e) => { e.preventDefault(); add() }}>
              <input className="field flex-1" placeholder="Ajouter un article…" value={name} onChange={(e) => setName(e.target.value)} />
              <input className="field w-24" placeholder="€" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} aria-label="Prix estimé" />
              <button type="submit" className="btn btn-primary !px-3" aria-label="Ajouter"><Plus size={18} /></button>
            </form>
            {items.length === 0 && <p className="text-sm text-ink-3 py-6 text-center">La liste est vide. Ajoute un article ci-dessus.</p>}
            <ul className="divide-y divide-line">
              {[...items].sort((a, b) => Number(a.checked) - Number(b.checked)).map((it) => (
                <li key={it.id} className="flex items-center gap-3 py-2.5">
                  <button onClick={() => toggle(it.id, it.checked)} aria-label={it.checked ? 'Décocher' : 'Cocher'} className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${it.checked ? 'bg-accent border-accent text-white' : 'border-axis'}`}>
                    {it.checked && <Check size={14} strokeWidth={3} />}
                  </button>
                  <span className={`flex-1 truncate ${it.checked ? 'line-through text-ink-3' : ''}`}>{it.name}</span>
                  <div className="flex items-center gap-1 text-sm">
                    <button className="h-7 w-7 rounded-lg bg-surface-2" onClick={() => setQty(it.id, it.qty - 1)} aria-label="Moins">−</button>
                    <span className="w-5 text-center tabular">{it.qty}</span>
                    <button className="h-7 w-7 rounded-lg bg-surface-2" onClick={() => setQty(it.id, it.qty + 1)} aria-label="Plus">+</button>
                  </div>
                  <span className="w-16 text-right text-sm tabular text-ink-2">{it.price ? money(it.price * it.qty) : '—'}</span>
                  <button onClick={() => removeItem(it.id)} className="text-ink-3 hover:text-bad" aria-label="Supprimer"><Trash2 size={16} /></button>
                </li>
              ))}
            </ul>
          </Card>
          <div className="space-y-4">
            <Card title="Récapitulatif">
              <div className="text-3xl font-semibold tabular tracking-tight">{money(est)}</div>
              <div className="text-xs text-ink-3 mt-1">estimation · {items.length} article{items.length > 1 ? 's' : ''}</div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-ink-2 mb-1"><span>{done.length} coché{done.length > 1 ? 's' : ''}</span><span className="tabular">{money(doneTotal)}</span></div>
                <Progress value={items.length ? done.length / items.length : 0} />
              </div>
              <button className="btn btn-primary w-full mt-4" disabled={done.length === 0 || !coursesCat} onClick={() => setCheckout(true)}><Receipt size={18} /> Enregistrer le ticket</button>
              {done.length > 0 && <button className="btn btn-ghost w-full mt-2" onClick={clearChecked}>Retirer les articles cochés</button>}
            </Card>
          </div>
        </div>
      )}

      <Sheet open={newList} onClose={() => setNewList(false)} title="Nouvelle liste">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); createList() }}>
          <input className="field" placeholder="Ex. Courses de la semaine, Apéro samedi…" value={listName} onChange={(e) => setListName(e.target.value)} autoFocus />
          <button type="submit" className="btn btn-primary w-full">Créer</button>
        </form>
      </Sheet>

      <Sheet open={checkout} onClose={() => setCheckout(false)} title="Enregistrer le ticket">
        <div className="space-y-4">
          <p className="text-sm text-ink-2">Les {done.length} articles cochés seront retirés de la liste et une dépense « Courses » sera créée à la date d'aujourd'hui.</p>
          <div>
            <label className="block text-xs font-medium text-ink-3 mb-1" htmlFor="ticket">Montant réel du ticket</label>
            <input id="ticket" className="field text-lg" inputMode="decimal" placeholder={doneTotal.toFixed(2)} value={total} onChange={(e) => setTotal(e.target.value)} autoFocus />
            <p className="mt-1 text-xs text-ink-3">Laisse vide pour utiliser l'estimation ({money(doneTotal)}).</p>
          </div>
          <button className="btn btn-primary w-full" onClick={finish}>Valider</button>
        </div>
      </Sheet>
    </>
  )
}
