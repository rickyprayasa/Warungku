# Panduan Mengatasi Email Masuk Spam (ZeptoMail Edition)

Anda saat ini menggunakan **ZeptoMail** sebagai SMTP provider. Jika email masih masuk spam atau ditandai merah ("This message might be dangerous"), itu berarti **Verifikasi Domain** belum sempurna.

## Langkah 1: Verifikasi Domain di ZeptoMail (WAJIB)

1.  Login ke [ZeptoMail Console](https://zeptomail.zoho.com/).
2.  Masuk ke menu **Domains** di sidebar kiri.
3.  Klik domain Anda: `rsquareidea.my.id`.
4.  Periksa bagian **DNS Records**. Anda akan melihat 3 jenis record yang harus ada di DNS Manager domain Anda (Niagahoster/Cloudflare/dll):

    *   **SPF (Sender Policy Framework)**
        *   Type: `TXT`
        *   Host: `@` (atau kosong)
        *   Value: `v=spf1 include:zepto.zoho.com ~all`
        *   *Catatan: Jika sudah ada SPF lain (misal Google), gabungkan: `v=spf1 include:_spf.google.com include:zepto.zoho.com ~all`*

    *   **DKIM (DomainKeys Identified Mail)**
        *   Type: `TXT`
        *   Host: `[selector]._domainkey` (sesuai yang diberikan ZeptoMail)
        *   Value: `[kunci panjang yang diberikan ZeptoMail]`

    *   **CNAME (Tracking/Bounce)**
        *   Type: `CNAME`
        *   Host: `zn` (atau sesuai instruksi)
        *   Value: `track.zeptomail.com` (atau sesuai instruksi)

5.  Setelah menambahkan record di atas ke DNS Manager Anda, kembali ke ZeptoMail dan klik tombol **Verify**.
6.  Pastikan status domain berubah menjadi **Verified** (Hijau).

## Langkah 2: Konfigurasi Supabase (Sudah Benar)

Berdasarkan screenshot, konfigurasi di Supabase sudah benar:
*   **Host**: `smtp.zeptomail.com`
*   **Port**: `465` (SSL)
*   **Username**: `emailapikey`
*   **Sender Email**: `info@rsquareidea.my.id`

## Langkah 3: Testing

Setelah domain terverifikasi di ZeptoMail (bisa butuh waktu 1-24 jam untuk propagasi):
1.  Kirim ulang email reset password.
2.  Cek Gmail. Peringatan merah seharusnya hilang.
3.  Tombol dan link akan bisa diklik secara normal.

## Troubleshooting

Jika masih masuk spam:
1.  Buka email di Gmail (di folder Spam).
2.  Klik titik tiga di pojok kanan atas email -> **Show original**.
3.  Cari baris **SPF**, **DKIM**, dan **DMARC**.
4.  Semuanya harus berstatus **PASS**. Jika ada yang **FAIL** atau **SOFTFAIL**, berarti setting DNS Anda masih salah.
