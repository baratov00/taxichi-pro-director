create table if not exists public.taxichi_pro_dispatchers (
  id text primary key,
  name text not null,
  email text,
  phone text,
  login text not null unique,
  password text not null,
  active boolean not null default true,
  hidden_from_directors boolean not null default false,
  payment_mode text not null default 'subscription',
  payment_provider text not null default 'none',
  payment_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.taxichi_pro_dispatchers
  add column if not exists email text,
  add column if not exists hidden_from_directors boolean not null default false,
  add column if not exists payment_mode text not null default 'subscription',
  add column if not exists payment_provider text not null default 'none',
  add column if not exists payment_settings jsonb not null default '{}'::jsonb;

create table if not exists public.taxichi_pro_directors (
  id text primary key,
  name text not null,
  email text not null unique,
  password text not null,
  active boolean not null default true,
  can_manage_directors boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.taxichi_pro_dispatchers disable row level security;
alter table public.taxichi_pro_directors disable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.taxichi_pro_dispatchers to anon, authenticated;
grant select, insert, update, delete on public.taxichi_pro_directors to anon, authenticated;

insert into public.taxichi_pro_dispatchers (id, name, phone, login, password, active)
values ('demo', 'Иванова Мария', '+7 999 999-77-42', 'admin', '1234', true)
on conflict (id) do update set
  name = excluded.name,
  phone = excluded.phone,
  login = excluded.login,
  password = excluded.password,
  active = excluded.active,
  updated_at = now();

insert into public.taxichi_pro_directors (id, name, email, password, active, can_manage_directors)
values ('main', 'Асадбек Баратов', 'baratov329@mail.ru', 'razoqiy123', true, true)
on conflict (id) do update set
  name = excluded.name,
  email = excluded.email,
  active = true,
  can_manage_directors = true,
  updated_at = now();
