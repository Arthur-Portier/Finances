/** Enseignes : recherche d'un article sur leur site (qui ouvre l'application si elle est installée). */
export interface Store {
  id: string
  name: string
  search: (q: string) => string
}

export const STORES: Store[] = [
  { id: 'lidl', name: 'Lidl', search: (q) => `https://www.lidl.fr/q/search?q=${encodeURIComponent(q)}` },
  { id: 'carrefour', name: 'Carrefour', search: (q) => `https://www.carrefour.fr/s?q=${encodeURIComponent(q)}` },
  { id: 'leclerc', name: 'E.Leclerc', search: (q) => `https://www.e.leclerc/recherche?q=${encodeURIComponent(q)}` },
  { id: 'auchan', name: 'Auchan', search: (q) => `https://www.auchan.fr/recherche?text=${encodeURIComponent(q)}` },
  { id: 'intermarche', name: 'Intermarché', search: (q) => `https://www.intermarche.com/recherche/${encodeURIComponent(q)}` },
  { id: 'monoprix', name: 'Monoprix', search: (q) => `https://courses.monoprix.fr/search?q=${encodeURIComponent(q)}` },
]

export const storeById = (id: string) => STORES.find((s) => s.id === id) ?? STORES[0]
export const normalizeName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')
