# Migration Optimization Testing Checklist

## Pre-Deployment Tests

### ✅ Test 1: Build & Syntax Check

```bash
cd /Users/Dev/Dev/doocoins_v2
npm run build
```

- [ ] Build completes without errors
- [ ] No TypeScript/ESLint errors
- [ ] Bundle size reasonable

### ✅ Test 2: Run Automated Test Suite

```bash
./test-migration-optimization.sh
```

- [ ] All tests pass
- [ ] File structure correct
- [ ] Storage keys namespaced

### ✅ Test 3: Code Review

- [ ] `migration-storage.js` exists and exports `MigrationStorage`
- [ ] `MigrationHandler.jsx` uses `MigrationStorage.isComplete()` early
- [ ] `v2-migration-helper.js` imports and uses `MigrationStorage`
- [ ] Console.log statements reduced to errors only
- [ ] Migration state machine: idle → migrating → completed

---

## Deployment to Mainnet

```bash
cd /Users/Dev/Dev/doocoins_v2
npm run build && dfx deploy frontend --network ic
```

- [ ] Frontend deployed successfully
- [ ] Canister ID matches production
- [ ] Assets uploaded correctly

---

## Post-Deployment Tests (Mainnet)

### Scenario 1: Returning User (Already Migrated)

**Expected:** Instant app load, no spinner, no backend call

1. Open app in production
2. Log in with Internet Identity (previously migrated user)
3. **Check:** App loads instantly after II login
4. **Check:** No "Checking migration..." spinner
5. **Check:** Console has no migration logs
6. **Check:** Network tab shows no `getMigrationStatus` call

**Browser Console Test:**

```javascript
// Should return true
MigrationStorage.isComplete();

// Should return NFID principal
MigrationStorage.getMigratedFrom();
```

- [ ] ✅ Instant load (< 200ms from auth to app)
- [ ] ✅ No spinner
- [ ] ✅ No backend call
- [ ] ✅ `MigrationStorage.isComplete()` returns true

---

### Scenario 2: New User (Never Had V1)

**Expected:** Instant app load, no migration check

1. Open app in production (new browser/incognito)
2. Create new Internet Identity
3. Log in
4. **Check:** App loads instantly after II login
5. **Check:** No "Checking migration..." spinner
6. **Check:** No migration-related backend calls

**Browser Console Test:**

```javascript
// Should return false (never migrated)
MigrationStorage.isComplete();

// Should return null
MigrationStorage.getMigratedFrom();
```

- [ ] ✅ Instant load
- [ ] ✅ No spinner
- [ ] ✅ No backend call
- [ ] ✅ `MigrationStorage.isComplete()` returns false

---

### Scenario 3: V1 User Upgrading (First Time)

**Expected:** Shows migration spinner once, then completes

**Setup:**

1. Open V1 frontend (old NFID version)
2. Log in with NFID
3. Click "Upgrade to V2" button
4. Should redirect to V2 with URL params: `?migrate=true&nfid=abc123...`

**Test:**

1. Verify URL has migration params
2. Log in with Internet Identity
3. **Check:** See "Migrating your data..." spinner
4. **Check:** Spinner shows for 1-3 seconds
5. **Check:** See success toast: "Migration Successful!"
6. **Check:** App loads normally

**Browser Console Test:**

```javascript
// During migration:
// Network tab shows: linkPrincipals() call

// After migration:
MigrationStorage.isComplete(); // Should return true
MigrationStorage.getMigratedFrom(); // Should return NFID principal
```

**Verification:**

1. Close and reopen app
2. Log in with same II
3. **Check:** Instant load (no spinner this time!)

- [ ] ✅ Migration spinner shown
- [ ] ✅ Backend call to `linkPrincipals()` succeeds
- [ ] ✅ Success toast shown
- [ ] ✅ `MigrationStorage.markComplete()` called
- [ ] ✅ Future logins instant (no migration check)

---

### Scenario 4: V1 User Upgrading (Already Linked)

**Expected:** Instant load (migration already done)

**Setup:**

1. Use same test account from Scenario 3 (already migrated)
2. Go to V1 frontend again
3. Click "Upgrade to V2" again (shouldn't but test anyway)

**Test:**

1. Should redirect with `?migrate=true&nfid=abc123...`
2. Log in with same II as before
3. **Check:** App loads instantly (no spinner!)
4. **Check:** Backend may call `getMigrationStatus()` (returns isLinked: true)
5. **Check:** Local flag updated if needed

- [ ] ✅ Instant load (no migration needed)
- [ ] ✅ No migration spinner
- [ ] ✅ Backend returns isLinked: true (if called)
- [ ] ✅ App works normally

---

### Scenario 5: Clear localStorage Test

**Expected:** Migration state restored from backend

**Setup:**

1. Use migrated user account
2. Open browser DevTools → Application → Local Storage
3. Delete all `doocoins_*` keys

**Test:**

1. Reload page
2. Log in
3. **Check:** App loads (may show brief spinner if backend check needed)
4. **Check:** Local flag restored from backend
5. **Check:** Future logins instant again

**Browser Console Test:**

```javascript
// After reload & login:
MigrationStorage.isComplete(); // Should return true again
MigrationStorage.getMigratedFrom(); // Should return NFID
```

- [ ] ✅ Migration state restored
- [ ] ✅ App works normally
- [ ] ✅ Future logins instant

---

## Native App Tests (iOS)

### Pre-Test: Install Native App

```bash
cd /Users/Dev/Dev/doocoins_v2/src/frontend
npm run build
USE_LOCAL_ASSETS_IN_NATIVE=1 npx cap sync ios
npx cap open ios
# Build and install on iOS device
```

### Test 6: iOS Native - First Migration

1. Open app on iOS device
2. Complete migration flow (similar to Scenario 3)
3. **Check:** Migration completes successfully
4. Force quit app (swipe up)
5. Reopen app
6. **Check:** Instant load (migration state persists)

**iOS Console (Xcode) Expected Logs:**

```
[MigrationStorage] ✅ Migration state saved to Keychain
[MigrationStorage]   - NFID: abc123...
```

- [ ] ✅ Migration works on iOS
- [ ] ✅ State persists after force quit
- [ ] ✅ Keychain storage logs visible

### Test 7: iOS Native - localStorage Clearing

1. Open app (already migrated)
2. iOS may clear localStorage on app termination
3. Force quit app multiple times
4. Reopen app
5. **Check:** App still knows migration is complete
6. **Check:** Instant load (no backend check)

**Expected:** Keychain backup ensures persistence even when localStorage cleared

- [ ] ✅ Migration persists across force quits
- [ ] ✅ Instant load every time

---

## Performance Tests

### Test 8: Network Tab Analysis

**Returning User (Already Migrated):**

1. Open DevTools → Network tab
2. Clear network log
3. Reload app and log in
4. **Check:** No `getMigrationStatus` or `linkPrincipals` calls
5. **Check:** Only normal app queries (getChildren, etc.)

**Metrics:**

- [ ] ✅ Zero migration-related network calls
- [ ] ✅ Faster time to interactive (< 200ms after auth)

### Test 9: Console Log Cleanliness

1. Open DevTools → Console
2. Reload app and log in (migrated user)
3. **Check:** No migration-related logs (except errors if any)
4. **Check:** No verbose "Checking migration..." or similar

**Allowed Logs:**

- `[migration] Error: ...` (only if error)

**Not Allowed:**

- `console.log('Migration status from backend...')`
- `console.log('User authenticated, starting migration...')`
- `console.log('Checking migration status...')`

- [ ] ✅ Clean console (no verbose migration logs)
- [ ] ✅ Only essential error logs if needed

---

## Backend Integration Tests

### Test 10: Backend Migration Status API

```javascript
// In browser console with actor:
const status = await actor.getMigrationStatus();
console.log(status);
// Expected: { isLinked: true/false, nfidPrincipal: [...] or [] }
```

- [ ] ✅ API returns correct status
- [ ] ✅ `isLinked` boolean correct
- [ ] ✅ `nfidPrincipal` array correct

### Test 11: Backend Link Principals API

```javascript
// Test linking (admin/test account)
import { Principal } from "@dfinity/principal";
const nfid = Principal.fromText("...");
const ii = identity.getPrincipal();
const result = await actor.linkPrincipals(nfid, ii);
console.log(result);
// Expected: { ok: null } or { err: "AlreadyLinked" }
```

- [ ] ✅ Linking works for new pairs
- [ ] ✅ Returns AlreadyLinked for duplicates
- [ ] ✅ Security: only II can link to itself

---

## Edge Cases

### Test 12: Invalid NFID Principal

1. Manually add invalid migration params: `?migrate=true&nfid=invalid`
2. Log in
3. **Check:** No error, just skip migration
4. **Check:** App loads normally

- [ ] ✅ Invalid principal handled gracefully
- [ ] ✅ Console shows error: `[migration] Invalid NFID principal`
- [ ] ✅ App continues to load

### Test 13: Network Failure During Migration

1. Open DevTools → Network tab
2. Throttle network to "Slow 3G"
3. Attempt migration
4. **Check:** Spinner shows with timeout
5. **Check:** Error state shown if timeout
6. **Check:** Retry button works

- [ ] ✅ Network errors handled gracefully
- [ ] ✅ Error UI shown
- [ ] ✅ Retry button works

### Test 14: Concurrent Migrations

1. Open app in two browser tabs
2. Both attempt migration simultaneously
3. **Check:** One succeeds, one gets AlreadyLinked
4. **Check:** Both end up in completed state

- [ ] ✅ Race condition handled
- [ ] ✅ AlreadyLinked treated as success
- [ ] ✅ Both tabs work normally

---

## Rollback Plan

### If Issues Found Post-Deployment

**Option 1: Quick Fix**

```bash
# Fix the issue in code
git checkout -b migration-hotfix
# ... make fix
npm run build && dfx deploy frontend --network ic
```

**Option 2: Rollback to Previous Version**

```bash
# Revert commit
git revert HEAD
npm run build && dfx deploy frontend --network ic
```

**Option 3: Disable Migration Check (Emergency)**

```javascript
// In MigrationHandler.jsx, force skip:
useEffect(() => {
  setMigrationState("completed"); // Force skip
  return;
  // ... rest of code
}, []);
```

---

## Success Criteria

All of these must be true to consider deployment successful:

- [x] ✅ Build succeeds without errors
- [x] ✅ Automated tests pass
- [ ] ✅ Returning users see instant load (< 200ms)
- [ ] ✅ New users see instant load
- [ ] ✅ V1 upgraders can migrate successfully
- [ ] ✅ No migration-related backend calls for migrated users
- [ ] ✅ Console is clean (no verbose logs)
- [ ] ✅ iOS native app migration persists
- [ ] ✅ Network tab shows zero unnecessary calls
- [ ] ✅ No user-facing errors

---

## Monitoring (Post-Launch)

### Week 1: Watch for Issues

- [ ] Monitor error logs for migration failures
- [ ] Check backend call frequency (should be ~99% lower)
- [ ] Collect user feedback on startup speed
- [ ] Watch for iOS-specific issues

### Week 2-4: Optimize Further

- [ ] Implement iOS native bridge if needed
- [ ] Add migration analytics if helpful
- [ ] Clean up legacy migration code

---

## Debug Commands

**If user reports migration issues:**

```javascript
// Have them run in console:
console.log("Migration Info:", MigrationStorage.getInfo());
console.log("V2 Helper Info:", V2MigrationHelper.getMigrationInfo());
console.log("Backend Status:", await actor.getMigrationStatus());

// Force clear migration (test):
MigrationStorage.clear();
localStorage.clear();
location.reload();
```

---

## Sign-off

- [ ] Developer tested locally: ****\_\_****
- [ ] Code reviewed by: ****\_\_****
- [ ] Deployed to mainnet: ****\_\_****
- [ ] Post-deployment tests passed: ****\_\_****
- [ ] No critical issues found: ****\_\_****
- [ ] Users reporting faster startup: ****\_\_****

**Date:** ****\_\_\_\_****  
**Version:** ****\_\_\_\_****  
**Canister ID:** ****\_\_\_\_****

---

_All green? Ship it! 🚀_
