# Testing Instructions - Broker Flow Implementation

## What Was Done

✅ **Recreated complete broker flow** in `use-auth-client.jsx`:

- Capacitor iOS detection
- Broker flag check (default ON for iOS)
- webkit.messageHandlers.broker availability check
- Ed25519 session key pair generation
- Relay URL construction with nonce, publicKey, and return parameters
- ASWebAuthenticationSession trigger via webkit bridge
- Broker callback handling with delegation chain reconstruction
- Retry logic with new session keys
- Comprehensive debug alerts at every step

✅ **Built and synced**:

- Bundle size: **888.76 kB** (confirmed broker code included)
- Synced to iOS with `USE_LOCAL_ASSETS_IN_NATIVE=1`
- All debug alerts verified in bundle

✅ **Added logging to Swift**:

- AppDelegate now logs when broker handler receives message
- Logs when ASWebAuthenticationSession is created and started

## Testing Steps

### 1. Prepare Clean Build

```bash
# In Terminal:
rm -rf ~/Library/Developer/Xcode/DerivedData
```

### 2. In Xcode

1. **Delete the app** from your iPhone (press and hold app icon → Delete)
2. **Open** `/Users/Dev/Dev/doocoins_v2/src/frontend/ios/App/App.xcworkspace` in Xcode
3. **Clean Build Folder**: Product → Clean Build Folder (⌘⇧K)
4. **Select your iPhone** as the build target
5. **Build and Run** (▶️ button)

### 3. What You Should See

#### When App Launches:

You should see **NO alerts yet** (alerts only appear when you click Connect)

#### When You Click "Connect":

You should see **THREE alerts in sequence**:

1. **First Alert**:

   ```
   [DEBUG] 🚀 Broker flow starting!
   ```

   ✅ This confirms the broker condition passed

2. **Second Alert**:

   ```
   [DEBUG] Relay URL:
   https://zks5c-sqaaa-aaaah-qqf4a-cai.icp0.io/auth/relay?nonce=XXXXX&publicKey=XXXXX&return=doocoins%3A%2F%2Fii-callback
   ```

   ✅ This shows the relay URL with all parameters
   📸 **TAKE A SCREENSHOT** of this alert!

3. **Third Alert**:
   ```
   [DEBUG] ⚡ Calling native bridge now!
   ```
   ✅ This confirms we're about to call ASWebAuthenticationSession

#### After Third Alert:

- A **system browser window** (Safari/ASWebAuthenticationSession) should open
- It should load the relay page at `https://...icp0.io/auth/relay`
- The relay page should redirect to Internet Identity
- You should be able to sign in with Apple or Google
- After successful sign-in, the browser should close and return to the app
- The app should navigate to the child list screen

### 4. Alternative Scenarios

#### If You See This Alert Instead:

```
[DEBUG] NOT using broker.
iOS: true/false
Flag: true/false
Webkit: true/false
```

❌ **This means the broker condition failed**

- Check which value is `false`
- If `Webkit: false`, the Swift message handler didn't register
- Take a screenshot and let me know what the values are

#### If You See This Alert:

```
[DEBUG ERROR] Broker failed: [error message]
```

❌ **The broker flow started but crashed**

- Take a screenshot of the error message
- Check Xcode console for Swift logs

#### If II Opens INSIDE the App (WebView):

❌ **ASWebAuthenticationSession is not working**

- This means the Swift bridge isn't being called
- Or ASWebAuthenticationSession.start() is failing silently
- Check Xcode console for:
  ```
  [broker] Swift handler received message!
  [broker] Swift: relayUrl = ...
  [broker] Swift: Creating ASWebAuthenticationSession
  [broker] Swift: Starting ASWebAuthenticationSession...
  [broker] Swift: ASWebAuthenticationSession.start() called
  ```

### 5. Xcode Console Logs to Check

Open the **Debug Area** in Xcode (View → Debug Area → Show Debug Area, or ⌘⇧Y)

Look for these log messages:

**JavaScript logs (from React app):**

```
[broker] ✅ BROKER FLOW STARTING - generating session key pair
[broker] session public key: ...
[broker] FULL RELAY URL: ...
[broker] ⚡ CALLING NATIVE BRIDGE NOW with relayUrl: ...
```

**Swift logs (from AppDelegate):**

```
[broker] Swift handler received message!
[broker] Swift: relayUrl = https://...
[broker] Swift: Creating ASWebAuthenticationSession
[broker] Swift: Starting ASWebAuthenticationSession...
[broker] Swift: ASWebAuthenticationSession.start() called
```

## Expected Results

✅ **SUCCESS** looks like:

1. Three debug alerts appear
2. System browser opens with relay page
3. Relay redirects to Internet Identity (id.ai)
4. You can sign in with Apple or Google
5. Browser closes automatically
6. App navigates to child list screen
7. You stay logged in (delegation persisted)

❌ **FAILURE** scenarios:

- No alerts = broker flow didn't start
- Alerts but II opens in app = ASWebAuthenticationSession not working
- "NOT using broker" alert = condition check failed
- Relay error page = parameters missing or malformed

## What to Report Back

Please provide:

1. **Screenshots** of any alerts you see (especially the relay URL alert)
2. **What happened** after the alerts (did browser open? in-app? nothing?)
3. **Xcode console logs** - copy/paste the broker-related logs
4. **Final result** - did you get to child list? stuck on login? error?

## Next Steps Based on Results

- ✅ If ASWebAuthenticationSession opens → We can debug the relay page error
- ❌ If alerts show but WebView opens → Swift bridge issue
- ❌ If "NOT using broker" → Need to check condition values
- ❌ If no alerts at all → Need to debug why broker flow isn't starting

---

**Current Status:** All code is ready. Waiting for test results to proceed with debugging.

**Files Modified:**

- `/Users/Dev/Dev/doocoins_v2/src/frontend/use-auth-client.jsx` - Complete broker flow
- `/Users/Dev/Dev/doocoins_v2/src/frontend/ios/App/App/AppDelegate.swift` - Added logging
- Built and synced to iOS successfully
