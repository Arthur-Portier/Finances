# Finances — consignes pour Claude

## Git
- **Travailler et pousser directement sur la branche `main`.** Pas de branche de fonctionnalité ni de pull request, sauf demande explicite d'Arthur. (Décision d'Arthur, novembre 2026.)
- Chaque push sur `main` déclenche le déploiement GitHub Pages (`.github/workflows/deploy.yml`) vers https://arthur-portier.github.io/Finances/.
- Avant de pousser : `npm run typecheck` et `npm run build`, et vérifier le rendu mobile (390 px) et desktop avec Playwright.

## Projet
- PWA React 19 + Vite + TypeScript + Tailwind 4 + Recharts + Dexie (IndexedDB), synchronisation optionnelle Supabase (`src/lib/sync.ts`, schéma dans `supabase/schema.sql`).
- **Toute écriture de données passe par `src/db/repo.ts`** (`save`, `saveMany`, `patch`, `remove`, `removeMany`) et jamais par `db.table.put/add/update/delete` directement : c'est ce qui alimente la file de synchronisation. Exception : les écritures venant du cloud dans `sync.ts` et la table `settings` (locale).
- Nouvelle table de données = version Dexie suivante dans `src/db/db.ts` + ajout dans `SyncedTableName`, `SyncedTable` et `SYNCED_TABLES`.
- Interface en français, tutoiement, montants au format fr-FR (`src/lib/format.ts`).
- Couleurs des graphiques : palette catégorielle fixe (`--s1` à `--s8`), jamais générée ; une seule couleur par série ; voir `src/lib/colors.ts`.
- La coque mobile ne fait défiler que la zone de contenu (conteneur `overflow-y-auto` dans `Layout.tsx`), la barre d'onglets est un élément normal en bas : ne pas la repasser en `position: fixed` (ça saute avec la barre d'adresse de Safari).
