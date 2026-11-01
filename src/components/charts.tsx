import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { money, money0 } from '../lib/format'
import { slotVar } from '../lib/colors'

const axisStyle = { fontSize: 11, fill: 'var(--ink-3)' }
const compact = (n: number) => (Math.abs(n) >= 1000 ? `${String(Math.round(n / 100) / 10).replace('.', ',')} k€` : `${Math.round(n)} €`)

type TipProps = { active?: boolean; label?: string | number; payload?: { name?: string; value?: number; color?: string; payload?: Record<string, unknown> }[] }

export function Tip({ active, label, payload, labelFormatter }: TipProps & { labelFormatter?: (l: string | number | undefined, p?: Record<string, unknown>) => string }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-card text-xs">
      <div className="font-semibold text-ink mb-1">{labelFormatter ? labelFormatter(label, row) : label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-ink-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span>{p.name}</span>
          <span className="ml-auto font-medium text-ink tabular">{money(Number(p.value ?? 0))}</span>
        </div>
      ))}
    </div>
  )
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: it.color }} />
          {it.label}
        </li>
      ))}
    </ul>
  )
}

/** Revenus vs dépenses par mois, deux séries (slots 1 et 2). */
export function MonthlyBars({ data, height = 220 }: { data: { label: string; depenses: number; revenus: number }[]; height?: number }) {
  return (
    <div>
      <Legend items={[{ label: 'Revenus', color: 'var(--s1)' }, { label: 'Dépenses', color: 'var(--s2)' }]} />
      <div style={{ height }} className="mt-2 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2} barCategoryGap="28%" margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="label" tick={axisStyle} axisLine={{ stroke: 'var(--axis)' }} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={compact} width={48} />
            <Tooltip content={<Tip />} cursor={{ fill: 'var(--surface-3)', opacity: 0.5 }} />
            <Bar dataKey="revenus" name="Revenus" fill="var(--s1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="depenses" name="Dépenses" fill="var(--s2)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Une série, une couleur : évolution mensuelle d'une catégorie. */
export function SingleBars({ data, slot, height = 200, name = 'Dépenses' }: { data: { label: string; value: number }[]; slot: number; height?: number; name?: string }) {
  return (
    <div style={{ height }} className="-ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="30%" margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="label" tick={axisStyle} axisLine={{ stroke: 'var(--axis)' }} tickLine={false} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={compact} width={48} />
          <Tooltip content={<Tip />} cursor={{ fill: 'var(--surface-3)', opacity: 0.5 }} />
          <Bar dataKey="value" name={name} fill={slotVar(slot)} radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Barres horizontales classées, couleur = identité de la catégorie. */
export function RankedBars({ data, height }: { data: { name: string; value: number; slot: number }[]; height?: number }) {
  const h = height ?? Math.max(120, data.length * 36 + 16)
  return (
    <div style={{ height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }} barCategoryGap="30%">
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={96} tick={{ ...axisStyle, fill: 'var(--ink-2)', fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip content={<Tip />} cursor={{ fill: 'var(--surface-3)', opacity: 0.5 }} />
          <Bar dataKey="value" name="Montant" radius={[0, 4, 4, 0]} maxBarSize={18} label={{ position: 'right', fontSize: 11, fill: 'var(--ink-2)', formatter: (v: unknown) => money0(Number(v)) }}>
            {data.map((d, i) => (
              <Cell key={i} fill={slotVar(d.slot)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Dépenses cumulées du mois : ce mois vs mois dernier. */
export function CumulativeLines({ data, height = 200 }: { data: { day: number; current?: number; previous?: number }[]; height?: number }) {
  const points = data.filter((d) => d.current != null).length
  return (
    <div>
      <Legend items={[{ label: 'Ce mois-ci', color: 'var(--s1)' }, { label: 'Mois dernier', color: 'var(--ink-3)' }]} />
      <div style={{ height }} className="mt-2 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="day" tick={axisStyle} axisLine={{ stroke: 'var(--axis)' }} tickLine={false} interval={6} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={compact} width={48} />
            <Tooltip content={<Tip labelFormatter={(l) => `Jour ${l}`} />} cursor={{ stroke: 'var(--axis)' }} />
            <Line type="monotone" dataKey="previous" name="Mois dernier" stroke="var(--ink-3)" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="current" name="Ce mois-ci" stroke="var(--s1)" strokeWidth={2.5} dot={points < 2 ? { r: 4, fill: 'var(--s1)', strokeWidth: 0 } : false} activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--surface)' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Barre segmentée part-du-tout (≤ 6 segments + Autres). */
export function SegmentedBar({ data }: { data: { name: string; value: number; slot: number }[] }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full gap-[2px]">
        {data.map((d) => (
          <div key={d.name} title={`${d.name} · ${money(d.value)}`} style={{ width: `${(d.value / total) * 100}%`, background: slotVar(d.slot) }} className="h-full first:rounded-l-full last:rounded-r-full" />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2 min-w-0">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: slotVar(d.slot) }} />
            <span className="truncate text-ink-2">{d.name}</span>
            <span className="ml-auto font-medium tabular">{Math.round((d.value / total) * 100)} %</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
