-- Executar após supabase/schema.sql. Keys permanentes, planos administrativos e promoção de lançamento.
alter table public.mc_users add column if not exists plan text not null default 'FREE';
alter table public.mc_users add column if not exists enabled boolean not null default true;
alter table public.mc_users add column if not exists first_activation_at timestamptz;
alter table public.mc_users add column if not exists promo_pro_until timestamptz;
alter table public.mc_users drop constraint if exists mc_users_plan_check;
alter table public.mc_users add constraint mc_users_plan_check check(plan in ('FREE','PRO','PREMIUM'));
alter table public.mc_login_keys alter column expires_at drop not null;
alter table public.mc_login_keys add column if not exists revoked_at timestamptz;
create index if not exists mc_login_keys_active on public.mc_login_keys(telegram_id) where revoked_at is null;

-- O prazo encerra na sexta-feira 20/11/2026 às 23:59:59.999 BRT (UTC-03:00).
-- O benefício dura 7 dias após a PRIMEIRA ativação, sem alterar o plano-base FREE.
create or replace function public.mc_activate_telegram(p_telegram_id bigint,p_username text,p_first_name text,p_key_hash text)
returns table (telegram_id bigint, plan text, promo_pro_until timestamptz)
language plpgsql security definer set search_path=public as $$
declare v_now timestamptz:=clock_timestamp();
begin
 if p_telegram_id<=0 or length(p_key_hash)<>64 then raise exception 'Invalid registration'; end if;
 insert into public.mc_users(telegram_id,username,first_name,first_activation_at,promo_pro_until)
 values(p_telegram_id,left(coalesce(p_username,''),80),left(coalesce(p_first_name,''),100),v_now,
 case when v_now < '2026-11-21 00:00:00-03'::timestamptz then v_now+interval '7 days' else null end)
 on conflict on constraint mc_users_pkey do update set username=excluded.username,first_name=excluded.first_name;
 perform 1 from public.mc_users u where u.telegram_id=p_telegram_id for update;
 update public.mc_login_keys k set revoked_at=v_now where k.telegram_id=p_telegram_id and k.revoked_at is null;
 insert into public.mc_login_keys(telegram_id,key_hash,expires_at,consumed_at,revoked_at)
 values(p_telegram_id,p_key_hash,null,null,null);
 return query select u.telegram_id,u.plan,u.promo_pro_until from public.mc_users u where u.telegram_id=p_telegram_id;
end; $$;

create or replace function public.mc_lookup_key(p_hash text)
returns table (telegram_id bigint,plan text,credits bigint)
language sql security definer set search_path=public as $$
 select u.telegram_id,
 case when u.plan='FREE' and u.promo_pro_until>now() then 'PRO'::text else u.plan end,
 u.credits
 from public.mc_login_keys k join public.mc_users u on u.telegram_id=k.telegram_id
 where k.key_hash=p_hash and k.revoked_at is null and u.enabled=true limit 1;
$$;

create or replace function public.mc_set_plan(p_telegram_id bigint,p_plan text)
returns text language plpgsql security definer set search_path=public as $$
begin
 if p_plan not in ('FREE','PRO','PREMIUM') then raise exception 'Invalid plan';end if;
 update public.mc_users set plan=p_plan,promo_pro_until=null where telegram_id=p_telegram_id;
 if not found then raise exception 'Unknown user';end if;
 return p_plan;
end;$$;

create or replace function public.mc_set_user_enabled(p_telegram_id bigint,p_enabled boolean)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 update public.mc_users set enabled=p_enabled where telegram_id=p_telegram_id;
 if not found then raise exception 'Unknown user';end if;
 return p_enabled;
end;$$;

create or replace function public.mc_revoke_user_key(p_telegram_id bigint)
returns integer language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 update public.mc_login_keys set revoked_at=now() where telegram_id=p_telegram_id and revoked_at is null;
 get diagnostics n=row_count;
 return n;
end;$$;

revoke all on function public.mc_activate_telegram(bigint,text,text,text),public.mc_lookup_key(text),public.mc_set_plan(bigint,text),public.mc_set_user_enabled(bigint,boolean),public.mc_revoke_user_key(bigint) from public,anon,authenticated;
grant execute on function public.mc_activate_telegram(bigint,text,text,text),public.mc_lookup_key(text),public.mc_set_plan(bigint,text),public.mc_set_user_enabled(bigint,boolean),public.mc_revoke_user_key(bigint) to service_role;
