-- Drop policies if they exist to avoid errors on rerun
drop policy if exists "Allow public insert to snack_requests" on public.snack_requests;
drop policy if exists "Allow store owners to view requests" on public.snack_requests;

-- Ensure table exists (matches 001_initial_schema.sql structure)
create table if not exists public.snack_requests (
  id uuid default gen_random_uuid() primary key,
  store_id uuid references public.stores(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete set null,
  requester_name text not null,
  snack_name text not null, -- Using snack_name to match initial schema
  quantity integer default 1,
  notes text,
  request_type text default 'stock_request',
  status text default 'pending',
  is_read boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.snack_requests enable row level security;

-- Allow public insert (for anonymous users)
create policy "Allow public insert to snack_requests"
on public.snack_requests
for insert
to public
with check (true);

-- Allow store owners to view their requests
create policy "Allow store owners to view requests"
on public.snack_requests
for select
to authenticated
using (
  store_id in (
    select store_id from public.store_members where user_id = auth.uid()
  )
);
