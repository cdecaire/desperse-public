# Desperse Android Style Guide

A comprehensive design system documentation for converting the Desperse web app to native Android (Kotlin/Jetpack Compose).

---

## Table of Contents

1. [Design Tokens](#1-design-tokens)
2. [Typography System](#2-typography-system)
3. [Color System](#3-color-system)
4. [Spacing System](#4-spacing-system)
5. [Component Library](#5-component-library)
6. [Screen-by-Screen Guide](#6-screen-by-screen-guide)
7. [Icons & Assets](#7-icons--assets)
8. [Android Implementation Notes](#8-android-implementation-notes)

---

## 1. Design Tokens

### 1.1 Border Radius

| Web Token | Web Value | Android (dp) | Compose Equivalent |
|-----------|-----------|--------------|-------------------|
| `rounded-none` | 0px | 0.dp | RoundedCornerShape(0.dp) |
| `rounded-xs` | 4px | 4.dp | RoundedCornerShape(4.dp) |
| `rounded-sm` | 8px | 8.dp | RoundedCornerShape(8.dp) |
| `rounded-md` | 12px | 12.dp | RoundedCornerShape(12.dp) |
| `rounded-lg` | 16px | 16.dp | RoundedCornerShape(16.dp) |
| `rounded-xl` | 20px | 20.dp | RoundedCornerShape(20.dp) |
| `rounded-full` | 9999px | 50% | CircleShape |

### 1.2 Shadows

| Web Token | Web Value | Android Elevation |
|-----------|-----------|-------------------|
| `shadow-sm` | 0 1px 4px 0 rgb(0 0 0 / 0.03) | 1.dp |
| `shadow` | 0 2px 8px 0 rgb(0 0 0 / 0.04) | 2.dp |
| `shadow-md` | 0 4px 12px -2px rgb(0 0 0 / 0.05) | 4.dp |
| `shadow-lg` | 0 8px 24px -4px rgb(0 0 0 / 0.05) | 8.dp |
| `shadow-xl` | 0 16px 40px -8px rgb(0 0 0 / 0.05) | 16.dp |

### 1.3 Animation Durations

| Animation | Duration | Android Equivalent |
|-----------|----------|-------------------|
| Hover fade | 150ms | tween(150) |
| Slide transition | 300ms | tween(300) |
| Sheet open | 500ms | tween(500) |
| Sheet close | 300ms | tween(300) |
| Fade in/out | 200ms | tween(200) |

---

## 2. Typography System

### 2.1 Font Family

**Primary Font:** Figtree
- Android: Include `figtree_regular.ttf`, `figtree_medium.ttf`, `figtree_semibold.ttf`, `figtree_bold.ttf`
- Fallback: System default sans-serif

**Monospace Font:** DM Mono
- Android: Include `dm_mono_regular.ttf`, `dm_mono_medium.ttf`
- Fallback: `monospace`

### 2.2 Font Weights

| Web Weight | Value | Android FontWeight |
|------------|-------|-------------------|
| Normal | 400 | FontWeight.Normal |
| Medium | 500 | FontWeight.Medium |
| Semibold | 600 | FontWeight.SemiBold |
| Bold | 700 | FontWeight.Bold |

**Default Weights:**
- Body text: Medium (500)
- Headings: SemiBold (600)
- Buttons/inputs: Medium (500)

### 2.3 Font Size Scale

| Web Class | Mobile Size | Desktop Size | Android SP (Mobile) | Line Height |
|-----------|-------------|--------------|---------------------|-------------|
| `text-xs` | 11.1px | 9.7px | 11.sp | 1rem (16sp) |
| `text-sm` | 13.3px | 11.7px | 13.sp | 1.25rem (20sp) |
| `text-base` | 16px | 14px | 16.sp | 1.5rem (24sp) |
| `text-lg` | 19.2px | 16.8px | 19.sp | 1.75rem (28sp) |
| `text-xl` | 23px | 20px | 23.sp | 2rem (32sp) |
| `text-2xl` | 27.6px | 24.2px | 28.sp | 2.25rem (36sp) |
| `text-3xl` | 33.2px | 29px | 33.sp | 2.5rem (40sp) |
| `text-4xl` | 39.8px | 34.8px | 40.sp | 3rem (48sp) |

### 2.4 Letter Spacing

- Global: `-0.01em` (-0.16sp at 16sp base)
- Uppercase headers: `0.2em` tracking wider

### 2.5 Compose Typography Definition

```kotlin
val FigtreeFamily = FontFamily(
    Font(R.font.figtree_regular, FontWeight.Normal),
    Font(R.font.figtree_medium, FontWeight.Medium),
    Font(R.font.figtree_semibold, FontWeight.SemiBold),
    Font(R.font.figtree_bold, FontWeight.Bold)
)

val DesperseTypography = Typography(
    displayLarge = TextStyle(
        fontFamily = FigtreeFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 40.sp,
        lineHeight = 48.sp,
        letterSpacing = (-0.16).sp
    ),
    displayMedium = TextStyle(
        fontFamily = FigtreeFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 33.sp,
        lineHeight = 40.sp,
        letterSpacing = (-0.16).sp
    ),
    displaySmall = TextStyle(
        fontFamily = FigtreeFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 28.sp,
        lineHeight = 36.sp,
        letterSpacing = (-0.16).sp
    ),
    headlineLarge = TextStyle(
        fontFamily = FigtreeFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 23.sp,
        lineHeight = 32.sp,
        letterSpacing = (-0.16).sp
    ),
    headlineMedium = TextStyle(
        fontFamily = FigtreeFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 19.sp,
        lineHeight = 28.sp,
        letterSpacing = (-0.16).sp
    ),
    headlineSmall = TextStyle(
        fontFamily = FigtreeFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        letterSpacing = (-0.16).sp
    ),
    titleLarge = TextStyle(
        fontFamily = FigtreeFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 19.sp,
        lineHeight = 28.sp,
        letterSpacing = (-0.16).sp
    ),
    titleMedium = TextStyle(
        fontFamily = FigtreeFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        letterSpacing = (-0.16).sp
    ),
    titleSmall = TextStyle(
        fontFamily = FigtreeFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = (-0.16).sp
    ),
    bodyLarge = TextStyle(
        fontFamily = FigtreeFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        letterSpacing = (-0.16).sp
    ),
    bodyMedium = TextStyle(
        fontFamily = FigtreeFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = (-0.16).sp
    ),
    bodySmall = TextStyle(
        fontFamily = FigtreeFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 12.sp,
        lineHeight = 16.sp,
        letterSpacing = (-0.16).sp
    ),
    labelLarge = TextStyle(
        fontFamily = FigtreeFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = (-0.16).sp
    ),
    labelMedium = TextStyle(
        fontFamily = FigtreeFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 12.sp,
        lineHeight = 16.sp,
        letterSpacing = (-0.16).sp
    ),
    labelSmall = TextStyle(
        fontFamily = FigtreeFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 10.sp,
        lineHeight = 14.sp,
        letterSpacing = 0.2.sp
    )
)
```

---

## 3. Color System

### 3.0 Light/Dark Color Tokens (Comprehensive)

Define a semantic token layer that all UI components use. Each token maps to a light and
dark value. Components should reference tokens, not raw palette colors.

#### 3.0.1 Core Tokens (Light/Dark)

| Token | Usage | Light | Dark |
|------|-------|-------|------|
| `bg.app` | App background | #FFFFFF | #09090B |
| `bg.surface` | Cards, sheets, menus | #FFFFFF | #18181B |
| `bg.elevated` | Elevated surfaces | #FFFFFF | #18181B |
| `bg.muted` | Muted panels, chips | #F4F4F5 | #27272A |
| `bg.inverse` | Inverse bg for light text | #09090B | #FAFAFA |
| `text.primary` | Primary text | #09090B | #FAFAFA |
| `text.secondary` | Secondary text | #52525B | #A1A1AA |
| `text.muted` | Muted/placeholder | #71717A | #71717A |
| `text.inverse` | Text on inverse bg | #FAFAFA | #09090B |
| `text.link` | Links, actions | #09090B | #FAFAFA |
| `icon.primary` | Primary icons | #09090B | #FAFAFA |
| `icon.muted` | Muted icons | #71717A | #A1A1AA |
| `icon.inverse` | Icons on inverse bg | #FAFAFA | #09090B |
| `border.default` | Standard borders | #E4E4E7 | #3F3F46 |
| `border.subtle` | Subtle dividers | #F4F4F5 | #27272A |
| `border.focus` | Focus ring border | #A1A1AA | #71717A |
| `ring.default` | Focus ring | #A1A1AA | #71717A |
| `ring.error` | Error ring | #FF003C | #FF2357 |
| `overlay.scrim` | Modals, sheets | #000000 (50%) | #000000 (50%) |
| `overlay.surface` | Hover/pressed overlay | #000000 (4%) | #FFFFFF (6%) |
| `shadow.color` | Shadow base | #000000 (5%) | #000000 (50%) |

#### 3.0.2 State Tokens (Alpha Overlays)

Use these as overlays on top of the base background/surface color.

| Token | Light (on surface) | Dark (on surface) |
|------|---------------------|------------------|
| `state.hover` | onSurface 4% | onSurface 6% |
| `state.pressed` | onSurface 8% | onSurface 12% |
| `state.selected` | onSurface 10% | onSurface 14% |
| `state.disabled` | onSurface 38% | onSurface 38% |
| `state.focused` | ring.default | ring.default |

#### 3.0.3 Text Emphasis Tokens

| Token | Usage | Light | Dark |
|------|-------|-------|------|
| `text.primary` | Body, headings | #09090B | #FAFAFA |
| `text.secondary` | Supporting | #52525B | #A1A1AA |
| `text.muted` | Placeholder | #71717A | #71717A |
| `text.disabled` | Disabled | #A1A1AA | #71717A |
| `text.onPrimary` | Text on primary | #FAFAFA | #09090B |
| `text.onSecondary` | Text on secondary | #09090B | #FAFAFA |

#### 3.0.4 Control Tokens

| Token | Usage | Light | Dark |
|------|-------|-------|------|
| `control.primary.bg` | Primary button bg | #09090B | #FAFAFA |
| `control.primary.text` | Primary button text | #FAFAFA | #09090B |
| `control.secondary.bg` | Secondary button bg | #F4F4F5 | #27272A |
| `control.secondary.text` | Secondary button text | #09090B | #FAFAFA |
| `control.ghost.text` | Ghost button text | #09090B | #FAFAFA |
| `control.outline.border` | Outline border | #E4E4E7 | #3F3F46 |
| `control.disabled.bg` | Disabled bg | #F4F4F5 | #27272A |
| `control.disabled.text` | Disabled text | #A1A1AA | #71717A |
| `input.bg` | Input background | #F4F4F5 | #27272A |
| `input.text` | Input text | #09090B | #FAFAFA |
| `input.placeholder` | Placeholder | #71717A | #71717A |
| `input.border` | Input border | #E4E4E7 | #3F3F46 |
| `input.focusRing` | Input ring | #A1A1AA | #71717A |
| `input.error` | Input error | #FF003C | #FF2357 |

#### 3.0.5 Navigation Tokens

| Token | Usage | Light | Dark |
|------|-------|-------|------|
| `nav.bg` | Top/Bottom bars | #FFFFFF | #09090B |
| `nav.border` | Bar divider | #E4E4E7 | #3F3F46 |
| `nav.icon.active` | Active icon | #09090B | #FAFAFA |
| `nav.icon.inactive` | Inactive icon | #71717A | #A1A1AA |
| `nav.text.active` | Active label | #09090B | #FAFAFA |
| `nav.text.inactive` | Inactive label | #71717A | #A1A1AA |

#### 3.0.6 Feedback Tokens (Semantic)

| Token | Usage | Light | Dark |
|------|-------|-------|------|
| `success.bg` | Success background | #EAFFF8 | #00302A |
| `success.text` | Success text | #00CBA2 | #27E4B8 |
| `success.border` | Success border | #00CBA2 | #27E4B8 |
| `warning.bg` | Warning background | #FFFAEC | #461D04 |
| `warning.text` | Warning text | #FF8000 | #FF980A |
| `warning.border` | Warning border | #FF8000 | #FF980A |
| `info.bg` | Info background | #EFF7FF | #162A55 |
| `info.text` | Info text | #3792FA | #5DB3FD |
| `info.border` | Info border | #3792FA | #5DB3FD |
| `error.bg` | Error background | #FFF0F4 | #500013 |
| `error.text` | Error text | #FF003C | #FF2357 |
| `error.border` | Error border | #FF003C | #FF2357 |

#### 3.0.7 Brand/Tone Tokens

| Token | Usage | Light | Dark |
|------|-------|-------|------|
| `tone.standard` | Success/default | #00CBA2 | #27E4B8 |
| `tone.collectible` | Free NFTs | #6221FF | #7346FF |
| `tone.edition` | Paid NFTs | #8D04EC | #B439FF |
| `tone.warning` | Alerts | #FF8000 | #FF980A |
| `tone.info` | Info | #3792FA | #5DB3FD |
| `tone.destructive` | Errors/delete | #FF003C | #FF2357 |
| `tone.highlight` | Selection | #8D04EC | #B439FF |

#### 3.0.8 Gradient Tokens (Common Overlays)

| Token | Usage | Light | Dark |
|------|-------|-------|------|
| `gradient.overlay.bottom` | Media overlays | #000000 0% → #000000 60% | #000000 0% → #000000 60% |
| `gradient.header.fade` | Header image fade | #000000 0% → #000000 40% | #000000 0% → #000000 40% |

#### 3.0.9 Compose Token Object (Reference)

```kotlin
object DesperseTokens {
    // Core
    val bgAppLight = Color(0xFFFFFFFF)
    val bgAppDark = Color(0xFF09090B)
    val bgSurfaceLight = Color(0xFFFFFFFF)
    val bgSurfaceDark = Color(0xFF18181B)
    val bgMutedLight = Color(0xFFF4F4F5)
    val bgMutedDark = Color(0xFF27272A)

    val textPrimaryLight = Color(0xFF09090B)
    val textPrimaryDark = Color(0xFFFAFAFA)
    val textSecondaryLight = Color(0xFF52525B)
    val textSecondaryDark = Color(0xFFA1A1AA)
    val textMutedLight = Color(0xFF71717A)
    val textMutedDark = Color(0xFF71717A)

    val borderDefaultLight = Color(0xFFE4E4E7)
    val borderDefaultDark = Color(0xFF3F3F46)
    val ringDefaultLight = Color(0xFFA1A1AA)
    val ringDefaultDark = Color(0xFF71717A)

    // Controls
    val primaryBgLight = Color(0xFF09090B)
    val primaryBgDark = Color(0xFFFAFAFA)
    val primaryTextLight = Color(0xFFFAFAFA)
    val primaryTextDark = Color(0xFF09090B)

    // Feedback
    val errorLight = Color(0xFFFF003C)
    val errorDark = Color(0xFFFF2357)
}

@Composable
fun tokenColor(light: Color, dark: Color) =
    if (isSystemInDarkTheme()) dark else light
```

### 3.1 Neutral Palette (Zinc)

| Token | Light Mode | Dark Mode | Hex |
|-------|------------|-----------|-----|
| zinc-50 | Background, cards | Text foreground | #FAFAFA |
| zinc-100 | Secondary, muted | - | #F4F4F5 |
| zinc-200 | Border, input | - | #E4E4E7 |
| zinc-300 | - | - | #D4D4D8 |
| zinc-400 | Ring | - | #A1A1AA |
| zinc-500 | - | Ring | #71717A |
| zinc-600 | Muted foreground | - | #52525B |
| zinc-700 | - | Border dark | #3F3F46 |
| zinc-800 | - | Secondary, muted | #27272A |
| zinc-900 | - | Card, popover | #18181B |
| zinc-950 | Foreground, primary | Background | #09090B |

### 3.2 Semantic Colors

#### Light Mode

```kotlin
val LightColorScheme = lightColorScheme(
    primary = Color(0xFF09090B),           // zinc-950
    onPrimary = Color(0xFFFAFAFA),          // zinc-50
    primaryContainer = Color(0xFF09090B),
    onPrimaryContainer = Color(0xFFFAFAFA),
    secondary = Color(0xFFF4F4F5),          // zinc-100
    onSecondary = Color(0xFF09090B),        // zinc-950
    secondaryContainer = Color(0xFFF4F4F5),
    onSecondaryContainer = Color(0xFF09090B),
    tertiary = Color(0xFFF4F4F5),           // accent
    onTertiary = Color(0xFF09090B),
    background = Color(0xFFFFFFFF),         // white
    onBackground = Color(0xFF09090B),       // zinc-950
    surface = Color(0xFFFFFFFF),            // card background
    onSurface = Color(0xFF09090B),
    surfaceVariant = Color(0xFFF4F4F5),     // muted
    onSurfaceVariant = Color(0xFF52525B),   // muted-foreground (zinc-600)
    outline = Color(0xFFE4E4E7),            // border (zinc-200)
    outlineVariant = Color(0xFFA1A1AA),     // ring (zinc-400)
    error = Color(0xFFFF003C),              // destructive (torch-red-600)
    onError = Color(0xFFFFFFFF)
)
```

#### Dark Mode

```kotlin
val DarkColorScheme = darkColorScheme(
    primary = Color(0xFFFAFAFA),             // zinc-50
    onPrimary = Color(0xFF09090B),           // zinc-950
    primaryContainer = Color(0xFFFAFAFA),
    onPrimaryContainer = Color(0xFF09090B),
    secondary = Color(0xFF27272A),           // zinc-800
    onSecondary = Color(0xFFFAFAFA),         // zinc-50
    secondaryContainer = Color(0xFF27272A),
    onSecondaryContainer = Color(0xFFFAFAFA),
    tertiary = Color(0xFF27272A),            // accent
    onTertiary = Color(0xFFFAFAFA),
    background = Color(0xFF09090B),          // zinc-950
    onBackground = Color(0xFFFAFAFA),        // zinc-50
    surface = Color(0xFF18181B),             // zinc-900 (card)
    onSurface = Color(0xFFFAFAFA),
    surfaceVariant = Color(0xFF27272A),      // muted (zinc-800)
    onSurfaceVariant = Color(0xFFA1A1AA),    // muted-foreground (zinc-400)
    outline = Color(0xFF3F3F46),             // border (zinc-700 with opacity)
    outlineVariant = Color(0xFF71717A),      // ring (zinc-500)
    error = Color(0xFFFF2357),               // destructive (torch-red-500)
    onError = Color(0xFFFFFFFF)
)
```

### 3.3 Brand/Semantic Tone Colors

| Tone | Purpose | Light Mode | Dark Mode | Hex Light/Dark |
|------|---------|------------|-----------|----------------|
| Standard | Success/default | caribbean-green-500 | caribbean-green-400 | #00CBA2 / #27E4B8 |
| Collectible | Free NFTs | blue-gem-600 | blue-gem-500 | #6221FF / #7346FF |
| Edition | Paid NFTs | purple-heart-700 | purple-heart-500 | #8D04EC / #B439FF |
| Warning | Alerts | flush-orange-600 | flush-orange-500 | #FF8000 / #FF980A |
| Info | Information | azure-radiance-500 | azure-radiance-400 | #3792FA / #5DB3FD |
| Destructive | Errors/delete | torch-red-600 | torch-red-500 | #FF003C / #FF2357 |
| Highlight | Selection | purple-heart-700 | purple-heart-500 | #8D04EC / #B439FF |

### 3.4 Compose Tone Colors

```kotlin
object DesperseTones {
    // Light mode
    val standardLight = Color(0xFF00CBA2)
    val collectibleLight = Color(0xFF6221FF)
    val editionLight = Color(0xFF8D04EC)
    val warningLight = Color(0xFFFF8000)
    val infoLight = Color(0xFF3792FA)
    val destructiveLight = Color(0xFFFF003C)

    // Dark mode
    val standardDark = Color(0xFF27E4B8)
    val collectibleDark = Color(0xFF7346FF)
    val editionDark = Color(0xFFB439FF)
    val warningDark = Color(0xFFFF980A)
    val infoDark = Color(0xFF5DB3FD)
    val destructiveDark = Color(0xFFFF2357)
}

@Composable
fun toneStandard() = if (isSystemInDarkTheme()) DesperseTones.standardDark else DesperseTones.standardLight
@Composable
fun toneCollectible() = if (isSystemInDarkTheme()) DesperseTones.collectibleDark else DesperseTones.collectibleLight
@Composable
fun toneEdition() = if (isSystemInDarkTheme()) DesperseTones.editionDark else DesperseTones.editionLight
@Composable
fun toneWarning() = if (isSystemInDarkTheme()) DesperseTones.warningDark else DesperseTones.warningLight
@Composable
fun toneInfo() = if (isSystemInDarkTheme()) DesperseTones.infoDark else DesperseTones.infoLight
@Composable
fun toneDestructive() = if (isSystemInDarkTheme()) DesperseTones.destructiveDark else DesperseTones.destructiveLight
```

### 3.5 Full Color Palettes (for Android colors.xml)

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Zinc (Neutral) -->
    <color name="zinc_50">#FAFAFA</color>
    <color name="zinc_100">#F4F4F5</color>
    <color name="zinc_200">#E4E4E7</color>
    <color name="zinc_300">#D4D4D8</color>
    <color name="zinc_400">#A1A1AA</color>
    <color name="zinc_500">#71717A</color>
    <color name="zinc_600">#52525B</color>
    <color name="zinc_700">#3F3F46</color>
    <color name="zinc_800">#27272A</color>
    <color name="zinc_900">#18181B</color>
    <color name="zinc_950">#09090B</color>

    <!-- Torch Red (Destructive) -->
    <color name="torch_red_50">#FFF0F4</color>
    <color name="torch_red_100">#FFDDE5</color>
    <color name="torch_red_200">#FFC0CF</color>
    <color name="torch_red_300">#FF94AD</color>
    <color name="torch_red_400">#FF577F</color>
    <color name="torch_red_500">#FF2357</color>
    <color name="torch_red_600">#FF003C</color>
    <color name="torch_red_700">#D70033</color>
    <color name="torch_red_800">#B1032C</color>
    <color name="torch_red_900">#920A2A</color>
    <color name="torch_red_950">#500013</color>

    <!-- Blue Gem (Collectible) -->
    <color name="blue_gem_50">#F3F1FF</color>
    <color name="blue_gem_100">#E9E6FF</color>
    <color name="blue_gem_200">#D5D0FF</color>
    <color name="blue_gem_300">#B7ABFF</color>
    <color name="blue_gem_400">#947BFF</color>
    <color name="blue_gem_500">#7346FF</color>
    <color name="blue_gem_600">#6221FF</color>
    <color name="blue_gem_700">#540FF2</color>
    <color name="blue_gem_800">#450CCB</color>
    <color name="blue_gem_900">#3A0CA3</color>
    <color name="blue_gem_950">#220471</color>

    <!-- Purple Heart (Edition/Accent) -->
    <color name="purple_heart_50">#FBF3FF</color>
    <color name="purple_heart_100">#F4E4FF</color>
    <color name="purple_heart_200">#ECCEFF</color>
    <color name="purple_heart_300">#DDA7FF</color>
    <color name="purple_heart_400">#C86FFF</color>
    <color name="purple_heart_500">#B439FF</color>
    <color name="purple_heart_600">#A213FF</color>
    <color name="purple_heart_700">#8D04EC</color>
    <color name="purple_heart_800">#7209B7</color>
    <color name="purple_heart_900">#62099A</color>
    <color name="purple_heart_950">#430074</color>

    <!-- Caribbean Green (Success) -->
    <color name="caribbean_green_50">#EAFFF8</color>
    <color name="caribbean_green_100">#CDFEEB</color>
    <color name="caribbean_green_200">#9FFBDD</color>
    <color name="caribbean_green_300">#61F4CD</color>
    <color name="caribbean_green_400">#27E4B8</color>
    <color name="caribbean_green_500">#00CBA2</color>
    <color name="caribbean_green_600">#00A585</color>
    <color name="caribbean_green_700">#00846D</color>
    <color name="caribbean_green_800">#006858</color>
    <color name="caribbean_green_900">#00554A</color>
    <color name="caribbean_green_950">#00302A</color>

    <!-- Flush Orange (Warning) -->
    <color name="flush_orange_50">#FFFAEC</color>
    <color name="flush_orange_100">#FFF4D3</color>
    <color name="flush_orange_200">#FFE5A5</color>
    <color name="flush_orange_300">#FFD16D</color>
    <color name="flush_orange_400">#FFB232</color>
    <color name="flush_orange_500">#FF980A</color>
    <color name="flush_orange_600">#FF8000</color>
    <color name="flush_orange_700">#CC5D02</color>
    <color name="flush_orange_800">#A1480B</color>
    <color name="flush_orange_900">#823D0C</color>
    <color name="flush_orange_950">#461D04</color>

    <!-- Azure Radiance (Info) -->
    <color name="azure_radiance_50">#EFF7FF</color>
    <color name="azure_radiance_100">#DAEDFF</color>
    <color name="azure_radiance_200">#BEE1FF</color>
    <color name="azure_radiance_300">#91CFFF</color>
    <color name="azure_radiance_400">#5DB3FD</color>
    <color name="azure_radiance_500">#3792FA</color>
    <color name="azure_radiance_600">#2E7CF0</color>
    <color name="azure_radiance_700">#195DDC</color>
    <color name="azure_radiance_800">#1B4BB2</color>
    <color name="azure_radiance_900">#1C438C</color>
    <color name="azure_radiance_950">#162A55</color>
</resources>
```

---

## 4. Spacing System

### 4.1 Base Spacing Scale

| Web Class | Web Value | Android (dp) | Usage |
|-----------|-----------|--------------|-------|
| `p-0.5` | 2px | 2.dp | Micro spacing |
| `p-1` | 4px | 4.dp | Tight spacing |
| `p-1.5` | 6px | 6.dp | Small gap |
| `p-2` | 8px | 8.dp | Standard small |
| `p-2.5` | 10px | 10.dp | Medium-small |
| `p-3` | 12px | 12.dp | Standard medium |
| `p-4` | 16px | 16.dp | Standard large |
| `p-5` | 20px | 20.dp | Large |
| `p-6` | 24px | 24.dp | Extra large |
| `p-8` | 32px | 32.dp | Section spacing |
| `p-10` | 40px | 40.dp | Large section |
| `p-12` | 48px | 48.dp | Container spacing |

### 4.2 Compose Spacing Object

```kotlin
object DesperseSpacing {
    val micro = 2.dp      // p-0.5
    val xs = 4.dp         // p-1
    val sm = 8.dp         // p-2
    val md = 12.dp        // p-3
    val lg = 16.dp        // p-4
    val xl = 20.dp        // p-5
    val xxl = 24.dp       // p-6
    val xxxl = 32.dp      // p-8
    val section = 40.dp   // p-10
    val container = 48.dp // p-12
}
```

### 4.3 Component-Specific Spacing

| Component | Padding | Gap | Margin |
|-----------|---------|-----|--------|
| Card | 24dp (p-6) | 24dp (gap-6) | - |
| CardHeader | 24dp horizontal | 8dp (gap-2) | - |
| CardContent | 24dp horizontal | - | - |
| Button (default) | 16dp horizontal, 8dp vertical | - | - |
| Button (icon) | 0dp (square) | - | - |
| Input | 12dp horizontal, 4dp vertical | - | - |
| Dialog | 24dp | 16dp (gap-4) | - |
| DropdownItem | 16dp horizontal, 10dp vertical | 12dp (gap-3) | - |
| ListItem | 12dp all | 12dp (gap-3) | - |
| BottomNav | 8dp horizontal | - | Safe area bottom |
| TopNav | 16dp horizontal | - | Safe area top |
| Sidebar | 12dp horizontal, 16dp vertical | 4dp (space-y-1) | - |

### 4.4 Safe Area Insets

```kotlin
// For edge-to-edge display
val topInset = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()
val bottomInset = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()

// TopNav height + safe area
val topNavHeight = 56.dp + topInset

// BottomNav height + safe area
val bottomNavHeight = 56.dp + bottomInset
```

---

## 5. Component Library

### 5.1 Button

#### Variants

| Variant | Background | Text Color | Border |
|---------|------------|------------|--------|
| default | primary | onPrimary | none |
| destructive | error | onError | none |
| outline | transparent | onSurface | outline |
| secondary | secondary | onSecondary | none |
| ghost | transparent | onSurface | none |
| link | transparent | primary | none (underline) |

#### Sizes

| Size | Height | Padding | Icon Size |
|------|--------|---------|-----------|
| default | 40dp (mobile), 32dp (tablet+) | 16dp horizontal | 16dp |
| cta | 44dp (mobile), 32dp (tablet+) | 16dp horizontal | 16dp |
| icon | 40x40dp (mobile), 32x32dp (tablet+) | 0dp | 20dp |
| icon-lg | 64x64dp | 0dp | 32dp |

#### Compose Implementation

```kotlin
enum class ButtonVariant { Default, Destructive, Outline, Secondary, Ghost, Link }
enum class ButtonSize { Default, Cta, Icon, IconLg }

@Composable
fun DesperseButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: ButtonVariant = ButtonVariant.Default,
    size: ButtonSize = ButtonSize.Default,
    enabled: Boolean = true,
    content: @Composable RowScope.() -> Unit
) {
    val colors = when (variant) {
        ButtonVariant.Default -> ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor = MaterialTheme.colorScheme.onPrimary
        )
        ButtonVariant.Destructive -> ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.error,
            contentColor = MaterialTheme.colorScheme.onError
        )
        ButtonVariant.Outline -> ButtonDefaults.outlinedButtonColors(
            contentColor = MaterialTheme.colorScheme.onSurface
        )
        ButtonVariant.Secondary -> ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.secondary,
            contentColor = MaterialTheme.colorScheme.onSecondary
        )
        ButtonVariant.Ghost -> ButtonDefaults.textButtonColors(
            contentColor = MaterialTheme.colorScheme.onSurface
        )
        ButtonVariant.Link -> ButtonDefaults.textButtonColors(
            contentColor = MaterialTheme.colorScheme.primary
        )
    }

    val height = when (size) {
        ButtonSize.Default -> 40.dp
        ButtonSize.Cta -> 44.dp
        ButtonSize.Icon -> 40.dp
        ButtonSize.IconLg -> 64.dp
    }

    val shape = when (size) {
        ButtonSize.Icon, ButtonSize.IconLg -> CircleShape
        else -> CircleShape // All buttons are pill-shaped
    }

    Button(
        onClick = onClick,
        modifier = modifier.height(height).then(
            if (size == ButtonSize.Icon || size == ButtonSize.IconLg)
                Modifier.width(height)
            else Modifier
        ),
        enabled = enabled,
        colors = colors,
        shape = shape,
        contentPadding = when (size) {
            ButtonSize.Icon, ButtonSize.IconLg -> PaddingValues(0.dp)
            else -> PaddingValues(horizontal = 16.dp, vertical = 8.dp)
        },
        content = content
    )
}
```

### 5.2 Input / TextField

#### Styling

| Property | Value |
|----------|-------|
| Height | 40dp |
| Corner radius | 8dp (rounded-sm) |
| Background | zinc-50 (light), zinc-800 (dark) |
| Border | 1dp, zinc-200 (light), zinc-700/50 (dark) |
| Focus border | ring color (zinc-400/500) |
| Focus ring | 2dp ring with 30% opacity |
| Error border | destructive color |
| Padding | 12dp horizontal, 4dp vertical |
| Font | 16sp (mobile), 14sp (tablet) |

#### Compose Implementation

```kotlin
@Composable
fun DesperseTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    isError: Boolean = false,
    enabled: Boolean = true,
    singleLine: Boolean = true,
    leadingIcon: @Composable (() -> Unit)? = null,
    trailingIcon: @Composable (() -> Unit)? = null
) {
    val isDark = isSystemInDarkTheme()

    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier
            .fillMaxWidth()
            .height(40.dp),
        placeholder = {
            Text(
                text = placeholder,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        },
        isError = isError,
        enabled = enabled,
        singleLine = singleLine,
        leadingIcon = leadingIcon,
        trailingIcon = trailingIcon,
        shape = RoundedCornerShape(8.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = if (isDark) Color(0xFF27272A) else Color(0xFFF4F4F5),
            unfocusedContainerColor = if (isDark) Color(0xFF27272A) else Color(0xFFF4F4F5),
            focusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
            unfocusedBorderColor = MaterialTheme.colorScheme.outline,
            errorBorderColor = MaterialTheme.colorScheme.error
        ),
        textStyle = MaterialTheme.typography.bodyMedium
    )
}
```

### 5.3 Card

#### Structure

```
Card (Surface with border + shadow)
├── CardHeader (optional)
│   ├── CardTitle
│   ├── CardDescription (optional)
│   └── CardAction (optional, top-right)
├── CardContent
└── CardFooter (optional)
```

#### Styling

| Property | Value |
|----------|-------|
| Background | surface (white/zinc-900) |
| Border | 1dp, outline color |
| Corner radius | 20dp (rounded-xl) |
| Shadow | 1dp elevation (shadow-sm) |
| Padding | 24dp vertical gap between sections |
| Content padding | 24dp horizontal |

#### Compose Implementation

```kotlin
@Composable
fun DesperseCard(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        shadowElevation = 1.dp
    ) {
        Column(
            modifier = Modifier.padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp),
            content = content
        )
    }
}
```

### 5.4 Dialog / Modal

#### Overlay
- Background: Black 50% opacity

#### Content
- Max width: Screen width - 32dp (16dp margin each side)
- Max width constraint: 512dp
- Corner radius: 16dp (rounded-lg)
- Padding: 24dp
- Gap between elements: 16dp
- Shadow: 8dp elevation (shadow-lg)

#### Close button position
- Absolute top-right: 16dp from edge
- Size: 44dp touch target minimum

### 5.5 Bottom Sheet

#### Styling

| Property | Value |
|----------|-------|
| Corner radius | 16dp top corners only |
| Handle | 32dp x 4dp, centered, 8dp from top |
| Handle color | onSurfaceVariant 40% opacity |
| Background | surface |
| Max height | 80% of screen |
| Padding | 16dp horizontal, 24dp bottom |

### 5.6 Dropdown Menu

#### Styling

| Property | Value |
|----------|-------|
| Min width | 128dp (8rem) |
| Corner radius | 20dp (rounded-xl) |
| Background | surface (popover) |
| Border | 1dp, outline |
| Shadow | 8dp elevation |
| Item padding | 16dp horizontal, 10dp vertical |
| Item corner radius | 16dp (rounded-lg) |
| Item gap | 12dp between icon and text |
| Separator | 1dp height, -4dp horizontal margin |

### 5.7 Tabs

#### Tab List

| Property | Value |
|----------|-------|
| Height | 36dp (h-9) |
| Background | surfaceVariant (muted) |
| Corner radius | 16dp (rounded-lg) |
| Padding | 3dp all around |

#### Tab Trigger

| Property | Active | Inactive |
|----------|--------|----------|
| Background | surface (white/dark card) | transparent |
| Text color | onSurface | onSurfaceVariant |
| Font weight | Medium | Medium |
| Corner radius | 12dp (rounded-md) |
| Shadow | 1dp (active only) | none |

### 5.8 Badge

#### Variants

| Variant | Background | Text |
|---------|------------|------|
| default | primary 10% | primary |
| secondary | surfaceVariant | onSurfaceVariant |
| destructive | error 10% | error |
| success | toneStandard 20% | toneStandard |
| warning | toneWarning 20% | toneWarning |
| outline | transparent | onSurface |

#### Sizes

| Size | Padding | Font Size |
|------|---------|-----------|
| default | 10dp x 2dp | 12sp (xs) |
| sm | 8dp x 2dp | 10sp |

### 5.9 Switch / Toggle

#### Dimensions

| Property | Value |
|----------|-------|
| Track width | 36dp |
| Track height | 20dp |
| Thumb size | 16dp |
| Thumb travel | 16dp |

#### Colors

| State | Track | Thumb |
|-------|-------|-------|
| Checked | primary | surface |
| Unchecked | zinc-300 (light), zinc-700 (dark) | surface |

### 5.10 Skeleton / Shimmer

- Background: surfaceVariant (accent)
- Animation: Shimmer effect (horizontal gradient sweep)
- Corner radius: 12dp (rounded-md)
- Duration: 1500ms per cycle

### 5.11 Toast / Snackbar

- Position: Top center
- Max width: 420dp
- Background: surface
- Border: 1dp outline
- Corner radius: 12dp
- Shadow: 4dp elevation
- Padding: 16dp
- Duration: 4000ms default

---

## 6. Screen-by-Screen Guide

### 6.1 Feed / Home Screen

#### Layout Structure
```
Scaffold
├── TopAppBar (hidden on scroll, 56dp height)
│   ├── Leading: Create button (icon)
│   ├── Center: Logo or "Feed" title
│   └── Trailing: Wallet button (icon)
├── Content (LazyColumn)
│   ├── FeedTabs (For You | Following)
│   │   └── Sticky header behavior
│   └── PostCards (infinite scroll)
│       ├── Pull-to-refresh
│       └── Load more on scroll end
└── BottomNavBar (56dp + safe area)
    ├── Home (filled when active)
    ├── Explore
    ├── Create (center, emphasized)
    ├── Notifications (with badge)
    └── Profile (avatar)
```

#### Measurements

| Element | Value |
|---------|-------|
| TopNav height | 56dp + status bar |
| BottomNav height | 56dp + nav bar |
| Content max width | None (full width) |
| PostCard margin | 16dp horizontal (mobile) |
| PostCard spacing | 0dp (dividers or borders) |
| Feed tabs height | 40dp |
| Feed tabs padding | 16dp horizontal |

#### PostCard Layout

```
Column
├── Header Row (padding: 16dp h, 8dp v)
│   ├── Avatar (40x40dp, circular)
│   ├── Column (flex)
│   │   ├── Row: DisplayName + Verified badge
│   │   └── Row: @username · timestamp · type badge
│   └── MoreMenu (IconButton 40x40dp)
├── MediaCarousel (full bleed, aspect ratio varies)
│   ├── Image/Video/Audio/3D content
│   ├── Overlay badges (top-left: slide count)
│   └── Overlay pills (bottom: price, status)
├── Actions Row (padding: 16dp h, 8dp v)
│   ├── Like (icon + count)
│   ├── Comment (icon + count)
│   ├── Collect/Buy (icon + count)
│   └── Share (icon)
└── Caption (padding: 16dp h, 8dp bottom)
    ├── Text (truncated at 150 chars)
    └── "more" link if truncated
```

#### Typography in PostCard

| Element | Style | Size |
|---------|-------|------|
| Display name | SemiBold | 14sp |
| Username | Medium | 12sp |
| Timestamp | Medium | 12sp |
| Type badge | Medium | 10sp |
| Caption | Medium | 14sp |
| Action counts | Medium | 14sp |

### 6.2 Explore Screen

#### Layout Structure
```
Scaffold
├── TopAppBar (custom MobileHeader)
│   └── Title: "Explore"
├── Content (LazyColumn)
│   ├── SearchBar (sticky, 48dp height)
│   │   └── Tap navigates to /search
│   ├── SuggestedCreators section
│   │   ├── Section title
│   │   └── Horizontal LazyRow of creator cards
│   ├── Divider
│   └── TrendingPosts section
│       ├── Section title
│       └── Grid of trending post thumbnails
└── BottomNavBar
```

#### Measurements

| Element | Value |
|---------|-------|
| SearchBar height | 48dp |
| SearchBar corner radius | 24dp (full) |
| SearchBar margin | 16dp horizontal |
| Creator card width | 140dp |
| Creator card gap | 12dp |
| Trending grid columns | 2 |
| Trending grid gap | 8dp |
| Section title padding | 16dp horizontal, 12dp vertical |

### 6.3 Search Screen

#### Layout Structure
```
Scaffold
├── TopAppBar
│   ├── Leading: Back button
│   ├── Center: Search TextField (expandable)
│   └── Trailing: Clear button (when has text)
├── Content
│   ├── TabRow (Top | Posts | People | Collectibles)
│   └── Results based on tab
│       ├── Top: Mixed results
│       ├── Posts: PostCard list
│       ├── People: UserCard list
│       └── Collectibles: Filtered PostCard list
└── BottomNavBar (hidden)
```

#### Search Tab Indicator
- Active: Bottom border 2dp, foreground color
- Width: 48dp centered under text
- Animation: Spring animation between tabs

#### UserCard (Search Result)

```
Row (padding: 12dp)
├── Avatar (48x48dp, circular)
├── Column (weight 1f, padding start 12dp)
│   ├── DisplayName (SemiBold, 14sp)
│   └── @username (Medium, 12sp, muted)
└── FollowButton (if not self)
```

### 6.4 Post Detail Screen

#### Layout Structure (Portrait Mobile)
```
Scaffold
├── TopAppBar
│   ├── Leading: Back button
│   ├── Title: (empty or username)
│   └── Trailing: MoreMenu
├── Content (LazyColumn)
│   ├── MediaCarousel (full width, max 80% height)
│   ├── UserHeader (padding: 16dp)
│   ├── PostMeta (type badge, timestamp)
│   ├── Actions Row
│   ├── Caption
│   ├── Categories (horizontal pills)
│   └── Comments Section
│       ├── Comment count header
│       └── Comment list
└── Fixed Input (bottom, above nav)
    ├── Avatar (32dp)
    ├── TextField (flex)
    └── Send button
```

#### Layout Structure (Landscape / Tablet)
```
Row
├── Left: MediaCarousel (50-60% width)
└── Right: Column (scrollable)
    ├── UserHeader
    ├── Caption
    ├── Actions
    └── Comments
```

### 6.5 Profile Screen

#### Layout Structure
```
Scaffold
├── TopAppBar (transparent overlay on header image)
│   ├── Leading: Back (if not own profile)
│   └── Trailing: Settings (if own) or MoreMenu
├── Content (LazyColumn with header collapse)
│   ├── HeaderImage (200dp height, parallax)
│   ├── ProfileInfo (negative margin overlap)
│   │   ├── Avatar (96dp, circular, bordered)
│   │   ├── DisplayName + Verified
│   │   ├── @username
│   │   ├── Bio
│   │   ├── Website link
│   │   └── Join date
│   ├── Stats Row
│   │   ├── Followers (clickable)
│   │   ├── Following (clickable)
│   │   └── Collectors (clickable)
│   ├── Action Button (Edit/Follow/Message)
│   ├── TabRow (Posts | Collected | For Sale)
│   └── Grid (3 columns)
│       └── ProfileGridItem (square, with overlay stats)
└── BottomNavBar
```

#### Measurements

| Element | Value |
|---------|-------|
| Header image height | 200dp |
| Avatar size | 96dp |
| Avatar border | 4dp, surface color |
| Avatar offset | -48dp (half overlapping header) |
| Profile info padding | 16dp horizontal |
| Stats gap | 24dp between items |
| Grid columns | 3 |
| Grid item aspect | 1:1 (square) |
| Grid gap | 2dp |

#### ProfileGridItem Overlay (on hover/press)
- Background: Black 60% gradient from bottom
- Stats: Likes, Comments, Collects with icons
- Font: 12sp, white

### 6.6 Notifications Screen

#### Layout Structure
```
Scaffold
├── TopAppBar
│   ├── Title: "Notifications"
│   └── Trailing: Clear all (if has notifications)
├── Content (LazyColumn)
│   └── NotificationItems
│       ├── Unread: accent background
│       └── Read: card background with border
└── BottomNavBar
```

#### NotificationItem Layout

```
Row (padding: 16dp h, 12dp v)
├── Avatar (40dp, circular)
│   └── Or: Action icon (follow, like, etc.)
├── Column (weight 1f, padding h: 12dp)
│   ├── Text: "[Actor] [action] [target]"
│   │   └── Actor name is bold/linked
│   ├── Preview text (if comment/mention, 2 lines max)
│   └── Timestamp (12sp, muted)
└── Thumbnail (48x48dp, rounded, if applicable)
    └── For post-related notifications
```

### 6.7 Settings Screen

#### Layout Structure (Mobile)
```
Scaffold
├── TopAppBar
│   ├── Leading: Back
│   └── Title: "Settings"
└── Content (LazyColumn)
    ├── Account Section
    │   ├── Profile Info
    │   ├── Wallets
    │   ├── Notifications
    │   ├── Messaging
    │   ├── Security
    │   └── App Settings
    ├── Divider
    └── General Section
        └── Help & About
```

#### SettingsItem Layout

```
Row (padding: 16dp h, 12dp v, clickable)
├── Icon (24dp, muted color)
├── Column (weight 1f, padding start: 16dp)
│   ├── Title (14sp, Medium)
│   └── Subtitle (12sp, muted, optional)
└── ChevronRight (16dp, muted)
```

### 6.8 Messages / DM Screen

#### Thread List Layout
```
Scaffold
├── TopAppBar
│   └── Title: "Messages"
└── Content (LazyColumn)
    └── ThreadItems
        ├── Avatar (48dp) + unread dot
        ├── Column
        │   ├── Row: Name + Timestamp
        │   └── Preview (truncated)
        └── Unread indicator (if applicable)
```

#### Conversation Layout
```
Scaffold
├── TopAppBar
│   ├── Leading: Back
│   ├── Center: Avatar (32dp) + Name
│   └── Trailing: MoreMenu
├── Content (LazyColumn, reversed)
│   ├── Date separators (centered pill)
│   └── MessageBubbles
│       ├── Sent: Right-aligned, primary bg
│       └── Received: Left-aligned, muted bg
└── InputRow (fixed bottom)
    ├── TextField (flex)
    └── Send button (enabled when has text)
```

#### MessageBubble Layout

| Property | Sent | Received |
|----------|------|----------|
| Alignment | End | Start |
| Max width | 75% | 75% |
| Background | primary | surfaceVariant |
| Text color | onPrimary | onSurface |
| Corner radius | 16dp, br: 4dp | 16dp, bl: 4dp |
| Padding | 12dp h, 8dp v | 12dp h, 8dp v |

### 6.9 Create Post Screen

#### Layout Structure
```
Scaffold
├── TopAppBar
│   ├── Leading: Close
│   ├── Title: "Create"
│   └── Trailing: Post button
└── Content (scrollable Column)
    ├── MediaUpload zone
    │   ├── Empty: Dashed border, upload icon
    │   └── Filled: Preview carousel
    ├── Caption TextField (expandable)
    ├── Categories selector
    │   └── Horizontal scrollable chips
    ├── Hashtags input
    ├── Post Type selector
    │   ├── Standard Post
    │   ├── Free Collectible
    │   └── Paid Edition
    └── Edition Options (if edition selected)
        ├── Price input
        ├── Currency toggle (SOL/USDC)
        ├── Supply input
        └── Royalty slider
```

### 6.10 Admin Screens

Similar patterns to settings with table/list views for:
- Moderation queue (reports list)
- Report detail (with actions)
- Feedback list
- Feedback detail

---

## 7. Icons & Assets

### 7.1 Icon Library

**Primary:** Font Awesome 6 Free + Solid
- Android equivalent: Font Awesome Android library or custom icon font

**Alternative approach:** Convert to Material Icons where possible

### 7.2 Icon Mapping (Font Awesome → Material/Custom)

| FA Icon | Material Equivalent | Usage |
|---------|---------------------|-------|
| fa-user | Icons.Default.Person | Profile |
| fa-xmark | Icons.Default.Close | Close/dismiss |
| fa-gem | Custom (gem.xml) | Collectibles |
| fa-arrow-left | Icons.AutoMirrored.Default.ArrowBack | Navigation |
| fa-play | Icons.Default.PlayArrow | Video |
| fa-music | Icons.Default.MusicNote | Audio |
| fa-wallet | Icons.Default.AccountBalanceWallet | Wallet |
| fa-triangle-exclamation | Icons.Default.Warning | Warnings |
| fa-image | Icons.Default.Image | Images |
| fa-cube | Custom (cube.xml) | NFT/3D |
| fa-bell | Icons.Default.Notifications | Notifications |
| fa-star | Icons.Default.Star | Favorites |
| fa-magnifying-glass | Icons.Default.Search | Search |
| fa-lock | Icons.Default.Lock | Security |
| fa-heart | Icons.Default.Favorite | Likes |
| fa-comment | Icons.Default.ChatBubble | Comments |
| fa-sun-bright | Icons.Default.LightMode | Light theme |
| fa-moon | Icons.Default.DarkMode | Dark theme |
| fa-message | Icons.Default.Message | DMs |
| fa-hashtag | Custom (hashtag.xml) | Tags |
| fa-check | Icons.Default.Check | Confirmed |
| fa-gear | Icons.Default.Settings | Settings |
| fa-flag | Icons.Default.Flag | Report |
| fa-ellipsis-vertical | Icons.Default.MoreVert | Menu |
| fa-paper-plane | Icons.Default.Send | Send |
| fa-spinner-third | CircularProgressIndicator | Loading |
| fa-plus | Icons.Default.Add | Create |
| fa-pencil | Icons.Default.Edit | Edit |
| fa-trash-xmark | Icons.Default.Delete | Delete |

### 7.3 Icon Usage Map (Where Each Icon Appears)

| FA Icon | UI Location | Usage Details |
|---------|------------|---------------|
| fa-user | Profile | Profile tab, user header fallback |
| fa-xmark | Dialogs/Sheets | Close buttons in modals, sheets |
| fa-gem | Post type | Collectible badge, post type chip |
| fa-arrow-left | Navigation | Back button in top bars |
| fa-play | Media | Video thumbnail overlay |
| fa-music | Media | Audio post indicator |
| fa-wallet | Wallet | Wallet action in top bar, settings |
| fa-triangle-exclamation | Alerts | Warning banners, validation |
| fa-image | Media | Image post indicator |
| fa-cube | Media | 3D/NFT indicator |
| fa-bell | Notifications | Bottom nav, notifications screen |
| fa-star | Favorites | Favorite/featured markers |
| fa-magnifying-glass | Search | Explore/Search bar, top bar |
| fa-lock | Security | Settings → Security |
| fa-heart | Actions | Like action in PostCard |
| fa-comment | Actions | Comment action in PostCard |
| fa-sun-bright | Theme | Theme toggle (light) |
| fa-moon | Theme | Theme toggle (dark) |
| fa-message | Messages | Messages tab, thread list |
| fa-hashtag | Tags | Hashtag input, category chips |
| fa-check | Status | Success state, confirmation |
| fa-gear | Settings | Settings entry point |
| fa-flag | Moderation | Report post/user |
| fa-ellipsis-vertical | Menus | PostCard more menu, headers |
| fa-paper-plane | Actions | Send in DMs, comment send |
| fa-spinner-third | Loading | Global loading, buttons |
| fa-plus | Create | Create button in nav |
| fa-pencil | Edit | Edit profile, edit post |
| fa-trash-xmark | Destructive | Delete post/comment |

### 7.4 Icon Sizes

| Context | Size (dp) | LineHeight |
|---------|-----------|------------|
| Inline text | 16 | Match text |
| Button | 20 | - |
| Navigation | 24 | - |
| Empty state | 48 | - |
| Feature icon | 32-40 | - |

### 7.5 Custom Vector Assets Required

Create these as vector drawables (`res/drawable/`) by converting the Font Awesome assets:
- `ic_gem.xml` - Collectible indicator (FA: fa-gem)
- `ic_cube.xml` - NFT/3D indicator (FA: fa-cube)
- `ic_hashtag.xml` - Tag indicator (FA: fa-hashtag)
- `ic_hexagon_image.xml` - 1/1 edition (FA: fa-hexagon-image)
- `ic_image_stack.xml` - Limited edition (FA: fa-image-stack)
- `ic_solana.xml` - SOL currency
- `ic_usdc.xml` - USDC currency
- `ic_desperse_logo.xml` - App logo

### 7.6 Token Logos

Store in `res/drawable/`:
- `ic_token_sol.xml` - Solana logo
- `ic_token_usdc.xml` - USDC logo

---

## 8. Android Implementation Notes

### 8.1 Project Structure

```
app/
├── src/main/
│   ├── java/com/desperse/
│   │   ├── MainActivity.kt
│   │   ├── DesperseApplication.kt
│   │   ├── ui/
│   │   │   ├── theme/
│   │   │   │   ├── Color.kt
│   │   │   │   ├── Type.kt
│   │   │   │   ├── Shape.kt
│   │   │   │   ├── Spacing.kt
│   │   │   │   └── Theme.kt
│   │   │   ├── components/
│   │   │   │   ├── Button.kt
│   │   │   │   ├── Card.kt
│   │   │   │   ├── TextField.kt
│   │   │   │   ├── Dialog.kt
│   │   │   │   ├── BottomSheet.kt
│   │   │   │   ├── Tabs.kt
│   │   │   │   ├── Badge.kt
│   │   │   │   ├── Avatar.kt
│   │   │   │   ├── PostCard.kt
│   │   │   │   ├── MediaCarousel.kt
│   │   │   │   └── ...
│   │   │   ├── navigation/
│   │   │   │   ├── DesperseNavHost.kt
│   │   │   │   ├── BottomNavBar.kt
│   │   │   │   └── Routes.kt
│   │   │   └── screens/
│   │   │       ├── feed/
│   │   │       │   ├── FeedScreen.kt
│   │   │       │   └── FeedViewModel.kt
│   │   │       ├── explore/
│   │   │       ├── search/
│   │   │       ├── post/
│   │   │       ├── profile/
│   │   │       ├── notifications/
│   │   │       ├── settings/
│   │   │       ├── messages/
│   │   │       └── create/
│   │   ├── data/
│   │   │   ├── api/
│   │   │   │   ├── DesperseApi.kt
│   │   │   │   └── ApiClient.kt
│   │   │   ├── models/
│   │   │   │   ├── User.kt
│   │   │   │   ├── Post.kt
│   │   │   │   ├── Comment.kt
│   │   │   │   └── ...
│   │   │   └── repository/
│   │   │       ├── AuthRepository.kt
│   │   │       ├── PostRepository.kt
│   │   │       └── ...
│   │   └── util/
│   │       ├── DateUtils.kt
│   │       └── Extensions.kt
│   └── res/
│       ├── drawable/
│       ├── font/
│       │   ├── figtree_regular.ttf
│       │   ├── figtree_medium.ttf
│       │   ├── figtree_semibold.ttf
│       │   └── figtree_bold.ttf
│       ├── values/
│       │   ├── colors.xml
│       │   ├── strings.xml
│       │   └── themes.xml
│       └── values-night/
│           └── colors.xml
```

### 8.2 Dependencies

```kotlin
// build.gradle.kts (app)
dependencies {
    // Compose BOM
    implementation(platform("androidx.compose:compose-bom:2024.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")

    // Navigation
    implementation("androidx.navigation:navigation-compose:2.7.7")

    // Coil for images
    implementation("io.coil-kt:coil-compose:2.5.0")

    // Accompanist (system UI, pager, etc.)
    implementation("com.google.accompanist:accompanist-systemuicontroller:0.34.0")
    implementation("com.google.accompanist:accompanist-placeholder:0.34.0")

    // Retrofit for API
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

    // ViewModel
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.7.0")

    // Hilt (DI)
    implementation("com.google.dagger:hilt-android:2.50")
    kapt("com.google.dagger:hilt-compiler:2.50")
    implementation("androidx.hilt:hilt-navigation-compose:1.1.0")

    // DataStore (preferences)
    implementation("androidx.datastore:datastore-preferences:1.0.0")

    // Solana (Web3)
    implementation("com.solanamobile:mobile-wallet-adapter-clientlib-ktx:2.0.0")

    // ExoPlayer (video)
    implementation("androidx.media3:media3-exoplayer:1.2.1")
    implementation("androidx.media3:media3-ui:1.2.1")
}
```

### 8.3 Theme Setup

```kotlin
// Theme.kt
@Composable
fun DesperseTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    val systemUiController = rememberSystemUiController()

    SideEffect {
        systemUiController.setSystemBarsColor(
            color = Color.Transparent,
            darkIcons = !darkTheme
        )
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = DesperseTypography,
        shapes = DesperseShapes,
        content = content
    )
}

// Shapes.kt
val DesperseShapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(12.dp),
    large = RoundedCornerShape(16.dp),
    extraLarge = RoundedCornerShape(20.dp)
)
```

### 8.4 Navigation Setup

```kotlin
// Routes.kt
sealed class Screen(val route: String) {
    object Feed : Screen("feed")
    object Explore : Screen("explore")
    object Search : Screen("search?q={query}") {
        fun createRoute(query: String = "") = "search?q=$query"
    }
    object Create : Screen("create")
    object Notifications : Screen("notifications")
    object Profile : Screen("profile/{slug}") {
        fun createRoute(slug: String) = "profile/$slug"
    }
    object PostDetail : Screen("post/{postId}") {
        fun createRoute(postId: String) = "post/$postId"
    }
    object Settings : Screen("settings")
    object Messages : Screen("messages")
    object Conversation : Screen("messages/{threadId}") {
        fun createRoute(threadId: String) = "messages/$threadId"
    }
}

// DesperseNavHost.kt
@Composable
fun DesperseNavHost(
    navController: NavHostController,
    modifier: Modifier = Modifier
) {
    NavHost(
        navController = navController,
        startDestination = Screen.Feed.route,
        modifier = modifier
    ) {
        composable(Screen.Feed.route) { FeedScreen(navController) }
        composable(Screen.Explore.route) { ExploreScreen(navController) }
        composable(Screen.Create.route) { CreateScreen(navController) }
        composable(Screen.Notifications.route) { NotificationsScreen(navController) }
        composable(
            route = Screen.Profile.route,
            arguments = listOf(navArgument("slug") { type = NavType.StringType })
        ) { backStackEntry ->
            ProfileScreen(
                navController = navController,
                slug = backStackEntry.arguments?.getString("slug") ?: ""
            )
        }
        // ... more routes
    }
}
```

### 8.5 API Integration

The web app uses TanStack Start server functions. For Android, create equivalent Retrofit endpoints:

```kotlin
interface DesperseApi {
    // Auth
    @POST("auth/init")
    suspend fun initAuth(@Body request: InitAuthRequest): AuthResponse

    @GET("users/me")
    suspend fun getCurrentUser(): UserResponse

    // Feed
    @GET("feed")
    suspend fun getFeed(
        @Query("cursor") cursor: String? = null,
        @Query("tab") tab: String = "for_you"
    ): FeedResponse

    // Posts
    @GET("posts/{postId}")
    suspend fun getPost(@Path("postId") postId: String): PostResponse

    @POST("posts")
    suspend fun createPost(@Body request: CreatePostRequest): PostResponse

    @DELETE("posts/{postId}")
    suspend fun deletePost(@Path("postId") postId: String)

    // Social
    @POST("follow/{userId}")
    suspend fun followUser(@Path("userId") userId: String): FollowResponse

    @DELETE("follow/{userId}")
    suspend fun unfollowUser(@Path("userId") userId: String)

    @POST("posts/{postId}/like")
    suspend fun likePost(@Path("postId") postId: String)

    @DELETE("posts/{postId}/like")
    suspend fun unlikePost(@Path("postId") postId: String)

    // Comments
    @GET("posts/{postId}/comments")
    suspend fun getComments(@Path("postId") postId: String): List<Comment>

    @POST("posts/{postId}/comments")
    suspend fun createComment(
        @Path("postId") postId: String,
        @Body request: CreateCommentRequest
    ): Comment

    // Notifications
    @GET("notifications")
    suspend fun getNotifications(
        @Query("cursor") cursor: String? = null
    ): NotificationsResponse

    @POST("notifications/read")
    suspend fun markNotificationsRead(@Body request: MarkReadRequest)

    // Messages
    @GET("messages/threads")
    suspend fun getThreads(): List<Thread>

    @GET("messages/threads/{threadId}")
    suspend fun getMessages(@Path("threadId") threadId: String): List<Message>

    @POST("messages/threads/{threadId}")
    suspend fun sendMessage(
        @Path("threadId") threadId: String,
        @Body request: SendMessageRequest
    ): Message

    // NFT
    @POST("editions/{postId}/buy")
    suspend fun buyEdition(@Path("postId") postId: String): BuyEditionResponse

    @POST("collectibles/{postId}/collect")
    suspend fun collectPost(@Path("postId") postId: String): CollectResponse

    // ... map all 70+ server functions
}
```

### 8.6 Edge-to-Edge Display

```kotlin
// MainActivity.kt
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Enable edge-to-edge
        WindowCompat.setDecorFitsSystemWindows(window, false)

        setContent {
            DesperseTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    DesperseApp()
                }
            }
        }
    }
}
```

### 8.7 Pull-to-Refresh Pattern

```kotlin
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedScreen(
    navController: NavController,
    viewModel: FeedViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val pullRefreshState = rememberPullToRefreshState()

    PullToRefreshBox(
        isRefreshing = uiState.isRefreshing,
        onRefresh = { viewModel.refresh() },
        state = pullRefreshState
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize()
        ) {
            items(
                items = uiState.posts,
                key = { it.id }
            ) { post ->
                PostCard(
                    post = post,
                    onPostClick = { navController.navigate(Screen.PostDetail.createRoute(post.id)) },
                    onUserClick = { navController.navigate(Screen.Profile.createRoute(post.user.slug)) }
                )
            }

            if (uiState.isLoadingMore) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                }
            }
        }
    }
}
```

### 8.8 Infinite Scroll Pattern

```kotlin
@Composable
fun InfiniteScrollList(
    items: List<Post>,
    isLoading: Boolean,
    onLoadMore: () -> Unit,
    content: @Composable (Post) -> Unit
) {
    val listState = rememberLazyListState()

    // Detect when near end
    val shouldLoadMore = remember {
        derivedStateOf {
            val lastVisibleItem = listState.layoutInfo.visibleItemsInfo.lastOrNull()
            lastVisibleItem != null &&
                lastVisibleItem.index >= items.size - 5
        }
    }

    LaunchedEffect(shouldLoadMore.value) {
        if (shouldLoadMore.value && !isLoading) {
            onLoadMore()
        }
    }

    LazyColumn(state = listState) {
        items(
            items = items,
            key = { it.id }
        ) { item ->
            content(item)
        }

        if (isLoading) {
            item {
                CircularProgressIndicator(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                        .wrapContentWidth(Alignment.CenterHorizontally)
                )
            }
        }
    }
}
```

### 8.9 Key Differences from Web

| Web Pattern | Android Equivalent |
|-------------|-------------------|
| CSS Grid | LazyVerticalGrid |
| Flexbox | Row/Column with weight |
| CSS Variables | CompositionLocal or Theme |
| Tailwind classes | Modifier chains |
| useState | remember + mutableStateOf |
| useEffect | LaunchedEffect |
| React Query | ViewModel + StateFlow |
| TanStack Router | Navigation Compose |
| Radix UI | Material 3 components |
| Sonner toasts | SnackbarHost |
| Privy auth | Custom auth + wallet adapter |

### 8.10 Performance Considerations

1. **Image Loading**: Use Coil with disk caching and memory limits
2. **List Performance**: Use `key` parameter in LazyColumn items
3. **Recomposition**: Use `remember` and `derivedStateOf` appropriately
4. **Network**: Implement proper caching strategy with OkHttp
5. **Startup**: Use App Startup library for initialization
6. **ProGuard**: Configure R8 rules for Solana libraries

### 8.11 Accessibility

- Use `contentDescription` for all icons
- Ensure minimum touch targets (48dp)
- Support TalkBack with semantic properties
- Implement proper focus ordering
- Test with accessibility scanner

---

## Appendix: Quick Reference

### Color Quick Reference

| Semantic | Light | Dark |
|----------|-------|------|
| Background | #FFFFFF | #09090B |
| Surface | #FFFFFF | #18181B |
| Primary | #09090B | #FAFAFA |
| Secondary | #F4F4F5 | #27272A |
| Muted | #F4F4F5 | #27272A |
| Border | #E4E4E7 | #3F3F46 |
| Error | #FF003C | #FF2357 |
| Success | #00CBA2 | #27E4B8 |
| Warning | #FF8000 | #FF980A |
| Collectible | #6221FF | #7346FF |
| Edition | #8D04EC | #B439FF |

### Spacing Quick Reference

| Name | Value |
|------|-------|
| xs | 4dp |
| sm | 8dp |
| md | 12dp |
| lg | 16dp |
| xl | 24dp |
| 2xl | 32dp |
| 3xl | 48dp |

### Typography Quick Reference

| Style | Size | Weight |
|-------|------|--------|
| Display | 40sp | SemiBold |
| Headline | 23sp | SemiBold |
| Title | 16sp | Medium |
| Body | 14sp | Medium |
| Label | 12sp | Medium |
| Caption | 10sp | Medium |

---

*Document generated from Desperse web codebase analysis. Last updated: 2026-02-01*
