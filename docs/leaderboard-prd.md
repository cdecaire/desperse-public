# PRD: Desperse Leaderboard

- **Status:** Implemented on `codex/leaderboard-prd`; ready for product and engineering review
- **Owner:** Product / Growth
- **Proposed route:** `/leaderboard`
- **Target release:** Phased; public creator leaderboard plus a conditional Community view

## 1. Decision summary

Build a first-class **Leaderboard** destination for Desperse, not a direct
replica of SuperRare's marketplace-volume leaderboard. The initial destination
has two distinct views: **Creators**, for people whose work is earning meaningful
recent support, and **Community**, for people bringing activated members into
Desperse through referrals. This gives non-creators a legitimate way to
participate without turning the product into a wallet-spend contest.

The Creators view ranks eligible creators over the last 30 days using confirmed
paid edition purchases, confirmed free collects, current likes, unique supporters, and
new follows created during the period. The Community view ranks eligible referrers by server-verified,
activated referrals. Neither view ranks people by wallet spend, total portfolio
value, or an invented USD conversion. Those are either unavailable, unsafe to
infer, or misaligned with a creator-first social product.

The MVP is one new public route and a read-only leaderboard API. It reuses the
existing Explore shell, creator cards, profile routes, confirmed
collection/purchase records, and referral activation records. It does not change
minting, payment, wallet, or moderation flows.

## 2. Why now

Desperse already has discovery surfaces—Trending, New, Minting Now, and
Creators—plus a `Trending Creators` row on Home. The current creator view is a
useful directory, but its ranking is an opaque all-time blend of post count,
confirmed mints, and follower count. A dedicated leaderboard creates a sharper
reason to return: see who is building momentum now, understand why, and move
directly to their work.

This is also a healthier use of a leaderboard than copying marketplace status
signals wholesale. Desperse supports both free collectible cNFTs and paid
editions in SOL or USDC. Rewarding only money would under-value genuine
distribution and would make creators compete across currencies without a
reliable, disclosed FX policy.

## 3. Reference research: SuperRare

### What the reference does

SuperRare exposes a top-level **Leaderboard** destination. The public search
index identifies separate **Artists**, **Collectors**, and **Collections** views
and shows an ETH denomination. Its current server-rendered page is largely a
client-side loading shell, so the exact ranking formula, periods, and populated
rows could not be independently verified without an authenticated/fully-rendered
session. The reference should therefore inform information architecture, not be
treated as a specification.

SuperRare is a curated Ethereum art marketplace with auctions, offers, fixed
prices, primary and secondary sales, and artist royalties. Those market
mechanics make transaction-volume and collection-value rankings natural there.

### What to borrow

- A first-class, navigable leaderboard destination—not a small Home module.
- Separate entities rather than mixing creators, collectors, and content in one
  unreadable table.
- A clear denomination or metric label beside every rank.
- Deep links from a ranked row to the relevant profile or collection.

### What not to copy

- Do not launch a collector spend ranking: it invites status competition around
  wallet size, exposes behavioral data, and has no strong discovery benefit for
  creators.
- Do not label a Desperse post grouping as a "Collection" until the product has
  an explicit creator-owned collection/series model. In the current schema,
  `collections` means a user's confirmed free cNFT collect, not an editorial or
  marketplace collection.
- Do not combine SOL and USDC into a single monetary total until a price-source,
  timestamp policy, rounding rules, and historical backfill are approved.
- Do not expose all-time volume by default. It favors early incumbents and makes
  the list less useful as a discovery surface.

### Sources

- [SuperRare Leaderboard](https://superrare.com/leaderboard) (accessed 2026-07-11;
  public HTML is a loading shell)
- [SuperRare Collections Leaderboard](https://superrare.com/leaderboard/series)
  (public search result identifies Artists, Collectors, and Collections views)
- [SuperRare offers, auctions, and pricing](https://help.superrare.com/en/articles/10629742-offers-auctions-and-pricing)
  (marketplace mechanics and primary/secondary sales context)

## 4. Product opportunity and positioning

| Dimension | SuperRare model | Desperse opportunity |
| --- | --- | --- |
| Primary signal | Marketplace activity/value | Recent, confirmed creator support |
| Economic model | ETH marketplace with primary and secondary sales | Free cNFT collects plus paid editions in SOL and USDC |
| Main audience | Art-market participants | Creators and collectors discovering original work |
| Best first entity | Artists, collectors, collections | Creators and community builders |
| Product promise | Who leads the market | Who is earning meaningful community momentum |
| Failure to avoid | Wealth/status leaderboard | Opaque, gameable popularity contest |

The differentiator is **explainable momentum**. Every row should answer “why is
this creator here?” with component metrics, not a mysterious score.

## 5. Goals and non-goals

### Goals

1. Improve discovery of active, supported creators beyond the follower graph.
2. Give non-creators a meaningful community-growth path through qualified
   referrals, rather than a spend or holdings ranking.
3. Give creators a fair, legible visibility incentive for publishing work that
   people genuinely collect or purchase.
4. Make discovery feel current with defined rolling periods and a visible
   freshness timestamp.
5. Make the destination public and discoverable without authentication while
   retaining signed-in actions such as Follow.
6. Preserve trust: only confirmed activity counts; hidden, deleted, development,
   flagged, banned, opted-out, and blocked content/users do not surface.

### Non-goals for MVP

- Ranking collectors, wallets, holdings, spending, or portfolio value.
- Ranking content series/collections, floor price, resale value, auctions, or
  royalties.
- A global USD/ETH/SOL value comparison, price oracle, or historical FX chart.
- Rewards, tokens, badges, prize pools, or automated promotion.
- Real-time rank animation or per-event rank notifications.
- Private analytics dashboards or creator-specific explanations beyond the
  public row metrics.

## 6. Users and jobs to be done

| User | Job | Success signal |
| --- | --- | --- |
| Collector/explorer | Find creators with work and support worth exploring now. | Opens a profile or work card from the leaderboard. |
| Emerging creator | Understand a credible route to greater discovery. | Can identify the public signals contributing to momentum. |
| Established creator | See current community response without all-time incumbency dominating. | Appears/re-enters a time-bounded list from recent activity. |
| Community builder | Receive recognition for bringing real, activated people into Desperse. | Appears in Community after verified referrals activate. |
| Moderator/admin | Keep unsafe, removed, test, or manipulated activity out of discovery. | Ineligible records never appear; reports have an audit trail. |

## 7. MVP experience

### Entry points and access

- Ship `/leaderboard` as a standalone public route, a peer to Explore rather
  than an Explore filter. It must render for unauthenticated and authenticated
  visitors without a login wall.
- Add a visible `Leaderboard` link to the public discovery/navigation surface so
  it is not buried under Explore. The exact header treatment should match the
  existing public-navigation hierarchy.
- Add `Leaderboard` to the authenticated **More** menu on desktop and mobile.
- Link the Home `Trending Creators` row’s “View all” to `/leaderboard?view=creators`
  when the route ships; until then retain `/explore?tab=creators`.
- Anonymous visitors can open profiles and public work. Signed-in visitors see
  Follow / Following actions; no leaderboard feature is gated by login.

### Page layout

Use the existing wide Explore rail/content shell, but make the route visually and
semantically independent from Explore. The page header contains:

- Title: `Leaderboard`
- Compact segmented view control: **Creators** (default) and **Community**,
  left-aligned rather than rendered as a second full-width tab row. Use a
  URL-controlled `view=creators|community` parameter.
- Plain-language subtitle changes with the view: `Creators earning recent
  support through collects, purchases, likes, and new followers` or `Community members
  bringing activated people into Desperse.`
- Right-aligned compact pill-style period toggle: **7 days**, **30 days**
  (default), **90 days**
- A quiet footer beneath the leaderboard contains “Updated [relative time]” and
  a compact “How ranking works” popover that does not shift the leaderboard when
  opened.

Rows use a dense, responsive creator-list treatment rather than a large card
grid:

1. Rank (with `—` for unranked/currently ineligible creators if shown in a
   future personal view)
2. Avatar, display name, and `@username`
3. One recent eligible work thumbnail when available
4. Primary stat: `support score`
5. Component metrics: `N paid editions`, `N collects`, `N likes`,
   `+N followers`
6. A fixed-width action slot with Follow / Following for other accounts and a
   quiet, non-interactive `You` label for the signed-in viewer's own row

The Community view uses the same dense identity treatment but has no work
thumbnail or Follow-derived score. Its primary metric is `N activated referrals`
for the selected period. The row exposes only aggregate counts—never the identity
of referred members.

On small screens, preserve rank, identity, primary score, and a single compact
support summary; move the rest into the row detail/accessible label. All row
controls must be keyboard reachable and have visible focus states.

### States

- **Loading:** 10 row skeletons; no rank flicker.
- **Empty by period:** Explain that no eligible creator activity was found and
  offer to choose a longer period.
- **Unavailable:** Keep the page shell, show a retry action, and never silently
  substitute an all-time list.
- **Sparse data:** Show qualifying rows only. Do not pad ranks with users who
  have no qualifying activity.
- **Tie:** Stable ordering by `creatorId`; tied scores display their ordinal
  position (1, 2, 3), not shared rank, for simple cursor pagination.

## 8. Ranking definition

### Eligibility

A creator is eligible when, within the selected period, they
have at least one qualifying event and all of the following are true:

- Creator account status is `active`.
- The post is not development content, deleted, or hidden.
- A free collect has `collections.status = 'confirmed'`.
- A paid edition has `purchases.status = 'confirmed'`, and its event timestamp
  is `mintConfirmedAt`. Confirmed free collects use `createdAt`, because the
  existing collection record has no separate confirmation timestamp.
- The viewer's block list excludes the creator; their block list excludes the
  viewer when that relationship is available in the existing query path.
- `preferences.privacy.leaderboardParticipation` is not explicitly `false`.

The Community view has a separate eligibility rule: the referrer is an active,
non-flagged, non-banned, non-opted-out user with at least one referral whose
state is `activated` in the selected period. An activation is already
server-verified: the referred user must complete a profile and follow a
pre-existing active creator who is neither themself nor their referrer. The
referral system also prevents self-referral and one referred user from producing
multiple referral records.

### Score

For each creator in the chosen period:

```
supportScore =
  (confirmedPaidEditions × 6) +
  (confirmedFreeCollects × 2) +
  (uniqueSupporters × 3) +
  (likes × 1) +
  (newFollowers × 1)
```

Definitions:

- `confirmedPaidEditions`: count of confirmed `purchases` of the creator’s
  eligible posts in the period.
- `confirmedFreeCollects`: count of confirmed `collections` of the creator’s
  eligible posts in the period.
- `uniqueSupporters`: distinct user IDs across those two confirmed event sets;
  counted once per creator per period.
- `likes`: active likes created during the period on the creator's eligible
  posts, excluding self-likes and likes from ineligible users. Because an
  unlike deletes its record, this measures currently active likes rather than
  a historical total of every like event.
- `newFollowers`: currently active follow edges created during the period,
  excluding self-follows (already prohibited by product logic) and users
  ineligible at snapshot time. This is not a true net-new count because an
  unfollow deletes the edge; the UI therefore labels it `new followers` rather
  than `net new followers`.

The score intentionally rewards conversion, engagement, and breadth of support. A paid
edition is weighted more than a free collect; unique supporters counterbalances
one highly active wallet; likes and follows remain light, secondary signals. The exact
weights live in one server-side `v2` algorithm configuration, alongside their
explanation and tests. A change requires a new algorithm version, regeneration
of snapshots, and a changelog note in the disclosure. Do not add a live admin
weight editor in MVP: versioned configuration is easy to maintain and adjust,
while retaining reproducibility and avoiding casual score manipulation.

### Community ranking

Community rank is intentionally simple:

```
communityScore = activatedReferrals
```

Only `referrals.state = 'activated'` counts, using `activatedAt` as the event
time. No click, signup-started, account-created, pending, expired, rejected, or
revoked referral is eligible. Ties resolve by the most recent activation and
then referrer ID. This makes the score explainable, inexpensive to maintain, and
resistant to low-effort referral spam.

### Deferred category behavior

Category filtering is not exposed in the initial public experience. The
snapshot and API implementation retain category scopes as a dormant capability
so a later discovery iteration can restore them without redesigning the ranking
model. Until then, the route always requests the all-category scope.

### Anti-gaming guardrails

- Deduplicate supporter contribution by creator for `uniqueSupporters`.
- Count at most one active like per user and post; exclude self-likes and likes
  from ineligible users.
- Count only confirmed records; pending, reserved, failed, abandoned, and
  fulfillment-in-progress events never influence the list.
- Exclude moderation-hidden/deleted posts, flagged users, banned users, and
  opted-out users before score aggregation, not merely when rendering results.
- Rate-limit and fraud-review unusually concentrated support. MVP should emit a
  review signal when one supporter supplies more than 50% of a creator’s paid
  edition events in a period; it does not automatically suppress a creator.
- Keep the formula public enough to understand but do not expose per-wallet
  contribution or raw internal fraud scores.
- Treat a referral as qualified only at its existing server-verified `activated`
  state; never rank link clicks or raw signups.

## 9. Desperse capability audit

| Need | Existing capability | MVP use | Gap / decision |
| --- | --- | --- | --- |
| Creator identity | `users`: profile identity and account status | Avatar, name, profile route, eligibility | None |
| Eligible work | `posts`: owner, categories, type, hidden/deleted/dev flags | Filter qualifying events and choose thumbnail | Category filtering is deferred from the public UI |
| Free support | `collections`: user, post, status, created time | Confirmed free-collect events | Existing table name must not be confused with product collections |
| Paid support | `purchases`: user, post, amount/currency, confirmation timestamps, status | Confirmed paid-edition events | Do not aggregate amount across currencies in MVP |
| Social engagement | `likes`: user, post, created time | Active likes created during the selected period | Exclude self-likes and users ineligible at snapshot time |
| Social support | `follows`: follower/following and created time | New active follows created in period | Unfollows delete the edge, so true historical net-new counts are unavailable |
| Existing creator discovery | `/explore?tab=creators`, CreatorGrid, CreatorCard, Home carousel | Shared identity/card tokens and Explore layout | Current ranking is all-time and opaque |
| Existing momentum logic | Trending post queries weight collects, purchases, comments, likes with time decay | Reference only; do not reuse post formula for creators | Needs purpose-built creator aggregation |
| Qualified community growth | `referrals`: one referrer/referred pair, server-verified `activated` state and timestamp | Community view counts activated referrals only | Do not rank clicks, pending referrals, or raw signups |
| Participation preference | `users.preferences` JSONB with default-merging and authenticated update path | Store `privacy.leaderboardParticipation` | Add type, default, validator, and UI; no table migration required |
| Content series | No explicit creator-owned series/collection entity found | Out of scope | Required before a “Collections” leaderboard |
| Secondary sales/value | No resale/listing/auction model found | Out of scope | Required before marketplace-volume/floor rankings |

## 10. Technical approach

### Request path

```
Leaderboard route / React query
  → getLeaderboard server function (wrapper only)
  → leaderboard utility
  → snapshot read or aggregate query
  → users + posts + collections + purchases + likes + follows
```

Follow the repository server boundary: the server-function file exports only a
`createServerFn` wrapper. SQL/Drizzle work belongs in a new
`src/server/utils/leaderboard.ts`; client code must not import that utility.

### API contract

`GET getLeaderboard({ view: 'creators' | 'community', period: '7d' | '30d' |
'90d', category?: string, cursor?: string, limit?: number })`

Response:

```ts
{
  success: true,
  algorithmVersion: 'v2',
  generatedAt: string,
  view: 'creators' | 'community',
  period: '7d' | '30d' | '90d',
  category: string | null,
  entries: Array<{
    rank: number,
    creator: { id: string, usernameSlug: string, displayName: string | null, avatarUrl: string | null },
    recentPost?: { id: string, mediaUrl: string, coverUrl: string | null } | null,
    score: number,
    paidEditionCount?: number,
    freeCollectCount?: number,
    likeCount?: number,
    newFollowerCount?: number,
    activatedReferralCount?: number,
  }>,
  nextCursor: string | null,
}
```

Validate `period`, the internal category scope, cursor, and an upper bounded
limit with Zod. The public route always requests the all-category scope. Use a
stable cursor that encodes snapshot ID and rank; do not use offset pagination
for a live-changing rank order.

### Freshness and performance

Use a materialized **leaderboard snapshot** generated every two hours, with an
on-demand refresh path for operations only. Two-hour freshness is sufficient for
discovery, keeps operational load predictable, and can be shortened later only
with evidence. A snapshot makes rank ordering stable across pages, provides a
trustworthy `generatedAt`, and prevents grouped multi-table aggregations from
running on every visitor request.

The implementation uses a versioned snapshot header plus entry rows (period,
category, algorithm version, generated time, rank, component counts, score).
Public reads are bounded snapshot queries rather than live multi-table
aggregations. This is preferable to storing an opaque score on the user record
because scores are period/category/algorithm specific.

If new lookup indexes are required, create them through the required Drizzle
migration workflow and review the generated SQL. Candidate indexes to validate
with `EXPLAIN ANALYZE`:

- `purchases(status, mint_confirmed_at, post_id)`
- `collections(status, created_at, post_id)`
- `likes(created_at, post_id)`
- `follows(created_at, following_id)`

The generated migration includes these source indexes plus snapshot lookup and
audit-history indexes. Its SQL was reviewed to contain only the intended tables,
constraints, and indexes, and the post-migration generation check reported no
schema drift.

### Operational requirements

- Log snapshot start/end, period/category, duration, entry count, and algorithm
  version using the `[leaderboard]` prefix. Never log wallet addresses or auth
  material.
- Track API error rate, p95 latency, snapshot age, zero-entry results, profile
  click-through, follow conversion, and period selection.
- A failed refresh leaves the last valid snapshot visible with its actual
  `generatedAt`; alert operations if it is older than 6 hours.
- Cache public reads by snapshot identity. Invalidate only when a new snapshot
  becomes active.

## 11. Accessibility, trust, and privacy

- Use semantic list/table markup appropriate to the final responsive design,
  descriptive rank labels, and accessible names for score components.
- Do not rely on color or movement to communicate rank change; rank movement is
  out of MVP.
- Respect reduced motion; no animated numeric counters are required.
- Show a short formula disclosure and “updated” timestamp. Link to a fuller
  methodology page only after one is written.
- Do not display a collector leaderboard or individual contribution history.
- Public creator performance is already inferable from public work and confirmed
  activity; still exclude blocked relationships from each viewer’s results and
  honor account moderation states.
- Add `privacy.leaderboardParticipation` to `UserPreferencesJson`. It defaults
  to `true` when absent, so existing and new users participate by default.
- Replace the current empty Security placeholder with **Privacy** at
  `/settings/account/privacy`, and reserve a future Security page for actual
  session, recovery, and account-protection controls. The Privacy page contains
  a single, clear switch: **Show my profile in the Leaderboard** (default on).
- Opting out removes the user’s own Creator or Community row at the next
  snapshot. It does not reveal referred people, and it does not retroactively
  erase their public interactions from aggregate support of other users.

### Moderation policy: `flagged`

`users.status` already defines `active`, `flagged`, and `banned`, with an optional
`flaggedReason`. The codebase does not currently establish a broad product-wide
behavior for the temporary `flagged` state, so the leaderboard must not inherit
an undefined policy. For this feature:

- `active`: eligible subject to ordinary content, block, and participation rules.
- `flagged`: excluded from all public leaderboard snapshots while under review.
- `banned`: excluded from all public leaderboard snapshots.

When moderation restores a user to `active`, they become eligible in the next
snapshot; there is no manual rank restoration. This is conservative, easy to
enforce in one query predicate, and avoids promoting accounts awaiting review.

### Moderation workflow and ownership

Manage account status from the existing **Admin → Content Moderation** report
workflow, not from a leaderboard-specific tool. A report-detail page should add
an **Account status** panel for the reported creator/user that shows current
status, current reason, and a concise audit history. Resolving or dismissing a
content report must remain separate from changing the account status.

Allowed status actions:

| Action | Intended role | Required input | Leaderboard result |
| --- | --- | --- | --- |
| Flag account | Moderator or admin | Reason | Immediately excluded |
| Restore active | Moderator or admin | Resolution note | Eligible at the next snapshot |
| Ban account | Admin (or an explicitly approved moderator capability) | Reason | Immediately excluded |

Every action must record the subject user, previous and next status, moderator
actor, reason, timestamp, and linked report ID when one exists. The existing
`flaggedReason` remains a useful current-state summary, but a new append-only
moderation-action audit record is required for accountability and reversibility.

Leaderboard reads must join current account status even when serving a snapshot,
so a newly flagged or banned user disappears immediately. The moderation action
also queues a debounced snapshot refresh; this cleans the stored ranks without
requiring a full two-hour wait. Restoring an account does not force a rank—it
only lets the next valid snapshot determine whether that user qualifies.

## 12. Success metrics and launch criteria

Measure a 28-day pre/post baseline and segment signed-in versus anonymous users.

| Metric | MVP target / guardrail |
| --- | --- |
| Leaderboard → creator profile CTR | At least 8% of leaderboard sessions |
| Profile → follow conversion | At least 3% of clicked profiles |
| Profile → work/collect intent | At least 5% of clicked profiles open a work detail or collect flow |
| Creator concentration | Top 10 creators account for no more than 60% of leaderboard visits after first month |
| Snapshot health | 99% of snapshots under 2 hours old |
| API performance | p95 public read under 400 ms from cache/snapshot |
| Trust | Zero confirmed incidents of hidden/banned/dev content appearing |

Launch requires: formula disclosure approved, moderation exclusion tests passing,
the snapshot job observed for seven days, query/index review completed, and an
on-call owner for stale snapshots identified.

## 13. Phasing

### Phase 0 — feasibility (1 small PR)

- Implement a private aggregate query or script against representative data.
- Validate timestamps, status semantics, category filtering, duplicate support,
  block/moderation exclusions, and index requirements.
- Produce an `EXPLAIN ANALYZE` note and confirm whether a snapshot is mandatory.

### Phase 1 — Public Leaderboard MVP

- Public `/leaderboard` route, public-navigation discovery link, authenticated
  More-menu link, view controls, loading / empty / error states, and
  profile/follow actions.
- Creator view, plus the Community view when the referral activation system is
  enabled in production; otherwise keep Community hidden rather than displaying
  incomplete data.
- Versioned v1 algorithms, two-hour snapshots, cursor API, telemetry,
  disclosure, privacy preference, and tests for all eligibility rules.
- Internal soft launch, then a limited public release.

### Phase 2 — quality improvements (only after MVP evidence)

- Rank delta versus prior snapshot and creator “why this week” insight.
- Saved period/category preference and shareable URLs.
- Opt-in featured modules on Home if leaderboard engagement justifies it.
- Recalibrate weights from outcomes and fraud review; publish formula version
  changes.

### Phase 3 — future entity leaderboards (separate PRDs)

- **Supporter/collector discovery:** only with a strong privacy model, explicit
  opt-in, and a creator-benefit hypothesis. Never default to spend ranking.
- **Series/collections:** only after a real series model exists with ownership,
  membership, and discoverable public metadata.
- **Marketplace value:** only after secondary sale/listing infrastructure and a
  reviewed currency-normalization source are available.

## 14. Acceptance criteria

1. `/leaderboard` loads a stable, public Creator list for 7d, 30d, and 90d;
   30d is the default. It does not require authentication.
2. The standalone public discovery link and authenticated More-menu link both
   reach the same route; signed-in users additionally see Follow actions.
3. Changing view or period updates the URL, result set, and visible methodology
   context.
4. Every Creator row displays rank, identity, support score, component support
   metrics, and a working profile link. Every Community row displays rank,
   identity, and activated-referral count without referred-member identities.
5. Only active, opted-in users and confirmed/activated eligible events
   contribute. Hidden, deleted, dev, pending, failed, reserved, abandoned,
   blocked, flagged, and banned records are excluded according to the policy.
6. `privacy.leaderboardParticipation` defaults to on and the Privacy setting
   removes an opted-out user from the next snapshot.
7. The public route requests the all-category snapshot and exposes no category
   control or category URL state.
8. Pagination does not duplicate or skip entries within a snapshot; ties resolve
   deterministically.
9. The interface is responsive, keyboard usable, screen-reader understandable,
   and consistent with the existing dark Explore shell.
10. The API observes the server-function boundary and introduces no direct DB
    import into `src/server/functions`.
11. Snapshot failure is visible to operations and does not replace a last-good
    list with misleading fallback data.
12. Type check, relevant unit/integration tests, and local route verification
    pass before release.

## 15. Decisions recorded for review

1. The public destination is named **Leaderboard**. “Creator Momentum” describes
   the Creator view’s methodology rather than the page name.
2. The Creator formula is versioned, centralized server configuration—not an
   editable production control—with component counts persisted on each snapshot.
3. `flagged` is a temporary moderation state and excludes a user until they are
   restored to `active`; `banned` also excludes them.
4. Participation is optional and defaults to on. The control lives in a new
   Account **Privacy** page, replacing the current empty Security placeholder.
5. Snapshots run every two hours. This is sufficient for discovery and can be
   reduced later with evidence.
6. The route is public and standalone. It has a public discovery link and an
   authenticated More-menu entry, rather than being buried in Explore.
7. Community participation uses activated referrals only, giving non-creators a
   durable, anti-spam way to appear on the Leaderboard.
