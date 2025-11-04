# iOS Authentication Persistence Fix

## Problem

Internet Identity authentication was not persisting in iOS Capacitor app (Xcode testing). The user had to re-authenticate after every app restart, while PWA and browser versions worked fine.

## Root Causes

### 1. Debug Cache Clearing

The `AppDelegate.swift` had debug code that cleared **ALL** WKWebView storage on launch:

```swift
#if DEBUG
clearWebViewCache()  // ❌ Cleared IndexedDB and LocalStorage
#endif
```

This wiped out:

- IndexedDB (where @dfinity/auth-client stores delegations by default)
- LocalStorage (where broker session keys are stored)

### 2. iOS IndexedDB Reliability Issues

iOS WKWebView has known issues with IndexedDB persistence:

- Can be cleared by iOS when under memory pressure
- Not as reliable as localStorage in native WebView contexts
- No custom storage adapter was configured for native mode

## Solutions Implemented

### Fix 1: Disabled Blanket Cache Clearing

**File:** `src/frontend/ios/App/App/AppDelegate.swift`

Commented out the debug cache clear to preserve auth data:

```swift
// NOTE: Commented out to preserve auth delegation storage (IndexedDB)
// #if DEBUG
// clearWebViewCache()
// #endif
```

### Fix 2: Selective Cache Clearing

Updated `clearWebViewCache()` to preserve auth storage:

```swift
let websiteDataTypes = NSSet(array: [
    WKWebsiteDataTypeDiskCache,
    WKWebsiteDataTypeMemoryCache,
    WKWebsiteDataTypeCookies,
    WKWebsiteDataTypeSessionStorage,
    // WKWebsiteDataTypeLocalStorage, // KEEP for auth
    // WKWebsiteDataTypeIndexedDBDatabases, // KEEP for auth
    WKWebsiteDataTypeWebSQLDatabases
])
```

Now you can re-enable cache clearing when needed without losing auth state.

### Fix 3: LocalStorage-Based AuthClient Storage Adapter

**File:** `src/frontend/use-auth-client.jsx`

Added a localStorage adapter for iOS native mode:

```javascript
class LocalStorageAdapter {
  constructor(keyPrefix = "ic-") {
    this.keyPrefix = keyPrefix;
  }

  async get(key) {
    const item = localStorage.getItem(this.keyPrefix + key);
    return item ? JSON.parse(item) : null;
  }

  async set(key, value) {
    localStorage.setItem(this.keyPrefix + key, JSON.stringify(value));
  }

  async remove(key) {
    localStorage.removeItem(this.keyPrefix + key);
  }
}
```

Applied to AuthClient creation in native mode:

```javascript
const storageAdapter = isNative
  ? new LocalStorageAdapter("ic-auth-")
  : undefined;

const client = await AuthClient.create({
  idleOptions: {
    disableDefaultIdleCallback: true,
    disableIdle: true,
  },
  ...(storageAdapter && { storage: storageAdapter }),
});
```

### Fix 4: Dual Storage Persistence

Added redundant storage in broker flow:

```javascript
// For iOS, use both idb-keyval AND localStorage as fallback
await set("delegation", delegationJSON);
if (isNative) {
  localStorage.setItem("ic-auth-delegation", JSON.stringify(delegationJSON));
}
```

## How It Works Now

### Desktop/Web (PWA)

- Uses default IndexedDB storage (via idb-keyval)
- Works as before - no changes

### iOS Native (Capacitor)

1. AuthClient uses **localStorage** instead of IndexedDB
2. Broker flow stores delegation in **both** IndexedDB and localStorage
3. Cache clearing (when needed) preserves localStorage and IndexedDB
4. Auth persists across app restarts ✅

## Testing Steps

1. **Clean test:**

   ```bash
   cd /Users/Dev/Dev/doocoins_v2/src/frontend
   npm run build
   USE_LOCAL_ASSETS_IN_NATIVE=1 npx cap sync ios
   ```

2. **Open in Xcode:**

   - Run the app
   - Sign in with Internet Identity
   - Close the app completely (swipe up in multitasking)
   - Reopen the app
   - **Expected:** User should still be authenticated ✅

3. **Check logs:**
   ```
   [auth] AuthClient recreated with storage adapter
   [broker] delegation persisted to storage
   ```

## Why This Works

1. **localStorage is more reliable** in iOS WKWebView than IndexedDB
2. **Dual storage** provides redundancy (if one fails, the other persists)
3. **Selective cache clearing** allows development iteration without losing auth
4. **Proper storage adapter** ensures AuthClient reads from the right place

## Migration Notes

- Existing users on IndexedDB storage will continue to work (backward compatible)
- New logins will use the localStorage adapter on iOS
- No user action required - seamless transition

## References

- [iOS WKWebView Storage Issues](https://developer.apple.com/forums/thread/660168)
- [@dfinity/auth-client Storage Documentation](https://github.com/dfinity/agent-js/tree/main/packages/auth-client)
- [Capacitor Storage Best Practices](https://capacitorjs.com/docs/guides/storage)
