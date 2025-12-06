# 🔧 Fix Localhost Issues (Production Works Fine)

## 🎯 Problem
- ✅ Production website (deployed) works perfectly
- ❌ Localhost shows errors like "Gagal memuat penjualan" atau "Supabase credentials not configured"

## 💡 Root Cause
Environment variables (`.env.local`) tidak ter-load oleh Vite dev server di localhost.

---

## ✅ Quick Fix (5 Steps)

### Step 1: Verify .env.local File Location

File **HARUS** ada di root folder project (sejajar dengan `package.json`):

```bash
# Check location
ls -la .env.local

# Should show:
# .env.local  <- in project root
# package.json
# src/
# node_modules/
```

**❌ Wrong locations:**
- `src/.env.local` ← NOT HERE
- `public/.env.local` ← NOT HERE
- `~/.env.local` ← NOT HERE

### Step 2: Kill ALL Node Processes

Vite might still be running with old environment:

```bash
# Option 1: Kill by port
lsof -ti:3000 | xargs kill -9

# Option 2: Kill all node processes (NUCLEAR OPTION)
pkill -9 node

# Option 3: Find and kill manually
ps aux | grep node
# Then: kill -9 <PID>
```

### Step 3: Clear Vite Cache

```bash
# Remove Vite cache
rm -rf node_modules/.vite

# Remove build cache (if exists)
rm -rf dist

# Optional: Clear npm cache
npm cache clean --force
```

### Step 4: Restart Dev Server (FRESH START)

```bash
# Start dev server
npm run dev

# You should see:
# VITE v6.x.x ready in xxx ms
# ➜ Local: http://localhost:3000/
```

### Step 5: Hard Refresh Browser

**Windows/Linux:**
```
Ctrl + Shift + R
```

**Mac:**
```
Cmd + Shift + R
```

**Or open Incognito/Private window:**
```
Ctrl + Shift + N (Chrome/Edge)
Cmd + Shift + N (Mac Chrome)
```

---

## 🔍 Verification

### Test 1: Add Debug Component

Temporarily add this to your app to verify env vars are loaded:

```typescript
// In src/pages/HomePage.tsx or any page
import { DebugEnv } from '@/components/DebugEnv';

export function HomePage() {
  return (
    <>
      {/* Temporary debug component */}
      {import.meta.env.DEV && <DebugEnv />}
      
      {/* Rest of your app */}
    </>
  );
}
```

**Expected result**: Bottom-right corner shows green checkmarks ✅

### Test 2: Check Browser Console

Open DevTools (F12) and run:

```javascript
// Should show your Supabase URL
console.log('URL:', import.meta.env.VITE_SUPABASE_URL);

// Should show 'SET'
console.log('Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');

// Should show 'true'
console.log('Realtime:', import.meta.env.VITE_ENABLE_REALTIME);
```

**Expected output:**
```
URL: https://ysujcewkfhbenxtaguuw.supabase.co
Key: SET
Realtime: true
```

### Test 3: Check Network Tab

1. Open DevTools (F12) → Network tab
2. Filter by "supabase.co"
3. Refresh page
4. Should see successful requests to Supabase (status 200)

---

## 🚨 Common Pitfalls

### Issue 1: Dev Server Still Running

**Problem**: Changed .env.local but server didn't pick up changes

**Solution**: 
```bash
# MUST restart! Vite doesn't hot-reload env changes
# Stop: Ctrl+C
# Start: npm run dev
```

### Issue 2: Browser Cache

**Problem**: Browser still using old cached JavaScript

**Solutions**:
```bash
# Option 1: Hard refresh (Ctrl+Shift+R)

# Option 2: Clear browser cache
# Chrome: Ctrl+Shift+Delete → Clear browsing data

# Option 3: Incognito window
# Ctrl+Shift+N (Windows) or Cmd+Shift+N (Mac)

# Option 4: Disable cache in DevTools
# DevTools (F12) → Network tab → Check "Disable cache"
```

### Issue 3: Wrong File Name

**Problem**: File named incorrectly

**Check:**
```bash
# Should be exactly:
.env.local

# NOT:
.env
.env.development
.env.development.local
env.local (missing dot!)
```

### Issue 4: Typo in Variable Name

**Problem**: Variable name misspelled

**Check .env.local:**
```env
# ✅ CORRECT
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# ❌ WRONG
VITE_SUPABASE_URL=https://xxx.supabase.co  ← Typo: URL
VITE_SUPABASE_ANON_KYE=eyJ...  ← Typo: KYE
REACT_APP_SUPABASE_URL=xxx  ← Wrong prefix!
NEXT_PUBLIC_SUPABASE_URL=xxx  ← Wrong prefix!
```

### Issue 5: Trailing Slash in URL

**Problem**: URL has trailing slash

```env
# ❌ WRONG
VITE_SUPABASE_URL=https://xxx.supabase.co/

# ✅ CORRECT
VITE_SUPABASE_URL=https://xxx.supabase.co
```

### Issue 6: Quotes in .env File

**Problem**: Using quotes unnecessarily

```env
# ❌ Might cause issues
VITE_SUPABASE_URL="https://xxx.supabase.co"

# ✅ No quotes needed
VITE_SUPABASE_URL=https://xxx.supabase.co
```

---

## 🧪 Nuclear Option: Complete Reset

If nothing works, do a complete reset:

```bash
# 1. Kill all node processes
pkill -9 node

# 2. Remove all caches
rm -rf node_modules/.vite
rm -rf node_modules/.cache
rm -rf dist
rm -rf .next  # if exists

# 3. Reinstall dependencies (optional, if desperate)
# rm -rf node_modules
# npm install

# 4. Verify .env.local
cat .env.local

# 5. Restart dev server
npm run dev

# 6. Open in NEW incognito window
```

---

## 📋 Checklist

Run through this step-by-step:

- [ ] `.env.local` exists in project root (same level as package.json)
- [ ] `.env.local` uses `VITE_` prefix (not NEXT_PUBLIC_ or REACT_APP_)
- [ ] No typos in variable names
- [ ] No trailing slash in URL
- [ ] Dev server completely stopped (no node processes running)
- [ ] Vite cache cleared (`rm -rf node_modules/.vite`)
- [ ] Dev server restarted (`npm run dev`)
- [ ] Browser hard refreshed (Ctrl+Shift+R) or incognito window opened
- [ ] Console shows correct env values (run test from Step 2)
- [ ] Network tab shows successful Supabase requests

---

## 🎯 Quick Test Script

Run this to verify everything:

```bash
#!/bin/bash
echo "🔍 Checking Localhost Setup..."

# Check .env.local exists
if [ -f .env.local ]; then
    echo "✅ .env.local exists"
else
    echo "❌ .env.local NOT FOUND!"
    exit 1
fi

# Check for VITE_ prefix
if grep -q "VITE_SUPABASE_URL" .env.local; then
    echo "✅ Using VITE_ prefix"
else
    echo "❌ VITE_ prefix not found. Check your .env.local!"
    exit 1
fi

# Check if dev server is running
if lsof -ti:3000 > /dev/null; then
    echo "⚠️  Dev server already running on port 3000"
    echo "   Kill it and restart: lsof -ti:3000 | xargs kill -9"
else
    echo "✅ Port 3000 is free"
fi

echo ""
echo "📝 Next steps:"
echo "1. Kill existing server: lsof -ti:3000 | xargs kill -9"
echo "2. Clear cache: rm -rf node_modules/.vite"
echo "3. Start fresh: npm run dev"
echo "4. Hard refresh browser: Ctrl+Shift+R"
```

Save as `check-localhost.sh` and run:
```bash
chmod +x check-localhost.sh
./check-localhost.sh
```

---

## 💡 Why Production Works But Localhost Doesn't?

| Environment | Config Source | Notes |
|-------------|--------------|-------|
| **Production** (Vercel/Netlify) | Environment variables set in dashboard | Always works ✅ |
| **Localhost** | `.env.local` file | Must restart server to reload ⚠️ |

Production deployment platforms inject environment variables at build/runtime, so they always work. But Vite dev server only reads `.env.local` on startup, so you MUST restart after changes.

---

## 🆘 Still Not Working?

If after ALL these steps it still doesn't work:

1. **Check Node version:**
   ```bash
   node --version  # Should be >= 18
   npm --version   # Should be >= 9
   ```

2. **Try different terminal:**
   - Close current terminal completely
   - Open NEW terminal
   - Navigate to project
   - Run `npm run dev`

3. **Try different port:**
   ```bash
   # In package.json, change port:
   "dev": "vite --host 0.0.0.0 --port 3001"
   
   # Then: npm run dev
   # Open: http://localhost:3001
   ```

4. **Check .gitignore:**
   ```bash
   # Make sure .env.local is in .gitignore
   cat .gitignore | grep .env.local
   
   # Should show:
   .env.local
   ```

5. **Create minimal test:**
   ```typescript
   // Create: src/test-env.tsx
   export function TestEnv() {
     return <div>{import.meta.env.VITE_SUPABASE_URL || 'NOT SET'}</div>;
   }
   
   // Add to HomePage temporarily
   import { TestEnv } from './test-env';
   // <TestEnv />
   ```

---

## ✅ Success Indicators

You know it's working when:

**In Browser Console:**
```javascript
✅ import.meta.env.VITE_SUPABASE_URL shows your URL
✅ No errors about "credentials not configured"
✅ Network tab shows 200 OK from supabase.co
```

**In Terminal:**
```bash
✅ Dev server starts without warnings
✅ No "Supabase credentials not configured" in console
```

**In UI:**
```
✅ Data loads successfully
✅ No "Gagal memuat penjualan" errors
✅ Products, sales, etc all visible
```

---

**Last Updated**: 2025-12-06  
**Version**: 2.2.0
