import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { db, type Category, type Transaction } from '../db/db'

export function useCategories() {
  return useLiveQuery(() => db.categories.orderBy('order').toArray(), []) ?? []
}

export function useCategoryMap() {
  const cats = useCategories()
  return useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats])
}

export function useTransactionsBetween(from: string, to: string) {
  return useLiveQuery(() => db.transactions.where('date').between(from, to, true, true).reverse().sortBy('date'), [from, to]) ?? []
}

export function useAllTransactions() {
  return useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray(), []) ?? []
}

export const monthRange = (d: Date) => ({
  from: format(startOfMonth(d), 'yyyy-MM-dd'),
  to: format(endOfMonth(d), 'yyyy-MM-dd'),
})

/** Transactions for the last N months, including the current one. */
export function useRecentMonths(n: number) {
  const from = format(startOfMonth(subMonths(new Date(), n - 1)), 'yyyy-MM-dd')
  const to = format(endOfMonth(new Date()), 'yyyy-MM-dd')
  return useTransactionsBetween(from, to)
}

export const sum = (txs: Transaction[]) => txs.reduce((a, t) => a + t.amount, 0)
export const expenses = (txs: Transaction[]) => txs.filter((t) => t.type === 'expense')
export const incomes = (txs: Transaction[]) => txs.filter((t) => t.type === 'income')

export function groupBy<T, K extends string | number>(arr: T[], key: (t: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>()
  for (const t of arr) {
    const k = key(t)
    const list = m.get(k)
    if (list) list.push(t)
    else m.set(k, [t])
  }
  return m
}

export function categoryTotals(txs: Transaction[], cats: Map<string, Category>) {
  const g = groupBy(txs, (t) => t.categoryId)
  return [...g.entries()]
    .map(([id, list]) => ({ category: cats.get(id), total: sum(list), count: list.length }))
    .filter((r): r is { category: Category; total: number; count: number } => !!r.category)
    .sort((a, b) => b.total - a.total)
}

export type Theme = 'light' | 'dark' | 'system'
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const t = localStorage.getItem('theme')
      return t === 'dark' || t === 'light' ? t : 'system'
    } catch {
      return 'system'
    }
  })
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') delete root.dataset.theme
    else root.dataset.theme = theme
    try {
      if (theme === 'system') localStorage.removeItem('theme')
      else localStorage.setItem('theme', theme)
    } catch {
      /* storage unavailable */
    }
  }, [theme])
  return [theme, setTheme]
}

export function useSetting<T>(key: string, fallback: T): [T, (v: T) => Promise<void>] {
  const row = useLiveQuery(() => db.settings.get(key), [key])
  const value = (row?.value as T | undefined) ?? fallback
  const set = async (v: T) => {
    await db.settings.put({ key, value: v })
  }
  return [value, set]
}

export function useMediaQuery(q: string) {
  const [m, setM] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(q).matches : false))
  useEffect(() => {
    const mq = window.matchMedia(q)
    const fn = (e: MediaQueryListEvent) => setM(e.matches)
    mq.addEventListener('change', fn)
    setM(mq.matches)
    return () => mq.removeEventListener('change', fn)
  }, [q])
  return m
}
