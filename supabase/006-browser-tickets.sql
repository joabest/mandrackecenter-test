-- Ephemeral one-use external browser login tickets: never put permanent keys in URLs.
create table if not exists public.mc_browser_tickets(id bigint generated always as identity primary key,telegram_id bigint not null references public.mc_users(telegram_id) on delete cascade,ticket_hash text not null unique check(length(ticket_hash)=64),expires_at timestamptz not null,used_at timestamptz,created_at timestamptz not null default now());
create index if not exists mc_browser_tickets_expiry_idx on public.mc_browser_tickets(expires_at);
alter table public.mc_browser_tickets enable row level security;
revoke all on public.mc_browser_tickets from anon,authenticated;
grant all on public.mc_browser_tickets to service_role;
create or replace function public.mc_redeem_browser_ticket(p_hash text)
returns table(telegram_id bigint) language plpgsql security definer set search_path=public as $$
declare v_id bigint;
begin
 update public.mc_browser_tickets t set used_at=now()
 where t.id=(select b.id from public.mc_browser_tickets b where b.ticket_hash=p_hash and b.expires_at>now() and b.used_at is null for update skip locked limit 1)
 returning t.telegram_id into v_id;
 if v_id is null then return;end if;
 return query select u.telegram_id from public.mc_users u where u.telegram_id=v_id and u.enabled=true;
end;$$;
revoke all on function public.mc_redeem_browser_ticket(text) from public,anon,authenticated;
grant execute on function public.mc_redeem_browser_ticket(text) to service_role;
