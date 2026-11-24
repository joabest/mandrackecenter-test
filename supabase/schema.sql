-- Execute no SQL Editor do seu próprio projeto Supabase.
-- Tabelas privadas, somente acessíveis pelo service_role do servidor.
create extension if not exists pgcrypto;

create table if not exists public.mc_users (
 telegram_id bigint primary key check (telegram_id > 0),
 username text not null default '',
 first_name text not null default '',
 credits bigint not null default 0 check (credits >= 0),
 created_at timestamptz not null default now()
);
create table if not exists public.mc_login_keys (
 id uuid primary key default gen_random_uuid(),
 telegram_id bigint not null references public.mc_users(telegram_id) on delete cascade,
 key_hash text not null unique check (length(key_hash) = 64),
 expires_at timestamptz not null,
 consumed_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists mc_login_keys_tg_idx on public.mc_login_keys(telegram_id,created_at desc);
create table if not exists public.mc_recharges (
 id uuid primary key default gen_random_uuid(),
 telegram_id bigint not null references public.mc_users(telegram_id) on delete cascade,
 credits_requested integer not null check (credits_requested between 1 and 100000),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz
);
create index if not exists mc_recharges_tg_idx on public.mc_recharges(telegram_id,created_at desc);

alter table public.mc_users enable row level security;
alter table public.mc_login_keys enable row level security;
alter table public.mc_recharges enable row level security;
revoke all on table public.mc_users,public.mc_login_keys,public.mc_recharges from anon,authenticated;
grant all on table public.mc_users,public.mc_login_keys,public.mc_recharges to service_role;

create or replace function public.mc_redeem_key(p_hash text)
returns table (telegram_id bigint, credits bigint)
language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  update public.mc_login_keys k set consumed_at=now()
  where k.id=(
    select id from public.mc_login_keys
    where key_hash=p_hash and consumed_at is null and expires_at>now()
    for update skip locked limit 1
  )
  returning k.telegram_id into v_id;
  if v_id is null then return; end if;
  return query select u.telegram_id,u.credits from public.mc_users u where u.telegram_id=v_id;
end;
$$;

create or replace function public.mc_adjust_credits(p_telegram_id bigint,p_delta bigint)
returns bigint language plpgsql security definer set search_path=public as $$
declare current_balance bigint;
begin
 update public.mc_users set credits=credits+p_delta where telegram_id=p_telegram_id and credits+p_delta>=0 returning credits into current_balance;
 if current_balance is null then raise exception 'Unknown user or insufficient balance'; end if;
 return current_balance;
end;
$$;

create or replace function public.mc_review_recharge(p_recharge_id uuid,p_approve boolean)
returns text language plpgsql security definer set search_path=public as $$
declare request_row public.mc_recharges%rowtype;
begin
 select * into request_row from public.mc_recharges where id=p_recharge_id and status='pending' for update;
 if not found then raise exception 'Recharge does not exist or already reviewed'; end if;
 update public.mc_recharges set status=case when p_approve then 'approved' else 'rejected' end,reviewed_at=now() where id=p_recharge_id;
 if p_approve then perform public.mc_adjust_credits(request_row.telegram_id,request_row.credits_requested); end if;
 return case when p_approve then 'approved' else 'rejected' end;
end;
$$;
revoke all on function public.mc_redeem_key(text),public.mc_adjust_credits(bigint,bigint),public.mc_review_recharge(uuid,boolean) from public,anon,authenticated;
grant execute on function public.mc_redeem_key(text),public.mc_adjust_credits(bigint,bigint),public.mc_review_recharge(uuid,boolean) to service_role;
