-- Operational admin data: maintenance, notices, support messages and aggregate activity.
-- Applied on project cnosihbkqwaqmdqayvbd, 2026-11-18.
create table if not exists public.mc_settings(key text primary key,value jsonb not null default '{}'::jsonb,updated_at timestamptz not null default now());
insert into public.mc_settings(key,value) values('maintenance','{"enabled":false,"message":"Estamos realizando uma manutenção programada. Voltaremos em breve."}') on conflict(key) do nothing;
alter table public.mc_users add column if not exists announcements_enabled boolean not null default true;
alter table public.mc_users add column if not exists last_bot_seen_at timestamptz;
create table if not exists public.mc_inbox(
 id bigint generated always as identity primary key,
 telegram_id bigint not null references public.mc_users(telegram_id) on delete cascade,
 message_text text not null check(length(message_text) between 1 and 2000),
 created_at timestamptz not null default now(),
 answered_at timestamptz
);
create index if not exists mc_inbox_recent on public.mc_inbox(created_at desc);
create table if not exists public.mc_announcements(
 id bigint generated always as identity primary key,
 message_text text not null check(length(message_text) between 1 and 1500),
 created_at timestamptz not null default now()
);
create table if not exists public.mc_announcement_deliveries(
 announcement_id bigint not null references public.mc_announcements(id) on delete cascade,
 telegram_id bigint not null references public.mc_users(telegram_id) on delete cascade,
 state text not null default 'pending' check(state in ('pending','sent','failed')),
 error_code text,sent_at timestamptz,
 primary key(announcement_id,telegram_id)
);
create index if not exists mc_announcement_pending on public.mc_announcement_deliveries(announcement_id,state);
create table if not exists public.mc_usage_events(
 id bigint generated always as identity primary key,
 telegram_id bigint references public.mc_users(telegram_id) on delete set null,
 event_type text not null check(event_type in ('member_login','dashboard_view','bot_start','bot_action')),
 created_at timestamptz not null default now()
);
create index if not exists mc_usage_recent on public.mc_usage_events(created_at desc);
alter table public.mc_settings enable row level security;
alter table public.mc_inbox enable row level security;
alter table public.mc_announcements enable row level security;
alter table public.mc_announcement_deliveries enable row level security;
alter table public.mc_usage_events enable row level security;
revoke all on table public.mc_settings,public.mc_inbox,public.mc_announcements,public.mc_announcement_deliveries,public.mc_usage_events from anon,authenticated;
grant all on table public.mc_settings,public.mc_inbox,public.mc_announcements,public.mc_announcement_deliveries,public.mc_usage_events to service_role;
create or replace function public.mc_create_announcement(p_text text)
returns bigint language plpgsql security definer set search_path=public as $$
declare v_id bigint;
begin
 if length(trim(coalesce(p_text,'')))<3 or length(p_text)>1500 then raise exception 'Invalid announcement'; end if;
 insert into public.mc_announcements(message_text) values(trim(p_text)) returning id into v_id;
 insert into public.mc_announcement_deliveries(announcement_id,telegram_id)
 select v_id,u.telegram_id from public.mc_users u where u.enabled and u.announcements_enabled and u.last_bot_seen_at is not null;
 return v_id;
end; $$;
revoke all on function public.mc_create_announcement(text) from public,anon,authenticated;
grant execute on function public.mc_create_announcement(text) to service_role;
