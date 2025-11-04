# iOS Auth Fix - Testing Instructions

## What Was Wrong

1. **Build wasn't including the new code** - The LocalStorageAdapter changes weren't in the compiled bundle
2. **Old JavaScript files** were still in the iOS app folder
3. **Old IndexedDB auth data** was persisting but incompatible with the new storage system

## What We Fixed

1. ✅ Rebuilt with confirmed inclusion of LocalStorageAdapter (`_S` class in minified code)
2. ✅ Force-cleaned iOS public folder and re-synced fresh bundle
3. ✅ Added one-time migration to clear old auth data on app launch (DEBUG mode only)

## Testing Steps

### 1. Open in Xcode

```bash
open /Users/Dev/Dev/doocoins_v2/src/frontend/ios/App/App.xcworkspace
```

### 2. Clean Build Folder

In Xcode:

- **Product → Clean Build Folder** (Cmd+Shift+K)
- This ensures Xcode isn't using cached Swift builds

### 3. Run on Simulator or Device

- Select target device/simulator
- Click Run (Cmd+R)

### 4. Watch Console Logs

You should see:

```
🔄 Migrating to new auth storage system - clearing old IndexedDB data
✅ Old auth data cleared for migration
✅ Migration complete - users will need to re-authenticate once
```

### 5. Sign In

- Sign in with Internet Identity
- Complete the auth flow

### 6. Check Browser Console (Safari Web Inspector)

In Safari:

- **Develop → [Your Device/Simulator] → localhost**
- Watch for these logs:

```
[broker] ✅ BROKER FLOW STARTING - generating session key pair
[broker] delegation persisted to storage
[broker] AuthClient recreated with storage adapter
[broker] login complete - using AuthClient identity
```

### 7. **CRITICAL TEST: Close and Reopen App**

- **Close app completely** (double-tap home, swipe up)
- **Wait 5 seconds**
- **Reopen app**
- ✅ **Expected: You should still be authenticated!**

### 8. Verify Storage

In Safari Web Inspector Console, run:

```javascript
// Check localStorage has the delegation
localStorage.getItem("ic-auth-delegation");

// Check the storage adapter is being used
console.log(
  "Keys:",
  Object.keys(localStorage).filter((k) => k.startsWith("ic-auth-"))
);
```

## What Changed in This Update

### Files Modified:

1. **`src/frontend/use-auth-client.jsx`**

   - Added `LocalStorageAdapter` class
   - Applied to native iOS AuthClient creation
   - Dual storage (IndexedDB + localStorage) in broker flow

2. **`src/frontend/ios/App/App/AppDelegate.swift`**
   - Disabled blanket cache clearing
   - Added one-time migration to clear old auth data
   - Selective cache clearing that preserves auth storage

### Code Verification:

```bash
# Verify new code is in the bundle
cd /Users/Dev/Dev/doocoins_v2/src/frontend
grep -c "ic-auth-delegation" dist/assets/index-0546713c.js
# Should output: 1

grep -c "ic-auth-delegation" ios/App/App/public/assets/index-0546713c.js
# Should output: 1
```

## Troubleshooting

### If Auth Still Doesn't Persist:

1. **Delete app from device/simulator completely**

   - Long-press app icon → Remove App
   - This clears ALL app data including UserDefaults

2. **Reinstall fresh**

   - Run from Xcode again
   - Migration will run on first launch

3. **Check Safari Console for errors**

   - Look for localStorage errors
   - Check for "storage adapter" messages

4. **Verify you're in DEBUG mode**
   - The migration only runs in DEBUG builds
   - For release builds, remove the `#if DEBUG` wrapper

### Common Issues:

**"Still not persisting"**

- Make sure you're testing with a clean app install
- Check that the migration log appears on first launch
- Verify the new JS bundle timestamp matches today

**"Can't find Safari Web Inspector"**

- In iOS Settings → Safari → Advanced → Enable Web Inspector
- In macOS Safari → Preferences → Advanced → Show Develop menu

**"localStorage.getItem returns null"**

- Sign in first, then check
- Make sure you're checking AFTER successful authentication
- Look for "[broker] delegation persisted to storage" log

## Migration Strategy for Production

When deploying to production:

1. **Keep the migration code** but remove `#if DEBUG`:

```swift
let migrationKey = "auth_storage_migrated_v1"
if !UserDefaults.standard.bool(forKey: migrationKey) {
    clearOldAuthData()
    UserDefaults.standard.set(true, forKey: migrationKey)
}
```

2. **After 2-3 app versions**, remove the migration entirely

3. **Users will need to re-authenticate once** after updating to this version

## Success Criteria

✅ Auth persists after app restart  
✅ Console shows "storage adapter" logs  
✅ localStorage contains `ic-auth-delegation` key  
✅ No repeated authentication requests  
✅ Works same as PWA/browser versions

---

**Last Updated:** Nov 4, 2025  
**Build Version:** Testing with local assets (USE_LOCAL_ASSETS_IN_NATIVE=1)  
**Main JS Bundle:** index-0546713c.js
