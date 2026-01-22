# Pending PRs & Tasks Summary

Berikut adalah daftar PR/tasks yang belum selesai atau di-skip sebelumnya:

## 1. Public Sales Transaction via RPC (SKIPPED)

**Status:** ⚠️ Di-skip di conversation sebelumnya
**Reference:** "Hmm yasudah skip saja dulu" - terkait implementasi RPC function untuk public sales

**Details:**
- Ada beberapa migration files terkait RPC untuk public sales:
  - `033_create_public_sales_rpc_working.sql`
  - `046_create_public_sales_rpc.sql`
  - `047_test_rpc_function.sql`
  - `048_recreate_rpc_with_uuid_fix.sql`
  - `049_debug_rpc.sql`
  - `050_test_rpc_with_real_data.sql`
- Script test terkait:
  - `scripts/test-public-sale.ts`
  - `scripts/test-rpc-function.ts`

**Todo:** Review dan implement RPC function untuk public sales transaction

---

## 2. Migration Files (Need Review)

**Status:** ⚠️ Banyak migration files yang belum di-apply atau perlu review

**Files to check:**
```bash
supabase/migrations/033_fix_public_sales_column_names.sql
supabase/migrations/034_transfer_account_data.sql
supabase/migrations/035_fix_rls_policies.sql
supabase/migrations/036_fix_public_storefront_access.sql
supabase/migrations/037_diagnose_data_leak.sql
supabase/migrations/038_separate_user_data.sql
supabase/migrations/039_check_sales_data.sql
supabase/migrations/040_fix_rls_priority.sql
supabase/migrations/041_test_rls_for_user.sql
supabase/migrations/042_delete_gmail_account.sql
supabase/migrations/043_check_specific_store.sql
supabase/migrations/044_fix_rls_final.sql
supabase/migrations/045_fix_infinite_recursion.sql
```

**Todo:**
- Review migration files mana yang perlu di-apply
- Bersihkan migration files yang sudah tidak relevan
- Pastikan urutan migration yang benar

---

## 3. Deleted Preview Images (Need Replacement)

**Status:** ⚠️ Preview images ter-deteksi deleted di git status

**Files:**
- `public/analytics-preview.png` (deleted)
- `public/dashboard-preview.png` (deleted)

**Todo:** Cek apakah file ini masih diperlukan atau sudah digantikan dengan screenshot baru

---

## 4. Landing Page Assets Folder

**Status:** ℹ️ Folder baru mungkin perlu clean-up

**Folder:**
- `Landing page/` (untracked)

**Todo:** Review folder ini untuk cek apakah isinya diperlukan atau bisa dihapus

---

## 5. Recent Code Changes (May Need Testing)

**Status:** ✅ Selesai tapi perlu testing

**Changes made in current session:**

### UpgradePlanContent.tsx
- ✅ Fixed pricing integration dengan CMS subscription plans
- ✅ Harga sekarang diambil dari database `subscription_plans`
- ⚠️ **Todo:** Test untuk memastikan harga tampil dengan benar

### LandingPage.tsx
- ✅ Fixed user count untuk menghitung unique users
- ✅ Redesign "Fitur Juara" section (lebih colorful, tanpa rotate 360)
- ✅ Animated logo menggunakan komponen `AnimatedLogo`
- ✅ Header color disesuaikan dengan toko (orange + white text)
- ✅ Menu hover effect yang clean dan elegant
- ⚠️ **Todo:** Test semua fitur landing page

### tailwind.config.js
- ✅ Added `border-3` utility
- ⚠️ **Todo:** Pastikan tidak ada breaking changes

---

## 6. Data Consistency Check (Potential Issue)

**Status:** ⚠️ Perlu verifikasi

**Issue:** User count showing 0 meskipun sudah ada users yang dibuat

**What was done:**
- Changed query from counting rows to counting distinct `user_id` from `store_members`

**Todo:**
- Verify user count sekarang tampil dengan benar
- Test dengan multiple users across different stores

---

## Testing Checklist

Sebelum deploy, pastikan untuk test:

- [ ] Landing page loads correctly
- [ ] Animated logo works on all pages (landing + store)
- [ ] User count displays correctly in stats section
- [ ] Upgrade dialog shows correct prices from CMS
- [ ] Navigation menu hover effects work properly
- [ ] Header colors consistent across all pages
- [ ] All migration files are in correct order
- [ ] No console errors

---

## Notes for Next Agent

1. **Focus Prioritas:** Public sales RPC dan migration cleanup
2. **Testing:** Landing page changes sudah selesai tapi perlu thorough testing
3. **Database:** Beberapa migration files mungkin sudah tidak relevan dan bisa dihapus
4. **Git:** Consider committing current changes sebelum lanjut ke next task

---

## Session Summary

**Date:** 2026-01-22
**Last Changes:**
- Pricing integration fixed (UpgradePlanContent.tsx)
- Landing page redesigned with animated logo
- User count query fixed
- Header styling updated to match store theme

**Files Modified:**
- `src/components/UpgradePlanContent.tsx`
- `src/pages/LandingPage.tsx`
- `tailwind.config.js`

**Git Status:**
- Modified: UpgradePlanContent.tsx, LandingPage.tsx, tailwind.config.js
- Deleted: public/analytics-preview.png, public/dashboard-preview.png
- Untracked: Multiple migration files, test scripts, "Landing page/" folder
