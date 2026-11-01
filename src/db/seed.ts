import { addDays, format, subMonths, startOfMonth } from 'date-fns'
import { db, uid, type Transaction } from './db'
import { saveMany } from './repo'

const rnd = (min: number, max: number) => Math.round((min + Math.random() * (max - min)) * 100) / 100
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

/** Loads ~6 months of realistic demo data. Never overwrites existing transactions. */
export async function seedDemo() {
  const cats = await db.categories.toArray()
  const byName = Object.fromEntries(cats.map((c) => [c.name, c]))
  const txs: Transaction[] = []
  const today = new Date()
  const push = (date: Date, cat: string, amount: number, sub?: string, note?: string) => {
    const c = byName[cat]
    if (!c) return
    txs.push({ id: uid(), date: format(date, 'yyyy-MM-dd'), amount, type: c.kind, categoryId: c.id, sub, note, createdAt: Date.now() })
  }

  for (let m = 5; m >= 0; m--) {
    const start = startOfMonth(subMonths(today, m))
    const daysInMonth = m === 0 ? today.getDate() : 28
    push(addDays(start, 1), 'Salaire', 2450, 'Salaire', 'Virement employeur')
    push(addDays(start, 2), 'Logement', 820, 'Loyer')
    push(addDays(start, 5), 'Logement', rnd(45, 70), 'Électricité')
    push(addDays(start, 8), 'Logement', 29.99, 'Internet')
    push(addDays(start, 3), 'Abonnements', 17.99, 'Streaming', 'Netflix')
    push(addDays(start, 10), 'Abonnements', 9.99, 'Streaming', 'Spotify')
    push(addDays(start, 15), 'Abonnements', 19.99, 'Téléphone')
    for (let d = 0; d < daysInMonth; d++) {
      const day = addDays(start, d)
      if (Math.random() < 0.35) push(day, 'Courses', rnd(12, 65), pick(['Supermarché', 'Supermarché', 'Marché', 'Boulangerie']))
      if (Math.random() < 0.12) push(day, 'Restaurants', rnd(9, 48), pick(['Restaurant', 'Bar', 'Livraison', 'Café']))
      if (Math.random() < 0.1) push(day, 'Transport', rnd(5, 60), pick(['Essence', 'Train', 'Métro', 'Parking']))
      if (Math.random() < 0.07) push(day, 'Loisirs', rnd(8, 40), pick(['Cinéma', 'Sorties', 'Livres', 'Jeux']))
      if (Math.random() < 0.04) push(day, 'Santé', rnd(6, 35), pick(['Pharmacie', 'Médecin']))
    }
    push(addDays(start, 12), 'Tennis', rnd(20, 40), 'Cordage')
    push(addDays(start, 20), 'Tennis', rnd(8, 15), 'Balles')
    if (m === 4) push(addDays(start, 6), 'Tennis', 160, 'Licence', 'Licence FFT + adhésion club')
    if (m % 2 === 0) push(addDays(start, 17), 'Tennis', 25, 'Tournois', 'Inscription tournoi')
    if (m === 2) push(addDays(start, 9), 'Tennis', 189, 'Matériel', 'Raquette')
    push(addDays(start, 14), 'Vêtements', rnd(25, 90), pick(['Haut', 'Bas', 'Chaussures']))
    if (m === 1) push(addDays(start, 22), 'Vêtements', 129, 'Veste', 'Veste mi-saison')
  }
  await saveMany('transactions', txs)

  const vet = byName['Vêtements']
  if (vet) {
    const items = [
      { name: 'Jean brut', brand: 'Levi’s', type: 'Bas', price: 89, wears: 34 },
      { name: 'Chemise lin', brand: 'Uniqlo', type: 'Haut', price: 29.9, wears: 12 },
      { name: 'Baskets blanches', brand: 'Veja', type: 'Chaussures', price: 135, wears: 58 },
      { name: 'Veste mi-saison', brand: 'COS', type: 'Veste', price: 129, wears: 9 },
      { name: 'Tenue tennis', brand: 'Nike', type: 'Sport', price: 65, wears: 21 },
    ]
    await saveMany('wardrobe', items.map((it, i) => ({ ...it, id: uid(), date: format(subMonths(today, 5 - i), 'yyyy-MM-dd') })))
  }

  const list = await db.shoppingLists.orderBy('createdAt').first()
  if (list) {
    const items = ['Lait', 'Œufs', 'Pain complet', 'Pommes', 'Pâtes', 'Yaourts', 'Poulet', 'Café']
    await saveMany('shoppingItems', items.map((name, i) => ({ id: uid(), listId: list.id, name, qty: 1, price: rnd(1.2, 8), checked: i < 2, createdAt: Date.now() + i })))
  }

  const abo = byName['Abonnements']
  const log = byName['Logement']
  const sal = byName['Salaire']
  await saveMany('recurring', [
    { id: uid(), name: 'Loyer', amount: 820, type: 'expense', categoryId: log.id, sub: 'Loyer', day: 2, active: true, lastApplied: format(today, 'yyyy-MM') },
    { id: uid(), name: 'Netflix', amount: 17.99, type: 'expense', categoryId: abo.id, sub: 'Streaming', day: 3, active: true, lastApplied: format(today, 'yyyy-MM') },
    { id: uid(), name: 'Spotify', amount: 9.99, type: 'expense', categoryId: abo.id, sub: 'Streaming', day: 10, active: true, lastApplied: format(today, 'yyyy-MM') },
    { id: uid(), name: 'Forfait mobile', amount: 19.99, type: 'expense', categoryId: abo.id, sub: 'Téléphone', day: 15, active: true, lastApplied: format(today, 'yyyy-MM') },
    { id: uid(), name: 'Salaire', amount: 2450, type: 'income', categoryId: sal.id, sub: 'Salaire', day: 1, active: true, lastApplied: format(today, 'yyyy-MM') },
  ])
}
