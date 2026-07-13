# `improve` — current-state findings: unauthenticated landing page (`HomeGallery`)

**Target**: `src/components/home/HomeGallery.tsx` (rendered at `/` for unauthenticated visitors, via `src/routes/index.tsx`), plus its section children (`CuratedRowPreview`, `HomeCtaBand`, `ArtistShowcase`, `CategorySpotlight`, `TrendingCreatorsRow`, `BrowseCategories`) and shared chrome (`PublicHeader`, `Footer`).

**Theme**: `desperse` (bare default, no `data-sable-theme` override on this page).

**Sable-nativeness**: confirmed. `PublicHeader`/`Footer` import `@cdecaire/sable/layout` (`Row`, `Center`); the gallery grid (`GalleryGrid`) uses `Col`/`Columns`; every section uses Sable's semantic tokens (`text-display-3xl`, `text-heading-2`, `bg-primary`, `motion-interactive`, etc). Not built by this skill — this is its first `improve` pass on this project (no prior `sable-design` rationale doc exists).

Rendered captured at desktop width, both color modes (light/dark), via a running dev instance on `localhost:3001`. Mobile capture was source-reasoned (Tailwind breakpoint classes) rather than rendered — the local resize tool didn't take effect on the shared window this session; the responsive classes below are unambiguous enough that this doesn't block the plan; note it if precision matters later.

## Section-by-section IA

| # | Section | Component | Container width | Notes |
|---|---|---|---|---|
| 1 | Hero | inline JSX in `HomeGallery` | `px-6 md:px-10`, no cap | Hand-rolled `<h1>` + CTA row |
| 2 | Trending | `CuratedRowPreview` → `GalleryGrid` | `px-6 md:px-10` | 2/3/4/5-col responsive grid |
| 3 | CTA band | `HomeCtaBand` | full-bleed `bg-card` band, inner `px-6 md:px-10` centered text | Only section that breaks the flat canvas |
| 4 | Minting Now | `CuratedRowPreview` | same as #2 | self-hides if empty |
| 5 | Featured Artist | `ArtistShowcase` | `px-6 md:px-10` | 2-col identity/work-peek grid |
| 6 | Curated (category spotlight) | `CategorySpotlight` | `px-6 md:px-10` | |
| 7 | Trending Creators | `TrendingCreatorsRow` → `CarouselRow` | `px-6 md:px-10` | horizontal scroll, hand-built prev/next arrows |
| 8 | New | `CuratedRowPreview` | same as #2 | |
| 9 | Discover | `BrowseCategories` | `px-6 md:px-10` | static category tile grid |
| 10 | "Made by an artist?" | inline JSX | `px-6 md:px-10` | quiet closing band, links to `/about` |
| — | Header | `PublicHeader` | fixed, full-bleed, `px-6` | logo, nav, theme toggle, login |
| — | Footer | `Footer` (`fluid`, `showCta=false`) | `px-6 md:px-10` | legal/download links only (no CTA block on this route) |

**Container-width rhythm**: every section shares the same `px-6 md:px-10` padding with no cap (`max-w-*`) — one section (`HomeCtaBand`) breaks the visual flatness with a `bg-card` band, but width-wise it's identical to every other section. No `Region`/`Bleed` primitives used anywhere on this page; every wrapper is hand-rolled. This isn't the classic "one global max-width" anti-pattern (there's no cap to begin with — it's intentionally fluid, matching `[[project-desperse-fluid-no-max-width]]`), but it does mean zero width *variety*, and it bypasses the primitives that exist to express that variety.

## Motion inventory

**Headline finding: no scroll/entrance motion anywhere on this page.** No `<Reveal>`, no `<TextReveal>`, no hero entrance, no staggered card/grid reveal. What *does* exist:

- Hero/CTA-band/artist-showcase buttons: `hover:scale-105 active:scale-[0.98] transition-all duration-200` (hand-rolled, duplicated verbatim 4 times — see Component/token usage below)
- `GalleryCard` media: `group-hover:scale-105` on the image, `transition-transform duration-700 ease-out` (component-level default, fine)
- `CarouselRow` prev/next arrows and nav links: `motion-interactive` (token-driven, fine)
- Loading skeletons: `motion-pulse` (fine)

DESIGN.md's motion section reserves "bounce, spring, or overshoot" for the marketing surface only, distinct from in-app UI — this page *is* that marketing surface, so a more expressive entrance language than the app shell uses is in-doctrine here, not a violation to dial back.

## Interaction-state inventory

- Hero/CTA/artist-showcase/footer CTA buttons: hover+active states present (scale), but hand-rolled and inconsistent in size/padding across the 4 instances.
- `PublicHeader`'s "Log in"/"Go to Feed" pill: hover state present but hardcoded to raw `zinc-950`/`white` rather than semantic tokens (see below) — will not adapt if the theme's primary/foreground ever changes from the current near-black/white pair.
- `BrowseCategories` tiles: `hover:bg-accent` + icon chip `group-hover:bg-background`, both token-driven — fine.
- Footer nav links: `motion-interactive` + raw `zinc-*` hover targets (same token-bypass issue as the header).

## Component/token usage — doctrine gaps

1. **Duplicated hand-rolled CTA buttons instead of Sable's `Button`.** The same button markup (`px-8 py-4 bg-primary text-primary-foreground text-label-lg rounded-full hover:scale-105 active:scale-[0.98] transition-all duration-200 focus-visible:ring-2 ...`) is copy-pasted in the hero, `HomeCtaBand`, and `ArtistShowcase`'s "View profile" link, with a 4th, differently-hardcoded variant in `Footer`. Sable exports `Button` (`variant="primary" size="cta"`, `render` prop for polymorphic `<Link>`/`<button>` composition) — the exact primitive for this. Zero of the four use it.
2. **Raw `zinc-*` colors bypass semantic tokens** in `PublicHeader` (`border-zinc-300 dark:border-zinc-700`, `hover:bg-zinc-950 dark:hover:bg-white`, `focus-visible:ring-zinc-950 dark:focus-visible:ring-white`) and throughout `Footer` (`text-zinc-600 dark:text-zinc-400`, `text-zinc-950 dark:text-zinc-50`, `text-zinc-500`, `bg-zinc-950 dark:bg-white`, the CTA button's own colors). These are the palette escape hatch `[[project-sable-enforcement-roadmap]]` flags — functionally near-identical to `border-border`/`text-muted-foreground`/`text-foreground`/`bg-primary` today, but they won't move if the theme's neutral ramp ever does.
3. **`CarouselRow` (home-grown, not Sable's `Carousel`)** already ships prev/next arrows, so it clears the "never a bare unlabeled peek rail" bar `build.md` step 9 sets — no action needed here, just noting it's a pre-existing local component, not a corpus/doctrine violation.
4. **`GalleryGrid`/`Col`/`Columns`** already use Sable layout primitives correctly — no gap there.

## Art direction / mood

Dark-first marketplace-gallery aesthetic (near-black canvas, high-contrast white display type, art thumbnails carrying all the color). No illustration devices — the page is 100% real content-driven (post art, avatars), so no image-generation-prompt gap applies here.

## Screenshots

Captured live at `localhost:3001` (dark + light, desktop), during this session — hero, Trending grid, CTA band, Featured Artist, Discover, and footer for both modes. Not persisted to disk; referenced directly in the review artifact.
