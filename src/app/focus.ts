// Original work © 2026 zhebuilds. AGPLv3 plus ADDITIONAL_TERMS.md.
import { useEffect, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function focusableWithin(container: HTMLElement): HTMLElement[] {
  // A collapsed listbox or an off-screen panel keeps its nodes in the DOM, so
  // skip anything with no box: Tab must never land on an invisible control.
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((node) => !node.hidden && node.getClientRects().length > 0);
}

export function useFocusTrap(ref: RefObject<HTMLElement | null>, initial?: string): void {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const target = (initial ? root.querySelector<HTMLElement>(initial) : null) ?? focusableWithin(root)[0];
    target?.focus();
    if (target instanceof HTMLInputElement) target.select();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
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
      previous?.focus();
    };
  }, [ref, initial]);
}
