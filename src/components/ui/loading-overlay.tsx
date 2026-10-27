"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

type LoadingOverlayProps = {
  title: string;
  description?: string;
};

// Several overlays can be up at once (e.g. "Signing you in" handing over
// to the next page's own loading screen), so the page scroll lock is
// reference-counted: it's applied by the first overlay and only released
// when the last one goes away.
let lockCount = 0;
let savedStyles: { htmlOverflow: string; bodyOverflow: string; bodyPaddingRight: string } | null = null;

function lockPage() {
  lockCount += 1;
  if (lockCount > 1) return;

  const html = document.documentElement;
  const body = document.body;
  const scrollbarWidth = window.innerWidth - html.clientWidth;

  savedStyles = {
    htmlOverflow: html.style.overflow,
    bodyOverflow: body.style.overflow,
    bodyPaddingRight: body.style.paddingRight,
  };
  html.style.overflow = "hidden";
  body.style.overflow = "hidden";
  // Hiding the scrollbar would otherwise shift the page sideways.
  if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
}

function unlockPage() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0 || !savedStyles) return;

  document.documentElement.style.overflow = savedStyles.htmlOverflow;
  document.body.style.overflow = savedStyles.bodyOverflow;
  document.body.style.paddingRight = savedStyles.bodyPaddingRight;
  savedStyles = null;
}

function subscribeNoop() {
  return () => {};
}

/**
 * Full-screen, blocking loading state. While it's mounted the page behind
 * it is blurred and can't be clicked, scrolled, or tabbed into, so a slow
 * request can't be fired twice or interrupted halfway by another action.
 * Render it conditionally (`{isLoading ? <LoadingOverlay … /> : null}`);
 * unmounting it gives the page back, including focus.
 */
export function LoadingOverlay({ title, description }: LoadingOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  // `true` in the browser, `false` while server rendering (route
  // `loading.tsx` files are server rendered), where there's no
  // document.body to portal into.
  const isClient = useSyncExternalStore(subscribeNoop, () => true, () => false);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    previouslyFocused?.blur();
    overlayRef.current?.focus({ preventScroll: true });
    lockPage();

    // Focus is parked on the overlay; Tab is the only key that could move
    // it back onto the page underneath.
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Tab") event.preventDefault();
    }
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      unlockPage();
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, []);

  const overlay = (
    <div
      ref={overlayRef}
      tabIndex={-1}
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="loading-overlay fixed inset-0 z-[100] grid place-items-center bg-[#061229]/60 px-6 outline-none backdrop-blur-md"
    >
      <div className="loading-overlay-topbar absolute inset-x-0 top-0 h-[3px] overflow-hidden bg-white/[.06]" aria-hidden="true">
        <span className="loader-bar-long absolute inset-y-0 bg-gradient-to-r from-indigo to-highlight" />
      </div>

      <div className="loading-overlay-card flex flex-col items-center text-center">
        <span className="relative" aria-hidden="true">
          <span className="brand-mark grid h-12 w-12 place-items-center rounded-xl text-2xl font-black text-white">
            N
          </span>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-[3px] ring-[#061229]" />
        </span>
        <p className="mt-5 text-lg font-semibold tracking-tight text-white">{title}</p>
        {description ? <p className="mt-1.5 max-w-xs text-sm text-ink-muted">{description}</p> : null}
        <div className="relative mt-5 h-[3px] w-56 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <span className="loader-bar-long absolute inset-y-0 rounded-full bg-gradient-to-r from-indigo to-highlight" />
          <span className="loader-bar-short absolute inset-y-0 rounded-full bg-white/70" />
        </div>
      </div>
    </div>
  );

  // Portalled to <body> because a `transform` or `backdrop-filter` on any
  // ancestor (the sidebar, `.reveal` sections) would otherwise turn
  // `position: fixed` into "fixed to that ancestor" instead of the screen.
  return isClient ? createPortal(overlay, document.body) : overlay;
}
