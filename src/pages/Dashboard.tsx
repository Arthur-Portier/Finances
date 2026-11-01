import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { addMonths, format, getDaysInMonth, startOfMonth, subMonths } from 'date-fns'
import { ArrowRight, Sparkles, Wallet } from 'lucide-react'
import { useTxSheet } from '../components/Layout'
import { Card, Empty, PageHeader, Progress, StatTile } from '../components/ui'
import { CumulativeLines, MonthlyBars, RankedBars } from '../components/charts'
import { TransactionRow } from '../components/TransactionRow'
import { categoryTotals, expenses, incomes, sum, useCategoryMap, useRecentMonths } from '../lib/hooks'
import { cap, fmtMonth, fmtMonthLong, money, money0 } from '../lib/format'
import { slotVar } from '../lib/colors'
import { seedDemo } from '../db/seed'

export default function Dashboard() {
  const txs = useRecentMonths(6)
  const cats = useCategoryMap()
  const { openEdit } = useTxSheet()
  const now = new Date()
  const ym = format(now, 'yyyy-MM')
  const prevYm = format(subMonths(now, 1), 'yyyy-MM')

  const thisMonth = useMemo(() => txs.filter((t) => t.date.startsWith(ym)), [txs, ym])
  const lastMonth = useMemo(() => txs.filter((t) => t.date.startsWith(prevYm)), [txs, prevYm])
  const spent = sum(expenses(thisMonth))
  const earned = sum(incomes(thisMonth))
  const spentPrev = sum(expenses(lastMonth))
  const balance = earned - spent
  const budgetTotal = [...cats.values()].filter((c) => c.kind === 'expense').reduce((a, c) => a + (c.budget ?? 0), 0)

  const monthly = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = startOfMonth(subMonths(now, 5 - i))
      const key = format(d, 'yyyy-MM')
      const list = txs.filter((t) => t.date.startsWith(key))
      return { label: cap(fmtMonth(d)), depenses: sum(expenses(list)), revenus: sum(incomes(list)) }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txs])

  const cumulative = useMemo(() => {
    const days = Math.max(getDaysInMonth(now), getDaysInMonth(subMonths(now, 1)))
    const today = now.getDate()
    const acc = (list: typeof txs, upTo: number) => {
      const out: number[] = []
      let run = 0
      for (let d = 1; d <= days; d++) {
        run += expenses(list).filter((t) => Number(t.date.slice(8, 10)) === d).reduce((a, t) => a + t.amount, 0)
        out.push(d <= upTo ? run : NaN)
      }
      return out
    }
    const cur = acc(thisMonth, today)
    const prev = acc(lastMonth, days)
    return Array.from({ length: days }, (_, i) => ({ day: i + 1, current: Number.isNaN(cur[i]) ? undefined : cur[i], previous: prev[i] }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thisMonth, lastMonth])

  const byCat = useMemo(() => categoryTotals(expenses(thisMonth), cats), [thisMonth, cats])
  const ranked = useMemo(() => {
    const top = byCat.slice(0, 7).map((r) => ({ name: r.category.name, value: r.total, slot: r.category.slot }))
    const rest = byCat.slice(7).reduce((a, r) => a + r.total, 0)
    if (rest > 0) top.push({ name: 'Autres', value: rest, slot: 0 })
    return top
  }, [byCat])

  const budgets = useMemo(
    () =>
      byCat
        .filter((r) => r.category.budget)
        .map((r) => ({ ...r, ratio: r.total / (r.category.budget ?? 1) }))
        .sort((a, b) => b.ratio - a.ratio)
        .slice(0, 5),
    [byCat],
  )

  const recent = txs.slice(0, 6)
  const dayOfMonth = now.getDate()
  const projected = dayOfMonth > 3 ? (spent / dayOfMonth) * getDaysInMonth(now) : null
  const nextMonth = addMonths(startOfMonth(now), 1)

  if (txs.length === 0) {
    return (
      <>
        <PageHeader title="Bonjour 👋" subtitle={cap(fmtMonthLong(now))} />
        <Card>
          <Empty
            icon={Wallet}
            title="Commençons"
            text="Ajoute ta première dépense avec le bouton +, ou charge un jeu de données d'exemple pour découvrir l'application."
            action={
              <button className="btn btn-ghost" onClick={() => seedDemo()}>
                <Sparkles size={16} /> Charger des données d'exemple
              </button>
            }
          />
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Bonjour 👋" subtitle={`${cap(fmtMonthLong(now))} · jour ${dayOfMonth}`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatTile label="Dépensé ce mois" value={money0(spent)} delta={spentPrev > 0 ? { value: (spent - spentPrev) / spentPrev, good: spent <= spentPrev, label: 'vs mois dernier' } : undefined} />
        <StatTile label="Revenus" value={money0(earned)} tone="good" />
        <StatTile label="Solde du mois" value={money0(balance)} tone={balance >= 0 ? 'accent' : 'bad'} hint={projected ? `Projection : ${money0(projected)} dépensés` : undefined} />
        <StatTile label="Budget restant" value={money0(Math.max(0, budgetTotal - spent))} hint={`sur ${money0(budgetTotal)} prévus`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card title="Revenus et dépenses · 6 mois" className="lg:col-span-3">
          <MonthlyBars data={monthly} />
        </Card>
        <Card title="Rythme de dépenses" className="lg:col-span-2">
          <CumulativeLines data={cumulative} />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card title="Où part l'argent ce mois-ci" className="lg:col-span-3" action={<Link to="/espaces" className="text-xs font-medium text-accent flex items-center gap-1">Tous les espaces <ArrowRight size={14} /></Link>}>
          {ranked.length ? <RankedBars data={ranked} /> : <p className="text-sm text-ink-3">Aucune dépense ce mois-ci.</p>}
        </Card>
        <Card title="Budgets à surveiller" className="lg:col-span-2" action={<Link to="/budgets" className="text-xs font-medium text-accent flex items-center gap-1">Détails <ArrowRight size={14} /></Link>}>
          {budgets.length === 0 && <p className="text-sm text-ink-3">Définis des budgets dans Réglages → Espaces.</p>}
          <ul className="space-y-3">
            {budgets.map((b) => (
              <li key={b.category.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{b.category.name}</span>
                  <span className="tabular text-ink-2">
                    {money0(b.total)} <span className="text-ink-3">/ {money0(b.category.budget ?? 0)}</span>
                  </span>
                </div>
                <Progress value={b.ratio} color={b.ratio > 1 ? 'var(--bad)' : b.ratio > 0.85 ? 'var(--warn)' : slotVar(b.category.slot)} />
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink-3">Les budgets se réinitialisent le {format(nextMonth, 'd/MM')}.</p>
        </Card>
      </div>

      <Card className="mt-4" title="Dernières transactions" action={<Link to="/transactions" className="text-xs font-medium text-accent flex items-center gap-1">Tout voir <ArrowRight size={14} /></Link>}>
        <div className="-mx-2">
          {recent.map((t) => (
            <TransactionRow key={t.id} tx={t} category={cats.get(t.categoryId)} onClick={() => openEdit(t)} />
          ))}
        </div>
        <div className="mt-2 text-right text-xs text-ink-3">{money(spent)} dépensés ce mois</div>
      </Card>
    </>
  )
}
