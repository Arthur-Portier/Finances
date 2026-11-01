-- Schéma de synchronisation pour l'application Finances.
-- À coller dans Supabase → SQL Editor → Run.
-- Une seule table : chaque ligne est un enregistrement local (catégorie,
-- transaction, article de courses…) sérialisé en JSON et rattaché à son utilisateur.

create table if not exists public.records (
  user_id    uuid    not null default auth.uid() references auth.users (id) on delete cascade,
  collection text    not null,
  id         text    not null,
  data       jsonb,
  deleted    boolean not null default false,
  updated_at bigint  not null,          -- horodatage client (ms), dernier qui écrit gagne
  synced_at  timestamptz not null default now(),  -- horodatage serveur, curseur de synchro
  primary key (user_id, collection, id)
);

create index if not exists records_user_synced_idx on public.records (user_id, synced_at);

-- Le serveur met à jour synced_at à chaque écriture.
create or replace function public.records_touch()
returns trigger language plpgsql as $$
begin
  new.synced_at := now();
  return new;
end $$;

drop trigger if exists records_touch on public.records;
create trigger records_touch before insert or update on public.records
for each row execute function public.records_touch();

-- Chaque utilisateur ne voit et ne modifie que ses propres lignes.
alter table public.records enable row level security;

drop policy if exists "records: propriétaire" on public.records;
create policy "records: propriétaire" on public.records
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Mises à jour en direct entre appareils.
alter publication supabase_realtime add table public.records;
