# Finances

> **📱 Ouvrir l'application : [arthur-portier.github.io/Finances](https://arthur-portier.github.io/Finances/)**
>
> Puis « Sur l'écran d'accueil » (Safari) ou « Installer l'application » (Chrome) pour l'avoir comme une vraie app.

Application desktop et mobile pour gérer mes finances au quotidien : dépenses, revenus, budgets, listes de courses, garde-robe, tennis et tous les autres postes de dépense.

C'est une **Progressive Web App** (PWA) : une seule base de code, installable sur iPhone, Android, Mac, Windows et Linux depuis le navigateur. Elle fonctionne hors ligne et les données restent sur l'appareil (IndexedDB).

## Fonctionnalités

- **Tableau de bord** : dépensé / revenus / solde du mois, projection de fin de mois, revenus vs dépenses sur 6 mois, rythme de dépenses comparé au mois dernier, répartition par espace, budgets à surveiller, dernières opérations.
- **Transactions** : ajout en 3 secondes (bouton +), recherche, filtres par type et par espace, navigation mois par mois, modification et suppression.
- **Espaces** : un espace par poste de dépense (Courses, Vêtements, Tennis, Logement…), chacun avec ses statistiques : total du mois, moyenne, total annuel, rythme annuel, évolution mensuelle, répartition par sous-catégorie (ex. Tennis → Licence, Cours, Cordage, Tournois…), budget et historique. Couleur, icône, budget et sous-catégories personnalisables ; création d'espaces illimitée.
- **Courses** : plusieurs listes, cases à cocher, quantités, prix estimés, total prévu ; « Enregistrer le ticket » transforme les articles cochés en une dépense Courses.
- **Garde-robe** : chaque pièce avec prix, marque, type et nombre de ports ; **coût par port** calculé automatiquement, valeur par type, tri par prix ou par €/port, création automatique de la dépense Vêtements.
- **Budgets** : budget mensuel par espace, progression globale avec repère « aujourd'hui », reste à dépenser par jour, alertes de dépassement.
- **Abonnements et récurrents** : loyer, Netflix, licence, salaire… ajoutés automatiquement chaque mois à la date prévue ; charges fixes mensuelles / annuelles et reste à vivre.
- **Réglages** : thème clair / sombre / automatique, export JSON (sauvegarde complète) et CSV, import, données d'exemple, remise à zéro.

## Lancer en local

```bash
npm install
npm run dev
```

Puis ouvrir l'adresse affichée (par défaut http://localhost:5173). Avec `--host` (déjà activé), l'adresse réseau permet de tester sur le téléphone connecté au même Wi-Fi.

Build de production :

```bash
npm run build
npm run preview
```

## Installer sur ses appareils

Le dépôt contient un workflow GitHub Actions qui publie l'application sur GitHub Pages à chaque push sur `main`.

1. Sur GitHub : **Settings → Pages → Source : GitHub Actions**.
2. Pousser sur `main` (ou lancer le workflow manuellement).
3. Ouvrir `https://<utilisateur>.github.io/Finances/`.
4. Installer :
   - **iPhone / iPad** : Safari → Partager → « Sur l'écran d'accueil ».
   - **Android** : Chrome → menu ⋮ → « Installer l'application ».
   - **Ordinateur** : Chrome ou Edge → icône d'installation dans la barre d'adresse.

Les données sont locales à chaque appareil. Pour les transférer : Réglages → Exporter (JSON) sur l'un, Importer sur l'autre.

## Synchronisation entre appareils (Supabase)

L'app reste utilisable hors ligne : les données vivent dans IndexedDB et une file de modifications est poussée vers Supabase dès que le réseau est là. Les autres appareils connectés au même compte reçoivent les changements en direct.

Mise en place, une seule fois :

1. Créer un projet gratuit sur [supabase.com](https://supabase.com).
2. **SQL Editor** → coller le contenu de `supabase/schema.sql` → Run.
3. **Authentication → Sign In / Providers → Email** : laisser activé. Pour éviter l'étape de confirmation par e-mail, désactiver « Confirm email ».
4. Récupérer dans **Project Settings → API** l'URL du projet et la clé publique `anon`, puis soit :
   - les renseigner dans l'app (Réglages → Synchronisation), appareil par appareil ;
   - soit les mettre dans `src/lib/syncConfig.ts` (ou dans les variables de dépôt GitHub `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`) pour qu'elles soient intégrées au build. La clé `anon` est publique par conception ; la sécurité repose sur les règles RLS du schéma.
5. Dans l'app : Réglages → Synchronisation → créer un compte, puis se connecter avec le même compte sur chaque appareil.

Règles de fusion : dernier qui écrit gagne, enregistrement par enregistrement ; les suppressions sont propagées. Un appareil neuf qui se connecte reçoit les données du cloud ; un appareil qui a déjà des données les envoie et fusionne.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS 4 · Recharts · Dexie (IndexedDB) · vite-plugin-pwa · Supabase (synchronisation optionnelle).

## Structure

```
src/
  db/          schéma Dexie, catégories par défaut, données d'exemple
  lib/         hooks de données, formats, couleurs, récurrents, sauvegarde, synchronisation
  db/repo.ts   couche d'écriture : toute modification alimente la file de synchro
supabase/      schéma SQL à exécuter dans le projet Supabase
  components/  coque (navigation), composants UI, graphiques, formulaires
  pages/       Tableau de bord, Transactions, Espaces, Courses, Garde-robe, Budgets, Abonnements, Réglages
```
