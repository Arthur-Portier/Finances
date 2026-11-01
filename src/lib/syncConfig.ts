/**
 * Configuration Supabase.
 * La clé « anon » est publique par conception (elle est livrée dans toute app
 * Supabase côté client) ; la sécurité repose sur les règles RLS en base.
 * Priorité : réglage saisi dans l'app > variables de build > valeurs ci-dessous.
 */
export const DEFAULT_SUPABASE = {
  url: 'https://yswcfqomwddqkaqdaebi.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlzd2NmcW9td2RkcWthcWRhZWJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1Mjk0OTMsImV4cCI6MjEwOTEwNTQ5M30.x1KjTp6dbNfFUruH1aDbg46UtqhACENmDiBy-eA1JD8',
}

export interface SyncConfig {
  url: string
  anonKey: string
}

const KEY = 'sync.config'

export function getSyncConfig(): SyncConfig {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const c = JSON.parse(raw) as SyncConfig
      if (c.url && c.anonKey) return c
    }
  } catch {
    /* ignore */
  }
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_SUPABASE.url
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || DEFAULT_SUPABASE.anonKey
  return { url, anonKey }
}

export function setSyncConfig(c: SyncConfig | null) {
  try {
    if (c) localStorage.setItem(KEY, JSON.stringify(c))
    else localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
