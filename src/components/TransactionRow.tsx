import type { Category, Transaction } from '../db/db'
import { fmtDay, signed } from '../lib/format'
import { CategoryBadge } from './ui'

export function TransactionRow({ tx, category, onClick, showDate = true }: { tx: Transaction; category?: Category; onClick?: () => void; showDate?: boolean }) {
  const title = tx.note || tx.sub || category?.name || 'Transaction'
  const subtitle = [category?.name, tx.sub && tx.sub !== title ? tx.sub : null, showDate ? fmtDay(tx.date) : null].filter(Boolean).join(' · ')
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-surface-2">
      <CategoryBadge category={category} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{title}</div>
        <div className="truncate text-xs text-ink-3">{subtitle}</div>
      </div>
      <div className={`tabular font-semibold ${tx.type === 'income' ? 'text-good' : 'text-ink'}`}>{signed(tx.amount, tx.type)}</div>
    </button>
  )
}
