-- =====================================================================
-- DJAYA MURSHODOH GROUP — SISTEM FINANSIAL INTERNAL
-- Skema database Supabase
-- =====================================================================
-- Jalankan file ini di Supabase SQL Editor (Project > SQL Editor > New query)
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ENUM
-- ---------------------------------------------------------------------
create type transaction_jenis as enum ('pemasukan', 'pengeluaran');

-- =====================================================================
-- TRIGGER FUNCTION: updated_at otomatis
-- Harus dibuat SEBELUM tabel yang pakai trigger ini.
-- =====================================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =====================================================================
-- 1. PROFILES (extends auth.users) — data user internal yang login
-- =====================================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null default 'staff',
  created_at timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =====================================================================
-- 2. INVENTORY — Stok barang (jamur, baglog, bibit, dll)
-- =====================================================================
create sequence inv_seq start 1;

create table inventory (
  id uuid primary key default gen_random_uuid(),
  id_invoice text unique not null default ('INV' || lpad(nextval('inv_seq')::text, 3, '0')),
  nama text not null,
  stok numeric(18,2) not null default 0,
  satuan text not null default 'kg',
  harga_modal numeric(18,2) not null default 0,
  harga_jual numeric(18,2) not null default 0,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_inventory_updated_at before update on inventory
  for each row execute function set_updated_at();

-- =====================================================================
-- 3. DISCOUNTS — Master diskon
-- =====================================================================

create table discounts (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  persentase numeric(5,2) not null check (persentase > 0 and persentase <= 100),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_discounts_updated_at before update on discounts
  for each row execute function set_updated_at();

-- =====================================================================
-- 4. TRANSACTIONS — Pemasukan & Pengeluaran
-- =====================================================================
create sequence trx_seq start 1;

create table transactions (
  id uuid primary key default gen_random_uuid(),
  id_invoice text unique not null default ('TRX' || lpad(nextval('trx_seq')::text, 4, '0')),
  tanggal date not null default current_date,
  jenis transaction_jenis not null,
  kategori text not null,
  nama text not null,
  deskripsi text,
  nominal numeric(18,2) not null check (nominal > 0),
  status text not null default 'Selesai',
  bukti boolean not null default false,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  inventory_id uuid references inventory(id) on delete set null,
  quantity numeric(18,2),
  discount_id uuid references discounts(id) on delete set null,
  updated_at timestamptz not null default now()
);

create trigger trg_transactions_updated_at before update on transactions
  for each row execute function set_updated_at();

create index idx_transactions_tanggal on transactions(tanggal desc);
create index idx_transactions_jenis on transactions(jenis);
create index idx_transactions_kategori on transactions(kategori);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table profiles enable row level security;
alter table inventory enable row level security;
alter table discounts enable row level security;
alter table transactions enable row level security;

create policy "profiles: user lihat semua" on profiles
  for select using (auth.uid() is not null);
create policy "profiles: user update profil sendiri" on profiles
  for update using (auth.uid() = id);

create policy "inventory: read all authenticated" on inventory
  for select using (auth.uid() is not null);
create policy "inventory: insert authenticated" on inventory
  for insert with check (auth.uid() is not null);
create policy "inventory: update authenticated" on inventory
  for update using (auth.uid() is not null);
create policy "inventory: delete authenticated" on inventory
  for delete using (auth.uid() is not null);

create policy "discounts: read all authenticated" on discounts
  for select using (auth.uid() is not null);
create policy "discounts: insert authenticated" on discounts
  for insert with check (auth.uid() is not null);
create policy "discounts: update authenticated" on discounts
  for update using (auth.uid() is not null);
create policy "discounts: delete authenticated" on discounts
  for delete using (auth.uid() is not null);

create policy "transactions: read all authenticated" on transactions
  for select using (auth.uid() is not null);
create policy "transactions: insert authenticated" on transactions
  for insert with check (auth.uid() is not null);
create policy "transactions: update authenticated" on transactions
  for update using (auth.uid() is not null);
create policy "transactions: delete authenticated" on transactions
  for delete using (auth.uid() is not null);

-- =====================================================================
-- SELESAI. Setelah menjalankan file ini:
-- 1. Buat user pertama lewat Supabase Dashboard > Authentication > Add User
--    (profile-nya otomatis terbuat lewat trigger di atas)
-- 2. (Opsional) Masukkan beberapa baris data awal secara manual lewat
--    Table Editor, atau langsung mulai input dari aplikasi setelah login.
-- =====================================================================
