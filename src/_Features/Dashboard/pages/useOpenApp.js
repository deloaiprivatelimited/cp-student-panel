// useOpenApp.js
import { useCallback } from "react";
// import { openApp } from "./openApp";
import { openApp } from "../../../utils/openapp";
/**
 * useOpenApp returns a function to attempt opening the native app.
 *
 * config:
 *   - scheme: 'myapp'
 *   - universalBase: 'https://myapp.com/open'
 *   - androidPackage: 'com.mycompany.myapp'
 *   - fallbackUrl: 'https://myapp.com/install'
 *   - timeout
 *   - analytics (optional)
 */
export function useOpenApp({
  scheme,
  universalBase,
  androidPackage,
  fallbackUrl,
  timeout = 1200,
  analytics = {},
}) {
  return useCallback((params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const schemeUrl = scheme ? `${scheme}://open${qs ? "?" + qs : ""}` : null;
    const universalUrl = universalBase ? `${universalBase}${qs ? "?" + qs : ""}` : null;

    // Build android intent with fallback built into the Intent extras
    // Add S.browser_fallback_url so Chrome on Android can fall back.
    let androidIntent = null;
    if (androidPackage && scheme) {
      const fallbackEncoded = fallbackUrl ? encodeURIComponent(fallbackUrl) : "";
      // Example: intent://open?foo=bar#Intent;scheme=myapp;package=com.example.app;S.browser_fallback_url=https%3A%2F%2F...;end
      androidIntent = `intent://open${qs ? "?" + qs : ""}#Intent;scheme=${scheme};package=${androidPackage};${fallbackEncoded ? `S.browser_fallback_url=${fallbackEncoded};` : ""}end`;
    }

    return openApp({
      schemeUrl,
      universalUrl,
      androidIntent,
      fallbackUrl,
      timeout,
      analytics,
    });
  }, [scheme, universalBase, androidPackage, fallbackUrl, timeout, analytics]);
}
