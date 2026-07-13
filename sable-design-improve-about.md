# `/about` — current-state findings (improve pass)

Target: `src/routes/about.tsx` (Sable-native: imports `@cdecaire/sable` `Reveal`/`TextReveal`, `@cdecaire/sable/layout` `Region`/`Row`/`Stack`, plus the project's own shims in `src/components/ui/*`). Not a page this skill built — no prior rationale doc existed before this run.

Rendered instance: `http://localhost:3000/about`, captured live via `claude-in-chrome` at desktop (1440px, resized window ~1426–1456px viewport) and mobile (390×844) widths, in both the site's light default and dark (toggled via the header theme switch). Screenshots were viewed in-session (not exported to a persisted path this run — degraded per improve.md §2, labeled here explicitly). No `+ focus` was given, so this is a full-pass audit across layout, motion, and component fidelity.

## Section-by-section inventory

| Section | Container | Motion | Notes |
|---|---|---|---|
| `HeroSection` | `Region max="wide"`, 2-col grid (`0.88fr`/`1.12fr` on `lg`) | `TextReveal` word-cascade on H1 (confirmed animating on load, both modes) | Live `LiveCreatorPreview` card on the right pulls real profile+post data via `useQuery`; has a bespoke skeleton |
| `AudienceSection` | `Region max="wide"`, bordered/divided 2-col grid | Wrapped in `<Reveal>` | Card grid: title, body, checklist, metric footer |
| `WorkModesSection` | `Region max="wide"`, 4-col grid | Wrapped in `<Reveal>` | Icon chip + title + body per mode |
| `LiveGallerySection` | `Region max="full"` (only section not `max="wide"` — genuine width-rhythm variety, good) | **None** | Live `GalleryGrid` of trending posts |
| `HowItWorksSection` | `Region max="wide"`, 2-col grid | **None** | Numbered (`01`–`04`) static cards |
| `PrinciplesSection` | `Region max="wide"` | **None** | Bad→good comparison rows in one bordered block |
| `TrustSection` | `Region max="wide"`, 3-col grid | **None** | Icon + title + body per stack item |
| `FinalCta` | `Region max="wide"` | **None** | Closing CTA row |

**Headline motion finding**: only 3 of 8 sections have any entrance choreography (`TextReveal` on the H1, `Reveal` on Audience and Work Modes). The other 5 — including the live gallery, the numbered how-it-works steps, the principles comparison, the trust stack, and the final CTA — pop in with zero reveal. This is the single largest, lowest-risk improvement available (`<Reveal>` is already imported and used twice in this same file, so the primitive and its import are already in scope).

## Source inventory — token/component hygiene

1. **Hand-rolled pill instead of `Badge`** (`HeroSection`, the `VALUE_PROPS` row): `<span className="rounded-full border border-border px-3 py-1 text-label-md text-muted-foreground">`. The project already has `src/components/ui/badge.tsx` wrapping Sable's `Badge`, and its `outline` variant (`bg-transparent border border-border text-foreground`) is nearly identical to this hand-rolled treatment. Currently reimplemented instead of reused.
2. **Hand-rolled cards instead of `Card`** (`AudienceSection`, `WorkModesSection`, `HowItWorksSection`, `TrustSection`, `LiveCreatorPreview`): all use raw `<div className="rounded-lg border border-border bg-card p-5 ...">` rather than `src/components/ui/card.tsx`'s `Card`/`CardContent`. Consistent hand-rolling, not a one-off — the whole page reimplements the same card shell six times instead of once.
3. **Raw arbitrary shadow value, not a token** (`LiveCreatorPreview`, all three states — loading, empty, live): `shadow-[0_8px_8px_rgba(0,0,0,0.18)]`. DESIGN.md's shadow tokens (`shadow-sm`/`shadow`/`shadow-lg`/`shadow-xl`) cover this exact "card lift" use case; this bypasses them with a literal rgba value repeated three times.
4. **Raw, untokenized hover-motion duration** (`LiveCreatorPreview` gallery thumbnails): `transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100`. It does correctly respect `motion-reduce`, but the `duration-700` is a bare Tailwind utility, not a Sable motion token — every other interactive element on the page routes through the `motion-interactive` class instead.
5. **Compliant / no violation found**: no raw `zinc-*`/hex/oklch literals in the file; all prose widths (`max-w-[54ch]`–`max-w-[64ch]`) are under the 65ch doctrine ceiling; radius usage matches the ladder (`rounded-full` on pills/buttons, `rounded-lg` on cards); `LiveGallerySection`'s `max="full"` already gives the page width-rhythm variety instead of one uniform wrapper; all text links use the `motion-interactive` token.

## Interaction-state inventory

- Links (`View profile`, `Open Explore`, footer `Fees and pricing`/`Privacy`) all carry `motion-interactive` + a color-shift hover — consistent, no gaps.
- The `LiveCreatorPreview` mini-gallery thumbnails have a group-hover scale (see hygiene finding 4).
- The static info cards (Work Modes, How It Works, Trust) have **no** hover treatment at all — they aren't links, so this isn't a doctrine violation (DESIGN.md's "hover on cards" rule concerns interactive cards), but it does mean these sections read as inert compared to the animated hero.

## Screenshots (session-only, not exported to disk this run)

- Desktop, light: hero, audience, work-modes/gallery, how-it-works/principles, trust/footer — full scroll pass.
- Desktop, dark: same scroll pass, toggled via the header switch.
- Mobile (390×844), dark: hero, gallery grid, audience stat rows, work-modes/gallery-open, principles — confirms clean single-column stacking, no overflow or clipped content observed.

## Addendum — re-gather for Opportunities pass (2026-07-12)

Plan items 1–5 above are applied and verified (see plan doc). Re-read the current source (`src/routes/about.tsx`) and re-captured desktop (1440px) + mobile (390×844) in both color modes via `claude-in-chrome` to ground a follow-up Tier-2 (Opportunities) pass. Puppeteer is still not installed in this project (`PUPPETEER_AVAILABLE: no` per `context.mjs`), so screenshots are again session-only, not exported to disk — same degradation as the original run, labeled explicitly per improve.md §2.

**Tier-1 hygiene re-sweep**: no new violations found. All 5 previously-applied fixes are intact in the current source (`Reveal` on all 8 sections, `Badge` on value props, `Card` on 5 hand-rolled shells, `shadow-lg` token, `duration-(--motion-duration-slower)` token). Nothing regressed.

**New observations feeding the Opportunities tier** (see `sable-design-improve-about-plan.md` for the ranked list):
- `AudienceSection`'s metric footer (`95%` / `5%`) is plain `text-display-lg` + a label — structurally a strong match for the corpus's `big-number-mono-caption-stat` recipe (tabular numeral + mono caption + hairline), which the section already half-implements (it has the hairline via `border-t`).
- Section eyebrows (`For creator-owned media`, `Creators and collectors`, etc.) are inconsistent one-off `text-label-md` lines — no repeating device ties the 8 sections together visually.
- `WorkModesSection`'s 4-up grid is uniform width; `Edition` is the revenue-bearing option but has no more visual weight than `Post`/`Download`.
- The static icon-grid sections (`WorkModesSection`, `TrustSection`) still have zero hover treatment — noted as out-of-scope in the original plan since they're non-interactive, but confirmed again this pass as the sections that read flattest against the animated hero.
