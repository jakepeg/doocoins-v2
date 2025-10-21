# Mobile Authentication Broker Pattern

## Overview

This document explains how mobile (iOS/Android) authentication works using the **broker pattern** with Internet Identity.

## Problem

Internet Identity (II) issues delegations **only to HTTPS origins**. Mobile apps using Capacitor load from `capacitor://localhost`, which II rejects.

## Solution: Auth Broker Pattern

### Architecture

```
┌─────────────┐      ┌──────────────┐      ┌────────────────┐
│  Mobile App │─────▶│ Relay Page   │─────▶│ Internet       │
│  (Capacitor)│      │ (Mainnet)    │      │ Identity       │
└─────────────┘      └──────────────┘      └────────────────┘
       │                     │                      │
       │  1. Open            │  2. Authenticate     │
       │  ASWebAuth          │                      │
       │                     │◀─────────────────────┘
       │                     │  3. Store delegation
       │                     │     in backend
       │◀────────────────────┘
       │  4. Return code
       │
       │  5. Fetch delegation
       └─────────────────────▶ Backend Canister
```

### Flow Steps

1. **Mobile app generates session key** (`broker-simple.js`)

   - Creates Ed25519 keypair
   - Stores private key in localStorage
   - Encodes public key as DER

2. **Opens relay in ASWebAuthenticationSession**

   - Native browser window (not WebView)
   - URL: `https://{canister}.icp0.io/auth/relay?nonce={nonce}&publicKey={pubkey}&return=doocoins://ii-callback`

3. **Relay page authenticates with II** (`AuthRelay.jsx`)

   - Parses session public key from URL
   - Calls `authClient.login()` with II
   - Receives delegation chain for session key
   - **Critical:** Stores using `DelegationChain.toJSON()` format

4. **Relay stores delegation in backend**

   - Calls `putAuthBlob(nonce, code, blob)`
   - Blob = JSON-serialized delegation chain
   - Redirects to `doocoins://ii-callback#code={code}&nonce={nonce}`

5. **Mobile app receives callback** (native deep link)

   - Extracts `code` and `nonce` from URL
   - Calls `takeAuthBlob(code, nonce)` on backend
   - Reconstructs `DelegationChain` from JSON
   - Creates `DelegationIdentity` with session key + chain
   - Dispatches `broker:auth-complete` event

6. **AuthProvider updates state**
   - Listens for `broker:auth-complete` event
   - Sets identity and creates authenticated actor
   - User is logged in!

## Implementation Files

### Mobile Client (`src/frontend/utils/broker-simple.js`)

```javascript
// Key function: handleBrokerCallback
export async function handleBrokerCallback(callbackUrl) {
  const { code, nonce } = parseCallbackUrl(callbackUrl);

  // Fetch delegation blob from backend
  const result = await actor.takeAuthBlob(code, nonce);
  const chainData = JSON.parse(decoder.decode(result[0]));

  // Reconstruct identity
  const sessionIdentity = restoreSessionIdentity();
  const chain = DelegationChain.fromJSON(chainData);
  const delegationIdentity = DelegationIdentity.fromDelegation(
    sessionIdentity,
    chain
  );

  // Notify app
  window.dispatchEvent(
    new CustomEvent("broker:auth-complete", {
      detail: { identity: delegationIdentity },
    })
  );
}
```

### Relay Page (`src/frontend/screens/AuthRelay.jsx`)

```javascript
// Key: Use DelegationChain.toJSON() for proper serialization
const chainJson = delegationChain.toJSON();
const chainBlob = encoder.encode(JSON.stringify(chainJson));

await actor.putAuthBlob(nonce, code, chainBlob);
```

### Auth Provider (`src/frontend/use-auth-client.jsx`)

```javascript
// Listen for broker completion
useEffect(() => {
  const handler = (event) => {
    const { identity } = event.detail;
    setIdentity(identity);
    const newActor = createActor(canisterId, { agentOptions: { identity } });
    setActor(newActor);
    setIsAuthenticated(true);
  };

  window.addEventListener("broker:auth-complete", handler);
  return () => window.removeEventListener("broker:auth-complete", handler);
}, []);
```

## Critical Details

### 1. Delegation Chain Serialization

**Wrong:**

```javascript
JSON.stringify(delegationChain); // Breaks public key format
```

**Correct:**

```javascript
JSON.stringify(delegationChain.toJSON()); // Proper format
```

The `toJSON()` method serializes public keys as hex strings in the format that `DelegationChain.fromJSON()` expects.

### 2. Session Key Storage

Store the session Ed25519 private key in localStorage:

```javascript
localStorage.setItem(
  "broker-session-key",
  JSON.stringify(Array.from(keyPair.secretKey))
);
```

Restore it:

```javascript
const stored = JSON.parse(localStorage.getItem("broker-session-key"));
const identity = Ed25519KeyIdentity.fromSecretKey(new Uint8Array(stored));
```

### 3. Deep Link Configuration

**iOS** (`Info.plist`):

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>doocoins</string>
    </array>
  </dict>
</array>
```

**Android** (`AndroidManifest.xml`):

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="doocoins" android:host="ii-callback" />
</intent-filter>
```

### 4. ASWebAuthenticationSession (iOS)

Native bridge in `BrokerPlugin.swift`:

```swift
let session = ASWebAuthenticationSession(
  url: url,
  callbackURLScheme: "doocoins"
) { callbackURL, error in
  // Handle callback
}
session.presentationContextProvider = self
session.start()
```

## Backend Canister Methods

```motoko
// Store delegation blob temporarily
public shared func putAuthBlob(
  nonce: Text,
  code: Text,
  blob: Blob
) : async () {
  authBlobStore.put(code, blob);
}

// Retrieve and delete blob
public shared func takeAuthBlob(
  code: Text,
  nonce: Text
) : async ?Blob {
  let blob = authBlobStore.get(code);
  authBlobStore.delete(code);
  blob
}
```

## Testing Checklist

- [ ] Session key generation works
- [ ] Relay URL opens in ASWebAuthenticationSession
- [ ] II authentication completes
- [ ] Callback returns with code/nonce
- [ ] Delegation blob retrieval succeeds
- [ ] DelegationChain reconstruction works
- [ ] Auth state updates without reload
- [ ] User can make authenticated calls

## Common Issues

### "Invalid public key" error

- **Cause:** Using `JSON.stringify(delegationChain)` instead of `.toJSON()`
- **Fix:** Always use `delegationChain.toJSON()` in relay

### "Delegation expired" error

- **Cause:** Clock skew or expired delegation
- **Fix:** Check device time, ensure delegation has 30+ day expiration

### Callback not received

- **Cause:** Deep link not registered or ASWebAuthenticationSession failed
- **Fix:** Check Info.plist, verify callback URL scheme matches

### State not updating after auth

- **Cause:** Event listener not attached or wrong event name
- **Fix:** Ensure `broker:auth-complete` listener is active

## Android Implementation Notes

For Android, replace ASWebAuthenticationSession with Chrome Custom Tabs:

```kotlin
val customTabsIntent = CustomTabsIntent.Builder().build()
customTabsIntent.launchUrl(context, Uri.parse(relayUrl))
```

Deep link handling is the same - use `android:scheme="doocoins"` intent filter.

## Security Considerations

1. **Nonce validation:** Backend should verify nonce matches
2. **Blob expiration:** Auto-delete blobs after 5 minutes
3. **One-time use:** `takeAuthBlob` deletes blob after retrieval
4. **Session key security:** Keep private key in localStorage only
5. **HTTPS only:** Relay must be on HTTPS for II to issue delegations

## References

- [Internet Identity Spec](https://internetcomputer.org/docs/references/ii-spec)
- [Capacitor Deep Links](https://capacitorjs.com/docs/guides/deep-links)
- [ASWebAuthenticationSession](https://developer.apple.com/documentation/authenticationservices/aswebauthenticationsession)
