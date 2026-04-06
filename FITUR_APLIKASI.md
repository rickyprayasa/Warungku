# 🚀 Omzetin (Sistem POS & Kasir Pintar) - Fitur & Spesifikasi

Omzetin adalah aplikasi web Point of Sale (POS) dan manajemen toko berbasis Software-as-a-Service (SaaS) modern yang dirancang khusus untuk warung, toko kelontong, retail, dan F&B. Dibangun dengan teknologi mutakhir untuk performa tinggi, aplikasi ini siap pakai dan sangat mudah dipasarkan ulang (White-Label / Commercial Ready).

## 🌟 Nilai Jual Utama (Unique Selling Points)
1. **Multi-Tenant SaaS**: Satu aplikasi untuk ribuan toko. Setiap toko memiliki pembukuan dan ruang kerjanya sendiri secara terenkripsi (Row-Level Security).
2. **Public Storefront (Toko Online)**: Secara otomatis membuatkan link toko publik untuk setiap pengguna (contoh: `omzetin/namatoko`) yang bisa dibagikan ke pelanggan untuk melihat katalog produk dan harga secara *real-time*.
3. **Offline-First & Tangguh**: Aplikasi tetap dapat beroperasi (mencatat transaksi di keranjang) meski koneksi internet terputus, dan akan otomatis melakukan sinkronisasi ketika sinyal kembali.
4. **Subscription / Paket Langganan**: Fitur *billing* siap pakai dengan dukungan paket langganan (Free, Pro, Enterprise) yang terintegrasi dengan Payment Gateway Duitku.
5. **Modern & Responsif**: UI/UX kelas atas ala *startup* yang dianimasikan dengan mulus dan cocok digunakan di layar HP, Tablet, maupun Desktop.

---

## 📦 Fitur Inti (Core Features)

### 🏪 Manajemen Kasir & POS (Point of Sale)
- **Katalog Produk Dinamis**: Pencarian cerdas, filter kategori, dan varian produk.
- **Keranjang Belanja (Cart)**: Manajemen *cart* yang mulus, kalkulasi pajak/diskon, dan fitur cetak struk kasir (*receipt*).
- **Mode Barcode Scanner**: Dukungan pemindaian SKU produk layaknya kasir minimarket profesional.
- **Riwayat Penjualan**: Lacak setiap transaksi secara granular, lengkap dengan detail waktu, kasir yang melayani, dan nota.

### 📦 Manajemen Inventori (Gudang)
- **Stock Opname**: Terdapat dua mode Stock Opname (Retail & F&B).
- **Peringatan Stok Tipis**: Indikator otomatis pada produk yang jumlah stoknya kritis (*Minimum Stock Level*).
- **Pembelian & Supplier**: Catat data pembelanjaan / *restock* produk, hitung HPP (Harga Pokok Penjualan), serta kelola kontak *supplier*.

### 📊 Laporan & Keuangan
- **Dashboard Analitik**: Grafik omzet interaktif, laba bersih harian/bulanan, dan metrik produk terlaris.
- **Rekonsiliasi (Tutup Kasir)**: Sistem perhitungan saldo awal (modal kasir) dan *cash-drawer* saat pergantian *shift* (Tutup Warung).

### 👥 Sistem Multi-Role (RBAC)
- **Super Administrator (Owner)**: Mengelola master pengguna, melihat statistik global SaaS, mengelola plan Duitku, dan meninjau Log Aktivitas (*Audit Log*).
- **Pemilik Toko (Merchant)**: Akses penuh ke inventori, laporan laba rugi, dan pengaturan profil warung.
- **Kasir (Staff)**: Akses dibatasi pada layar POS dan pencatatan transaksi saja demi keamanan data.

### 🌐 Halaman Publik
- **Landing Page Interaktif**: Dilengkapi dengan statistik *real-time* ("KATA MEREKA"), simulasi harga, dan testimoni pengguna.
- **Katalog Publik (Toko Link)**: Halaman *read-only* eksklusif tanpa login untuk calon pembeli melihat inventaris toko.

---

## 🛠️ Stack Teknologi (Tech Stack)

Aplikasi ini menggunakan perpaduan teknologi paling stabil dan *modern* di tahun ini:
- **Frontend Framework**: React 18 (Vite) + TypeScript.
- **Routing & State**: React Router v6, Zustand (Global Store), TanStack React Query (Caching & Sync).
- **Styling & UI**: Tailwind CSS, Radix UI (shadcn/ui), Framer Motion (Animasi).
- **Backend & Database**: Supabase (PostgreSQL, GoTrue Auth, Realtime WebSockets, Storage).
- **Security**: Row-Level Security (RLS) PostgreSQL tingkat lanjut memisahkan data ribuan toko dengan akurat.
- **Payment Gateway**: Dukungan Duitku untuk sistem pembayaran subskripsi (*SaaS Billing*).
- **Testing & Tooling**: Playwright, ESLint, dan arsitektur *Service-Controller* berstandar *Enterprise*.

---

### Kenapa Aplikasi Ini Layak Dibeli?
*Source code* ini **bukan sekadar template**, melainkan sistem SaaS utuh yang sudah diuji secara arsitektural. Mulai dari sistem otentikasi antartab yang terhindar dari *deadlock*, pengelolaan memori klien (*offline-mutations*), sistem izin (RBAC), hingga halaman publik dengan *unauthenticated client* yang aman. Pembeli tinggal melakukan *rebranding* warna/logo dan aplikasi siap diluncurkan untuk memonetisasi ribuan *merchant* UMKM!
