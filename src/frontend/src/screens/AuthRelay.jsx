import React, { useEffect, useState } from "react";
import { AuthClient } from "@dfinity/auth-client";

// Note: This page is intended to run in a top-level browser context (Safari/ASWebAuthenticationSession), not inside WKWebView.
// It starts the Internet Identity flow, then stores the delegation package via putAuthBlob and redirects back to the app.
// For now, this is a scaffold with TODOs. It won't change existing behavior until wired.

export default function AuthRelay() {
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const nonce = url.searchParams.get("nonce");
        const ret = url.searchParams.get("return");
        if (!nonce || !ret) throw new Error("Missing nonce/return params");

        const client = await AuthClient.create({
          idleOptions: { disableDefaultIdleCallback: true, disableIdle: true },
        });

        // TODO(auth-relay): Start II in this top-level context, on success:
        // 1) Serialize the delegation package into a compact Blob/Uint8Array
        // 2) Call backend putAuthBlob(code, nonce, blob, expiresAt)
        // 3) Redirect back to `${ret}?code=${code}&nonce=${nonce}`

        // Placeholder: redirect back immediately so this page is non-breaking while we wire things.
        window.location.replace(`${ret}?error=not-yet-implemented`);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1>Authenticating…</h1>
      {error && <p style={{ color: "tomato" }}>Error: {error}</p>}
      <p>This page will complete sign-in and return to the app.</p>
    </div>
  );
}
