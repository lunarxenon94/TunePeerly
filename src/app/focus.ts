// Original work © 2026 zhebuilds. AGPLv3 plus ADDITIONAL_TERMS.md.
import { useEffect, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Several dialogs can be mounted at once — Overlays renders DialogHost, OfferDialog and
// MoveDialog side by side, each deciding for itself — and every one of them installs a trap
// on document. Only the newest one may answer Tab: an older trap sees focus living in the
// dialog above it, mistakes it for focus that escaped to the background, and drags it back
// down, so two traps fight over every Tab and focus never advances past the first control.
const traps: HTMLElement[] = [];

export function focusableWithin(container: HTMLElement): HTMLElement[] {
  // A collapsed listbox or an off-screen panel keeps its nodes in the DOM, so
  // skip anything with no box: Tab must never land on an invisible control.
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((node) => !node.hidden && node.getClientRects().length > 0);
}

export function useFocusTrap(ref: RefObject<HTMLElement | null>, initial?: string): void {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    traps.push(root);
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const target = (initial ? root.querySelector<HTMLElement>(initial) : null) ?? focusableWithin(root)[0];
    target?.focus();
    if (target instanceof HTMLInputElement) target.select();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      if (traps[traps.length - 1] !== root) return;
      const items = focusableWithin(root);
      if (items.length === 0) return;
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const at = active ? items.indexOf(active) : -1;
      const next = at + (event.shiftKey ? -1 : 1);
      // Let the browser move focus while Tab stays inside the overlay; only the
      // two ends — plus focus that escaped to the background UI — need a wrap,
      // otherwise Tab would reach the sidebar and player hidden behind it.
      if (at !== -1 && next >= 0 && next < items.length) return;
      event.preventDefault();
      items[event.shiftKey ? items.length - 1 : 0].focus();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      // Remove by identity, not by pop: closing an inner menu must not evict the
      // dialog underneath it, which is still mounted and still owns a trap.
      const at = traps.indexOf(root);
      if (at !== -1) traps.splice(at, 1);
      previous?.focus();
    };
  }, [ref, initial]);
}
