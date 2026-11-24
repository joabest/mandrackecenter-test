-- Per-module configuration and account-scoped draggable menu preferences.
create table if not exists public.mc_module_settings(
 module_id text primary key check(module_id ~ '^[a-z0-9_-]{2,50}$'),
 enabled boolean not null default true,
 off_message text not null default 'Esta função está temporariamente indisponível. Voltaremos em breve.',
 updated_at timestamptz not null default now()
);
create table if not exists public.mc_ui_preferences(
 account_id text primary key check(length(account_id) between 4 and 90),
 preferences jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
alter table public.mc_module_settings enable row level security;
alter table public.mc_ui_preferences enable row level security;
revoke all on public.mc_module_settings,public.mc_ui_preferences from public,anon,authenticated;
grant all on public.mc_module_settings,public.mc_ui_preferences to service_role;
insert into public.mc_module_settings(module_id,enabled) values
('dashboard',true),('credits',true),('users',true),('telegram',true),
('extractor',true),('formatcc',true),('formatlogin',true),('bin',true),('ip',true),
('geradorbr',true),('geradorgg',true),('zeroauth',true),('preauth',false),
('zeroauthv2',true),('amazon',true),('drogasil',true),('profile',true),('settings',true)
on conflict(module_id) do nothing;
