# Panduan Menggunakan Domain Asli (omzetin.web.id) untuk Auth

Saat ini, link reset password Anda mungkin mengarah ke `omzetin-prayasas-projects.vercel.app` karena konfigurasi default di Supabase. Untuk menggunakan domain asli `omzetin.web.id`, ikuti langkah berikut:

## 1. Update Site URL di Supabase

1.  Buka **Supabase Dashboard** > **Authentication** > **URL Configuration**.
2.  Di kolom **Site URL**, ganti URL yang ada dengan:
    `https://omzetin.web.id`
3.  Klik **Save**.

## 2. Tambahkan Redirect URLs

Di halaman yang sama (**URL Configuration**), pastikan Anda menambahkan URL berikut ke daftar **Redirect URLs**:

*   `https://omzetin.web.id/**` (Wildcard untuk semua halaman)
*   `https://omzetin.web.id/update-password` (Spesifik untuk reset password)
*   `https://omzetin.web.id/dashboard` (Untuk login sukses)

## 3. Cara Kerja di Aplikasi

Kode aplikasi kita (`ForgotPasswordPage.tsx`) sudah menggunakan `window.location.origin`. Artinya:

*   Jika user membuka `https://omzetin.web.id/forgot-password`, maka link di email akan mengarah ke `https://omzetin.web.id/update-password`.
*   Jika user membuka `https://vercel-app-url/forgot-password`, maka link di email akan mengarah ke `https://vercel-app-url/update-password`.

Jadi, pastikan Anda dan user Anda selalu mengakses aplikasi melalui domain utama `https://omzetin.web.id`.

## Kenapa sebelumnya mengarah ke Vercel?

Supabase menggunakan **Site URL** sebagai fallback jika `redirectTo` URL yang dikirim oleh aplikasi dianggap tidak valid (tidak ada di whitelist). Dengan melakukan langkah 1 & 2 di atas, Supabase akan mengenali domain asli Anda sebagai domain yang sah.
