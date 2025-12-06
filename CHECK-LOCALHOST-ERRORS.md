# 🔍 Check Localhost Errors - Step by Step

Error `POST /api/client-errors 200` di terminal berarti ada JavaScript error di browser yang dikirim ke backend untuk logging.

## 🚨 Step 1: Check Browser Console (PALING PENTING!)

### Cara 1: Via DevTools

1. **Buka browser** dengan aplikasi localhost:3000
2. **Tekan F12** (atau Cmd+Option+I di Mac)
3. **Pilih tab "Console"**
4. **Screenshot semua error** yang muncul (warna merah)

### Yang Perlu Dicari:

```
❌ Error yang mungkin muncul:

1. "Supabase credentials not configured"
   → Env variables tidak ter-load

2. "currentStoreId is null"
   → Store ID tidak di-set

3. "Failed to fetch"
   → Network/CORS issue

4. "Maximum update depth exceeded"
   → Infinite re-render loop

5. "Cannot read properties of undefined"
   → Data belum loaded saat component render

6. Errors tentang "sales" atau "products"
   → Issue dengan fetch functions
```

---

## 🔬 Step 2: Run Diagnostic Commands

Buka browser console (F12) dan jalankan commands ini **satu per satu**:

### Command 1: Check Environment Variables
```javascript
console.log('=== ENV CHECK ===');
console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
console.log('Mode:', import.meta.env.MODE);
console.log('Dev:', import.meta.env.DEV);
```

**Expected:**
```
URL: https://ysujcewkfhbenxtaguuw.supabase.co
Key exists: true
Mode: development
Dev: true
```

**If undefined:** Environment variables TIDAK ter-load!

---

### Command 2: Check Supabase Client
```javascript
console.log('=== SUPABASE CLIENT ===');
// Try to get supabase instance from window
console.log('Window has supabase:', 'supabase' in window);
```

---

### Command 3: Check Store State
```javascript
console.log('=== STORE STATE ===');
// Access Zustand store
const store = window.__ZUSTAND_STORE__ || {};
console.log('Current Store ID:', store.currentStoreId);
console.log('Products count:', store.products?.length || 0);
console.log('Sales count:', store.sales?.length || 0);
console.log('Error:', store.error);
console.log('Loading:', store.isLoading);
```

---

### Command 4: Test Supabase Connection Directly
```javascript
console.log('=== DIRECT SUPABASE TEST ===');

// Import Supabase (jika belum loaded)
const testSupabase = async () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  console.log('Testing with:', url);
  
  if (!url || !key) {
    console.error('❌ Missing credentials!');
    return;
  }
  
  // You'll need to do this test via the app's supabase instance
  console.log('✅ Credentials present');
};

testSupabase();
```

---

## 📋 Step 3: Common Error Patterns & Solutions

### Error Pattern 1: "undefined is not an object"

**Full error example:**
```
TypeError: Cannot read properties of undefined (reading 'fetchSales')
```

**Cause**: Store not initialized or currentStoreId is null

**Solution**:
```javascript
// Check in console:
console.log('Auth:', useAuth());  // Should show user and store

// If store is null:
// 1. User needs to login first
// 2. Or check DEFAULT_STORE_ID in HomePage.tsx
```

---

### Error Pattern 2: "currentStoreId is null"

**Cause**: No store ID set for current session

**Check HomePage.tsx:**
```javascript
// Should see this logic:
const DEFAULT_STORE_ID = '6c65a321-3576-4a38-a834-19afa1c4d83e';

// In useEffect:
if (!isAuthenticated && !currentStoreId) {
  setCurrentStoreId(DEFAULT_STORE_ID);
}
```

**Quick Fix**: Set store ID manually in console:
```javascript
// Get store from Zustand
const useWarungStore = window.useWarungStore; // if exposed
// Or access via React DevTools

// Set store ID
useWarungStore.getState().setCurrentStoreId('6c65a321-3576-4a38-a834-19afa1c4d83e');
```

---

### Error Pattern 3: "relation 'public.sales' does not exist"

**Cause**: Database tables not created

**Solution**: Run migrations in Supabase SQL Editor

See: `FIX-SALES-ERROR.md` for SQL scripts

---

### Error Pattern 4: "Row Level Security policy violation"

**Cause**: RLS blocking access

**Quick Test in Console:**
```javascript
// Check if logged in
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);

// If null, you're not logged in!
// RLS will block access.
```

**Solution**: 
1. Login via /login page
2. Or temporarily disable RLS (see FIX-SALES-ERROR.md)

---

## 🎯 Step 4: Enable Verbose Logging

Add this to HomePage.tsx temporarily:

```typescript
// At the top of HomePage component
useEffect(() => {
  console.log('=== HOMEPAGE DEBUG ===');
  console.log('isAuthenticated:', isAuthenticated);
  console.log('store:', store);
  console.log('currentStoreId:', currentStoreId);
  console.log('authLoading:', authLoading);
}, [isAuthenticated, store, currentStoreId, authLoading]);

// In fetchSales/fetchProducts useEffect:
useEffect(() => {
  console.log('=== FETCH DATA TRIGGER ===');
  console.log('currentStoreId:', currentStoreId);
  
  if (currentStoreId) {
    console.log('Fetching data for store:', currentStoreId);
    // ... existing fetch code
  } else {
    console.warn('❌ No store ID, skipping fetch');
  }
}, [currentStoreId]);
```

---

## 🔧 Step 5: Quick Fixes Based on Console Output

### Fix 1: Env Not Loaded
```bash
# Terminal:
pkill -9 node
rm -rf node_modules/.vite
npm run dev

# Browser:
# Hard refresh (Ctrl+Shift+R)
# Re-run Command 1 in console
```

---

### Fix 2: Store ID Not Set
```typescript
// Check HomePage.tsx line ~18:
const DEFAULT_STORE_ID = '6c65a321-3576-4a38-a834-19afa1c4d83e';

// Make sure this useEffect exists:
useEffect(() => {
  if (authLoading) return;

  if (isAuthenticated && store) {
    setCurrentStoreId(store.id);
  } else if (!currentStoreId) {
    setCurrentStoreId(DEFAULT_STORE_ID);  // ← This line is critical!
  }
}, [isAuthenticated, store, authLoading, currentStoreId, setCurrentStoreId]);
```

---

### Fix 3: Infinite Re-render Loop

**Error**: "Maximum update depth exceeded"

**Cause**: setState called inside render or wrong dependency array

**Check**: Look for useEffect with missing dependencies

**Solution**: Add proper dependency arrays to all useEffects

---

## 📸 Step 6: Share Debug Info

If still stuck, take screenshots of:

1. **Browser Console** (full screenshot showing all errors)
2. **Network Tab** (filtered by "supabase.co")
3. **React DevTools** (Components → show current props/state)
4. **Terminal output** (showing the POST /api/client-errors)

And share the output of these console commands:
```javascript
// Copy-paste ALL output:
console.log('ENV:', {
  url: import.meta.env.VITE_SUPABASE_URL,
  hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  mode: import.meta.env.MODE
});

// And:
console.log('STORE:', {
  currentStoreId: useWarungStore?.getState?.()?.currentStoreId,
  error: useWarungStore?.getState?.()?.error,
  isLoading: useWarungStore?.getState?.()?.isLoading,
  productsCount: useWarungStore?.getState?.()?.products?.length,
  salesCount: useWarungStore?.getState?.()?.sales?.length
});
```

---

## ✅ Success Checklist

Once fixed, you should see in console:

```
✅ ENV: url is set, hasKey: true
✅ STORE: currentStoreId is set (not null)
✅ No red errors in console
✅ Network tab shows 200 OK for supabase requests
✅ Data appears in UI
```

---

## 💡 Most Likely Issues (Ranked)

Based on "POST /api/client-errors 200", the most likely causes are:

1. **currentStoreId is null** (80% probability)
   - Check: console.log(useWarungStore.getState().currentStoreId)
   - Fix: Make sure DEFAULT_STORE_ID is set in HomePage

2. **Environment variables not loaded** (15% probability)
   - Check: console.log(import.meta.env.VITE_SUPABASE_URL)
   - Fix: Restart server

3. **React infinite loop** (3% probability)
   - Check: Console shows "Maximum update depth"
   - Fix: Check useEffect dependencies

4. **Database tables missing** (2% probability)
   - Check: Network tab shows 404 or "does not exist"
   - Fix: Run migrations

---

**NEXT STEP**: Please run **Command 1 and Command 3** in browser console dan kasih tahu saya outputnya!
