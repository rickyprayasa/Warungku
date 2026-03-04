# Setup Cron Job untuk Keep-Alive Supabase

## Overview

Cron job ini digunakan untuk melakukan ping ke Supabase secara berkala agar database tetap aktif dan tidak pause karena inactivity. Ini sangat penting untuk free tier Supabase yang akan pause setelah 1 minggu tidak ada aktivitas.

## Cara Kerja

1. **Vercel Cron** memanggil endpoint `/api/cron/keep-alive` setiap 10 menit
2. Endpoint melakukan query sederhana ke Supabase (`SELECT FROM stores LIMIT 1`)
3. Hasil ping dicatat di tabel `cron_logs` untuk monitoring
4. Log yang lebih tua dari 30 hari otomatis dihapus

## Langkah-Langkah Setup

### 1. Pastikan Migration Sudah Dijalankan

Pastikan migration `20260303_create_cron_logs.sql` sudah dijalankan di Supabase:

```bash
# Jika menggunakan Supabase CLI
supabase db push

# Atau jalankan manual via dashboard Supabase
# Buka: SQL Editor > Paste isi file migration > Run
```

### 2. Setup Environment Variables di Vercel

Buka Vercel Dashboard: **Project Settings > Environment Variables**

Tambahkan environment variables berikut:

| Variable | Value | Required | Environment |
|----------|-------|----------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key dari Supabase Dashboard | ✅ Yes | Production |
| `CRON_SECRET` | Random string untuk keamanan (optional) | ❌ No | Production |

**Mendapatkan Supabase Service Role Key:**
1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project Anda
3. Go to **Settings > API**
4. Copy `service_role` secret (bukan `anon` key!)

**Membuat CRON_SECRET (Optional):**
```bash
# Generate random string
openssl rand -base64 32
```

### 3. Deploy ke Vercel

Cron job akan otomatis aktif setelah deploy:

```bash
# Deploy ke Vercel
vercel --prod
```

### 4. Verifikasi Cron Job Berjalan

Setelah deploy, cron job akan otomatis berjalan. Untuk verifikasi:

#### Via Vercel Dashboard:
1. Buka **Deployments > YOUR_DEPLOYMENT > Logs**
2. Cari log dengan prefix `[keep-alive]`
3. Seharusnya muncul setiap 10 menit

#### Via Supabase Dashboard:
1. Buka **Table Editor > cron_logs**
2. Anda akan melihat entries baru setiap 10 menit
3. Kolom `status` harus bernilai `success`

#### Test Manual Endpoint:
```bash
# Test endpoint secara manual
curl https://omzetin.web.id/api/cron/keep-alive

# Response seharusnya:
{
  "status": "ok",
  "message": "Supabase is alive",
  "response_time_ms": 123,
  "timestamp": "2026-03-04T10:00:00.000Z"
}
```

## Konfigurasi Jadwal

Jadwal cron diatur di `vercel.json`:

```json
"crons": [
  {
    "path": "/api/cron/keep-alive",
    "schedule": "*/10 * * * *"
  }
]
```

**Format Cron:** `*/10 * * * *` = Setiap 10 menit

### Mengubah Jadwal

Untuk mengubah frekuensi ping, ubah nilai `schedule` di `vercel.json`:

| Schedule | Deskripsi |
|----------|-----------|
| `*/5 * * * *` | Setiap 5 menit |
| `*/10 * * * *` | Setiap 10 menit (default) |
| `*/15 * * * *` | Setiap 15 menit |
| `*/30 * * * *` | Setiap 30 menit |
| `0 * * * *` | Setiap jam |
| `0 */4 * * *` | Setiap 4 jam |

⚠️ **Catatan:** Jangan terlalu sering ping untuk menghemat quota. 10-15 menit sudah cukup.

## Monitoring

### Melihat Log di Supabase

```sql
-- 10 ping terakhir
SELECT * FROM cron_logs
ORDER BY created_at DESC
LIMIT 10;

-- Statistik ping hari ini
SELECT
    status,
    COUNT(*) as count,
    AVG(response_time_ms) as avg_response_time
FROM cron_logs
WHERE created_at >= CURRENT_DATE
GROUP BY status;

-- Cek jika ada error
SELECT * FROM cron_logs
WHERE status = 'error'
ORDER BY created_at DESC
LIMIT 10;
```

### Alert untuk Cron Failure (Optional)

Jika ingin menerima notifikasi saat cron gagal, bisa tambahkan monitoring service seperti:
- **UptimeRobot** - Monitor endpoint `/api/cron/keep-alive`
- **Better Uptime** - Free monitoring dengan alerts
- **Healthchecks.io** - Simple cron monitoring

## Troubleshooting

### Cron tidak berjalan:

1. **Cek Vercel Logs:**
   - Buka Vercel Dashboard > Deployments > Logs
   - Cari error messages

2. **Cek Environment Variables:**
   - Pastikan `SUPABASE_SERVICE_ROLE_KEY` sudah di-set di Vercel
   - Pastikan value yang di-copy benar (service_role, bukan anon key)

3. **Cek Cron Syntax:**
   - Pastikan format cron di `vercel.json` valid
   - Gunakan [crontab.guru](https://crontab.guru) untuk validasi

4. **Test Endpoint Manual:**
   ```bash
   curl https://your-domain.vercel.app/api/cron/keep-alive
   ```

### Response time sangat lambat (>5000ms):

- Ini normal jika database baru saja "wake up" dari pause
- Setelah beberapa ping, response time akan normal (100-500ms)
- Jika terus lambat, cek limits di Supabase Dashboard

### Error "Missing Supabase environment variables":

- Pastikan `SUPABASE_SERVICE_ROLE_KEY` di-set di Vercel Environment Variables
- Jangan lupa re-deploy setelah menambah environment variables

## Security

Endpoint cron sudah dilengkapi dengan security layer:

1. **Method Check:** Hanya menerima GET requests
2. **Bearer Token:** Optional verification via `CRON_SECRET` header
3. **Service Role Key:** Menggunakan service role key (bukan anon key)

Jika menggunakan `CRON_SECRET`, Vercel akan otomatis mengirim header:
```
Authorization: Bearer <YOUR_CRON_SECRET>
```

## Resource Limits

### Vercel Hobby Plan:
- ✅ Mendukung cron jobs
- ✅ Max execution time: 10s (cukup untuk ping)
- ✅ No additional cost

### Supabase Free Tier:
- ✅ 500MB database storage
- ✅ 1GB bandwidth/month
- ✅ Cron logs sangat kecil (<1KB per entry)
- ✅ Auto-cleanup 30 hari menjaga size tetap kecil

**Estimasi penggunaan:**
- 1 ping = 1KB log
- 144 pings/hari (setiap 10 menit)
- Total: ~144KB/hari = ~4.3MB/bulan

## Links

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Supabase Free Tier Limits](https://supabase.com/pricing)
- [Cron Schedule Reference](https://crontab.guru/)
