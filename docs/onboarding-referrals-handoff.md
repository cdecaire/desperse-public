# Onboarding + Referrals — State of Work (branch `pr-47-rebuilt`)

_Last updated: 2026-07-11. Written for any agent picking up onboarding/referral work — this branch supersedes the original PR 47, which was rebuilt locally against the real referral backend (#44) and then merged with main through #48._

## What this branch contains

### 1. First-run onboarding flow (`/onboarding`)

Three-step wizard in `src/components/onboarding/`:

- **`OnboardingShell.tsx`** — owns the stage state machine (`profile → firstPost → summary`), a compact horizontal `Stepper` (completed steps clickable to go back), and a two-column desktop layout with a sticky live preview. `getOnboardingSteps(stage)` is exported and reused by the invite landing page.
- **`ProfileSetupStep.tsx`** — display name (required) + avatar (required) + bio/link (optional). Mirrors the settings profile-info form vocabulary. Advances only when `deriveOnboardingState` says the profile is complete.
- **`FirstPostStep.tsx`** — one image + caption, publishes via `createPost` with `type: 'collectible'` (free collectible). Skippable ("No thanks, let me browse the work").
- **`OnboardingPreview.tsx`** — live profile-plus-first-post card that fills in as the user types; doubles as the share card on the summary step (`showPostPlaceholder={false}` there so a skipped post doesn't render an empty dashed slot).

**Completeness rule** (`src/lib/onboarding.ts`): profile is complete when `displayName` and `avatarUrl` are both non-blank. Bio/link/socials deliberately do NOT gate onboarding. `shouldShowOnboarding = authenticated && auth settled && profile incomplete`.

**Entry redirects** — per-route `useEffect` redirects to `/onboarding`:

| Route | Gate |
|---|---|
| `/` (`src/routes/index.tsx`) | `isOnboardingV1Enabled() && shouldShowOnboarding` |
| `/profile` (`src/routes/profile/index.tsx`) | `isOnboardingV1Enabled() && shouldShowOnboarding` |
| `/create` (`src/routes/create/index.tsx`) | `shouldShowOnboarding` only — **not flag-gated (known inconsistency, decide before launch)** |

**Feature flag**: `VITE_FEATURE_ONBOARDING_V1` (default `'false'`, build-time). Set `true` in `.env.local` for dev. **Not set in Vercel prod — prod is off.** Flipping it on requires a redeploy.

### 2. Share pipeline (the step-3 payoff)

The share card is only a preview; the *actual* shared artifact is the link unfurl. The pipeline:

- **Invite links** `desperse.com/i/<slug>` hit the Nitro handler `server/routes/i/[code].get.ts`, which creates/restores a signed attribution session, sets the `desperse_referral_attribution` httpOnly cookie (30-day TTL), then 302s.
- **Deep link (`?next=`)**: when onboarding published a first post, share buttons mint `/i/<slug>?next=/post/<postId>`. The handler validates `next` against `/^\/post\/[A-Za-z0-9_-]+$/` (rejects absolute URLs, `//host`, traversal), sets the cookie, and redirects to the post — so scrapers unfurl the artwork's OG image (`/api/og/post/:id`) and humans land on the collect button with attribution captured in passing. A dead invite code still redirects to `next` (art > error page).
- **No post**: falls back to `/i/<code>/welcome`, which now has full OG/Twitter meta (`src/routes/i/$code/welcome.tsx` route loader + `head()`), using `/api/og/profile/<slug>` as the image. The loader also seeds the client query (`initialPreview` prop) so the landing page doesn't refetch, and skips the DB entirely when `?invalid=1`.
- **Share buttons** (summary step): Copy invite link (primary, plain `/i/<slug>`), Share on X (intent URL with prefilled text), native share when available.

### 3. Invite landing page (`src/components/referrals/InviteLandingPage.tsx`)

Three states: visitor pitch (referrer profile + up to 4 sample posts + join CTA), `NextStepsView` (just joined via this invite, not activated → onboarding hand-off), `ActivatedView` (confirmation). Copy is deliberately "recognition only, no cash value."

### 4. Referral backend (shared with main; merged cleanly)

Attribution → binding → activation, all in `src/server/utils/referrals.ts`:

1. **Attribution**: `/i/:code` (web) or `POST /api/v1/referrals/manual` (mobile/manual code entry) → signed session cookie. Sessions are single-use (`consumedAt` guard, from main #46).
2. **Binding**: at signup, both web `initAuth` (`src/server/functions/auth.ts`, main's #46 implementation) and REST `POST /api/v1/auth/init` read the cookie and call `bindReferralToUserFromAttributionSession`.
3. **Activation** (`verifyReferralActivationForUser`): requires completed profile (displayName+avatar) AND a qualifying follow made after signup. Hooked into follow mutations and profile updates. Stale pending referrals expire after 30 days.

`getMyReferralStatus` / `getInviteReferrerPreview` server fns live in `src/server/functions/referrals.ts` (alongside main's mod-gated `getReferralOwnerDashboard`).

## Merge notes (2026-07-11)

Branch merged main through `573bce5` (#48). Resolutions: `src/server/functions/auth.ts` → took main's referral binding wholesale (our duplicate `bindReferralForNewUser` dropped — main's pairs with the `consumedAt` replay guard); `src/server/functions/referrals.ts` → union of both sides; `src/server/utils/referrals.ts` auto-merged. Post-merge: tsc clean, 310/310 tests.

## Remaining work / known gaps

1. **Flag decision before launch**: set `VITE_FEATURE_ONBOARDING_V1=true` in Vercel prod (+ redeploy) and either flag-gate `/create`'s redirect or delete the flag and make all three unconditional.
2. **Missing composite index**: `getReferrerInvitePreview`'s sample-posts query (`WHERE user_id … ORDER BY created_at DESC LIMIT 6`) has no `(user_id, created_at)` index — needs a migration (**shared prod DB: migrations only with explicit per-run confirmation**).
3. **Direct welcome-URL shares get no attribution**: `/i/<code>/welcome` renders the pitch but only `/i/<code>` sets the cookie. Someone copying the post-redirect URL from the address bar shares a credit-less link. Options: bounce welcome → `/i/<code>` when no cookie present, or set the cookie from the welcome route too.
4. **Cleanup candidates** (from 2026-07-11 code review, deferred): shared `buildOgMeta()` helper (three routes now copy OG boilerplate); reuse `Stepper` on the invite landing page instead of its hand-rolled step cards; merge `NextStepsView`/`ActivatedView` into one card shell; lift onboarding draft state into the shell instead of `onDraftChange` mirror effects; dedupe avatar upload handler with settings; server fns use the codebase's `input: unknown` + hand-parse convention which forces `as never` casts at call sites (a codebase-wide pattern, not fixed here).
5. **Mobile onboarding**: not wired at all — see `docs/onboarding-mobile-spec.md`.
6. **Invite-specific OG template** (nice-to-have): current unfurl reuses the profile OG image; an invite-specific 1200×630 ("X invited you — collect their first piece") would convert better. Renderer/template infra exists under `server/utils/og/`.
