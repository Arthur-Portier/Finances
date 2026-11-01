import { db } from '../db/db'

export async function exportJSON() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: await db.categories.toArray(),
    transactions: await db.transactions.toArray(),
    shoppingLists: await db.shoppingLists.toArray(),
    shoppingItems: await db.shoppingItems.toArray(),
    wardrobe: await db.wardrobe.toArray(),
    recurring: await db.recurring.toArray(),
    settings: await db.settings.toArray(),
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `finances-${data.exportedAt.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importJSON(file: File) {
  const text = await file.text()
  const data = JSON.parse(text)
  if (!data || data.version !== 1 || !Array.isArray(data.transactions)) throw new Error('Fichier invalide')
  await db.transaction('rw', [db.categories, db.transactions, db.shoppingLists, db.shoppingItems, db.wardrobe, db.recurring, db.settings], async () => {
    await Promise.all([db.categories.clear(), db.transactions.clear(), db.shoppingLists.clear(), db.shoppingItems.clear(), db.wardrobe.clear(), db.recurring.clear(), db.settings.clear()])
    await db.categories.bulkAdd(data.categories ?? [])
    await db.transactions.bulkAdd(data.transactions ?? [])
    await db.shoppingLists.bulkAdd(data.shoppingLists ?? [])
    await db.shoppingItems.bulkAdd(data.shoppingItems ?? [])
    await db.wardrobe.bulkAdd(data.wardrobe ?? [])
    await db.recurring.bulkAdd(data.recurring ?? [])
    await db.settings.bulkAdd(data.settings ?? [])
  })
}

export async function exportCSV() {
  const cats = new Map((await db.categories.toArray()).map((c) => [c.id, c.name]))
  const txs = await db.transactions.orderBy('date').toArray()
  const esc = (s: unknown) => `"${String(s ?? '').replace(/"/g, '""')}"`
  const rows = [
    ['date', 'type', 'categorie', 'sous_categorie', 'montant', 'note'].join(';'),
    ...txs.map((t) => [t.date, t.type === 'expense' ? 'dépense' : 'revenu', cats.get(t.categoryId) ?? '', t.sub ?? '', t.amount.toFixed(2).replace('.', ','), t.note ?? ''].map(esc).join(';')),
  ]
  const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export async function wipeAll() {
  await db.transaction('rw', [db.categories, db.transactions, db.shoppingLists, db.shoppingItems, db.wardrobe, db.recurring, db.settings], async () => {
    await Promise.all([db.categories.clear(), db.transactions.clear(), db.shoppingLists.clear(), db.shoppingItems.clear(), db.wardrobe.clear(), db.recurring.clear(), db.settings.clear()])
  })
}
