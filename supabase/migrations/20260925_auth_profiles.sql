-- Supabase authentication support for Smart Procurement.
-- Run this migration in Supabase SQL Editor or with `supabase db push`.
-- Passwords are managed by Supabase Auth and must never be stored here.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  full_name text,
  role text not null default 'Employee' check (
    role in ('Employee', 'Manager', 'Finance Officer', 'Procurement Officer', 'Vendor', 'Admin')
  ),
  department_id text,
  vendor_id text,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.profiles is 'Application profile data linked to a Supabase Auth user.';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

 drop trigger if exists profiles_set_updated_at on public.profiles;
 create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name, role, department_id, vendor_id, avatar_url)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'username', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.email),
    'Employee',
    nullif(new.raw_user_meta_data ->> 'departmentId', ''),
    nullif(new.raw_user_meta_data ->> 'vendorId', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- The trigger creates profiles. Clients do not need direct insert access.
revoke insert on public.profiles from anon, authenticated;
revoke delete on public.profiles from anon, authenticated;
