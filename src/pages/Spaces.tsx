import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ChevronRight, Plus } from 'lucide-react'
import { Card, CategoryBadge, PageHeader, Progress, Sheet } from '../components/ui'
import { CategoryForm } from '../components/CategoryForm'
import { useCategories, useRecentMonths } from '../lib/hooks'
import { money0 } from '../lib/format'
import { slotVar } from '../lib/colors'

export default function Spaces() {
  const cats = useCategories()
  const txs = useRecentMonths(3)
  const [open, setOpen] = useState(false)
  const ym = format(new Date(), 'yyyy-MM')

  const stats = useMemo(() => {
    const m = new Map<string, { month: number; avg: number }>()
    for (const c of cats) {
      const list = txs.filter((t) => t.categoryId === c.id)
      const month = list.filter((t) => t.date.startsWith(ym)).reduce((a, t) => a + t.amount, 0)
      const avg = list.reduce((a, t) => a + t.amount, 0) / 3
      m.set(c.id, { month, avg })
    }
    return m
  }, [cats, txs, ym])

  const expense = cats.filter((c) => c.kind === 'expense')
  const income = cats.filter((c) => c.kind === 'income')

  const Grid = ({ list }: { list: typeof cats }) => (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((c) => {
        const s = stats.get(c.id)
        const ratio = c.budget ? (s?.month ?? 0) / c.budget : null
        return (
          <Link key={c.id} to={`/espaces/${c.id}`} className="card p-4 flex flex-col gap-3 hover:-translate-y-0.5 transition">
            <div className="flex items-center gap-3">
              <CategoryBadge category={c} size={44} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{c.name}</div>
                <div className="text-xs text-ink-3">moy. {money0(s?.avg ?? 0)} / mois</div>
              </div>
              <ChevronRight size={18} className="text-ink-3" />
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-semibold tabular tracking-tight">{money0(s?.month ?? 0)}</span>
              {c.budget && <span className="text-xs text-ink-3">sur {money0(c.budget)}</span>}
            </div>
            {ratio !== null && <Progress value={ratio} color={ratio > 1 ? 'var(--bad)' : slotVar(c.slot)} />}
          </Link>
        )
      })}
    </div>
  )

  return (
    <>
      <PageHeader title="Espaces" subtitle="Un espace par poste de dépense, avec ses propres statistiques." action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={18} /> <span className="hidden sm:inline">Nouvel espace</span></button>} />
      <h2 className="text-sm font-semibold text-ink-2 mb-3">Dépenses · ce mois-ci</h2>
      <Grid list={expense} />
      {income.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-ink-2 mt-8 mb-3">Revenus</h2>
          <Grid list={income} />
        </>
      )}
      {cats.length === 0 && <Card><p className="text-sm text-ink-3">Aucun espace. Crée ton premier espace.</p></Card>}
      <Sheet open={open} onClose={() => setOpen(false)} title="Nouvel espace">
        <CategoryForm onDone={() => setOpen(false)} />
      </Sheet>
    </>
  )
}
