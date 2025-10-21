# Technical Debt & Cleanup Tasks

## Completed ✅

- [x] Removed broken `src/frontend/utils/broker.js`
- [x] Documented working broker pattern in `MOBILE_AUTH_BROKER.md`
- [x] Created mobile testing guide in `MOBILE_TESTING.md`
- [x] Fixed relay delegation chain serialization (using `.toJSON()`)
- [x] Implemented broker callback loading state in `LoggedOut.jsx`

## Code Cleanup Needed

### High Priority

- [ ] **Remove debug logging from production**

  - Clean up `console.log('[broker]...')` statements in `broker-simple.js`
  - Remove verbose logging from `AuthRelay.jsx`
  - Keep only error logs for production

- [ ] **Error handling improvements**

  - Add proper error messages for network failures in broker flow
  - Handle blob expiration gracefully (show "Session expired" message)
  - Add retry logic for `takeAuthBlob` calls

- [ ] **Security hardening**
  - Add nonce verification in backend `takeAuthBlob`
  - Implement blob expiration (auto-delete after 5 minutes)
  - Rate limit `putAuthBlob` calls to prevent abuse

### Medium Priority

- [ ] **Remove dead code**

  - Search for unused migration-related code
  - Remove commented-out code blocks
  - Clean up unused imports

- [ ] **TypeScript migration**

  - Convert `broker-simple.js` to TypeScript
  - Add proper types for broker events
  - Type the custom `broker:auth-complete` event

- [ ] **Test coverage**
  - Add unit tests for delegation chain reconstruction
  - Mock II authentication in tests
  - Test error paths in broker flow

### Low Priority

- [ ] **Performance optimization**

  - Lazy load broker code (only on mobile)
  - Reduce bundle size (check for duplicate dependencies)
  - Optimize image assets for mobile

- [ ] **UI/UX improvements**

  - Better loading states during authentication
  - Add animation for "Completing sign in..." screen
  - Improve error messages for users

- [ ] **Documentation**
  - Add JSDoc comments to broker functions
  - Document backend canister methods
  - Create architecture diagram

## Known Issues

### iOS

- "UIScene lifecycle" warning (non-critical, Capacitor 7.x limitation)
- Cache clearing only works in DEBUG mode

### Android

- Not yet implemented (blocked by: need Android setup)

### Cross-Platform

- No offline mode handling
- Session doesn't persist across app updates
- Deep link handling could be more robust

## Refactoring Opportunities

### Broker Pattern

Currently split across multiple files:

- `broker-simple.js` - Core logic
- `use-auth-client.jsx` - Event listener
- `AuthRelay.jsx` - Relay page
- `BrokerPlugin.swift` - iOS native bridge

**Potential improvement:** Create a `BrokerAuth` class to encapsulate all broker logic:

```typescript
class BrokerAuth {
  async startFlow(): Promise<DelegationIdentity>;
  async handleCallback(url: string): Promise<DelegationIdentity>;
  private async generateSessionKey();
  private async fetchDelegation();
  private async reconstructIdentity();
}
```

### Auth State Management

Consider migrating from React Context to a more robust solution:

- Zustand (lightweight state management)
- Jotai (atomic state)
- TanStack Query (for async state)

### Backend Storage

Current `putAuthBlob`/`takeAuthBlob` pattern works but could be improved:

- Add encryption for blob storage
- Implement proper expiration with timers
- Add audit logging for security

## Migration Path to Production

### Before App Store Submission

1. Remove all debug logging
2. Add error tracking (Sentry/DataDog)
3. Implement proper session persistence
4. Add analytics for auth flow
5. Test on real devices (not just simulators)
6. Ensure HTTPS enforcement
7. Add rate limiting
8. Security audit

### Post-Launch Monitoring

- Track authentication success rate
- Monitor blob storage usage
- Watch for delegation expiration issues
- Track deep link failures
- Monitor memory usage on older devices

## Notes

### Why We Removed `broker.js`

The original implementation tried multiple approaches to reconstruct `DelegationChain`:

- Manual hex-to-bytes conversion
- DER prefix stripping
- Various public key format attempts

All failed with "Invalid public key" error. Root cause: relay was using `JSON.stringify(delegationChain)` instead of `delegationChain.toJSON()`.

### Lessons Learned

1. Always use library serialization methods (`.toJSON()`) instead of raw `JSON.stringify()`
2. Event-driven architecture works better than page reloads for mobile
3. Native bridges need careful URL encoding/decoding
4. Document working solutions immediately (while fresh in memory)

### Future Considerations

- Consider upstreaming broker pattern to @dfinity/auth-client
- Explore WebAuthn integration for native biometrics
- Investigate session refresh without re-authentication
- Add multi-device session management
