# Panduan Integrasi Duitku Payment Gateway

Fitur upgrade plan dan pembayaran via Duitku telah diimplementasikan di kode. Ikuti langkah-langkah berikut untuk mengaktifkannya di live production.

## 1. Setup Database Supabase
Buka SQL Editor di Dashboard Supabase Anda dan jalankan script yang ada di file:
`src/lib/supabase-schema-subscription.sql`

Script ini akan membuat tabel:
- `subscription_plans` (Daftar paket)
- `subscription_transactions` (Riwayat transaksi)
- Dan menambahkan kolom subscription ke tabel `stores`.

## 2. Deploy Supabase Edge Function
Fitur ini membutuhkan backend untuk keamanan (signature generation). Kita menggunakan Supabase Edge Functions.

1.  Pastikan Anda sudah menginstall Supabase CLI.
2.  Login ke Supabase CLI: `supabase login`
3.  Buat function baru (jika belum): `supabase functions new duitku-payment`
4.  Copy kode dari `src/lib/edge-functions/duitku-payment.ts` ke `supabase/functions/duitku-payment/index.ts`.
5.  Set Environment Variables (Ganti dengan kredensial Duitku Anda):
    ```bash
    supabase secrets set DUITKU_MERCHANT_CODE=DSxxxxx DUITKU_API_KEY=xxxxxxxxxxxxxxxx
    ```
6.  Deploy function:
    ```bash
    supabase functions deploy duitku-payment --no-verify-jwt
    ```
    *Note: `--no-verify-jwt` diperlukan agar callback dari Duitku (yang tidak punya JWT Supabase) bisa masuk.*

## 3. Konfigurasi Dashboard Duitku
Masuk ke Dashboard Merchant Duitku (Sandbox/Production):
1.  Masuk ke menu **Settings** > **Project**.
2.  Set **Callback URL** ke:
    `https://[PROJECT_REF].supabase.co/functions/v1/duitku-payment/callback`
    *(Ganti `[PROJECT_REF]` dengan ID project Supabase Anda)*
3.  Set **Return URL** (opsional, sudah di-handle di request code) ke:
    `https://[DOMAIN_ANDA]/dashboard?tab=billing&status=success`

## 4. Konfigurasi Melalui CMS Admin
1.  Login ke **CMS Admin** menggunakan akun admin.
2.  Klik menu **"Duitku Settings"** di sidebar.
3.  Masukkan **Merchant Code** dan **API Key** dari dashboard Duitku Anda.
4.  Pilih **Mode Sandbox** saat testing atau **Production** saat siap live.
5.  Aktifkan **Duitku Payment Gateway**.
6.  Klik **"Simpan Pengaturan"**.
7.  Gunakan tombol **"Test Koneksi"** untuk memverifikasi konfigurasi.

## 5. Testing
1.  Login sebagai User Toko.
2.  Klik menu **"Langganan" > "Upgrade Plan"** di sidebar.
3.  Pilih paket dan lakukan pembayaran (gunakan simulator di mode Sandbox).
4.  Cek status di **CMS Admin > Transactions**.

## Catatan
- Kode saat ini menggunakan URL Sandbox Duitku (`https://sandbox.duitku.com/...`). Ubah ke URL Production di `duitku-payment/index.ts` saat siap live.
- Pastikan RLS policies sudah sesuai dengan kebutuhan keamanan Anda.
- Pengaturan Duitku dapat dikelola melalui **CMS Admin > Duitku Settings** oleh administrator platform.
