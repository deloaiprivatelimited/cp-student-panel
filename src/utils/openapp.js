/**
 * Try to open a native app from the web and fallback to install URL.
 *
 * options:
 *   - schemeUrl (string): custom URI scheme like "myapp://open?x=1"
 *   - universalUrl (string|optional): https link that maps to Universal/App Links
 *   - androidIntent (string|optional): full intent://...#Intent;...;end
 *   - fallbackUrl (string): web install page (store / landing)
 *   - timeout (number|optional): ms to wait before fallback (default 1200)
 *
 * Returns a controller with a `cancel()` method to stop the fallback (if you want).
 */
export function openApp({
  schemeUrl,
  universalUrl,
  androidIntent,
  fallbackUrl,
  timeout = 1200,
}) {
  if (!schemeUrl && !universalUrl && !androidIntent) {
    throw new Error("Provide at least one of schemeUrl, universalUrl, or androidIntent");
  }

  const start = Date.now();
  let fallbackTimer = null;
  let succeeded = false;

  // helpers to cleanup heuristic listeners
  const onVisibilityChange = () => {
    if (document.hidden) {
      succeeded = true;
      clearTimeout(fallbackTimer);
    }
  };
  const onPageHide = () => {
    succeeded = true;
    clearTimeout(fallbackTimer);
  };
  const onBlur = () => {
    // losing focus can indicate switch to app in some browsers
    // don't trust alone, but mark success
    succeeded = true;
    clearTimeout(fallbackTimer);
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("blur", onBlur);

  // Fallback trigger
  fallbackTimer = setTimeout(() => {
    // If heuristics saw a switch, don't fallback
    if (succeeded) {
      cleanup();
      return;
    }

    // Some heuristics: small elapsed time and window still open -> assume failed
    const elapsed = Date.now() - start;

    // If elapsed is small, maybe browser blocked immediate navigation; still fallback
    // Trigger fallback navigation
    if (fallbackUrl) {
      // Use replace to avoid back button noise
      window.location.replace(fallbackUrl);
    }
    cleanup();
  }, timeout);

  // Attempt to open app:
  const userAgent = navigator.userAgent || "";

  // 1) Prefer universal/app link if provided (recommended for mobile)
  //    Opening an https link will let the OS decide to open the app or show web.
  if (universalUrl) {
    // For most modern setups this is the cleanest.
    window.location.href = universalUrl;
    return {
      cancel() { clearTimeout(fallbackTimer); cleanup(); },
    };
  }

  // 2) If Android Chrome and androidIntent provided, use intent:// which supports fallback
  //    Detect Chrome on Android:
  const isAndroid = /Android/i.test(userAgent);
  const isChrome = /Chrome\/\d+/i.test(userAgent);
  if (isAndroid && isChrome && androidIntent) {
    // Using location.href works fine for intent URIs
    window.location.href = androidIntent;
    return {
      cancel() { clearTimeout(fallbackTimer); cleanup(); },
    };
  }

  // 3) Fallback: attempt to open via custom scheme.
  // Two common approaches: window.location or temporary iframe. Use location first.
  try {
    // Some browsers (desktop) will prompt the user. This action triggers navigation attempt.
    window.location.href = schemeUrl;
  } catch (e) {
    // older browsers / restrictions -> try iframe method
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = schemeUrl;
    document.body.appendChild(iframe);
    // remove after timeout to clean up
    setTimeout(() => {
      try { document.body.removeChild(iframe); } catch (_) {}
    }, timeout + 1000);
  }

  function cleanup() {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("blur", onBlur);
  }

  return {
    cancel() {
      clearTimeout(fallbackTimer);
      cleanup();
    }
  };
}
