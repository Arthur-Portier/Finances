import { useMemo, useState } from 'react'
import { addMonths, format, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Search, ArrowLeftRight } from 'lucide-react'
import { useTxSheet } from '../components/Layout'
import { Card, Empty, PageHeader, Segmented } from '../components/ui'
import { TransactionRow } from '../components/TransactionRow'
import { expenses, groupBy, incomes, monthRange, sum, useCategories, useCategoryMap, useTransactionsBetween } from '../lib/hooks'
import { cap, fmtDayLong, fmtMonthLong, money, todayISO } from '../lib/format'
import { CategoryBadge } from '../components/ui'

type Filter = 'all' | 'expense' | 'income'

export default function Transactions() {
  const [month, setMonth] = useState(() => new Date())
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [catId, setCatId] = useState<string>('')
  const { from, to } = monthRange(month)
  const txs = useTransactionsBetween(from, to)
  const cats = useCategories()
  const catMap = useCategoryMap()
  const { openEdit } = useTxSheet()

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return txs.filter((t) => {
      if (filter !== 'all' && t.type !== filter) return false
      if (catId && t.categoryId !== catId) return false
      if (needle) {
        const hay = `${t.note ?? ''} ${t.sub ?? ''} ${catMap.get(t.categoryId)?.name ?? ''} ${t.amount}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [txs, filter, q, catId, catMap])

  const days = useMemo(() => [...groupBy(filtered, (t) => t.date).entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)), [filtered])
  const isCurrent = format(month, 'yyyy-MM') === todayISO().slice(0, 7)

  return (
    <>
      <PageHeader
        title="Transactions"
        subtitle={`${filtered.length} opération${filtered.length > 1 ? 's' : ''}`}
        action={
          <div className="flex items-center gap-1">
            <button className="btn btn-ghost !p-2" onClick={() => setMonth((m) => subMonths(m, 1))} aria-label="Mois précédent"><ChevronLeft size={18} /></button>
            <span className="min-w-32 text-center text-sm font-semibold">{cap(fmtMonthLong(month))}</span>
            <button className="btn btn-ghost !p-2" onClick={() => setMonth((m) => addMonths(m, 1))} disabled={isCurrent} aria-label="Mois suivant"><ChevronRight size={18} /></button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-ink-3">Dépenses</div>
          <div className="mt-1 text-xl font-semibold tabular">{money(sum(expenses(filtered)))}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-ink-3">Revenus</div>
          <div className="mt-1 text-xl font-semibold tabular text-good">{money(sum(incomes(filtered)))}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <label className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input className="field !pl-9" placeholder="Rechercher une note, un montant…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: 'Tout' }, { value: 'expense', label: 'Dépenses' }, { value: 'income', label: 'Revenus' }]} />
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-4 -mx-4 px-4">
        <button onClick={() => setCatId('')} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${!catId ? 'bg-ink text-page' : 'bg-surface-2 text-ink-2'}`}>Toutes</button>
        {cats.map((c) => (
          <button key={c.id} onClick={() => setCatId(catId === c.id ? '' : c.id)} className={`shrink-0 flex items-center gap-1.5 rounded-full pl-1 pr-3 py-1 text-xs font-medium ${catId === c.id ? 'bg-ink text-page' : 'bg-surface-2 text-ink-2'}`}>
            <CategoryBadge category={c} size={22} /> {c.name}
          </button>
        ))}
      </div>

      {days.length === 0 ? (
        <Card><Empty icon={ArrowLeftRight} title="Rien ici" text="Aucune transaction ne correspond à ce mois ou à ces filtres." /></Card>
      ) : (
        <div className="space-y-4">
          {days.map(([date, list]) => (
            <Card key={date}>
              <div className="flex items-center justify-between mb-1 px-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-3">{cap(fmtDayLong(date))}</h3>
                {sum(expenses(list)) > 0 && <span className="text-xs tabular text-ink-3">{money(sum(expenses(list)))}</span>}
              </div>
              <div className="-mx-2">
                {list.map((t) => (
                  <TransactionRow key={t.id} tx={t} category={catMap.get(t.categoryId)} showDate={false} onClick={() => openEdit(t)} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
