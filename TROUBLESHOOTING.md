# 🔧 Troubleshooting Guide - Supabase Connection Issues

## ❌ Problem: "Supabase credentials not configured" atau data tidak load

### ✅ Solution: Fix Environment Variables Prefix

**CRITICAL**: Aplikasi ini menggunakan **Vite**, BUKAN Next.js!

#### ❌ WRONG (Next.js prefix):
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

#### ✅ CORRECT (Vite prefix):
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 🔍 Step-by-Step Debugging

### Step 1: Check .env.local file

```bash
# Check if file exists
ls -la .env.local

# View content (credentials will be masked)
cat .env.local
```

**Expected content:**
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ENABLE_REALTIME=true
```

**Common mistakes:**
- ❌ Using `NEXT_PUBLIC_` prefix (wrong framework!)
- ❌ Using `REACT_APP_` prefix (also wrong!)
- ❌ No prefix at all
- ❌ Typo in variable names
- ❌ Trailing slash in URL: `https://xxx.supabase.co/` ← Remove slash!
- ❌ Using service_role key instead of anon key (DANGEROUS!)

### Step 2: Verify Supabase Project is Active

1. Go to https://supabase.com/dashboard
2. Check project status (should be green/active)
3. If "Paused" → Click "Restore project"

**Note**: Free tier projects auto-pause after 1 week of inactivity!

### Step 3: Test Connection Directly

Open this test file in browser:
```
file:///path/to/project/test-supabase-connection.html
```

Or serve it:
```bash
# Option 1: Python
python3 -m http.server 8000
# Then open: http://localhost:8000/test-supabase-connection.html

# Option 2: Node http-server
npx http-server -p 8000
# Then open: http://localhost:8000/test-supabase-connection.html
```

### Step 4: Restart Dev Server

**IMPORTANT**: Vite caches environment variables. You MUST restart!

```bash
# Stop dev server (Ctrl+C)

# Clear any cache
rm -rf node_modules/.vite

# Restart
npm run dev
```

### Step 5: Check Browser Console

Open Chrome DevTools (F12) and look for:

**✅ Success indicators:**
```
[REALTIME] Setting up realtime sync for store: xxx
[REALTIME] Products channel status: SUBSCRIBED
[REALTIME] Sales channel status: SUBSCRIBED
```

**❌ Error indicators:**
```
Supabase credentials not configured
Failed to fetch products
CORS error
timeout
```

### Step 6: Verify Environment Variables in Browser

**During development**, add this to see what Vite loaded:

```javascript
// In browser console:
console.log({
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
  realtime: import.meta.env.VITE_ENABLE_REALTIME
});
```

**Expected output:**
```
{
  url: "https://xxx.supabase.co",
  key: "SET",
  realtime: "true"
}
```

**If you see `undefined`:**
- Variable names are wrong (typo or wrong prefix)
- `.env.local` is in wrong location (must be in project root!)
- Dev server not restarted after changing .env

---

## 🚨 Common Error Messages & Fixes

### Error: "Failed to fetch products"

**Possible causes:**
1. **Database tables not created**
   - Solution: Run migrations (see SETUP-SUPABASE.md step 4)

2. **RLS blocking access**
   - Solution: Check RLS policies or temporarily disable for testing

3. **Project paused**
   - Solution: Restore project in Supabase dashboard

4. **Network/CORS issue**
   - Check browser console for CORS errors
   - Verify URL doesn't have trailing slash

### Error: "JWT expired" / Auth errors

**Cause**: Session expired (default: 1 hour)

**Solution**:
- User needs to login again
- Or increase JWT expiry in Supabase dashboard

### Error: "relation 'public.stores' does not exist"

**Cause**: Database tables not created

**Solution**:
```bash
# Run migrations in Supabase SQL Editor
# See /migrations folder or SETUP-SUPABASE.md step 4
```

### Error: Real-time not working / Channel timeout

**Cause**: Realtime not enabled on tables

**Solution**:
```sql
-- Run in Supabase SQL Editor
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
ALTER PUBLICATION supabase_realtime ADD TABLE purchases;
ALTER PUBLICATION supabase_realtime ADD TABLE suppliers;
ALTER PUBLICATION supabase_realtime ADD TABLE snack_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE reconciliations;
```

Or via Dashboard:
1. Database → Replication
2. Enable replication for all tables

---

## 📝 Quick Fix Checklist

Run through this checklist:

```bash
# 1. Check .env.local exists and uses VITE_ prefix
cat .env.local | grep VITE_

# 2. Check Supabase credentials are valid
# Open: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
# Compare URL and anon key

# 3. Clear cache and restart
rm -rf node_modules/.vite dist
npm run dev

# 4. Hard refresh browser
# Windows: Ctrl+Shift+R
# Mac: Cmd+Shift+R
# Or open incognito window

# 5. Check browser console for errors
# Press F12 and look at Console tab
```

---

## 🔬 Advanced Debugging

### Enable Verbose Logging

Add to `.env.local`:
```env
VITE_DEBUG=true
```

Restart dev server.

### Check Supabase Connection Manually

```javascript
// In browser console:
const { createClient } = supabase;
const client = createClient(
  'https://xxx.supabase.co',
  'eyJ...'
);

// Test query
const { data, error } = await client
  .from('stores')
  .select('*')
  .limit(1);

console.log({ data, error });
```

### Network Tab Analysis

1. Open DevTools → Network tab
2. Filter by "supabase.co"
3. Look for failed requests (red)
4. Click on request → Response tab
5. Check error message

### Common Network Errors

| Status | Error | Cause | Solution |
|--------|-------|-------|----------|
| 0 | (failed) | CORS/Network | Check URL, internet connection |
| 400 | Bad Request | Invalid query | Check RLS policies |
| 401 | Unauthorized | Invalid key | Check anon key is correct |
| 404 | Not Found | Wrong URL/table | Check project URL and migrations |
| 500 | Server Error | Supabase issue | Check Supabase status page |

---

## 🆘 Still Not Working?

### 1. Verify Your Setup

Run this checklist:
- [ ] `.env.local` exists in project root
- [ ] Uses `VITE_` prefix (not NEXT_PUBLIC_ or REACT_APP_)
- [ ] Credentials match Supabase dashboard exactly
- [ ] No trailing slash in URL
- [ ] Dev server restarted after changing .env
- [ ] Browser cache cleared (hard refresh)
- [ ] Supabase project is active (not paused)
- [ ] Database tables created (migrations run)
- [ ] Realtime enabled on tables

### 2. Test with Fresh Browser

```bash
# Open in incognito/private mode
# Or different browser
```

### 3. Check Supabase Project Logs

1. Supabase Dashboard → Logs
2. Select "API" logs
3. Look for recent errors

### 4. Minimal Test Setup

Create a minimal test file:

```html
<!-- minimal-test.html -->
<!DOCTYPE html>
<html>
<body>
  <h1>Minimal Supabase Test</h1>
  <div id="result"></div>
  <script type="module">
    import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
    
    const supabase = createClient(
      'YOUR_URL_HERE',
      'YOUR_ANON_KEY_HERE'
    );
    
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .limit(1);
    
    document.getElementById('result').innerHTML = 
      error ? `Error: ${error.message}` : `Success! Data: ${JSON.stringify(data)}`;
  </script>
</body>
</html>
```

### 5. Contact Support

If still stuck, gather this info:
- Node version: `node --version`
- npm version: `npm --version`
- OS: Windows/Mac/Linux
- Browser: Chrome/Firefox/Safari + version
- Error messages from console
- Network tab screenshots
- `.env.local` content (MASK the keys!)

---

## ✅ Success Indicators

You'll know it's working when you see:

**In Console:**
```
✅ [VERSION CHECK] App version changed from null to 2.2.0
✅ [REALTIME] Setting up realtime sync
✅ [REALTIME] Products channel status: SUBSCRIBED
✅ [REALTIME] Sales channel status: SUBSCRIBED
```

**In Network Tab:**
```
✅ Requests to xxx.supabase.co return 200 OK
✅ WebSocket connection established for realtime
```

**In UI:**
```
✅ Products load without errors
✅ Can add/edit/delete products
✅ Changes reflect instantly in other browser windows
```

---

## 📚 Related Documentation

- **SETUP-SUPABASE.md** - Complete setup guide
- **IMPLEMENTATION-SUMMARY.md** - Architecture overview
- **.env.example** - Environment template
- **test-supabase-connection.html** - Connection test page

---

**Last Updated**: 2025-12-06  
**Version**: 2.2.0
