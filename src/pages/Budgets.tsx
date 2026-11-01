import { useMemo, useState } from 'react'
import { format, getDaysInMonth } from 'date-fns'
import { Link } from 'react-router-dom'
import { PiggyBank } from 'lucide-react'
import { patch } from '../db/repo'
import { Card, CategoryBadge, Empty, PageHeader, Progress, StatTile } from '../components/ui'
import { expenses, sum, useCategories, useRecentMonths } from '../lib/hooks'
import { money, money0 } from '../lib/format'
import { slotVar } from '../lib/colors'

export default function Budgets() {
  const cats = useCategories().filter((c) => c.kind === 'expense')
  const txs = useRecentMonths(1)
  const now = new Date()
  const ym = format(now, 'yyyy-MM')
  const progress = now.getDate() / getDaysInMonth(now)
  const [editing, setEditing] = useState<string | null>(null)
  const [val, setVal] = useState('')

  const rows = useMemo(
    () =>
      cats.map((c) => {
        const spent = sum(expenses(txs.filter((t) => t.categoryId === c.id && t.date.startsWith(ym))))
        return { c, spent, ratio: c.budget ? spent / c.budget : 0 }
      }),
    [cats, txs, ym],
  )
  const withBudget = rows.filter((r) => r.c.budget)
  const totalBudget = withBudget.reduce((a, r) => a + (r.c.budget ?? 0), 0)
  const totalSpent = withBudget.reduce((a, r) => a + r.spent, 0)
  const over = withBudget.filter((r) => r.ratio > 1).length

  const save = async (id: string) => {
    const n = Number(val.replace(',', '.'))
    await patch('categories', id, { budget: n > 0 ? n : undefined })
    setEditing(null)
  }

  return (
    <>
      <PageHeader title="Budgets" subtitle={`Nous sommes à ${Math.round(progress * 100)} % du mois.`} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Budget total" value={money0(totalBudget)} />
        <StatTile label="Dépensé" value={money0(totalSpent)} tone={totalSpent > totalBudget ? 'bad' : 'neutral'} />
        <StatTile label="Restant" value={money0(Math.max(0, totalBudget - totalSpent))} tone="accent" />
        <StatTile label="Dépassés" value={String(over)} tone={over ? 'bad' : 'good'} hint={over ? 'budget(s) dépassé(s)' : 'tout est sous contrôle'} />
      </div>

      <Card className="mt-4">
        {withBudget.length > 0 && (
          <div className="mb-5">
            <div className="flex justify-between text-sm mb-1.5"><span className="font-medium">Global</span><span className="tabular text-ink-2">{money0(totalSpent)} / {money0(totalBudget)}</span></div>
            <div className="relative">
              <Progress value={totalBudget ? totalSpent / totalBudget : 0} color={totalSpent > totalBudget ? 'var(--bad)' : 'var(--accent)'} />
              <span className="absolute top-[-3px] h-3.5 w-0.5 bg-ink-3" style={{ left: `${progress * 100}%` }} title="Aujourd'hui" />
            </div>
            <p className="mt-1.5 text-xs text-ink-3">Le trait gris indique où nous en sommes dans le mois.</p>
          </div>
        )}
        {rows.length === 0 && <Empty icon={PiggyBank} title="Aucun espace de dépense" />}
        <ul className="divide-y divide-line">
          {rows.map(({ c, spent, ratio }) => (
            <li key={c.id} className="py-3.5 flex items-center gap-3">
              <Link to={`/espaces/${c.id}`}><CategoryBadge category={c} /></Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium truncate">{c.name}</span>
                  {editing === c.id ? (
                    <form className="flex gap-1" onSubmit={(e) => { e.preventDefault(); save(c.id) }}>
                      <input className="field !py-1 !px-2 w-24 text-right" inputMode="decimal" autoFocus value={val} onChange={(e) => setVal(e.target.value)} onBlur={() => save(c.id)} placeholder="€" />
                    </form>
                  ) : (
                    <button onClick={() => { setEditing(c.id); setVal(c.budget ? String(c.budget) : '') }} className="tabular text-ink-2 hover:text-accent">
                      {money0(spent)} <span className="text-ink-3">/ {c.budget ? money0(c.budget) : 'définir'}</span>
                    </button>
                  )}
                </div>
                <div className="mt-1.5">
                  {c.budget ? (
                    <Progress value={ratio} color={ratio > 1 ? 'var(--bad)' : ratio > progress + 0.1 ? 'var(--warn)' : slotVar(c.slot)} />
                  ) : (
                    <div className="h-2 rounded-full border border-dashed border-axis" />
                  )}
                </div>
                {c.budget && <div className="mt-1 text-xs text-ink-3">{ratio > 1 ? `Dépassé de ${money(spent - c.budget)}` : `Reste ${money(c.budget - spent)} · ${money(Math.max(0, (c.budget - spent) / Math.max(1, getDaysInMonth(now) - now.getDate() + 1)))} par jour`}</div>}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}
