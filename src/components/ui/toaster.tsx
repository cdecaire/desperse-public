/**
 * Toast positioning shim for Sable's toast viewport.
 *
 * The toast *provider + viewport* is mounted once in `src/routes/__root.tsx`
 * via Sable's `<ToastProvider>` (it binds the global imperative `toast()` store
 * and renders the stack). Sable's default viewport is anchored top-right and the
 * provider does not expose a way to pass a className/style to its internal
 * viewport — so we re-anchor it here to match the previous Sonner placement:
 *
 *   - top-center
 *   - offset by half the 256px desktop sidebar on `lg` so it centers within the
 *     content area (Sonner used `lg:!left-[calc(50%+128px)]`)
 *   - pushed below the status bar on PWA / notched devices via
 *     `env(safe-area-inset-top)`
 *
 * Sable's viewport renders as `<div role="region" aria-label="Notifications">`,
 * which gives us a stable selector to override without touching Sable internals.
 *
 * This component injects only CSS (no provider), so it is safe to mount more
 * than once (the rules are global + idempotent). It is mounted in `__root.tsx`
 * so the placement applies on every route, including standalone routes that
 * bypass AppShell.
 */
export function Toaster() {
  return (
    <style>{`
      [role="region"][aria-label="Notifications"] {
        top: calc(1rem + env(safe-area-inset-top, 0px)) !important;
        right: auto !important;
        left: 50% !important;
        transform: translateX(-50%);
        align-items: center;
      }
      @media (min-width: 1024px) {
        [role="region"][aria-label="Notifications"] {
          left: calc(50% + 128px) !important;
        }
      }
    `}</style>
  )
}
