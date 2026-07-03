# Djaya Murshodoh Group — Sistem Finansial Internal

Aplikasi finansial internal (pemasukan/pengeluaran, inventory, laporan keuangan) untuk Djaya Murshodoh Group. Sekarang sudah terhubung ke **Supabase** (Auth + Postgres) — sebelumnya semua data hanya tersimpan di `localStorage` browser dan login tidak benar-benar diverifikasi.

## Apa yang berubah dari versi awal

Project asli yang diupload adalah aplikasi front-end murni:
- Login hanya mengecek email/password tidak kosong (siapa pun bisa masuk)
- Data transaksi & inventory di-generate acak (`seedTransactions`, `seedInventory`) lalu disimpan di `localStorage` lewat shim `window.storage`
- Tidak ada backend sama sekali — refresh di device lain = data berbeda

Setelah integrasi:
- ✅ **Login sungguhan** via Supabase Auth (`signInWithPassword`) — salah password akan ditolak
- ✅ **Sesi tersimpan** — refresh halaman tidak perlu login ulang
- ✅ **Data transaksi & inventory tersimpan di Postgres** (Supabase), bukan lagi di browser — semua staff yang login melihat data yang sama, real-time antar device
- ✅ Semua operasi Tambah/Edit/Hapus di halaman Transaksi & Inventory terhubung ke database, dengan rollback otomatis jika request gagal (optimistic update)
- ✅ Format ID tetap sama seperti sebelumnya (`TRX0001`, `INV001`, dst) — dibuat otomatis oleh database, bukan lagi `Date.now()`

**Tidak ada perubahan tampilan/UX.** Semua komponen UI (Dashboard, TransaksiForm, InventoryPage, LaporanPage, dll) tetap persis sama — hanya sumber datanya yang diganti.

## File baru yang ditambahkan

```
supabase/
└── schema.sql              # Skema database: tabel, RLS, trigger

src/
├── lib/
│   └── supabaseClient.js   # Supabase client singleton
└── services/
    ├── auth.js              # signIn, signOut, getSession, getProfile
    ├── transactions.js      # CRUD transaksi
    └── inventory.js         # CRUD inventory (mapping snake_case <-> camelCase)
```

File yang diubah: `src/App.jsx` (logic data & auth), `src/main.jsx` (hapus import storage-shim), `vite.config.js` (tambah alias `@`), `package.json` (tambah `@supabase/supabase-js`). File `src/storage-shim.js` sudah **dihapus** karena tidak dipakai lagi.

## Setup — langkah demi langkah

### 1. Install dependencies

```bash
npm install
```

### 2. Buat project Supabase

1. Buka [supabase.com](https://supabase.com) → **New Project**
2. Catat **Database Password** yang Anda buat
3. Tunggu provisioning selesai (~2 menit)

### 3. Jalankan skema database

1. Di dashboard Supabase, buka **SQL Editor** → **New query**
2. Copy-paste seluruh isi file `supabase/schema.sql`, klik **Run**
3. Cek di **Table Editor** — harus muncul tabel `profiles`, `transactions`, `inventory`

### 4. Buat user pertama

1. Buka **Authentication** → **Users** → **Add user** → **Create new user**
2. Isi email & password — ini yang dipakai login di aplikasi
3. Profile otomatis terbuat lewat trigger (cek tabel `profiles` di Table Editor)

Untuk menambah staff lain, ulangi langkah ini per orang (Supabase belum menyediakan self sign-up di aplikasi ini secara default — pendaftaran dilakukan admin lewat dashboard).

### 5. Konfigurasi environment variable

```bash
cp .env.example .env
```

Isi `.env` dengan kredensial dari **Project Settings > API**:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### 6. Jalankan aplikasi

```bash
npm run dev
```

Buka `http://localhost:5173`, login dengan akun yang dibuat di langkah 4.

## Struktur data di Supabase

**`transactions`** — satu baris per transaksi pemasukan/pengeluaran
| kolom | tipe | keterangan |
|---|---|---|
| `id` | text | auto: `TRX0001`, `TRX0002`, ... |
| `tanggal` | date | |
| `jenis` | enum | `pemasukan` / `pengeluaran` |
| `kategori`, `nama`, `deskripsi` | text | |
| `nominal` | numeric | harus > 0 |
| `status` | text | default `"Selesai"` |
| `bukti` | boolean | flag "ada bukti transaksi" (belum berupa file upload — lihat catatan di bawah) |

**`inventory`** — satu baris per produk/stok
| kolom | tipe |
|---|---|
| `id` | text, auto: `INV001`, `INV002`, ... |
| `nama`, `satuan` | text |
| `stok`, `harga_modal`, `harga_jual` | numeric |

**`profiles`** — data user yang login (dibuat otomatis saat user baru daftar lewat trigger `on_auth_user_created`)

## Soal keamanan (RLS)

Aturan Row Level Security saat ini sengaja dibuat **sederhana**: siapa pun yang sudah login (punya akun di project Supabase ini) boleh membaca & mengubah semua data transaksi/inventory. Ini sesuai dengan desain aplikasi aslinya yang memang belum punya pembagian role di UI (halaman Settings hanya bilang "Administrator Keuangan").

Kolom `profiles.role` sudah disediakan sebagai fondasi jika ke depannya Anda ingin role granular (misal: staff hanya bisa lihat, admin bisa hapus) — tinggal perketat policy di `transactions`/`inventory` berdasarkan `role` tersebut.

## Keterbatasan & saran pengembangan lanjutan

- **`bukti` masih berupa flag boolean**, bukan upload file sungguhan. Jika ingin upload bukti transfer/nota asli: buat Supabase Storage bucket (`attachments`), tambah kolom `bukti_url text`, dan tambahkan file input di `TransaksiForm` yang meng-upload ke bucket lalu simpan public URL-nya. Saya bisa bantu implementasikan ini jika dibutuhkan.
- **Tidak ada pendaftaran user mandiri** — admin harus membuat akun staff lewat Supabase Dashboard. Bisa ditambah halaman "Undang User" jika perlu (butuh Edge Function karena membuat user baru butuh service role key yang tidak aman dipakai di frontend).
- **Laporan (Laba Rugi, Neraca, Buku Besar, Arus Kas)** masih dihitung di sisi client dari data yang sudah di-fetch — cukup untuk skala data saat ini, tapi jika transaksi sudah sangat banyak (>10rb baris), sebaiknya pindahkan agregasi ke SQL view/RPC di Supabase.
- **Export** (tombol Download di halaman Transaksi/Laporan) tetap jalan seperti semula karena hanya memproses data yang sudah ada di state React — tidak perlu diubah.

## Troubleshooting

- **Layar putih / error di console soal `VITE_SUPABASE_URL`**: pastikan `.env` sudah diisi dan restart `npm run dev` (env var hanya dibaca saat start).
- **Login gagal terus padahal email/password benar**: cek di Supabase Dashboard > Authentication > Users, pastikan user statusnya bukan "Waiting for verification" (kalau email confirmation aktif, matikan di Authentication > Providers > Email > "Confirm email" untuk kemudahan internal, atau konfirmasi manual).
- **Data tidak muncul setelah login**: buka DevTools > Network, cek response dari Supabase — kemungkinan besar RLS policy belum ter-apply (pastikan `schema.sql` dijalankan sampai selesai tanpa error).
