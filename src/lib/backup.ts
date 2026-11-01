import { db, SYNCED_TABLES } from '../db/db'
import { removeMany, saveMany } from '../db/repo'

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
  for (const t of SYNCED_TABLES) {
    const ids = (await db[t].toCollection().primaryKeys()) as string[]
    await removeMany(t, ids)
  }
  await db.transaction('rw', [db.categories, db.transactions, db.shoppingLists, db.shoppingItems, db.wardrobe, db.recurring, db.settings], async () => {
    await Promise.all([db.categories.clear(), db.transactions.clear(), db.shoppingLists.clear(), db.shoppingItems.clear(), db.wardrobe.clear(), db.recurring.clear(), db.settings.clear()])
    await db.settings.bulkAdd(data.settings ?? [])
  })
  await saveMany('categories', data.categories ?? [])
  await saveMany('transactions', data.transactions ?? [])
  await saveMany('shoppingLists', data.shoppingLists ?? [])
  await saveMany('shoppingItems', data.shoppingItems ?? [])
  await saveMany('wardrobe', data.wardrobe ?? [])
  await saveMany('recurring', data.recurring ?? [])
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

/** Efface tout : localement, et dans le cloud si connecté (via des suppressions synchronisées). */
export async function wipeAll() {
  for (const t of SYNCED_TABLES) {
    const ids = (await db[t].toCollection().primaryKeys()) as string[]
    await removeMany(t, ids)
  }
  await db.transaction('rw', [db.categories, db.transactions, db.shoppingLists, db.shoppingItems, db.wardrobe, db.recurring, db.settings], async () => {
    await Promise.all([db.categories.clear(), db.transactions.clear(), db.shoppingLists.clear(), db.shoppingItems.clear(), db.wardrobe.clear(), db.recurring.clear(), db.settings.clear()])
  })
}
