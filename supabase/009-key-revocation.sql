-- Revogação definitiva de keys, trilha de auditoria e bloqueio de novas emissões.
alter table public.mc_users add column if not exists key_generation_blocked boolean not null default false;
create table if not exists public.mc_key_audit(
 id bigint generated always as identity primary key,
 key_id uuid not null,
 telegram_id bigint not null,
 actor_id text not null,
 action text not null check (action in ('revoked','issued')),
 reason text,
 created_at timestamptz not null default now()
);
create index if not exists mc_key_audit_user_idx on public.mc_key_audit(telegram_id,created_at desc);
alter table public.mc_key_audit enable row level security;
revoke all on table public.mc_key_audit from public,anon,authenticated;
grant all on table public.mc_key_audit to service_role;

-- Atomically revokes a bounded list of keys, rejects foreign-user IDs for members,
-- and invalidates all existing sessions of affected accounts.
create or replace function public.mc_revoke_keys(p_ids uuid[],p_owner bigint,p_actor text,p_reason text default null)
returns table(telegram_id bigint, key_id uuid)
language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
 if p_ids is null or cardinality(p_ids)<1 or cardinality(p_ids)>100 then raise exception 'Invalid selection'; end if;
 if p_owner is not null and p_owner<=0 then raise exception 'Invalid owner'; end if;
 if length(coalesce(p_actor,''))<1 then raise exception 'Invalid actor'; end if;
 -- Lock affected users to serialize with mc_activate_telegram.
 perform 1 from public.mc_users u where u.telegram_id in
 (select distinct k.telegram_id from public.mc_login_keys k where k.id=any(p_ids) and (p_owner is null or k.telegram_id=p_owner))
 order by u.telegram_id for update;
 return query with revoked as (
  update public.mc_login_keys k set revoked_at=clock_timestamp()
  where k.id=any(p_ids) and k.revoked_at is null and (p_owner is null or k.telegram_id=p_owner)
  returning k.telegram_id,k.id
 ), audit as (
  insert into public.mc_key_audit(key_id,telegram_id,actor_id,action,reason)
  select r.id,r.telegram_id,left(p_actor,120),'revoked',left(coalesce(p_reason,''),250) from revoked r
  returning 1
 ), sessions as (
  update public.mc_users u set session_version=u.session_version+1
  where u.telegram_id in (select distinct r.telegram_id from revoked r)
  returning u.telegram_id
 )
 select r.telegram_id,r.id from revoked r;
end;$$;

create or replace function public.mc_revoke_all_keys(p_owner bigint,p_actor text,p_reason text default null)
returns integer language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 if length(coalesce(p_actor,''))<1 then raise exception 'Invalid actor'; end if;
 perform 1 from public.mc_users u where p_owner is null or u.telegram_id=p_owner order by u.telegram_id for update;
 with revoked as (
  update public.mc_login_keys k set revoked_at=clock_timestamp()
  where k.revoked_at is null and (p_owner is null or k.telegram_id=p_owner)
  returning k.id,k.telegram_id
 ), audit as (
  insert into public.mc_key_audit(key_id,telegram_id,actor_id,action,reason)
  select r.id,r.telegram_id,left(p_actor,120),'revoked',left(coalesce(p_reason,''),250) from revoked r returning 1
 ), sessions as (
  update public.mc_users u set session_version=u.session_version+1
  where u.telegram_id in (select distinct r.telegram_id from revoked r) returning u.telegram_id
 )
 select count(*) into n from revoked;
 return n;
end;$$;

-- Existing bot behavior is preserved: issuing a new key replaces all older keys.
-- Banned or key-blocked users must never be reactivated by /key.
create or replace function public.mc_activate_telegram(p_telegram_id bigint,p_username text,p_first_name text,p_key_hash text)
returns table (telegram_id bigint, plan text, promo_pro_until timestamptz)
language plpgsql security definer set search_path=public as $$
declare v_now timestamptz:=clock_timestamp(); v_key_id uuid;
begin
 if p_telegram_id<=0 or p_key_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid registration'; end if;
 insert into public.mc_users(telegram_id,username,first_name,first_activation_at,promo_pro_until)
 values(p_telegram_id,left(coalesce(p_username,''),80),left(coalesce(p_first_name,''),100),v_now,
 case when v_now<'2026-11-21 00:00:00-03'::timestamptz then v_now+interval '7 days' else null end)
 on conflict on constraint mc_users_pkey do update set username=excluded.username,first_name=excluded.first_name;
 perform 1 from public.mc_users u where u.telegram_id=p_telegram_id and u.enabled=true and u.key_generation_blocked=false for update;
 if not found then raise exception 'KEY_GENERATION_BLOCKED'; end if;
 update public.mc_login_keys k set revoked_at=v_now where k.telegram_id=p_telegram_id and k.revoked_at is null;
 update public.mc_users u set session_version=session_version+1 where u.telegram_id=p_telegram_id;
 insert into public.mc_login_keys(telegram_id,key_hash,expires_at,consumed_at,revoked_at)
 values(p_telegram_id,p_key_hash,null,null,null) returning id into v_key_id;
 insert into public.mc_key_audit(key_id,telegram_id,actor_id,action) values(v_key_id,p_telegram_id,'telegram:'||p_telegram_id,'issued');
 return query select u.telegram_id,u.plan,u.promo_pro_until from public.mc_users u where u.telegram_id=p_telegram_id;
end;$$;

-- Browser tickets and Telegram Mini App must also require an active key.
create or replace function public.mc_redeem_browser_ticket(p_hash text)
returns table(telegram_id bigint) language plpgsql security definer set search_path=public as $$
declare v_id bigint;
begin
 update public.mc_browser_tickets t set used_at=now()
 where t.id=(select b.id from public.mc_browser_tickets b where b.ticket_hash=p_hash and b.expires_at>now() and b.used_at is null for update skip locked limit 1)
 returning t.telegram_id into v_id;
 if v_id is null then return;end if;
 return query select u.telegram_id from public.mc_users u where u.telegram_id=v_id and u.enabled=true
 and exists(select 1 from public.mc_login_keys k where k.telegram_id=u.telegram_id and k.revoked_at is null);
end;$$;
revoke all on function public.mc_revoke_keys(uuid[],bigint,text,text),public.mc_revoke_all_keys(bigint,text,text) from public,anon,authenticated;
grant execute on function public.mc_revoke_keys(uuid[],bigint,text,text),public.mc_revoke_all_keys(bigint,text,text) to service_role;
