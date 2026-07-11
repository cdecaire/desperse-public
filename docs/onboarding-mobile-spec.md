# Mobile Onboarding Spec (iOS / Android)

_Written 2026-07-11 for the mobile agents. Mirrors the web first-run flow shipped on branch `pr-47-rebuilt` (see `docs/onboarding-referrals-handoff.md` for the web implementation and product rationale). Everything below uses existing `/api/v1` endpoints — no new backend work is required except where explicitly marked._

## Product shape (match the web flow)

Three steps, shown to any authenticated user whose profile is incomplete:

1. **Set up your profile** — display name (required), avatar (required), bio + link (optional). This is the only gate.
2. **Create your first collectible** — one image + optional caption, published as a free collectible. Skippable; never block on it.
3. **Tell the world** — share your invite link / first post. Native share sheet is the primary affordance on mobile.

**Completeness rule** (must match web exactly): profile is complete ⇔ `displayName` and `avatarUrl` are both non-blank after trimming. Bio, link, and socials do NOT gate onboarding. Route into onboarding when authenticated + auth settled + profile incomplete; re-entry with a complete profile starts at step 2. Never show it again once complete — persist a local "seen" flag as a belt-and-suspenders, but the profile fields are the source of truth.

Design: follow the Desperse design system (dark by default, three-step compact stepper, one primary CTA per screen, 44pt/48dp touch targets). The web live-preview card (profile + first post filling in as you type) is the signature moment — replicate if feasible.

## Endpoint map

All under `/api/v1` (Nitro routes in `server/routes/api/v1/`). Auth = Privy access token, same as the rest of the mobile API.

| Step | Call | Notes |
|---|---|---|
| Gate check | `GET /users/me` | Read `displayName`, `avatarUrl` to derive completeness client-side |
| Profile save | `PATCH /users/me` | `displayName`, `bio`, `link` |
| Avatar | `POST /users/me/avatar` | Existing upload contract |
| First post media | `POST /media/upload-token` + `POST /media/upload` | Same pipeline the create flow uses |
| Publish | `POST /posts` | `{ mediaUrl, type: 'collectible', caption? }` — free collectible, same as web onboarding |
| Own profile / post count | `GET /users/me`, `GET /users/{slug}/posts` | For the "first post CTA" on own profile when step 2 was skipped |

## Referral attribution (the mobile-specific part)

Web attribution rides an httpOnly cookie set by `GET /i/:code`. Mobile equivalent:

1. **Capture the code** — from a universal link / app link (`desperse.com/i/<code>` should open the app when installed) or a manual "Have an invite code?" field on the signup screen.
2. **`POST /api/v1/referrals/manual`** with `{ code }` **before** calling `/api/v1/auth/init`. Response sets the signed `desperse_referral_attribution` cookie AND returns `{ referrer: { slug, displayName, avatarUrl, bio } }` — use that to show "Invited by X" in the signup UI.
3. **`POST /api/v1/auth/init`** (existing signup call) reads that cookie server-side and binds the referral automatically for new users. **Requirement: the HTTP client must persist cookies between these two calls** — URLSession does by default; OkHttp needs a `CookieJar`. If the client is cookie-less, that's the one place new backend work would be needed (e.g. accept an attribution token in the `auth/init` body) — coordinate before building.
4. **Activation is server-side and automatic**: completed profile + one qualifying follow after signup. The app doesn't call anything to activate — but finishing onboarding (profile step) and following a creator (surface a "follow creators" suggestion after step 3, e.g. via `GET /explore/suggested-creators`) are what trigger it.

Deep-link nuance: `desperse.com/i/<code>?next=/post/<id>` means "this share points at a post" — when handling the universal link, capture the code for attribution AND route to the post screen, mirroring the web redirect.

## Sharing (step 3)

- Invite link format: `https://desperse.com/i/<usernameSlug>`; with a first post: `https://desperse.com/i/<slug>?next=/post/<postId>` (the web handler validates `next` — only `/post/<id>` paths).
- Share text (keep parity with web): with a post — "My first collectible is live on Desperse — free to collect."; without — "Join me on Desperse."
- Use the native share sheet. Link unfurls are already handled server-side (post OG image via the deep link; profile OG card otherwise) — the app doesn't need to generate share images.

## Parity checklist before shipping

- [ ] Completeness rule identical to `src/lib/onboarding.ts` (displayName + avatar only)
- [ ] First post publishes as `type: 'collectible'`, skippable
- [ ] Manual code entry field exists (cookie-less installs can still be attributed)
- [ ] Cookie persistence verified between `referrals/manual` and `auth/init`
- [ ] Universal links for `/i/*` capture attribution before routing
- [ ] Share links use the `?next=/post/<id>` form when a first post exists
- [ ] Web feature flag `VITE_FEATURE_ONBOARDING_V1` does not gate the API — mobile can ship independently, but coordinate launch timing with web
