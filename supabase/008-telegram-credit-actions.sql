-- One-time administrator credit confirmations.
create table if not exists public.mc_bot_credit_actions(
 id uuid primary key default gen_random_uuid(),
 telegram_id bigint not null references public.mc_users(telegram_id) on delete cascade,
 delta bigint not null check(delta between -5000 and 5000 and delta<>0),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '5 minutes'),
 applied_at timestamptz
);
create index if not exists mc_bot_credit_actions_expiry on public.mc_bot_credit_actions(expires_at);
alter table public.mc_bot_credit_actions enable row level security;
revoke all on table public.mc_bot_credit_actions from public,anon,authenticated;
grant all on table public.mc_bot_credit_actions to service_role;
create or replace function public.mc_apply_bot_credit_action(p_action_id uuid)
returns table(telegram_id bigint,new_balance bigint,amount bigint)
language plpgsql security definer set search_path=public as $$
declare v public.mc_bot_credit_actions%rowtype; balance bigint;
begin
 select * into v from public.mc_bot_credit_actions a where a.id=p_action_id and a.applied_at is null and a.expires_at>now() for update;
 if not found then raise exception 'Action expired or already applied'; end if;
 balance:=public.mc_adjust_credits(v.telegram_id,v.delta);
 update public.mc_bot_credit_actions a set applied_at=now() where a.id=v.id;
 return query select v.telegram_id,balance,v.delta;
end;$$;
revoke all on function public.mc_apply_bot_credit_action(uuid) from public,anon,authenticated;
grant execute on function public.mc_apply_bot_credit_action(uuid) to service_role;
