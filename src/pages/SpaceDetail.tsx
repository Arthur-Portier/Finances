import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { format, startOfMonth, subMonths } from 'date-fns'
import { ArrowLeft, Pencil, Plus, ShoppingBasket, Shirt } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useTxSheet } from '../components/Layout'
import { Card, CategoryBadge, PageHeader, Progress, Segmented, Sheet, StatTile } from '../components/ui'
import { RankedBars, SingleBars } from '../components/charts'
import { TransactionRow } from '../components/TransactionRow'
import { CategoryForm } from '../components/CategoryForm'
import { groupBy, sum } from '../lib/hooks'
import { cap, fmtMonth, money, money0 } from '../lib/format'
import { slotVar } from '../lib/colors'

type Range = '3' | '6' | '12'

export default function SpaceDetail() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const category = useLiveQuery(() => db.categories.get(id), [id])
  const txs = useLiveQuery(() => db.transactions.where('categoryId').equals(id).reverse().sortBy('date'), [id]) ?? []
  const [range, setRange] = useState<Range>('6')
  const [edit, setEdit] = useState(false)
  const { openAdd, openEdit } = useTxSheet()
  const now = new Date()
  const ym = format(now, 'yyyy-MM')
  const year = format(now, 'yyyy')
  const n = Number(range)

  const monthly = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        const d = startOfMonth(subMonths(now, n - 1 - i))
        const key = format(d, 'yyyy-MM')
        return { label: cap(fmtMonth(d)), value: sum(txs.filter((t) => t.date.startsWith(key))) }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [txs, n],
  )
  const inRange = useMemo(() => {
    const from = format(startOfMonth(subMonths(now, n - 1)), 'yyyy-MM-dd')
    return txs.filter((t) => t.date >= from)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txs, n])

  const thisMonth = sum(txs.filter((t) => t.date.startsWith(ym)))
  const thisYear = sum(txs.filter((t) => t.date.startsWith(year)))
  const avg = sum(inRange) / n
  const slot = category?.slot ?? 0

  const subs = useMemo(() => {
    const g = groupBy(inRange, (t) => t.sub || 'Sans précision')
    const rows = [...g.entries()].map(([name, list]) => ({ name, value: sum(list), slot })).sort((a, b) => b.value - a.value)
    const top = rows.slice(0, 7)
    const rest = rows.slice(7).reduce((a, r) => a + r.value, 0)
    if (rest) top.push({ name: 'Autres', value: rest, slot: 0 })
    return top
  }, [inRange, slot])

  if (category === undefined) return null
  if (category === null) return <p>Espace introuvable. <Link to="/espaces" className="text-accent">Retour</Link></p>

  const ratio = category.budget ? thisMonth / category.budget : null

  return (
    <>
      <button onClick={() => nav(-1)} className="mb-3 inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ArrowLeft size={16} /> Retour</button>
      <PageHeader
        title={category.name}
        subtitle={category.kind === 'expense' ? `${txs.length} dépense${txs.length > 1 ? 's' : ''} enregistrée${txs.length > 1 ? 's' : ''}` : `${txs.length} revenu${txs.length > 1 ? 's' : ''}`}
        action={
          <div className="flex items-center gap-2">
            <CategoryBadge category={category} size={44} />
            <button className="btn btn-ghost !p-2.5" onClick={() => setEdit(true)} aria-label="Modifier l'espace"><Pencil size={18} /></button>
            <button className="btn btn-primary !p-2.5 sm:!px-4" onClick={() => openAdd({ categoryId: category.id })}><Plus size={18} /><span className="hidden sm:inline">Ajouter</span></button>
          </div>
        }
      />

      {category.module === 'shopping' && (
        <Link to="/courses" className="card mb-4 flex items-center gap-3 p-4 hover:bg-surface-2 transition">
          <ShoppingBasket size={20} className="text-accent" /> <span className="font-medium">Ouvrir la liste de courses</span>
        </Link>
      )}
      {category.module === 'wardrobe' && (
        <Link to="/garde-robe" className="card mb-4 flex items-center gap-3 p-4 hover:bg-surface-2 transition">
          <Shirt size={20} className="text-accent" /> <span className="font-medium">Ouvrir la garde-robe</span>
        </Link>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Ce mois-ci" value={money0(thisMonth)} />
        <StatTile label={`Moyenne · ${n} mois`} value={money0(avg)} />
        <StatTile label={`Total ${year}`} value={money0(thisYear)} />
        <StatTile label="Par an (rythme)" value={money0(avg * 12)} hint="moyenne × 12" />
      </div>

      {ratio !== null && (
        <Card className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Budget du mois</span>
            <span className="tabular text-ink-2">{money0(thisMonth)} <span className="text-ink-3">/ {money0(category.budget ?? 0)}</span></span>
          </div>
          <Progress value={ratio} color={ratio > 1 ? 'var(--bad)' : ratio > 0.85 ? 'var(--warn)' : slotVar(slot)} />
          <p className="mt-2 text-xs text-ink-3">{ratio > 1 ? `Dépassé de ${money0(thisMonth - (category.budget ?? 0))}` : `Il reste ${money0((category.budget ?? 0) - thisMonth)}`}</p>
        </Card>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card title="Évolution mensuelle" className="lg:col-span-3" action={<Segmented value={range} onChange={setRange} options={[{ value: '3', label: '3 m' }, { value: '6', label: '6 m' }, { value: '12', label: '12 m' }]} />}>
          <SingleBars data={monthly} slot={slot} name={category.kind === 'expense' ? 'Dépenses' : 'Revenus'} />
        </Card>
        <Card title={`Répartition · ${n} mois`} className="lg:col-span-2">
          {subs.length ? <RankedBars data={subs} /> : <p className="text-sm text-ink-3">Ajoute une sous-catégorie à tes transactions pour voir la répartition.</p>}
        </Card>
      </div>

      <Card className="mt-4" title="Historique">
        {txs.length === 0 && <p className="text-sm text-ink-3">Aucune transaction pour cet espace.</p>}
        <div className="-mx-2">
          {txs.slice(0, 50).map((t) => (
            <TransactionRow key={t.id} tx={t} category={category} onClick={() => openEdit(t)} />
          ))}
        </div>
        {txs.length > 50 && <p className="mt-2 text-xs text-ink-3 text-center">50 dernières affichées · total {money(sum(txs))}</p>}
      </Card>

      <Sheet open={edit} onClose={() => setEdit(false)} title="Modifier l'espace">
        <CategoryForm initial={category} onDone={() => { setEdit(false); db.categories.get(id).then((c) => { if (!c) nav('/espaces') }) }} />
      </Sheet>
    </>
  )
}
