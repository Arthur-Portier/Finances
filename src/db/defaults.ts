import { db, uid, type Category } from './db'
import { save, saveMany } from './repo'

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Courses', icon: 'ShoppingBasket', slot: 3, kind: 'expense', budget: 350, module: 'shopping', subs: ['Supermarché', 'Marché', 'Boulangerie', 'Drive'], order: 1 },
  { name: 'Vêtements', icon: 'Shirt', slot: 5, kind: 'expense', budget: 120, module: 'wardrobe', subs: ['Haut', 'Bas', 'Chaussures', 'Veste', 'Accessoire', 'Sport'], order: 2 },
  { name: 'Tennis', icon: 'Trophy', slot: 4, kind: 'expense', budget: 150, subs: ['Licence', 'Cours', 'Tournois', 'Cordage', 'Balles', 'Matériel', 'Tenue'], order: 3 },
  { name: 'Logement', icon: 'Home', slot: 1, kind: 'expense', budget: 900, subs: ['Loyer', 'Électricité', 'Internet', 'Assurance', 'Entretien'], order: 4 },
  { name: 'Restaurants', icon: 'UtensilsCrossed', slot: 2, kind: 'expense', budget: 150, subs: ['Restaurant', 'Bar', 'Livraison', 'Café'], order: 5 },
  { name: 'Transport', icon: 'Car', slot: 7, kind: 'expense', budget: 120, subs: ['Essence', 'Train', 'Métro', 'Parking', 'Péage'], order: 6 },
  { name: 'Loisirs', icon: 'Gamepad2', slot: 6, kind: 'expense', budget: 100, subs: ['Cinéma', 'Jeux', 'Sorties', 'Livres', 'Musique'], order: 7 },
  { name: 'Abonnements', icon: 'Repeat', slot: 8, kind: 'expense', budget: 60, subs: ['Streaming', 'Téléphone', 'Cloud', 'Salle de sport'], order: 8 },
  { name: 'Santé', icon: 'HeartPulse', slot: 0, kind: 'expense', budget: 50, subs: ['Pharmacie', 'Médecin', 'Mutuelle'], order: 9 },
  { name: 'Divers', icon: 'Sparkles', slot: 0, kind: 'expense', subs: [], order: 10 },
  { name: 'Salaire', icon: 'Banknote', slot: 1, kind: 'income', subs: ['Salaire', 'Prime'], order: 11 },
  { name: 'Autres revenus', icon: 'PiggyBank', slot: 3, kind: 'income', subs: ['Remboursement', 'Vente', 'Cadeau'], order: 12 },
]

export async function ensureDefaults() {
  const count = await db.categories.count()
  if (count > 0) return
  await saveMany('categories', DEFAULT_CATEGORIES.map((c) => ({ ...c, id: uid() })))
  await save('shoppingLists', { id: uid(), name: 'Courses de la semaine', createdAt: Date.now() })
}
