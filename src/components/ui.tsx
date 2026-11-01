import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { iconFor } from '../lib/icons'
import { slotSoft, slotVar } from '../lib/colors'
import type { Category } from '../db/db'

export function Card({ children, className = '', title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={`card p-4 sm:p-5 ${className}`}>
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold text-ink-2">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function StatTile({ label, value, hint, tone = 'neutral', delta }: { label: string; value: string; hint?: ReactNode; tone?: 'neutral' | 'good' | 'bad' | 'accent'; delta?: { value: number; good: boolean; label: string } }) {
  const color = tone === 'good' ? 'text-good' : tone === 'bad' ? 'text-bad' : tone === 'accent' ? 'text-accent' : 'text-ink'
  return (
    <div className="card p-4 sm:p-5 rise">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-3">{label}</div>
      <div className={`mt-1.5 text-2xl sm:text-3xl font-semibold tracking-tight ${color}`}>{value}</div>
      {delta && (
        <div className={`mt-1 text-xs font-medium ${delta.good ? 'text-good' : 'text-bad'}`}>
          {delta.value >= 0 ? '▲' : '▼'} {Math.abs(Math.round(delta.value * 100))} % <span className="text-ink-3 font-normal">{delta.label}</span>
        </div>
      )}
      {hint && <div className="mt-1 text-xs text-ink-3">{hint}</div>}
    </div>
  )
}

export function CategoryBadge({ category, size = 40 }: { category?: Category; size?: number }) {
  const Icon = iconFor(category?.icon ?? 'Tag')
  const slot = category?.slot ?? 0
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-2xl"
      style={{ width: size, height: size, background: slotSoft(slot), color: slotVar(slot) }}
      aria-hidden
    >
      <Icon size={Math.round(size * 0.5)} strokeWidth={2.2} />
    </span>
  )
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40 fade-in" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-surface shadow-card sheet-in safe-bottom">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-surface/90 backdrop-blur px-5 pt-4 pb-3 border-b border-line">
          <div className="mx-auto sm:hidden absolute left-1/2 -translate-x-1/2 top-2 h-1 w-10 rounded-full bg-surface-3" />
          <h2 className="text-lg font-semibold mt-1">{title}</h2>
          <button className="btn btn-ghost !p-2 rounded-full" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function Empty({ icon: Icon, title, text, action }: { icon: React.ComponentType<{ size?: number }>; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <Icon size={26} />
      </span>
      <h3 className="mt-4 font-semibold">{title}</h3>
      {text && <p className="mt-1 text-sm text-ink-3 max-w-xs">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="inline-flex rounded-xl bg-surface-2 p-1 gap-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${value === o.value ? 'bg-surface shadow-card text-ink' : 'text-ink-3 hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Progress({ value, color = 'var(--accent)', track = 'var(--surface-3)' }: { value: number; color?: string; track?: string }) {
  const v = Math.max(0, Math.min(1, value))
  return (
    <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: track }} role="progressbar" aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${v * 100}%`, background: color }} />
    </div>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-5 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-3">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}
