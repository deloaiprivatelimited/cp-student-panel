// useDisableCopyPaste.js
import { useEffect } from "react";

/**
 * options:
 *  - enabled: boolean — if true, wire handlers
 *  - allowInputs: boolean — allow copy/paste in <input>, <textarea>, [contenteditable]
 *  - blockContextMenu: boolean
 */
export default function useDisableCopyPaste({
  enabled = true,
  allowInputs = true,
  blockContextMenu = true,
} = {}) {
  useEffect(() => {
    if (!enabled) return;

    const isEditable = (el) => {
      if (!el) return false;
      const tag = (el.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return true;
      if (el.isContentEditable) return true;
      return false;
    };

    // Block keyboard shortcuts
    const onKeyDown = (e) => {
      // allow shortcuts in editable fields if allowInputs === true
      if (allowInputs && isEditable(e.target)) return;

      const ctrl = e.ctrlKey || e.metaKey;
      const key = (e.key || "").toLowerCase();

      // block common copy/paste/select shortcuts
      if (ctrl && (key === "c" || key === "v" || key === "x" || key === "a")) {
        e.preventDefault();
        e.stopPropagation();
      }

      // optionally block context menu key (some keyboards)
      if (key === "contextmenu") {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Block right-click context menu
    const onContextMenu = (e) => {
      if (blockContextMenu) {
        if (allowInputs && isEditable(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Block clipboard events
    const onCopy = (e) => {
      if (allowInputs && isEditable(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      // Optionally: record attempt (analytics)
    };
    const onCut = (e) => {
      if (allowInputs && isEditable(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    const onPaste = (e) => {
      // allow paste into inputs if requested
      if (allowInputs && isEditable(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("contextmenu", onContextMenu, true);
    document.addEventListener("copy", onCopy, true);
    document.addEventListener("cut", onCut, true);
    document.addEventListener("paste", onPaste, true);

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("contextmenu", onContextMenu, true);
      document.removeEventListener("copy", onCopy, true);
      document.removeEventListener("cut", onCut, true);
      document.removeEventListener("paste", onPaste, true);
    };
  }, [enabled, allowInputs, blockContextMenu]);
}
