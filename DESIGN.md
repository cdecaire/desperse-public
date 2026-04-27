---
version: alpha
name: Desperse
description: >-
  Content-first design system for a Web3 social platform on Solana.
  Minimal. Focused. Sharp. Dark by default, with three post-type tones
  (Standard, Collectible, Edition) that encode value and rarity at a glance.
  Tokens are authored once and applied across web, responsive web, iOS
  (PWA + native shell), and Android.
colors:
  # --- Neutrals (zinc) -------------------------------------------------------
  zinc-50: "#fafafa"
  zinc-100: "#f4f4f5"
  zinc-200: "#e4e4e7"
  zinc-300: "#d4d4d8"
  zinc-400: "#a1a1aa"
  zinc-500: "#71717a"
  zinc-600: "#52525b"
  zinc-700: "#3f3f46"
  zinc-800: "#27272a"
  zinc-900: "#18181b"
  zinc-950: "#09090b"

  # --- Purple Heart (Edition / brand accent) ---------------------------------
  purple-heart-50: "#fbf3ff"
  purple-heart-100: "#f4e4ff"
  purple-heart-200: "#ecceff"
  purple-heart-300: "#dda7ff"
  purple-heart-400: "#c86fff"
  purple-heart-500: "#b439ff"
  purple-heart-600: "#a213ff"
  purple-heart-700: "#8d04ec"
  purple-heart-800: "#7209b7"
  purple-heart-900: "#62099a"
  purple-heart-950: "#430074"

  # --- Blue Gem (Collectible) ------------------------------------------------
  blue-gem-50: "#f3f1ff"
  blue-gem-100: "#e9e6ff"
  blue-gem-200: "#d5d0ff"
  blue-gem-300: "#b7abff"
  blue-gem-400: "#947bff"
  blue-gem-500: "#7346ff"
  blue-gem-600: "#6221ff"
  blue-gem-700: "#540ff2"
  blue-gem-800: "#450ccb"
  blue-gem-900: "#3a0ca3"
  blue-gem-950: "#220471"

  # --- Caribbean Green (Standard / Success) ----------------------------------
  caribbean-green-50: "#eafff8"
  caribbean-green-100: "#cdfeeb"
  caribbean-green-200: "#9ffbdd"
  caribbean-green-300: "#61f4cd"
  caribbean-green-400: "#27e4b8"
  caribbean-green-500: "#00cba2"
  caribbean-green-600: "#00a585"
  caribbean-green-700: "#00846d"
  caribbean-green-800: "#006858"
  caribbean-green-900: "#00554a"
  caribbean-green-950: "#00302a"

  # --- Torch Red (Destructive) -----------------------------------------------
  torch-red-50: "#fff0f4"
  torch-red-100: "#ffdde5"
  torch-red-200: "#ffc0cf"
  torch-red-300: "#ff94ad"
  torch-red-400: "#ff577f"
  torch-red-500: "#ff2357"
  torch-red-600: "#ff003c"
  torch-red-700: "#d70033"
  torch-red-800: "#b1032c"
  torch-red-900: "#920a2a"
  torch-red-950: "#500013"

  # --- Flush Orange (Warning) ------------------------------------------------
  flush-orange-50: "#fffaec"
  flush-orange-100: "#fff4d3"
  flush-orange-500: "#ff980a"
  flush-orange-600: "#ff8000"
  flush-orange-700: "#cc5d02"

  # --- Azure Radiance (Info) -------------------------------------------------
  azure-radiance-50: "#eff7ff"
  azure-radiance-400: "#5db3fd"
  azure-radiance-500: "#3792fa"
  azure-radiance-600: "#2e7cf0"

  # --- Semantic tokens (dark — brand default) --------------------------------
  background: "#09090b"
  foreground: "#fafafa"
  card: "#18181b"
  card-foreground: "#fafafa"
  popover: "#18181b"
  popover-foreground: "#fafafa"
  primary: "#fafafa"
  primary-foreground: "#09090b"
  secondary: "#27272a"
  secondary-foreground: "#fafafa"
  muted: "#27272a"
  muted-foreground: "#a1a1aa"
  accent: "#27272a"
  accent-foreground: "#fafafa"
  destructive: "#ff2357"
  destructive-foreground: "#ffffff"
  border: "#3f3f46"
  input: "#3f3f46"
  ring: "#71717a"
  sidebar: "#09090b"
  sidebar-foreground: "#fafafa"
  sidebar-primary: "#fafafa"
  sidebar-accent: "#27272a"
  sidebar-border: "#18181b"

  # --- Semantic tokens (light — counterpart) ---------------------------------
  background-light: "#ffffff"
  foreground-light: "#09090b"
  card-light: "#ffffff"
  card-foreground-light: "#09090b"
  primary-light: "#09090b"
  primary-foreground-light: "#fafafa"
  secondary-light: "#f4f4f5"
  secondary-foreground-light: "#09090b"
  muted-light: "#f4f4f5"
  muted-foreground-light: "#52525b"
  accent-light: "#f4f4f5"
  accent-foreground-light: "#09090b"
  destructive-light: "#ff003c"
  border-light: "#e4e4e7"
  input-light: "#e4e4e7"
  ring-light: "#a1a1aa"

  # --- Post-type tones (dark — brand default) --------------------------------
  tone-standard: "#27e4b8"
  tone-collectible: "#947bff"
  tone-edition: "#b439ff"
  tone-warning: "#ff980a"
  tone-info: "#5db3fd"
  highlight: "#a213ff"

  # --- Post-type tones (light counterpart) -----------------------------------
  tone-standard-light: "#00cba2"
  tone-collectible-light: "#6221ff"
  tone-edition-light: "#8d04ec"
  tone-warning-light: "#ff8000"
  tone-info-light: "#3792fa"
  highlight-light: "#8d04ec"

typography:
  display-lg:
    fontFamily: Figtree
    fontSize: 2.986rem
    fontWeight: 600
    lineHeight: 3.5rem
    letterSpacing: -0.02em
  display-md:
    fontFamily: Figtree
    fontSize: 2.488rem
    fontWeight: 600
    lineHeight: 3rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Figtree
    fontSize: 2.074rem
    fontWeight: 600
    lineHeight: 2.5rem
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Figtree
    fontSize: 1.728rem
    fontWeight: 600
    lineHeight: 2.25rem
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Figtree
    fontSize: 1.44rem
    fontWeight: 600
    lineHeight: 2rem
    letterSpacing: -0.01em
  title:
    fontFamily: Figtree
    fontSize: 1.2rem
    fontWeight: 600
    lineHeight: 1.75rem
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Figtree
    fontSize: 1.2rem
    fontWeight: 500
    lineHeight: 1.75rem
    letterSpacing: -0.01em
  body-md:
    fontFamily: Figtree
    fontSize: 1rem
    fontWeight: 500
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  body-sm:
    fontFamily: Figtree
    fontSize: 0.833rem
    fontWeight: 500
    lineHeight: 1.25rem
    letterSpacing: -0.01em
  label-md:
    fontFamily: Figtree
    fontSize: 0.833rem
    fontWeight: 600
    lineHeight: 1rem
    letterSpacing: 0
  label-sm:
    fontFamily: Figtree
    fontSize: 0.694rem
    fontWeight: 600
    lineHeight: 1rem
    letterSpacing: 0.01em
  label-caps:
    fontFamily: Figtree
    fontSize: 0.694rem
    fontWeight: 600
    lineHeight: 1rem
    letterSpacing: 0.08em
  mono-sm:
    fontFamily: DM Mono
    fontSize: 0.833rem
    fontWeight: 400
    lineHeight: 1.25rem
  mono-pill:
    fontFamily: Figtree
    fontSize: 0.625rem
    fontWeight: 600
    lineHeight: 1rem
    letterSpacing: 0.015em

rounded:
  none: 0px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  full: 9999px

spacing:
  base: 8px
  px: 1px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 48px
  4xl: 64px
  5xl: 96px
  # Layout constants
  nav-height: 56px
  sidebar-width: 256px
  feed-max: 1024px
  wide-max: 1536px
  body-measure: 65ch
  # Platform-specific minimum touch targets
  touch-ios: 44px
  touch-android: 48px

components:
  # --- Buttons ---------------------------------------------------------------
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: 40px
    padding: 0 16px
  button-primary-hover:
    backgroundColor: "{colors.zinc-200}"
  button-primary-md:
    height: 32px
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: 40px
    padding: 0 16px
  button-secondary-hover:
    backgroundColor: "{colors.zinc-800}"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.destructive-foreground}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: 40px
    padding: 0 16px
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: 40px
    padding: 0 12px
  button-ghost-hover:
    backgroundColor: "{colors.zinc-800}"
  button-outline:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: 40px
    padding: 0 16px
  button-icon:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
    height: 40px
    width: 40px
  button-link:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    typography: "{typography.label-md}"

  # --- Card ------------------------------------------------------------------
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: 24px
  card-flat:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: 24px

  # --- Inputs ----------------------------------------------------------------
  input-field:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    height: 40px
    padding: 0 12px
  input-field-focus:
    backgroundColor: "{colors.card}"
  input-field-invalid:
    backgroundColor: "{colors.card}"
  textarea:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: 12px

  # --- Badges ----------------------------------------------------------------
  badge-default:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: 2px 10px
  badge-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.destructive-foreground}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
  badge-success:
    backgroundColor: "{colors.tone-standard}"
    textColor: "{colors.zinc-950}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
  badge-warning:
    backgroundColor: "{colors.tone-warning}"
    textColor: "{colors.zinc-950}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
  badge-outline:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"

  # --- Category pill (tappable tag) -----------------------------------------
  pill-display:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  pill-interactive:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  pill-interactive-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"

  # --- Media pills (overlays on imagery) -------------------------------------
  media-pill-dark:
    backgroundColor: rgba(9, 9, 11, 0.85)
    textColor: "#ffffff"
    typography: "{typography.mono-pill}"
    rounded: "{rounded.full}"
    height: 24px
    padding: 0 10px
  media-pill-muted:
    backgroundColor: "{colors.zinc-700}"
    textColor: "#ffffff"
    typography: "{typography.mono-pill}"
    rounded: "{rounded.full}"
    height: 24px
  media-pill-tone-edition:
    backgroundColor: "{colors.tone-edition}"
    textColor: "{colors.zinc-950}"
    typography: "{typography.mono-pill}"
    rounded: "{rounded.full}"
    height: 24px
  media-pill-tone-collectible:
    backgroundColor: "{colors.tone-collectible}"
    textColor: "{colors.zinc-950}"
    typography: "{typography.mono-pill}"
    rounded: "{rounded.full}"
    height: 24px
  media-pill-tone-standard:
    backgroundColor: "{colors.tone-standard}"
    textColor: "{colors.zinc-950}"
    typography: "{typography.mono-pill}"
    rounded: "{rounded.full}"
    height: 24px

  # --- Navigation -----------------------------------------------------------
  nav-sidebar-item:
    backgroundColor: transparent
    textColor: "{colors.sidebar-foreground}"
    typography: "{typography.body-md}"
    rounded: "{rounded.full}"
    padding: 8px 12px
  nav-sidebar-item-hover:
    backgroundColor: "{colors.zinc-800}"
  nav-sidebar-item-active:
    backgroundColor: "{colors.sidebar-accent}"
    textColor: "{colors.foreground}"
  nav-bottom-item:
    backgroundColor: transparent
    textColor: "{colors.muted-foreground}"
    typography: "{typography.label-sm}"
    height: 56px
  nav-bottom-item-active:
    textColor: "{colors.foreground}"
  nav-topbar:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    height: 56px

  # --- Notification badge ---------------------------------------------------
  notification-badge:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.destructive-foreground}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    height: 20px

  # --- Surfaces -------------------------------------------------------------
  dialog:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: 24px
  sheet:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
  tooltip:
    backgroundColor: "{colors.zinc-900}"
    textColor: "{colors.foreground}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.sm}"
    padding: 6px 10px
  toast:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.md}"
    padding: 12px 16px

  # --- Post card (composite) ------------------------------------------------
  post-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: 16px
  post-action-button:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: 40px
  post-action-button-hover:
    backgroundColor: "{colors.zinc-900}"

---

# Desperse Design System

Desperse is a Web3 social platform for creators on Solana. This document is
the single source of truth for its visual identity. The YAML tokens above
define the atoms. The prose below explains **how and why** to apply them
across web, responsive web, iOS, and Android.

## Overview

Desperse is **minimal, focused, and sharp**. It is a content-first platform:
the creator's work is the interface, and the UI recedes so art advances.
Confidence comes from restraint, not decoration.

**Audience.** Crypto-native creators who already live in Web3 and want a
polished, powerful creative tool. They expect speed, precision, and respect
for their time. The interface should feel like a sharp instrument — fast to
learn, faster to use, never in the way of the content.

**Emotional response.** Quiet confidence. The app should feel like a gallery
at night — dark walls, lit artwork, nothing superfluous on the walls. Not
cold, not loud. Premium, legible, and fast.

**References.** Zora and Foundation (art-forward, Web3-native), SuperRare and
Exchange.Art (premium collectible feel), Linear and Vercel (developer-grade
polish and speed), Instagram and TikTok (proven content-first social
patterns).

**Anti-patterns.** Overly playful UI, excessive animation, neon glow effects,
glassmorphism as decoration, busy dashboards, "Web3-for-Web3's-sake"
aesthetics (wallet jargon, hex addresses in faces, blockchain-first UX).

**Cross-surface intent.** The same tokens ship on:

- **Web (desktop ≥ 1024px).** Sidebar navigation (256px), max feed width
  1024px, hover states, keyboard focus.
- **Responsive web (< 1024px).** Fixed top bar (56px) with `env(safe-area-inset-top)`
  applied, bottom tab bar (56px), full-bleed cards on mobile.
- **iOS (PWA and native shell).** Respects notches and home indicator via
  `env(safe-area-inset-*)`. 44pt minimum touch target. Haptic feedback on
  destructive and collect actions.
- **Android (PWA and native shell).** 48dp minimum touch target. Material
  ripple replaced with Desperse's zinc-800 hover state for consistency across
  platforms. System back handler integrated with TanStack Router history.

A single token set drives all four surfaces. Native shells read the YAML and
generate platform-specific theme files (iOS: `Colors.xcassets`; Android:
`colors.xml` / Jetpack Compose `ColorScheme`).

## Colors

The palette is a disciplined duotone: **zinc neutrals** as the stage,
**purple-heart** as the single brand accent, and **three post-type tones**
that carry meaning (not decoration). Semantic colors are exposed as roles so
that surfaces and components reference intent, not hex.

### Neutrals — Zinc (the stage)

Zinc 50 → 950 forms the entire neutral ladder. No true black (`#000`) and no
pure white (`#fff`) appear anywhere in product UI; `zinc-950` (`#09090b`) is
the floor and `zinc-50` (`#fafafa`) is the ceiling. Both are subtly tinted so
white never looks clinical and black never looks dead.

The brand defaults to **dark**. The sole reason is viewing context: this
product is consumed by night-owl creators scrolling high-saturation imagery.
Dark surface + tinted neutrals makes color-rich media pop without burning
retinas. Light mode exists and is fully supported, but it is the alternate
— not a co-equal default.

### Accent — Purple Heart (the signal)

`purple-heart-700` (`#8d04ec`, light) / `purple-heart-500` (`#b439ff`, dark)
is used for **one thing**: highlighting editions and text selection. It is
rare on purpose. When you see purple, you are looking at value.

### Post-type tones (the taxonomy)

Desperse posts have three economic modes. Each one has a tone that appears
consistently wherever the post is represented — the action button, the media
overlay pill, and the subtle indicator on the compose tray.

- **Standard (Caribbean Green).** Free-form posts. `#00cba2` / `#27e4b8`.
- **Collectible (Blue Gem).** Free to mint as an NFT. `#6221ff` / `#947bff`.
- **Edition (Purple Heart).** Paid NFT editions. `#8d04ec` / `#b439ff`.

Because Edition and Collectible are both in the purple-violet family, they
are **intentionally close but distinct**: Edition is redder (warmer, more
premium); Collectible is bluer (cooler, more community). The hue shift is
the semantic signal.

### Support tones

- **Warning (Flush Orange):** `#ff8000` / `#ff980a`.
- **Info (Azure Radiance):** `#3792fa` / `#5db3fd`.
- **Destructive (Torch Red):** `#ff003c` / `#ff2357`.

### Semantic roles

The `primary`, `secondary`, `muted`, `accent`, `card`, `popover`, `border`,
`input`, `ring` tokens mirror the shadcn/ui convention and are what
components actually reference. In dark mode, `primary` is zinc-50 and the
`primary-foreground` is zinc-950 — intentional inversion, so a "primary
button" in dark mode is a white pill, and in light mode it is a near-black
pill. The brand never relies on purple for primary CTAs.

### Contrast targets

All foreground / background pairings meet **WCAG AA** (4.5:1 for body text,
3:1 for large text and UI elements). Muted text on card surfaces is tuned
for the dark default:

| Pair | Ratio |
|---|---|
| `foreground` on `background` (dark) | 18.9 : 1 |
| `foreground` on `card` (dark) | 16.2 : 1 |
| `muted-foreground` on `background` (dark) | 6.8 : 1 |
| `foreground-light` on `background-light` | 19.5 : 1 |
| `muted-foreground-light` on `background-light` | 6.6 : 1 |

### Native-platform mapping

- **iOS.** `background` → `UIColor.systemBackground`; dynamic color assets
  should pair the dark and light hexes so `UITraitCollection` handles the
  swap. `tone-*` colors map to custom named colors in `Assets.xcassets`.
- **Android.** Map semantic tokens to `MaterialTheme.colorScheme`:
  `background` → `surface`, `card` → `surfaceContainer`, `primary` →
  `onSurface` (so Material ripple lands on the right hue), `destructive` →
  `error`. Post-type tones live as extension colors.

## Typography

**Figtree** is the single family for UI and body. **DM Mono** is reserved
for on-chain data (signatures, hashes, balances, mint supply counts), never
as "technical vibes" decoration.

Figtree was chosen over the reflex defaults (Inter, DM Sans) because it
hits a specific note: its geometric construction is as clean as Inter, but
its slightly softer terminals and open apertures give it warmth — which
matters on a creator-facing product where Inter reads as too much like a
developer tool.

### Weight strategy

- **500 (Medium)** is the body weight. Not 400. Figtree at 400 reads as
  anemic on dark backgrounds; stepping up to 500 restores perceived weight
  without looking bold.
- **600 (Semibold)** is the only heading weight. All `<h1>`–`<h6>`, `<b>`,
  and `<strong>` render at 600. The design does not use 700 or higher.
- **400** appears only in DM Mono when on-chain data is shown.

A maximum of **two weights on any single screen** is enforced.

### Scale

The type scale is a **1.2 (minor third)** modular scale computed from a
responsive root:

- Mobile (`< 768px`): root is **16px**.
- Desktop (`≥ 768px`): root is **14px**.

This means `body-md` (1rem) is 16px on mobile but 14px on desktop — which
matches the ergonomics of each surface (readable on phones held at arm's
length, denser on monitors at viewing distance). All other sizes inherit
from this root via rem, so the entire scale flexes with one variable.

**Hierarchy levels:**

- `display-lg` / `display-md` — reserved for marketing pages and onboarding
  headers. Do not use inside the feed.
- `headline-lg` / `headline-md` / `headline-sm` — section and page titles.
- `title` — component titles (card headers, dialog titles).
- `body-lg` / `body-md` / `body-sm` — prose, post captions, form field
  helper text. Captions cap at `body-measure` (65ch).
- `label-md` / `label-sm` / `label-caps` — buttons, chip labels, metadata.
- `mono-sm` / `mono-pill` — on-chain data and media overlays.

### Global typographic settings

- **Letter-spacing:** `-0.01em` on buttons, inputs, selects, textareas.
  Small negative tracking tightens interactive copy and matches Figtree's
  geometric rhythm.
- **Line-height for form elements:** `1.25`. Longer reading copy uses the
  per-level line-heights in the token table.
- **Font features:** `cv01, ss01` enabled on Figtree where available (opens
  the lowercase `a` and `g` for a cleaner display appearance). Enable via
  `font-feature-settings` on the body root.

### Native-platform mapping

- **iOS.** Ship Figtree as a bundled `.ttf` via `Info.plist
  UIAppFonts`. Fallback to `-apple-system`/San Francisco at render time
  only if the font fails to load. Map `body-md` to `.body` dynamic type at
  default, `headline-sm` to `.title3`, `display-md` to `.largeTitle`. Dynamic
  Type scaling is respected — the 16px mobile root accommodates up to
  "Accessibility Large" without layout break.
- **Android.** Ship Figtree via `font/figtree_*.xml` + XML families or the
  Compose `FontFamily.resource()`. Fallback is `Roboto`. Text appearance
  styles (`TextAppearance.Desperse.BodyMedium`, etc.) mirror the token
  names.

### Platform text APIs

| Token | iOS UIFont | Android TextAppearance |
|---|---|---|
| `display-lg` | `largeTitle` 700 | `displayMedium` |
| `headline-md` | `title2` 600 | `headlineMedium` |
| `title` | `title3` 600 | `titleLarge` |
| `body-md` | `body` 500 | `bodyLarge` |
| `body-sm` | `subheadline` 500 | `bodyMedium` |
| `label-md` | `footnote` 600 | `labelLarge` |
| `label-sm` | `caption1` 600 | `labelSmall` |

## Layout

Desperse uses a **three-tier responsive shell** that adapts instead of
shrinks. Nothing is amputated on mobile.

### The 8px grid

All spacing is on an 8px base with a 4px half-step for micro-adjustments.
The semantic spacing scale (`xs` = 4, `sm` = 8, `md` = 12, `lg` = 16,
`xl` = 24, `2xl` = 32, `3xl` = 48, `4xl` = 64, `5xl` = 96) is what
components consume. Pixel-named tokens are not exposed — density is
expressed through intent, not math.

### Breakpoints

| Name | Width | Behavior |
|---|---|---|
| `sm` | 640px | Large phones; typography begins to unwind |
| `md` | 768px | Tablets; type root drops from 16 → 14px |
| `lg` | 1024px | Desktops; sidebar appears, bottom nav hides |
| `xl` | 1280px | Comfortable desktop |
| `2xl` | 1536px | Admin / settings max width |

### Shell patterns

- **Mobile (`< 1024px`).** Top bar (56px, sticky, hides on scroll-down) +
  bottom tab bar (56px, sticky). Content receives
  `padding-top: calc(3.5rem + env(safe-area-inset-top, 0px))` and
  `padding-bottom: calc(3.5rem + env(safe-area-inset-bottom, 0px))`.
- **Desktop (`≥ 1024px`).** Left sidebar (256px, fixed) + content column.
  No top bar. No bottom bar.

### Container widths

- **Feed and standard routes:** `max-width: 1024px`, centered.
- **Settings / admin / post detail:** `max-width: 1536px`, left-aligned.
- **Post detail:** full width; the media is the layout.
- **Prose (post caption, about, changelog):** clamp line length to `65ch`.

### Touch targets

- **iOS:** 44×44pt minimum for any tappable element.
- **Android:** 48×48dp minimum.
- **Web mobile:** 40px is acceptable for secondary actions; all primary
  actions and the bottom tab bar hit 48px.

Icon buttons in desktop density (`32px`) exist for power users in settings
and admin tooling only — never in the feed.

### Safe areas (mobile)

Every fixed-position element respects `env(safe-area-inset-*)`. The top
bar adds inset-top to its padding, the bottom tab bar adds inset-bottom,
and any full-screen modal applies both. Landscape insets are honored on
iOS.

### Motion and scroll

- **Scroll-driven nav.** Top and bottom bars hide on scroll-down and
  reappear on scroll-up. Transition: `transform 200ms ease-out`. The bars
  never block interaction while hidden (they translate off-screen).
- **Smooth scroll.** Enabled via Lenis on web for feed browsing.
- **Reduced motion.** All scroll-linked and decorative animations honor
  `prefers-reduced-motion: reduce` by switching to instant transitions.

## Elevation & Depth

Desperse is a **flat-with-tonal-layers** system. Depth is almost never
shadow; it is a step up the zinc ladder.

### Tonal elevation (dark mode)

| Layer | Surface | Hex |
|---|---|---|
| 0 — base | `background` | `#09090b` |
| 1 — card / popover | `card` | `#18181b` |
| 2 — hover / secondary | `secondary` | `#27272a` |
| 3 — floating (menu) | `popover` + border | `#18181b` + border |
| 4 — dialog / sheet | `card` + overlay scrim | `#18181b` + `rgba(0,0,0,0.5)` |

### Tonal elevation (light mode)

| Layer | Surface | Hex |
|---|---|---|
| 0 — base | `background-light` | `#ffffff` |
| 1 — card | `card-light` | `#ffffff` (subtle shadow distinguishes) |
| 2 — hover / secondary | `secondary-light` | `#f4f4f5` |
| 3 — floating | `popover` + border | `#ffffff` + `#e4e4e7` |
| 4 — dialog / sheet | `card` + overlay | `#ffffff` + `rgba(0,0,0,0.4)` |

### Shadow tokens

Shadows are whisper-soft. Opacity ranges 3–5%.

- `shadow-sm`: `0 1px 4px 0 rgb(0 0 0 / 0.03)` — default card lift.
- `shadow` / `shadow-md`: `0 2px 8px 0 rgb(0 0 0 / 0.04)`.
- `shadow-lg`: `0 8px 24px -4px rgb(0 0 0 / 0.05)` — floating menus.
- `shadow-xl`: `0 16px 40px -8px rgb(0 0 0 / 0.05)` — dialogs on dark.

In dark mode, shadows are functionally invisible and elevation is carried
entirely by tonal contrast. Shadows are kept for light mode.

### Borders instead of shadow

Components in dark mode define edges with a translucent border:
`border: 1px solid oklch(from var(--zinc-700) l c h / 0.4)`. This reads
crisper than a shadow on dark backgrounds and mirrors the "light refraction
edge" of premium OLED UI.

### Platform elevation mapping

- **iOS.** Use `UIBlurEffect` sparingly — only on sticky bars when scrim is
  required for legibility over media. Materials are not a brand element.
- **Android.** Disable Material 3 tonal elevation overlays. Provide
  `Surface(tonalElevation = 0.dp)` and use the tonal ladder above instead.
  Compose `Modifier.shadow` only on `lg` / `xl` surfaces.

## Shapes

**Tight radii. Pill-shaped actions. Soft-square containers.** No sharp
(0-radius) corners anywhere in the product. No fully-rounded containers
either — only actions are pills.

### Radius ladder

- `none` (0px) — never used in UI, reserved for media viewports.
- `xs` (4px) — tight utilities (focus outlines, badges on dense rows).
- `sm` (8px) — inputs, small pills, selects, badges.
- `md` (12px) — popovers, toasts, small modals, icon tiles.
- `lg` (16px) — cards, dialog containers, sheets.
- `xl` (20px) — hero elements, featured media containers.
- `full` (9999px) — buttons, avatars, tags, media overlay pills.

### Rules

- **Actions are always `full` radius.** Primary, secondary, ghost,
  destructive, icon buttons — all pills. This is the single most
  recognizable shape signal in the system.
- **Containers are always `lg`.** Cards, dialogs, sheets — 16px. Media
  carousels inside cards get `md` (12px).
- **Inputs are `sm`.** 8px. Never pills. An input that looks like a button
  is a bad input.
- **Never mix**: a card should not contain a sharp-cornered element, and a
  pill should not contain a square-cornered affordance.

### Platform notes

- **iOS.** Native system controls (`UISwitch`, `UISegmentedControl`) follow
  Apple's default corner radii. Custom controls match the Desperse ladder.
- **Android.** Material 3 `Shapes` theme overrides all corner families to
  the ladder above: `Shapes(small = 8.dp, medium = 12.dp, large = 16.dp)`.

## Components

Component behavior is fully specified in the YAML front matter. Prose here
covers only the "why" and the cross-platform nuance.

### Buttons

Pill-shaped, Medium-weight label, tight letter-spacing. Three visual tiers
from loudest to quietest:

1. **Primary.** Solid fill of the inverted neutral (`zinc-50` in dark mode,
   `zinc-950` in light). One per screen, maximum.
2. **Secondary.** `zinc-800` fill (dark) or `zinc-100` (light). The default
   for any non-hero action.
3. **Ghost.** Transparent, fills on hover with `zinc-800` (dark) or
   `zinc-100` (light). For tertiary actions inside a card.

**Destructive** is reserved for Torch Red and only for irrevocable actions
(delete post, remove follower, revoke access). Never use it for cancel.

**Size ladder.** 40px (mobile, also the CTA height) → 32px (desktop
density). Icon buttons inherit those. A 44px "cta" size exists on mobile
for the primary commerce action (Buy, Collect) to meet iOS HIG.

### Post card

The feed atom. Structure: media (full-bleed inside the card), metadata
overlay pill on the media, caption, category pills, action row.

- **Media overlay pill.** Bottom-left of the media. Uses `media-pill-tone-*`
  tokens so the pill color carries the post type. Example: an Edition post
  shows `0.5 SOL` in a purple-heart pill.
- **Action row.** Like, Comment, Collect/Buy. The action button for
  Collect/Buy inherits the post-type tone; Like and Comment are neutral.
- **Collected state.** "Collected" swaps in place of the action button.
  The media pill remains visible so the post's economic identity is never
  hidden.

### Category pill

Two variants: display (non-interactive, sits below a caption) and
interactive (toggles a filter). Selected state swaps to the `primary`
surface — this is the one place the primary color appears as a
content-level state, and it's the correct choice because selection is an
explicit user action.

### Media pill

Short, mono-tracked label overlaid on media. Three variants: `dark` (the
default for neutral metadata like "3 images"), `muted` (for informational
state like "Sold Out"), and `tone` (for price and type cues). All pills are
24px tall — small enough to not dominate media, large enough to be legible
on a phone.

Tone pills use **`zinc-950` text on the tone fill**, not white. Small-cap
pill type (10px) on bright purple/blue fails WCAG AA at white; dark text on
those same fills passes cleanly. The rule is consistent across all three
post-type tones, so the visual family is preserved.

### Inputs

Soft-square (`rounded-sm`), no shadow, 40px tall on mobile / 32px on
desktop. Focus state uses a 2px `ring`-colored ring at 30% opacity
(`ring-ring/30`). Invalid state swaps the ring to `destructive`. No
validation icons inside the input — the error message below carries the
signal. Placeholder text is `muted-foreground` weight 400.

### Navigation

- **Sidebar (desktop).** 256px, full-height, sticky. Nav items are
  full-radius pills at 40px tall; hover fills with `zinc-800`, active state
  fills with `sidebar-accent` and swaps the icon to filled.
- **Bottom bar (mobile).** 56px tall. Icon + label, label is `label-sm`.
  Active state changes the icon to its solid Font Awesome variant and
  raises the text to `foreground`.
- **Top bar (mobile).** 56px, shows page title (or logo on home), back
  button on secondary pages, optional trailing action icon. Translucent
  scrim not used — we prefer a solid `background` so typography over media
  stays readable.

### Notifications (unread indicator)

A solid `destructive` dot (4px) or count pill (20px tall). The count pill
caps at `99+`. Never use purple for unread — that conflates value (purple)
with activity (red).

### Surfaces (dialogs, sheets, toasts, tooltips)

- **Dialog.** Centered on desktop (`max-width: 500px`), full-screen sheet
  on mobile. Backdrop is `rgba(0,0,0,0.5)`.
- **Sheet.** Slides from bottom on mobile, from right on desktop.
- **Toast.** Top-right (desktop) / top (mobile). Auto-dismiss 4s; error
  toasts require manual dismiss.
- **Tooltip.** `zinc-900` fill, 8px side padding, 6px vertical. Show after
  400ms hover on pointer devices. Long-press equivalent on touch (500ms).

### Icons

**Font Awesome Pro** is the primary icon family (solid for active states
and filled affordances; regular for idle states). **Lucide** is used only
where Font Awesome lacks a good match (close `X`, chevrons in Radix
primitives). All icons inherit text color — never colored icons except in
post-type action buttons where the tone is the point.

### Focus states

Interactive elements use a 2px `ring`-colored outline with 30% opacity,
offset by 1-2px depending on component density.

Buttons and clickable containers have their browser focus ring suppressed
(`outline: none !important` on `button:focus-visible`) — a historical
choice in the codebase. Form inputs, checkboxes, toggles, and category
pills **retain** focus rings; that's the accessibility floor. Any new
interactive element that isn't a `<button>`/`<a>` must opt into a ring.

Focus rings are not defined as a standalone component in the YAML because
the spec's component sub-token vocabulary doesn't include `borderColor` /
`outlineColor`. Treat them as a cross-cutting style rule: 2px ring, color
`ring` (from the color tokens), 30% opacity, 1–2px offset depending on
component density.

## Do's and Don'ts

### Do

- Do treat the post-type tone as semantic. If you introduce a new color
  anywhere near a post, ask: does this belong on the standard / collectible /
  edition axis, or is it truly new information?
- Do default to **dark** when making a new component. Build light as a
  counterpart, not a co-equal.
- Do use `primary` for exactly one action per screen. If you can't pick
  one, the hierarchy is wrong.
- Do respect `env(safe-area-inset-*)` on every fixed-position surface. iOS
  notches and Android gesture bars are not edge cases.
- Do ship Figtree as a bundled font on native shells. Fall back to
  `-apple-system` / Roboto only if bundling fails.
- Do cap prose at `65ch` line length. Feeds scroll; paragraphs read.
- Do use the 8px grid. Anything off-grid must be a deliberate optical
  correction, not a drift.
- Do match touch-target minimums per platform (44pt iOS / 48dp Android).
- Do honor `prefers-reduced-motion` for all non-essential animation.

### Don't

- Don't use **pure black** (`#000`) or **pure white** (`#fff`) anywhere in
  product UI. Always use `zinc-950` and `zinc-50`.
- Don't use **gradient text**. Ever. Use weight or size for emphasis.
- Don't use purple for primary CTAs. Purple is for Editions and selection
  only.
- Don't use side-stripe borders (`border-left: 3px solid accent`) on cards,
  callouts, or list items. It is the most recognizable AI-design tell.
- Don't nest cards inside cards. Flatten the hierarchy.
- Don't mix radii inside one component. Pill buttons should never sit
  inside a sharp-cornered frame.
- Don't use more than **two font weights** on a single screen (500 body +
  600 heading is the normal pair; DM Mono 400 for chain data is the rare
  third).
- Don't use `text-uppercase` on body copy. Caps are for `label-caps` only.
- Don't ship icons in a color that isn't the active text color — except
  post-type action buttons, where tone is the point.
- Don't use Material ripple on Android. Replace with the same hover state
  the web uses (`zinc-800` fill) for consistency.
- Don't implement features that only work on desktop. Every capability
  must have a mobile path; adapt, don't amputate.
- Don't call `primary-foreground` "white" or `primary` "black" — they
  invert with theme.
- Don't introduce a new external font. Figtree and DM Mono are the only
  families. If a new need emerges, propose a change to this document
  first.
