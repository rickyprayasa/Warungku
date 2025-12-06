# Changelog: Real-time Sync & React Query Implementation

## Version 2.2.0 - 2025-12-06 (Phase 2)

### 🚀 Phase 2: React Query Integration & Advanced Caching

Phase 2 menambahkan Tanstack Query (React Query) untuk better caching strategy, optimistic updates, dan smart retry logic.

#### ✅ Implementations

1. **Tanstack Query Setup**
   - **File modified**: `src/main.tsx`
   - Setup QueryClientProvider dengan smart retry logic
   - Network mode: online only (tidak fetch saat offline)
   - Auto refetch on window focus & reconnect
   - Smart cache dengan staleTime 30s, gcTime 5 minutes

2. **Custom React Query Hooks - Products**
   - **File new**: `src/hooks/useProducts.ts`
   - `useProducts(storeId)` - Fetch products dengan auto-caching
   - `useAddProduct(storeId)` - Tambah produk dengan auto invalidation
   - `useUpdateProduct(storeId)` - Update produk dengan auto invalidation
   - `useDeleteProduct(storeId)` - Hapus produk dengan auto invalidation
   - `useAdjustStock(storeId)` - Adjust stok dengan auto invalidation

3. **Custom React Query Hooks - Sales**
   - **File new**: `src/hooks/useSales.ts`
   - `useSales(storeId)` - Fetch sales dengan auto-caching
   - `useAddSale(storeId)` - Tambah sale dengan **optimistic updates**
   - `useDeleteSale(storeId)` - Hapus sale dengan stock restoration
   - Auto invalidate products cache saat sales berubah

4. **Query Utils - Smart Error Handling**
   - **File new**: `src/lib/query-utils.ts`
   - `shouldRetryQuery()` - Hanya retry pada network/timeout errors
   - `getRetryDelay()` - Exponential backoff (1s, 2s, 4s, max 10s)
   - `handleQueryError()` - User-friendly error messages
   - `isRecoverableError()` - Check apakah error bisa di-retry
   - `formatErrorMessage()` - Format error untuk user display

5. **Realtime Sync Integration dengan React Query**
   - **File modified**: `src/lib/realtime-sync.ts`
   - Add `setRealtimeQueryClient()` untuk set query client instance
   - Realtime changes sekarang invalidate React Query cache
   - Double invalidation: Query cache + Zustand store (backward compatible)
   - **File modified**: `src/pages/HomePage.tsx`
   - Setup query client untuk realtime sync

#### 🎯 Key Features

**Optimistic Updates**:
```typescript
// Contoh: Add Sale with optimistic update
onMutate: async (newSale) => {
  // Cancel outgoing refetches
  await queryClient.cancelQueries({ queryKey: ['sales', storeId] });
  
  // Snapshot previous value
  const previousSales = queryClient.getQueryData(['sales', storeId]);
  
  // Optimistically update UI
  queryClient.setQueryData(['sales', storeId], [optimisticSale, ...previousSales]);
  
  return { previousSales };
},
onError: (err, newSale, context) => {
  // Rollback on error
  queryClient.setQueryData(['sales', storeId], context.previousSales);
}
```

**Smart Retry Logic**:
```typescript
retry: (failureCount, error) => {
  if (failureCount >= 2) return false;
  
  // Only retry on network/timeout errors
  if (error.message.includes('timeout') || error.message.includes('network')) {
    return true;
  }
  
  // Don't retry auth errors
  if (error.message.includes('jwt')) return false;
  
  return false;
}
```

**Auto Cache Invalidation**:
```typescript
onSuccess: () => {
  // Invalidate related caches
  queryClient.invalidateQueries({ queryKey: ['sales', storeId] });
  queryClient.invalidateQueries({ queryKey: ['products', storeId] }); // Stock affected
}
```

#### 📊 Performance Improvements

1. **Automatic Background Refetching**: Data auto-refresh saat window focus kembali
2. **Smart Caching**: Reduce unnecessary API calls dengan staleTime 30s
3. **Optimistic Updates**: UI langsung update tanpa tunggu server response
4. **Garbage Collection**: Old cache auto-removed setelah 5 minutes
5. **Network-Aware**: Tidak fetch saat offline, auto retry saat online kembali

#### 🛡️ Error Handling Improvements

**Before (Phase 1)**:
- Generic error messages
- Retry semua errors
- No user-friendly messages

**After (Phase 2)**:
- Specific error messages per error type
- Hanya retry recoverable errors (network/timeout)
- User-friendly bahasa Indonesia messages
- Exponential backoff untuk prevent server overload

#### 💡 Usage Example

```typescript
// Menggunakan React Query hooks (NEW)
import { useProducts, useAddProduct } from '@/hooks/useProducts';

function ProductList() {
  const { data: products, isLoading, error } = useProducts(storeId);
  const addProduct = useAddProduct(storeId);
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {products?.map(product => (
        <div key={product.id}>{product.name}</div>
      ))}
      <button onClick={() => addProduct.mutate(newProductData)}>
        Add Product
      </button>
    </div>
  );
}
```

#### 🔗 Related Files (Phase 2)

- `src/main.tsx` (MODIFIED - QueryClient setup)
- `src/hooks/useProducts.ts` (NEW - Products hooks)
- `src/hooks/useSales.ts` (NEW - Sales hooks)
- `src/lib/query-utils.ts` (NEW - Error handling utils)
- `src/lib/realtime-sync.ts` (MODIFIED - Query integration)
- `src/pages/HomePage.tsx` (MODIFIED - Query client setup)

---

## Version 2.1.0 - 2025-12-06 (Phase 1)

### 🎯 Problem Solved
Aplikasi mengalami masalah di mana data tidak tersinkronisasi secara real-time ketika dibuka di 2 device berbeda. User harus clear browser data atau menggunakan private window untuk melihat data terbaru.

### ✅ Solutions Implemented

#### 1. **Supabase Realtime Subscriptions** ⭐ (HIGH PRIORITY)
- **File baru**: `src/lib/realtime-sync.ts`
- Menambahkan real-time subscriptions untuk tabel:
  - `products` - Auto-refresh ketika produk berubah
  - `sales` - Auto-refresh ketika ada transaksi baru
  - `purchases` - Auto-refresh ketika ada pembelian baru
  - `suppliers` - Auto-refresh ketika supplier berubah
  - `snack_requests` - Auto-refresh ketika ada request baru
  - `reconciliations` - Auto-refresh ketika ada rekonsiliasi baru
- Semua perubahan data di Supabase akan langsung ter-update di semua device yang terbuka
- Cleanup otomatis saat component unmount untuk prevent memory leaks

#### 2. **Remove Stale Data from localStorage**
- **File modified**: `src/lib/store-supabase.ts`
- Upgrade storage version dari `warung-storage-v2` ke `warung-storage-v3`
- Hanya `currentStoreId` yang di-persist, data entities (products, sales, dll) TIDAK di-persist
- Menambahkan migration logic untuk clear old cached data
- Auto-fetch fresh data ketika `setCurrentStoreId()` dipanggil

#### 3. **Integration with HomePage**
- **File modified**: `src/pages/HomePage.tsx`
- Setup realtime sync di HomePage saat store ID tersedia
- Cleanup subscriptions saat component unmount
- Logs untuk debugging realtime connection status

#### 4. **Force Refresh Button**
- **File modified**: `src/components/Sidebar.tsx`
- Menambahkan tombol "Refresh Data" di sidebar (expanded & collapsed mode)
- Button akan fetch ulang semua data dari server
- Toast notification untuk user feedback
- Useful sebagai fallback jika realtime sync gagal

#### 5. **App Version Check**
- **File modified**: `src/main.tsx`
- App version: `2.1.0`
- Otomatis clear stale cached data ketika app version berubah
- Clear keys: `warung-storage-v2`, `warung-storage-v3`, `dismissedNotifications`
- Tidak menghapus auth data (Supabase session tetap preserved)

### 🔧 Technical Details

**Before:**
```typescript
// Data di-persist ke localStorage
persist(immer((set, get) => ({ ... })), {
  name: 'warung-storage-v2',
  partialize: (state) => ({
    currentStoreId: state.currentStoreId,
    products: state.products,  // ❌ Stale data!
    sales: state.sales,        // ❌ Stale data!
    // ...
  })
})
```

**After:**
```typescript
// Hanya store ID yang di-persist
persist(immer((set, get) => ({ ... })), {
  name: 'warung-storage-v3',
  version: 3,
  partialize: (state) => ({
    currentStoreId: state.currentStoreId, // ✅ Only ID
  }),
  migrate: (persistedState, version) => {
    if (version < 3) {
      return { currentStoreId: persistedState?.currentStoreId || null };
    }
    return persistedState;
  }
})

// Plus Realtime Subscriptions
setupRealtimeSync(storeId); // ✅ Auto-sync!
```

### 📊 Expected Benefits

1. **Real-time Data Sync**: Data akan otomatis ter-update di semua device
2. **No More Stale Cache**: localStorage tidak menyimpan stale data
3. **Better UX**: User tidak perlu clear browser data atau refresh manual
4. **Offline Resilience**: Timeout protection (15s) sudah ada
5. **Migration Safety**: Version check ensures clean migration dari v2 ke v3

### 🚀 Testing Checklist

- [x] Build berhasil tanpa error
- [x] Lint check passed
- [ ] Test realtime sync dengan 2 browser windows
- [ ] Test Force Refresh button
- [ ] Test migration dari v2 ke v3
- [ ] Test offline behavior (timeout)
- [ ] Test dengan koneksi lambat

### 📝 Next Steps

**Phase 2 - Optimization** ✅ COMPLETED:
- ✅ Integrate Tanstack Query untuk better caching strategy
- ✅ Add optimistic updates untuk better perceived performance
- ✅ Add retry logic untuk failed requests
- ✅ Implement background sync strategy

**Phase 3 - Advanced** (Future Work):
- Add conflict resolution untuk concurrent edits
- Implement offline-first dengan IndexedDB
- Add WebSocket fallback untuk real-time sync
- Add data versioning untuk detect conflicts

### 🐛 Known Issues / Limitations

1. Supabase Realtime requires Realtime to be enabled di Supabase project
2. Connection dapat drop pada poor network - user harus click Refresh button
3. Belum ada conflict resolution untuk concurrent edits

### 🔗 Related Files

- `src/lib/realtime-sync.ts` (NEW)
- `src/lib/store-supabase.ts` (MODIFIED)
- `src/pages/HomePage.tsx` (MODIFIED)
- `src/components/Sidebar.tsx` (MODIFIED)
- `src/main.tsx` (MODIFIED)

---

## 📈 Migration Guide

### Dari Zustand ke React Query

Aplikasi saat ini menggunakan **hybrid approach**: Zustand store masih berfungsi (backward compatible), tapi bisa mulai migrasi ke React Query hooks untuk better performance.

**Migrasi Bertahap (Optional)**:

1. **Step 1**: Import hooks di component yang perlu real-time data
```typescript
// Old way (Zustand)
const products = useWarungStore(state => state.products);
const addProduct = useWarungStore(state => state.addProduct);

// New way (React Query) - Better caching & optimistic updates
import { useProducts, useAddProduct } from '@/hooks/useProducts';
const { data: products } = useProducts(storeId);
const addProduct = useAddProduct(storeId);
```

2. **Step 2**: Update komponen untuk handle loading & error states
```typescript
const { data: products, isLoading, error } = useProducts(storeId);

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
```

3. **Step 3**: Use mutations dengan optimistic updates
```typescript
const addSale = useAddSale(storeId);

addSale.mutate(saleData, {
  onSuccess: () => {
    // UI already updated optimistically!
  }
});
```

**Catatan**: Kedua approach bisa coexist. Tidak perlu migrate semua sekaligus.

---

**Author**: Factory Droid  
**Date**: 2025-12-06  
**Latest Version**: 2.2.0
