-- PACO: tabela única de registros (treinos, atividades, programa, configurações).
-- Cole tudo no SQL Editor do Supabase e clique em Run.

create table if not exists public.records (
  id         text        not null,
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  kind       text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),  -- hora da edição no aparelho (resolve conflitos)
  server_ts  timestamptz not null default clock_timestamp(),  -- hora em que o servidor recebeu (usada para baixar novidades)
  primary key (user_id, id)
);

create index if not exists records_user_server_ts on public.records (user_id, server_ts);
create index if not exists records_user_kind on public.records (user_id, kind);

create or replace function public.paco_set_server_ts()
returns trigger
language plpgsql
as $$
begin
  new.server_ts := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists paco_records_server_ts on public.records;
create trigger paco_records_server_ts
before insert or update on public.records
for each row execute function public.paco_set_server_ts();

-- Segurança: cada pessoa só enxerga e altera os próprios registros.
alter table public.records enable row level security;

drop policy if exists "dono acessa os proprios registros" on public.records;
create policy "dono acessa os proprios registros"
on public.records
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
