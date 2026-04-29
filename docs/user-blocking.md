# User Blocking

App Store Guideline 1.2 / Google Play UGC moderation requires functional
user-blocking on any platform that displays user-generated content. This
doc captures the contract so iOS, Android, and web can implement parity.

iOS shipped first; Android and web should mirror the API + UX semantics
described here.

## Data model

### `user_blocks`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` |
| `blocker_id` | UUID | FK → `users.id`, `ON DELETE CASCADE` |
| `blocked_id` | UUID | FK → `users.id`, `ON DELETE CASCADE` |
| `created_at` | TIMESTAMP | default `now()` |

Constraints:
- Unique on `(blocker_id, blocked_id)` — block is idempotent.
- CHECK `blocker_id <> blocked_id` — can't self-block.
- B-tree indexes on both `blocker_id` and `blocked_id` (the read filter
  scans both directions).

Migration: `src/server/db/migrations/add-user-blocks.ts`. Run via
`runMigration()` against the production DB before deploying any client
that calls the new endpoints.

### Block semantics

A row represents `blockerId blocks blockedId` (a single direction). The
**read-side filter is symmetric** — if either party has blocked the other,
the content is hidden in both directions. This means:

- I can't see your posts/profile/messages
- You can't see my posts/profile/messages
- Neither of us is notified that the block exists
- A blocked user can infer they're blocked indirectly (your profile 404s
  for them) but no API surface confirms it

Storing one row instead of two simplifies the unblock UX (a user only
manages "people I've blocked," not "people who blocked me") while
preserving the symmetric privacy guarantee.

## REST API

All endpoints use the standard Privy-bearer auth pattern (see
`server/auth.ts`). Response envelope matches the rest of `/api/v1/...`
(`{success, data?, error?, requestId}`).

### `POST /api/v1/users/:id/block`

Block another user. `:id` is a UUID, the target's `users.id`.

- **Auth:** required.
- **Idempotent:** repeated calls return 200; no duplicate row inserted
  (relies on the unique index).
- **400:** invalid UUID, or self-block attempt.
- **404:** target user does not exist.
- **Response:** `{success: true, data: {isBlocked: true}}`

### `DELETE /api/v1/users/:id/block`

Unblock a user.

- **Auth:** required.
- **Idempotent:** unblocking a non-block is a no-op 200.
- **Response:** `{success: true, data: {isBlocked: false}}`

### `GET /api/v1/users/me/blocked`

List the authenticated user's blocked users. Newest first. No pagination
yet — block lists are typically small. Add cursor pagination if needed.

- **Auth:** required.
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "users": [
        {"id": "...", "slug": "alice", "displayName": "Alice", "avatarUrl": "..."}
      ]
    },
    "requestId": "..."
  }
  ```

## Server-side filtering

The single helper to use everywhere:

```ts
import { getBlockedUserIdSet } from '@/server/utils/blocks'
const blocked = await getBlockedUserIdSet(viewerId)  // Set<string> of user IDs
// Use in WHERE: notInArray(posts.userId, Array.from(blocked))
```

Anonymous viewers (`viewerId == null`) get an empty Set — no-op.

### Currently filtered

| Endpoint | File | Filter |
|---|---|---|
| Feed (For You + Following) | `server/routes/api/v1/posts/index.get.ts` | `notInArray(posts.userId, blocked)` |
| Post detail | `server/routes/api/v1/posts/[id].get.ts` | 404 if author in `blocked` |
| User profile | `server/routes/api/v1/users/[slug]/index.get.ts` | 404 if target in `blocked` |

### Not yet filtered (follow-up work, in priority order)

| Surface | Files (if known) | Why it matters |
|---|---|---|
| Comments on a post | `server/routes/api/v1/posts/[id]/comments/index.get.ts` | Blocked user's comments still visible on shared posts |
| User's own posts list | `server/routes/api/v1/users/[slug]/posts.get.ts` | Same as profile — should 404 the parent before reaching this |
| Followers / Following lists | `server/routes/api/v1/users/[slug]/followers.get.ts`, `following.get.ts` | Blocked user shouldn't appear in these lists |
| Mention search | `server/routes/api/v1/users/mention-search.get.ts` | Blocked user shouldn't be `@`-mentionable |
| Notifications | `server/routes/api/v1/notifications/index.get.ts` | Activity from blocked users (likes, follows) shouldn't notify |
| DM thread creation | DM thread creation route | Should reject if blocked-pair |
| Existing DM threads | `server/routes/api/v1/messages/...` | Distinct from existing per-thread block; user-level block should also hide threads |
| Search / Explore | (varies) | Blocked users shouldn't surface in discovery |

For each, the pattern is: fetch `getBlockedUserIdSet(viewerId)` once at
the top of the handler, then either filter the WHERE clause (list
endpoints) or 404 the response (detail endpoints). Cache the Set in
`event.context` if a single request hits multiple of these paths.

## Client API contracts

### iOS (shipped — `desperse-ios` commit `ad68225`)

- `UserRepository.blockUser(_:)` → `POST /api/v1/users/{id}/block`
- `UserRepository.unblockUser(_:)` → `DELETE /api/v1/users/{id}/block`
- `UserRepository.blockedUsers()` → `GET /api/v1/users/me/blocked`
- UI:
  - `PostMoreMenu` "Block @username" (destructive, with confirm alert)
  - `ProfileView` toolbar Menu (Block + Report) when viewing other users
  - `BlockedUsersView` settings screen pushed from "Blocked accounts"

### Android (TODO)

Mirror iOS contracts. The `UserRepository`/`UserBlockingProviding`
boundary is a clean reference. Surface a `Block @username` row in the
post overflow menu and a `Manage Blocked Accounts` row in Settings →
Account.

### Web (TODO)

Mirror iOS contracts. Surface in the post overflow menu and a
`/settings/blocked` route. The web has the advantage that all surfaces
funnel through the same TanStack Query layer — adding a single
`useBlockUser`/`useBlockedUsers` hook covers the UI.

## Testing checklist

For App Store / Play Store review readiness, exercise on a real device:

1. User A blocks User B from a post's overflow menu → success toast.
2. User A's feed no longer shows User B's posts.
3. User A's profile of User B → 404 / "User unavailable" empty state.
4. User A's Blocked Accounts settings screen lists User B with Unblock.
5. Tap Unblock → User B disappears from list.
6. User A's feed now shows User B's posts again.
7. From a fresh User B login: User A's posts/profile also 404 (symmetric).
8. User B can't DM User A (existing per-thread block + once user-level
   filter lands in DM endpoints).

## Open questions

1. **Existing thread-level DM block** (`server/routes/api/v1/messages/threads/[threadId]/block.post.ts`)
   pre-dates user-level block. We should decide whether thread block becomes
   a no-op (subsumed by user-level block) or remains a separate finer-
   grained tool. Lean toward subsume; thread block is rarely used and
   adds API surface area.
2. **Block during active DM:** if A and B have an open thread and A
   blocks B, should existing messages disappear for B, or only stop
   future delivery? Standard pattern (Twitter, Instagram) is the latter
   — the thread vanishes for the blocker, the blocked user sees the
   thread but no new messages can be sent.
3. **Cascade on user delete:** the `ON DELETE CASCADE` on both FKs means
   when a user deletes their account, all their block records vanish —
   they can't keep "blocked" people post-deletion. This is correct.
