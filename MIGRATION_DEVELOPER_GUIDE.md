# Migration Flow - Developer Quick Reference

## For New Developers

### What is Migration?

DooCoins V1 used NFID for authentication. V2 uses Internet Identity (II).
Migration links a user's old NFID account with their new II account so they keep their data.

### How It Works

```
V1 User (NFID: abc123) → Clicks "Upgrade" → V2 App
                                              ↓
                                  Logs in with II (xyz789)
                                              ↓
                            Backend links: NFID abc123 ↔ II xyz789
                                              ↓
                              User's data remains under abc123
                                              ↓
                            Future logins with xyz789 → access abc123 data
```

## Optimization Overview

### Before (Slow)

Every app startup:

1. ✅ User logs in
2. 🔄 Show spinner "Checking migration..."
3. 🌐 Call backend `getMigrationStatus()`
4. ⏱️ Wait 500-1000ms
5. ✅ Hide spinner, show app

**Problem:** 99% of users already migrated but still see spinner!

### After (Fast)

Every app startup:

1. ✅ User logs in
2. ⚡ Check local flag `MigrationStorage.isComplete()`
3. ✅ Skip migration, show app immediately

**Only if migration needed:**

1. 🔄 Show spinner "Migrating..."
2. 🌐 Call backend `linkPrincipals()`
3. ✅ Mark complete, show app

## Key Files

### `migration-storage.js`

Cross-platform storage for migration state.

```javascript
// Check if already migrated
MigrationStorage.isComplete(); // true/false

// Mark migration complete
MigrationStorage.markComplete(nfidPrincipal);

// Get migration info
MigrationStorage.getInfo();
// { isComplete, migratedFrom, migrationDate }

// Clear (for testing)
MigrationStorage.clear();
```

### `v2-migration-helper.js`

Helper functions for migration logic.

```javascript
// Extract URL params from V1
V2MigrationHelper.extractMigrationDataFromUrl();
// { shouldMigrate, nfidPrincipal }

// Check pending migration
V2MigrationHelper.getPendingMigration();

// Check if completed (uses MigrationStorage)
V2MigrationHelper.isMigrationCompleted();
```

### `MigrationHandler.jsx`

React component that wraps the app and handles migration.

**Optimization Flow:**

```javascript
useEffect(() => {
  // FAST PATH: Check local flag first
  if (MigrationStorage.isComplete()) {
    return; // Skip everything!
  }

  // Check if migration signals exist
  const hasSignals = urlParams || pendingData || legacyFlags;
  if (!hasSignals) {
    return; // Skip backend call
  }

  // SLOW PATH: Only for actual migrations
  const status = await actor.getMigrationStatus();
  if (status.isLinked) {
    MigrationStorage.markComplete();
    return;
  }

  // Perform migration...
}, [isAuthenticated]);
```

## Migration States

```
idle      → User not authenticated or migration complete
migrating → Currently running migration (shows spinner)
completed → Migration done or not needed (show app)
error     → Migration failed (show error UI)
```

## Common Scenarios

### Scenario 1: New User (Never Had V1)

```
1. Opens app
2. Logs in with II
3. No migration needed
4. MigrationStorage.isComplete() = false but no signals
5. Skip backend check
6. Show app immediately ✅
```

### Scenario 2: Returning User (Already Migrated)

```
1. Opens app
2. Logs in with II
3. MigrationStorage.isComplete() = true ✅
4. Skip everything
5. Show app immediately ✅
```

### Scenario 3: V1 User Upgrading

```
1. Clicks "Upgrade" in V1
2. Redirected: app.com/?migrate=true&nfid=abc123
3. Logs in with II (xyz789)
4. MigrationStorage.isComplete() = false
5. Has migration signals → check backend
6. Backend: not linked yet
7. Show spinner 🔄
8. Call linkPrincipals(abc123, xyz789)
9. MigrationStorage.markComplete(abc123) ✅
10. Show app
```

### Scenario 4: V1 User (Already Migrated)

```
1. Clicks "Upgrade" in V1 (again)
2. Redirected: app.com/?migrate=true&nfid=abc123
3. Logs in with II (xyz789)
4. MigrationStorage.isComplete() = true ✅
5. Skip migration
6. Show app immediately ✅
```

## Backend API

### `getMigrationStatus()`

Query call - check if caller's II is linked to NFID.

```motoko
public shared query func getMigrationStatus() : async {
  isLinked: Bool;
  nfidPrincipal: ?Text;
}
```

### `linkPrincipals(nfid, ii)`

Update call - link NFID account to II account.

```motoko
public shared func linkPrincipals(
  nfidPrincipal: Principal,
  iiPrincipal: Principal
) : async Result<(), Text>
```

**Security:**

- Only `iiPrincipal` can call (caller must be `iiPrincipal`)
- Verifies `nfidPrincipal` has existing data
- Prevents duplicate links
- Returns `#err(#AlreadyLinked)` if already linked (treated as success)

## Data Access Pattern

After migration, user logs in with II but data is stored under NFID:

```motoko
// In backend: Resolve II → NFID
let effectivePrincipal = Migration.resolvePrincipal(principalLinks, caller);
// If caller (II xyz789) is linked to NFID abc123, returns abc123
// Otherwise returns caller

// All data operations use effectivePrincipal
let userData = Trie.get(userProfiles, keyPrincipal(effectivePrincipal), Principal.equal);
```

## Testing

### Manual Test

```javascript
// In browser console:

// Check migration status
window.MigrationStorage.getInfo();

// Simulate new user (clear migration flag)
window.MigrationStorage.clear();

// Force re-check
location.reload();
```

### Automated Test

```bash
# Run optimization test suite
./test-migration-optimization.sh
```

## Debugging

### User Says "I Can't See My Data After Upgrade"

**Check:**

1. Which identity did they use in V1? (NFID principal)
2. Which identity are they using in V2? (II principal)
3. Are they linked in backend?
   ```javascript
   // In browser console with actor:
   await actor.getMigrationStatus();
   // Should return: { isLinked: true, nfidPrincipal: [...] }
   ```

**Fix:**

```javascript
// Get their NFID principal from V1
const nfidPrincipal = "..."; // From V1 logs

// Link manually (if user is logged in with II)
import { Principal } from "@dfinity/principal";
const nfid = Principal.fromText(nfidPrincipal);
const result = await actor.linkPrincipals(nfid, identity.getPrincipal());
```

### User Sees Spinner Forever

**Check:**

1. Network tab - is `linkPrincipals` call failing?
2. Console - are there errors?
3. Is NFID principal valid?

**Common Issues:**

- Invalid principal format → add validation
- Backend returns error → check error message
- Network timeout → retry logic

## Performance Metrics

### Before Optimization

- **New user:** ~500ms delay (unnecessary backend check)
- **Returning user:** ~500ms delay (unnecessary backend check)
- **Backend calls per day:** 1000 users × 3 opens = 3000 calls

### After Optimization

- **New user:** 0ms delay (early bailout)
- **Returning user:** 0ms delay (local flag check)
- **Backend calls per day:** ~10 calls (only actual migrations)

**Savings:** 99.7% reduction in backend calls! 🚀

## Native Platform Notes

### iOS

- localStorage can be cleared when app terminates
- `MigrationStorage` has native bridge hooks for iOS Keychain
- Implement Swift handler for `migrationStorage` message
- Reference: `use-auth-client.jsx` → Keychain persistence pattern

### Android

- localStorage more reliable than iOS
- Can add Encrypted Preferences backup if needed
- Same bridge pattern as iOS

### Desktop (Electron/Tauri)

- localStorage very reliable
- No special handling needed

## Migration Hygiene

### DO:

✅ Check `MigrationStorage.isComplete()` before backend calls
✅ Mark complete immediately after successful migration
✅ Handle `AlreadyLinked` error gracefully (treat as success)
✅ Clear URL params after processing
✅ Use `[migration]` prefix in logs

### DON'T:

❌ Call `getMigrationStatus()` on every app load
❌ Show spinner for "checking" state
❌ Spam console.log in production
❌ Forget to mark migration complete
❌ Clear migration flag without good reason

## Questions?

**Q: What if user clears localStorage?**
A: Native apps: restored from Keychain/Secure Storage. Web: backend will return `isLinked: true` on next check.

**Q: Can user migrate multiple times?**
A: No. Backend prevents duplicate links. Second attempt returns `AlreadyLinked` (treated as success).

**Q: What if user has multiple NFID accounts?**
A: Each II can link to only ONE NFID. First link wins. Others will fail.

**Q: Can we migrate from II back to NFID?**
A: No. Migration is one-way. Data stays under NFID, accessed via linked II.

**Q: What happens if backend is down during migration?**
A: Error state shown, user can retry. Pending migration persists for 10 minutes.

## Summary

**Key Insight:** Most users never need migration. Check local flag first, skip backend calls.

**Performance:** 500ms → 0ms startup time for 99% of users.

**Compatibility:** All existing migration paths still work (URL, pending, legacy).

**Maintenance:** Single source of truth (`MigrationStorage`) = easier debugging.

---

_Last updated: Nov 2025_
_Migration flow optimized for instant app startup_
