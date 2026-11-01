import Dexie, { type EntityTable } from 'dexie'

export type TxType = 'expense' | 'income'

/** Champ commun : horodatage de dernière modification locale (ms), utilisé par la synchro. */
export interface Synced {
  updatedAt?: number
}

export interface Category extends Synced {
  id: string
  name: string
  icon: string            // lucide icon name (see lib/icons)
  slot: number            // 1..8 categorical color slot, 0 = neutral
  kind: TxType
  budget?: number         // monthly budget (expenses only)
  module?: 'shopping' | 'wardrobe' | null
  subs?: string[]         // suggested sub-categories
  order: number
}

export interface Transaction extends Synced {
  id: string
  date: string            // yyyy-MM-dd
  amount: number          // always positive
  type: TxType
  categoryId: string
  sub?: string
  note?: string
  recurringId?: string
  createdAt: number
}

export interface ShoppingList extends Synced {
  id: string
  name: string
  createdAt: number
  archived?: boolean
}

export interface ShoppingItem extends Synced {
  id: string
  listId: string
  name: string
  qty: number
  price?: number
  checked: boolean
  createdAt: number
}

export interface WardrobeItem extends Synced {
  id: string
  name: string
  brand?: string
  type: string            // Haut, Bas, Chaussures, Veste, Accessoire, Sport…
  price: number
  date: string
  wears: number
  transactionId?: string
  archived?: boolean
}

export interface Recurring extends Synced {
  id: string
  name: string
  amount: number
  type: TxType
  categoryId: string
  sub?: string
  day: number             // day of month
  active: boolean
  lastApplied?: string    // yyyy-MM
}

export interface Setting {
  key: string
  value: unknown
}

export interface OutboxEntry {
  seq?: number
  table: SyncedTableName
  id: string
  op: 'put' | 'del'
  ts: number
}

export type SyncedTableName = 'categories' | 'transactions' | 'shoppingLists' | 'shoppingItems' | 'wardrobe' | 'recurring'
export type SyncedTable<T extends SyncedTableName> = T extends 'categories' ? Category
  : T extends 'transactions' ? Transaction
  : T extends 'shoppingLists' ? ShoppingList
  : T extends 'shoppingItems' ? ShoppingItem
  : T extends 'wardrobe' ? WardrobeItem
  : Recurring
export const SYNCED_TABLES: SyncedTableName[] = ['categories', 'transactions', 'shoppingLists', 'shoppingItems', 'wardrobe', 'recurring']

export const db = new Dexie('finances') as Dexie & {
  categories: EntityTable<Category, 'id'>
  transactions: EntityTable<Transaction, 'id'>
  shoppingLists: EntityTable<ShoppingList, 'id'>
  shoppingItems: EntityTable<ShoppingItem, 'id'>
  wardrobe: EntityTable<WardrobeItem, 'id'>
  recurring: EntityTable<Recurring, 'id'>
  settings: EntityTable<Setting, 'key'>
  outbox: EntityTable<OutboxEntry, 'seq'>
}

db.version(1).stores({
  categories: 'id, order, kind',
  transactions: 'id, date, categoryId, type, [categoryId+date]',
  shoppingLists: 'id, createdAt',
  shoppingItems: 'id, listId, checked',
  wardrobe: 'id, date, type',
  recurring: 'id, active',
  settings: 'key',
})

db.version(2).stores({
  categories: 'id, order, kind',
  transactions: 'id, date, categoryId, type, [categoryId+date]',
  shoppingLists: 'id, createdAt',
  shoppingItems: 'id, listId, checked',
  wardrobe: 'id, date, type',
  recurring: 'id, active',
  settings: 'key',
  outbox: '++seq, [table+id]',
})

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
