import { format } from 'date-fns'
import { db, uid } from '../db/db'
import { patch, save } from '../db/repo'

/** Creates this month's transaction for every active recurring entry whose day has passed. */
export async function applyRecurring() {
  const today = new Date()
  const ym = format(today, 'yyyy-MM')
  const items = await db.recurring.filter((r) => r.active).toArray()
  for (const r of items) {
    if (r.lastApplied === ym) continue
    if (today.getDate() < r.day) continue
    const day = Math.min(r.day, 28)
    await save('transactions', {
      id: uid(),
      date: `${ym}-${String(day).padStart(2, '0')}`,
      amount: r.amount,
      type: r.type,
      categoryId: r.categoryId,
      sub: r.sub,
      note: r.name,
      recurringId: r.id,
      createdAt: Date.now(),
    })
    await patch('recurring', r.id, { lastApplied: ym })
  }
}
