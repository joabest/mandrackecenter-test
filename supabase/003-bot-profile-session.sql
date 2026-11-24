-- Applied to Supabase on 2026-11-18. Profile image Telegram file id and session invalidation.
alter table public.mc_users add column if not exists photo_file_id text;
alter table public.mc_users add column if not exists session_version bigint not null default 0;
create or replace function public.mc_disconnect_sessions(p_telegram_id bigint)
returns bigint language plpgsql security definer set search_path=public as $$
declare v bigint;
begin
 update public.mc_users u set session_version=u.session_version+1 where u.telegram_id=p_telegram_id returning u.session_version into v;
 if v is null then raise exception 'Unknown user'; end if;
 return v;
end; $$;
revoke all on function public.mc_disconnect_sessions(bigint) from public,anon,authenticated;
grant execute on function public.mc_disconnect_sessions(bigint) to service_role;
