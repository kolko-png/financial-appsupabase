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
-- 1. PROFILES (extends auth.users) — data user internal yang login
-- =====================================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null default 'staff', -- 'admin' | 'staff' (bebas dipakai/tidak oleh UI)
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
-- 2. TRANSACTIONS — Pemasukan & Pengeluaran
-- =====================================================================
-- id dibuat berformat "TRX0001", "TRX0002", dst — sama seperti di kode
-- frontend saat ini (seedTransactions), supaya tampilan tidak berubah.
create sequence trx_seq start 1;

create table transactions (
  id text primary key default ('TRX' || lpad(nextval('trx_seq')::text, 4, '0')),
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
  updated_at timestamptz not null default now()
);

create index idx_transactions_tanggal on transactions(tanggal desc);
create index idx_transactions_jenis on transactions(jenis);
create index idx_transactions_kategori on transactions(kategori);

-- =====================================================================
-- 3. INVENTORY — Stok barang (jamur, baglog, bibit, dll)
-- =====================================================================
create sequence inv_seq start 1;

create table inventory (
  id text primary key default ('INV' || lpad(nextval('inv_seq')::text, 3, '0')),
  nama text not null,
  stok numeric(18,2) not null default 0,
  satuan text not null default 'kg',
  harga_modal numeric(18,2) not null default 0,
  harga_jual numeric(18,2) not null default 0,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- TRIGGER: updated_at otomatis
-- =====================================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_transactions_updated_at before update on transactions
  for each row execute function set_updated_at();
create trigger trg_inventory_updated_at before update on inventory
  for each row execute function set_updated_at();

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
-- Aplikasi ini bersifat internal untuk satu tim kecil (tanpa pembagian
-- role granular di UI saat ini), sehingga aturan RLS-nya sengaja dibuat
-- sederhana: siapa pun yang sudah login (punya akun di Supabase Auth
-- project ini) boleh membaca & mengelola semua data transaksi/inventory.
-- Jika nanti butuh role Owner/Admin/Staff seperti sistem lain, tabel
-- profiles.role sudah tersedia sebagai basis untuk RLS yang lebih ketat.

alter table profiles enable row level security;
alter table transactions enable row level security;
alter table inventory enable row level security;

create policy "profiles: user lihat semua" on profiles
  for select using (auth.uid() is not null);
create policy "profiles: user update profil sendiri" on profiles
  for update using (auth.uid() = id);

create policy "transactions: read all authenticated" on transactions
  for select using (auth.uid() is not null);
create policy "transactions: insert authenticated" on transactions
  for insert with check (auth.uid() is not null);
create policy "transactions: update authenticated" on transactions
  for update using (auth.uid() is not null);
create policy "transactions: delete authenticated" on transactions
  for delete using (auth.uid() is not null);

create policy "inventory: read all authenticated" on inventory
  for select using (auth.uid() is not null);
create policy "inventory: insert authenticated" on inventory
  for insert with check (auth.uid() is not null);
create policy "inventory: update authenticated" on inventory
  for update using (auth.uid() is not null);
create policy "inventory: delete authenticated" on inventory
  for delete using (auth.uid() is not null);

-- =====================================================================
-- SELESAI. Setelah menjalankan file ini:
-- 1. Buat user pertama lewat Supabase Dashboard > Authentication > Add User
--    (profile-nya otomatis terbuat lewat trigger di atas)
-- 2. (Opsional) Masukkan beberapa baris data awal secara manual lewat
--    Table Editor, atau langsung mulai input dari aplikasi setelah login.
-- =====================================================================
