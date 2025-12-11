## Arsitektur SaaS Omzetin

### URL Structure yang Direkomendasikan

| URL | Fungsi |
|-----|--------|
| `omzetin.web.id` | Landing page (marketing, fitur, pricing) |
| `omzetin.web.id/login` | Login untuk semua user |
| `omzetin.web.id/register` | Registrasi + buat toko baru |
| `omzetin.web.id/dashboard` | CMS Dashboard (setelah login) |
| `omzetin.web.id/store/{slug}` | Halaman publik toko (untuk pelanggan) |

### Komponen yang Perlu Dibuat

**1. Landing Page (`/`)**
- Hero section dengan tagline
- Fitur-fitur utama
- Pricing plans (Free, Pro, Enterprise)
- Testimonial
- CTA: "Mulai Gratis" → `/register`

**2. Halaman Register (`/register`)**
- Form: Email, Password, Nama Toko
- Auto-generate slug dari nama toko
- Redirect ke `/dashboard` setelah sukses

**3. Update Routing**
```
/                → LandingPage (baru)
/login           → LoginPage (existing)
/register        → RegisterPage (baru)
/dashboard       → DashboardPage (existing, protected)
/store/:slug     → PublicStorePage (existing)
```

**4. Database Schema (sudah ada)**
- `stores` - multi-tenant ready ✓
- `store_members` - user-store relationship ✓
- `products`, `sales`, dll dengan `store_id` ✓

### Flow User

```
Visitor → Landing Page → Register → Buat Toko → Dashboard
                       → Login → Dashboard → Kelola Toko
                       
Pelanggan → /store/{slug} → Browse & Beli
```

### Prioritas Implementasi

1. **Phase 1**: Landing Page + Register Page
2. **Phase 2**: Pricing/Plan system
3. **Phase 3**: Custom domain (namatoko.omzetin.web.id)
4. **Phase 4**: Advanced features (analytics, multi-user per store)

