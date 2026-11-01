import { useEffect, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { db, uid, type Transaction, type TxType } from '../db/db'
import { useCategories } from '../lib/hooks'
import { todayISO } from '../lib/format'
import { CategoryBadge, Segmented } from './ui'
import { slotVar } from '../lib/colors'

export function TransactionForm({ initial, onDone, defaultCategoryId }: { initial?: Transaction; onDone: () => void; defaultCategoryId?: string }) {
  const cats = useCategories()
  const [type, setType] = useState<TxType>(initial?.type ?? 'expense')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? defaultCategoryId ?? '')
  const [sub, setSub] = useState(initial?.sub ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [saving, setSaving] = useState(false)

  const visible = useMemo(() => cats.filter((c) => c.kind === type), [cats, type])
  const category = cats.find((c) => c.id === categoryId)

  useEffect(() => {
    if (!visible.find((c) => c.id === categoryId)) setCategoryId(visible[0]?.id ?? '')
  }, [visible, categoryId])

  const parsed = Number(amount.replace(',', '.'))
  const valid = parsed > 0 && categoryId && date

  const save = async () => {
    if (!valid || saving) return
    setSaving(true)
    const tx: Transaction = {
      id: initial?.id ?? uid(),
      date,
      amount: Math.round(parsed * 100) / 100,
      type,
      categoryId,
      sub: sub.trim() || undefined,
      note: note.trim() || undefined,
      recurringId: initial?.recurringId,
      createdAt: initial?.createdAt ?? Date.now(),
    }
    await db.transactions.put(tx)
    setSaving(false)
    onDone()
  }

  const remove = async () => {
    if (!initial) return
    if (!confirm('Supprimer cette transaction ?')) return
    await db.transactions.delete(initial.id)
    onDone()
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <div className="flex justify-center">
        <Segmented value={type} onChange={setType} options={[{ value: 'expense', label: 'Dépense' }, { value: 'income', label: 'Revenu' }]} />
      </div>

      <div className="text-center">
        <label className="block text-xs font-medium text-ink-3 mb-1">Montant</label>
        <div className="flex items-baseline justify-center gap-1">
          <input
            autoFocus
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-44 bg-transparent text-center text-4xl font-semibold tracking-tight outline-none placeholder:text-ink-3"
            aria-label="Montant"
          />
          <span className="text-2xl text-ink-3">€</span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-3 mb-2">Catégorie</label>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {visible.map((c) => {
            const active = c.id === categoryId
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => {
                  setCategoryId(c.id)
                  setSub('')
                }}
                className={`flex flex-col items-center gap-1 rounded-2xl p-2 text-[11px] font-medium transition border ${active ? 'border-transparent bg-surface-2' : 'border-transparent hover:bg-surface-2'}`}
                style={active ? { boxShadow: `0 0 0 2px ${slotVar(c.slot)}` } : undefined}
                aria-pressed={active}
              >
                <CategoryBadge category={c} size={36} />
                <span className="truncate w-full text-center">{c.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {category?.subs && category.subs.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-ink-3 mb-2">Sous-catégorie</label>
          <div className="flex flex-wrap gap-1.5">
            {category.subs.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setSub(sub === s ? '' : s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${sub === s ? 'bg-accent text-white' : 'bg-surface-2 text-ink-2 hover:bg-surface-3'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-ink-3 mb-1" htmlFor="tx-date">Date</label>
          <input id="tx-date" type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-3 mb-1" htmlFor="tx-sub">Précision</label>
          <input id="tx-sub" className="field" value={sub} onChange={(e) => setSub(e.target.value)} placeholder="Sous-catégorie" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-3 mb-1" htmlFor="tx-note">Note</label>
        <input id="tx-note" className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. Raquette, Netflix, courses du samedi…" />
      </div>

      <div className="flex gap-2 pt-1">
        {initial && (
          <button type="button" className="btn btn-danger" onClick={remove} aria-label="Supprimer">
            <Trash2 size={18} />
          </button>
        )}
        <button type="submit" className="btn btn-primary flex-1" disabled={!valid || saving}>
          {initial ? 'Enregistrer' : 'Ajouter'}
        </button>
      </div>
    </form>
  )
}
