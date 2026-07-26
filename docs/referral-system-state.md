# Referral System — Canonical State

Status: the web referral epic is **complete and shipped to `main`** (PRs #44–#75). iOS onboarding/referrals is **in progress**. This is the system-of-record for what exists and the product decisions behind it — read it before any referral work (web or mobile) so nothing already-decided gets rebuilt or contradicted.

## What the system does

Attribution → activation → recognition, with no rewards:

1. **Attribution** — an invite link (`/i/<code>`, or `/i/<code>/welcome` direct) or manual code binds a signed attribution session to the new signup. Codes resolve to a referrer via `usernameSlug` (default) or an active custom code.
2. **Activation** — a referral becomes `activated` once the invitee completes profile + a qualifying follow (`verifyReferralActivationForUser`). Stale pending referrals expire after 30 days.
3. **Recognition** — activation count drives a profile status badge and a weekly leaderboard. Tiers: **First Signal** (≥1) → **Referrer** (≥10). No cash, perks, or transferable value — and we do **not** state that absence anywhere in copy.

## Canonical surface (web)

- **Routes:** `/i/$code` + `/i/$code/welcome` (attribution), `/leaderboard?view=referrals` (the board), `/settings/invites` (dashboard, custom code, milestones, board preview), `/top-connectors` (**redirect only** → `/leaderboard?view=referrals`).
- **Server fns** (`src/server/functions/`): `referrals.ts` (attribution, status, dashboard, custom code, `getReferralLeaderboard`), `referral-admin.ts` (moderation), `notifications.ts` (activation notifications).
- **Utils** (`src/server/utils/referrals.ts`): attribution/session, activation verify, custom-code lifecycle, leaderboard, moderation. **Pure logic** (tiers, labels, ranking, status): `src/lib/referrals.ts`.

## Settled decisions — DO NOT contradict

- **Moderation = user-level leaderboard exclusion ONLY.** `setUserLeaderboardExclusion` / `getLeaderboardExcludedUserIds` (durable events, reversible, audited). Excluding a user removes only their leaderboard ranking — profile credit, invitees, and their other referrals are untouched.
  - **Removed on purpose:** per-referral `reject`/`revoke`/`restore`/`correct` (shipped #67 → removed #68 → re-added #72 → removed again #73). Do not rebuild. Only revisit if referrals gain real incentives.
- **Leaderboard lives at `/leaderboard?view=referrals`** (a tab beside Creators/Collectors), weekly, ranked by `activated` referrals since the UTC week start. `/top-connectors` is retired.
- **Terminology:** the ≥10 badge is **"Referrer"** (never "Connector"). Board copy uses "referrals"/"invites."
- **No reward disclaimers.** Do not add "recognition only," "no cash value," "not transferable," etc. anywhere. Let users speculate.

## Mobile / iOS (REST) — parity notes

The iOS app talks to Nitro REST at `server/routes/api/v1/` (NOT the web server fns). Current referral surface:

- **Exists:** `POST /api/v1/referrals/manual.post` — manual attribution (`inviteCode`, `source: 'manual'`). `auth/init.post` binds web referral attribution on login.
- **Missing:** there is **no referral-leaderboard or referral-status REST endpoint.** `server/routes/api/v1/leaderboard/refresh.get.ts` is the **creator** leaderboard, unrelated. If iOS surfaces the referral board or status, add a `/api/v1/...` endpoint that calls `getReferralLeaderboard` / the status util.

Parity rules for any mobile referral endpoint or screen:

1. **Moderation exclusion must be applied server-side there too.** Any mobile referral-leaderboard endpoint must filter via `getLeaderboardExcludedUserIds()` exactly like the web board — moderation filters go in **both** layers (web serverFn + mobile REST), same rule as block enforcement.
2. **Mirror the settled copy:** "Referrer" not "Connector"; no reward disclaimers. Keep iOS strings in sync with the web decisions above.
3. **Same data semantics:** weekly window = UTC week start; eligibility at 10 activations; statuses `ineligible` / `awaiting` / `ranked` / `review-held`.

## Gotchas (these bit us — verify against them)

- **Dates in raw SQL:** never interpolate a JS `Date` into a drizzle ``sql`` `` fragment — postgres.js can't encode it (`ERR_INVALID_ARG_TYPE`). Bind `.toISOString()`. This 500'd the leaderboard (#74) and **passed CI** because mocked-db tests don't execute SQL. Verify DB queries against the real DB.
- **Migrations on the shared prod DB:** dev DB == prod DB. New referral migrations (0050 invite codes, 0051 notification enum) have repeatedly landed **unapplied**, 500ing the feature in prod. Run `pnpm db:check` before merging and apply pending migrations (with confirmation).
- **Agent coordination:** Hermes cards can predate in-session product decisions (that's how #72 re-added revoke/restore). When landing a referral PR, reconcile it against this doc first.
