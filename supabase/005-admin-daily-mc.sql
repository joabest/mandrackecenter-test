-- Daily administrator allowance for Telegram ID 5451047991.
-- MC is an internal usage unit, not money or blockchain currency.
alter table public.mc_users
 add column if not exists mc_tokens bigint not null default 0 check(mc_tokens >= 0),
 add column if not exists admin_allowance_day date;
create or replace function public.mc_refresh_admin_allowance(p_telegram_id bigint)
returns table (telegram_id bigint, credits bigint, mc_tokens bigint, next_refresh_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare v_today date := (clock_timestamp() at time zone 'America/Sao_Paulo')::date;
begin
 if p_telegram_id = 5451047991 then
   update public.mc_users u set credits=1000,mc_tokens=1500,admin_allowance_day=v_today
   where u.telegram_id=p_telegram_id and u.admin_allowance_day is distinct from v_today;
 end if;
 return query select u.telegram_id,u.credits,u.mc_tokens,
  ((v_today+1)::timestamp at time zone 'America/Sao_Paulo')
 from public.mc_users u where u.telegram_id=p_telegram_id;
end; $$;
create or replace function public.mc_spend_admin_tokens(p_telegram_id bigint,p_amount bigint)
returns bigint language plpgsql security definer set search_path=public as $$
declare v_balance bigint;
begin
 if p_telegram_id<>5451047991 or p_amount<1 or p_amount>1500 then raise exception 'Not allowed';end if;
 perform public.mc_refresh_admin_allowance(p_telegram_id);
 update public.mc_users u set mc_tokens=mc_tokens-p_amount
 where u.telegram_id=p_telegram_id and u.mc_tokens>=p_amount returning u.mc_tokens into v_balance;
 if v_balance is null then raise exception 'Insufficient MC';end if;
 return v_balance;
end; $$;
revoke all on function public.mc_refresh_admin_allowance(bigint),public.mc_spend_admin_tokens(bigint,bigint) from public,anon,authenticated;
grant execute on function public.mc_refresh_admin_allowance(bigint),public.mc_spend_admin_tokens(bigint,bigint) to service_role;
