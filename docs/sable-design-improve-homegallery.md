# `improve` — HomeGallery (unauthenticated landing page)

**Target:** `src/components/home/HomeGallery.tsx` (rendered at `/` via `src/routes/index.tsx` for unauthenticated visitors), plus its section children in `src/components/home/*` and shared `src/components/layout/{PublicHeader,Footer}.tsx`.

**Theme:** `desperse` (the package default — `data-sable-theme` is not explicitly set anywhere in `__root.tsx`'s early branch; `desperse` is Sable's fallback, confirmed by DESIGN.md/styles.css). Any token-level change here is a **shared-theme** change per `refine.md` bucket B discipline.

**Sable-nativeness:** Confirmed. `PublicHeader`/`Footer` import `@cdecaire/sable/layout` (`Row`, `Center`) directly; `GalleryGrid`/`CarouselRow`'s children import `@cdecaire/sable/layout` (`Col`, `Columns`); the whole page is built on Sable's typography/color/motion tokens (`text-display-3xl`, `text-heading-2`, `bg-primary`, `motion-interactive`, etc.). `HomeGallery.tsx` itself and most of its direct section children (`ArtistShowcase`, `BrowseCategories`, `CategorySpotlight`, `CuratedRowPreview`, `HomeCtaBand`, `TrendingCreatorsRow`) don't import Sable components directly — they're hand-rolled `<section>`/`<div>` wrappers styled with Sable's Tailwind tokens. This is itself one of the doctrine gaps below (hand-rolled wrappers vs. Sable layout primitives).

**Rendered instance:** `http://localhost:3001/` — a dev server already running for this checkout (another concurrent agent session's; not one I started). Confirmed live and serving current `HomeGallery.tsx`.

## Rendered capture

### Desktop (1440×900, light mode)
- Hero: "Create. Collect. **Own.**" (last word muted-foreground), sub-copy, "Get Started" pill + "Explore the gallery →" text link. Single line at this width.
- Trending row: 4-col grid, real post art loads after a skeleton flash (grey `motion-pulse` blocks → images).
- "Own the work you love." CTA band: `bg-card` tint, centered, same button pair pattern as hero.
- Minting Now: 1 live item in this session's data (self-hiding grid, so mostly empty space next to it — visually thin single-card row).
- Featured Artist: identity block (avatar/name/stats/View profile pill) beside a 3-up work peek grid.
- Curated → Digital Art spotlight: eyebrow + heading + 4-col grid (NSFW-tagged demo content visible in this dataset — content moderation is out of scope for this pass).
- Trending Creators: horizontal `CarouselRow` of creator cards, prev/next controls visible on hover-capable input.
- New row: same 4-col grid pattern a third time.
- Discover: 6-col icon-tile grid, static.
- Closing band: "Made by an artist? Keep 95%." + "How Desperse works →", quiet (`showCta={false}` footer, no watermark wordmark).

### Dark mode (brand default)
- Verified via the header's theme toggle. Same structure; canvas correctly goes to zinc-950, cards/skeletons to zinc-900/zinc-800. No dark-mode-specific defects spotted (no light-mode color leaking through).

### Near-mobile (~686px viewport — see note below)
- Hero headline wraps to 2 lines ("Create. Collect." / "Own.") — reads fine, no overflow.
- Grids collapse to `grid-cols-2` per `GalleryGrid`'s `GRID_CLASS`.
- Header nav links (`Explore`/`Leaderboard`/`About`) are still visible at this width — they only hide below Tailwind's `sm` (640px) breakpoint, which this capture didn't quite cross.

**Tooling note:** `resize_window` on this environment has a floor around ~660–690px regardless of the requested width (390px requested → 663px actual, 700px requested → 686px actual) — a genuine sub-640px capture wasn't reachable this session. Source-level responsive classes (`hidden sm:flex`, `grid-cols-2 md:grid-cols-3 …`, `px-6 md:px-10`) were used as the basis for true-mobile assessment below, degraded per `improve.md` step 1's fallback allowance.

## Motion inventory (mandatory pass)

This is the headline finding, not a null result:

- **Zero use of Sable's motion primitives** (`Reveal`, `TextReveal`, `Presence`) anywhere in `HomeGallery.tsx` or its section children. Every section simply appears — no fade/lift on scroll-in, no hero entrance, no stagger on the grid rows.
- **Existing hover-only motion**, all via bare Tailwind transitions, not Sable's `motion-interactive`/`motion-press` recipes consistently:
  - `GalleryCard` media: `transition-transform duration-700 ease-out group-hover:scale-105` (hand-rolled, has its own `motion-reduce:` fallback — fine, but bypasses the token ladder).
  - Primary/CTA buttons (hero, `HomeCtaBand`, `ArtistShowcase`, `Footer`): `hover:scale-105 active:scale-[0.98] transition-all duration-200` repeated verbatim in 4 separate files — hand-rolled, not `motion-interactive`/`motion-press`, and drifts from DESIGN.md's own "No bounce, spring, or overshoot in product UI — physical motion belongs to the marketing surface only" (this *is* the marketing surface, so the intent is arguably fine, but the value is duplicated four times instead of being one token/utility).
  - Text links (`View all →`, nav items, footer links): correctly use `motion-interactive`.
  - `CarouselRow` arrow buttons: correctly use `motion-interactive`.
- **No section entrance choreography** — DESIGN.md explicitly reserves "physical motion" (spring/bounce/entrance) for the marketing surface, and this page qualifies, but currently uses none of it.
- **No scroll-conditional header behavior** — `PublicHeader` is `position="fixed"` always-visible, never condenses/hides on scroll (fine — nothing in the findings suggests it should; noted only for completeness).

## Component / token usage audit

- **No `Region`/`Bleed` usage anywhere in the page.** Every section is a hand-rolled `<section className="px-6 md:px-10">` (or bare, for the CTA band). This is exactly the "global inset reused for every section" pattern `build.md` step 9 calls out as a Sable anti-pattern trigger — here it's mild (the page IS mostly one width already, gallery grids legitimately want full canvas per the code's own comment: *"a gallery earns the full canvas"*), but the repeated literal `px-6 md:px-10` string across 7+ files is duplicated styling that `Region`'s `max`/`inset` props exist to centralize, and it means `--page-inset`/`--region-*` tokens (which the theme does define, per Desperse's own CSS) aren't actually driving this page's gutters — plain Tailwind arbitrary values are.
- **Hardcoded `zinc-*` Tailwind classes bypass semantic tokens** in `PublicHeader.tsx` (`border-zinc-300 dark:border-zinc-700`, `hover:bg-zinc-950 dark:hover:bg-white`, `ring-zinc-950 dark:ring-white`) and `Footer.tsx` (`text-zinc-600 dark:text-zinc-400`, `text-zinc-950 dark:text-zinc-50`, `text-zinc-500 dark:text-zinc-500`, `bg-zinc-950 dark:bg-white`). DESIGN.md's semantic layer already covers every one of these 1:1 (`border`/`muted-foreground`/`foreground`/`primary`/`primary-foreground`/`ring`) — this is manual light/dark duplication of what the semantic tokens already resolve automatically, a real (if low-severity) doctrine violation ("Don't write oklch() / don't bypass the semantic layer").
- **Repeated hand-rolled button markup.** The exact same pill-button className string (`px-8 py-4 bg-primary text-primary-foreground text-label-lg rounded-full hover:scale-105 active:scale-[0.98] transition-all duration-200 …`) is copy-pasted across the hero, `HomeCtaBand`, and `ArtistShowcase` (slightly shorter `px-6 py-3` variant), plus a fourth near-variant in `Footer`. Sable ships a `Button` component (confirmed exported from `@cdecaire/sable`) that isn't used once on this page.
- **`CarouselRow` is a fully hand-rolled carousel** (scroll-by-viewport buttons, edge-fade mask, resize-observer sync) rather than Sable's shipped `Carousel` component. It already clears the usability floor `build.md` step 9 cares about (visible arrows, works without drag-only affordance), so this is a lower-priority component-fidelity note, not a broken-UX one.
- **`GalleryGrid` already uses Sable's `Col`/`Columns` primitives correctly** (aligned-grid opt-in path) — this is the one place on the page already on-doctrine for layout.

## Layout & IA (loose, for completeness — full pass not requested as a focus)

Hero → Trending → CTA band → Minting Now → Featured Artist → Curated spotlight → Trending Creators → New → Discover → quiet closing CTA. Reasonable alternating rhythm per the file's own header comment; no structural complaint.

## Applied — status (2026-07-12)

All four plan items approved and applied in full.

| # | Item | Status | Files touched |
|---|---|---|---|
| 1 | Motion pass — hero entrance + section `<Reveal>`s, staggered grid reveals | **Applied** | `HomeGallery.tsx`, `CuratedRowPreview.tsx`, `HomeCtaBand.tsx`, `ArtistShowcase.tsx`, `CategorySpotlight.tsx`, `BrowseCategories.tsx`, `TrendingCreatorsRow.tsx` |
| 2 | Collapse 4 hand-copied CTA buttons into `Button` (`@/components/ui/button`, the project's existing Sable `Button` shim) | **Applied** | `HomeGallery.tsx`, `HomeCtaBand.tsx`, `ArtistShowcase.tsx`, `Footer.tsx` |
| 3 | Swap hardcoded `zinc-*` classes for semantic tokens | **Applied** | `PublicHeader.tsx`, `Footer.tsx` |
| 4 | Route section gutters through `Region` | **Applied** (conservative form — see note) | All 7 `src/components/home/*.tsx` section files |

Notes on how items were actually applied, where it deviated from the literal plan wording:

- **Item 2** used the project's own `Button` from `@/components/ui/button` (a pre-existing shim over Sable's `Button`, already the app's established composition pattern via `asChild`), not Sable's raw `Button` + `render` prop as the plan sketch implied — this is the more idiomatic fit for this codebase and required no new import pattern.
- **Item 4**: `Region` was applied with `inset={false}` and the original `px-6 md:px-10` className preserved, rather than switching to Sable's `--page-inset` token value. Doing the full token switch would have shrunk the gutter at both ends (`clamp(16px, 4vw, 32px)` vs. the app's `24px`/`40px` convention used consistently elsewhere across the site, including outside this page), which would have been a real visual regression for a low-priority hygiene item. This gets the section onto the `Region` primitive (landmark + future centralization point) without an uncoordinated sitewide gutter change.
- Verified: `tsc --noEmit` clean, dev server hot-reloaded with no console errors, hero/CTA-band buttons checked by hand in both light and dark mode (hover correctly inverts fill + text, legible in both modes), Discover grid's staggered reveal observed firing on scroll-in.

`HomeGallery.tsx` (and the rest of this page's component tree) is now a `refine` target for future iteration.
