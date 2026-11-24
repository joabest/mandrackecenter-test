-- Executar após 009-key-revocation.sql. Tabela de sessões Adyen para o módulo Check Adyen.
create table if not exists public.mc_adyen_sessions (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null references public.mc_users(telegram_id) on delete cascade,
  mode text not null check(mode in ('TEST','LIVE')),
  active boolean not null default true,
  reference text not null default '',
  merchant_account text not null default 'mandracke_test',
  test_card_data jsonb not null default '{"pan":"","expiry":"","cvv":"","brand":""}'::jsonb,
  result text default null check(result in ('APPROVED','DECLINED','ERROR','PENDING')),
  psp_reference text default null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz
);
create index if not exists mc_adyen_sessions_tg_idx on public.mc_adyen_sessions(telegram_id,created_at desc);
create index if not exists mc_adyen_sessions_active_idx on public.mc_adyen_sessions(telegram_id) where active=true;

alter table public.mc_adyen_sessions enable row level security;
grant all on table public.mc_adyen_sessions to service_role;
revoke all on table public.mc_adyen_sessions from anon,authenticated;