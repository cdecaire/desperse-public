/**
 * Development route to audit all colors used in the app
 * Route: /dev/colors-test
 */

import { createFileRoute } from '@tanstack/react-router'
import { Card } from '@/components/ui/card'

export const Route = createFileRoute('/dev/colors-test')({
  component: ColorsTestPage,
})

function ColorSwatch({
  name,
  value,
  cssVar,
  textClass = 'text-foreground',
}: {
  name: string
  value: string
  cssVar?: string
  textClass?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-12 h-12 rounded-md border border-border shrink-0"
        style={{ backgroundColor: value }}
      />
      <div className="min-w-0">
        <p className={`text-sm font-medium ${textClass}`}>{name}</p>
        <p className="text-xs text-muted-foreground font-mono">{value}</p>
        {cssVar && (
          <p className="text-xs text-muted-foreground/70 font-mono">{cssVar}</p>
        )}
      </div>
    </div>
  )
}

function SemanticColorRow({
  name,
  bgVar,
  fgVar,
  description,
}: {
  name: string
  bgVar: string
  fgVar: string
  description?: string
}) {
  return (
    <div className="flex items-center gap-4">
      <div
        className="w-24 h-12 rounded-md border border-border flex items-center justify-center text-sm font-medium"
        style={{
          backgroundColor: `var(${bgVar})`,
          color: `var(${fgVar})`,
        }}
      >
        {name}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground font-mono">
          bg: {bgVar} / fg: {fgVar}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground/70">{description}</p>
        )}
      </div>
    </div>
  )
}

function ColorsTestPage() {
  return (
    <div className="py-6 max-w-5xl mx-auto px-4">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Color Audit</h1>
          <p className="text-muted-foreground">
            All colors and design tokens used in the app. Toggle dark mode to
            see both themes.
          </p>
        </div>

        {/* Zinc Palette */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Zinc Palette</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Base Zinc tokens from Tailwind used to build the entire color
            system. These follow the shadcn/ui theming convention.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ColorSwatch name="Zinc 50" value="#fafafa" cssVar="--zinc-50" />
            <ColorSwatch name="Zinc 100" value="#f4f4f5" cssVar="--zinc-100" />
            <ColorSwatch name="Zinc 200" value="#e4e4e7" cssVar="--zinc-200" />
            <ColorSwatch name="Zinc 300" value="#d4d4d8" cssVar="--zinc-300" />
            <ColorSwatch name="Zinc 400" value="#a1a1aa" cssVar="--zinc-400" />
            <ColorSwatch name="Zinc 500" value="#71717a" cssVar="--zinc-500" />
            <ColorSwatch
              name="Zinc 600"
              value="#52525b"
              cssVar="--zinc-600"
              textClass="text-zinc-50"
            />
            <ColorSwatch
              name="Zinc 700"
              value="#3f3f46"
              cssVar="--zinc-700"
              textClass="text-zinc-50"
            />
            <ColorSwatch
              name="Zinc 800"
              value="#27272a"
              cssVar="--zinc-800"
              textClass="text-zinc-50"
            />
            <ColorSwatch
              name="Zinc 900"
              value="#18181b"
              cssVar="--zinc-900"
              textClass="text-zinc-50"
            />
            <ColorSwatch
              name="Zinc 950"
              value="#09090b"
              cssVar="--zinc-950"
              textClass="text-zinc-50"
            />
          </div>
        </Card>

        {/* Torch Red Palette */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Torch Red Palette</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Destructive/error color palette. Primary shade is 600.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ColorSwatch name="Torch Red 50" value="#fff0f4" cssVar="--torch-red-50" />
            <ColorSwatch name="Torch Red 100" value="#ffdde5" cssVar="--torch-red-100" />
            <ColorSwatch name="Torch Red 200" value="#ffc0cf" cssVar="--torch-red-200" />
            <ColorSwatch name="Torch Red 300" value="#ff94ad" cssVar="--torch-red-300" />
            <ColorSwatch name="Torch Red 400" value="#ff577f" cssVar="--torch-red-400" />
            <ColorSwatch name="Torch Red 500" value="#ff2357" cssVar="--torch-red-500" />
            <ColorSwatch
              name="Torch Red 600"
              value="#ff003c"
              cssVar="--torch-red-600"
              textClass="text-zinc-50"
            />
            <ColorSwatch
              name="Torch Red 700"
              value="#d70033"
              cssVar="--torch-red-700"
              textClass="text-zinc-50"
            />
            <ColorSwatch
              name="Torch Red 800"
              value="#b1032c"
              cssVar="--torch-red-800"
              textClass="text-zinc-50"
            />
            <ColorSwatch
              name="Torch Red 900"
              value="#920a2a"
              cssVar="--torch-red-900"
              textClass="text-zinc-50"
            />
            <ColorSwatch
              name="Torch Red 950"
              value="#500013"
              cssVar="--torch-red-950"
              textClass="text-zinc-50"
            />
          </div>
        </Card>

        {/* Blue Gem Palette */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Blue Gem Palette</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Collectible color palette. Primary shade is 900.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ColorSwatch name="Blue Gem 50" value="#f3f1ff" cssVar="--blue-gem-50" />
            <ColorSwatch name="Blue Gem 100" value="#e9e6ff" cssVar="--blue-gem-100" />
            <ColorSwatch name="Blue Gem 200" value="#d5d0ff" cssVar="--blue-gem-200" />
            <ColorSwatch name="Blue Gem 300" value="#b7abff" cssVar="--blue-gem-300" />
            <ColorSwatch name="Blue Gem 400" value="#947bff" cssVar="--blue-gem-400" />
            <ColorSwatch name="Blue Gem 500" value="#7346ff" cssVar="--blue-gem-500" />
            <ColorSwatch
              name="Blue Gem 600"
              value="#6221ff"
              cssVar="--blue-gem-600"
              textClass="text-zinc-50"
            />
            <ColorSwatch
              name="Blue Gem 700"
              value="#540ff2"
              cssVar="--blue-gem-700"
              textClass="text-zinc-50"
            />
            <ColorSwatch
              name="Blue Gem 800"
              value="#450ccb"
              cssVar="--blue-gem-800"
              textClass="text-zinc-50"
            />
            <ColorSwatch
              name="Blue Gem 900"
              value="#3a0ca3"
              cssVar="--blue-gem-900"
              textClass="text-zinc-50"
            />
            <ColorSwatch
              name="Blue Gem 950"
              value="#220471"
              cssVar="--blue-gem-950"
              textClass="text-zinc-50"
            />
          </div>
        </Card>

        {/* Purple Heart Palette */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Purple Heart Palette</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Edition/accent color palette. Primary shade is 800.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ColorSwatch name="Purple Heart 50" value="#fbf3ff" cssVar="--purple-heart-50" />
            <ColorSwatch name="Purple Heart 100" value="#f4e4ff" cssVar="--purple-heart-100" />
            <ColorSwatch name="Purple Heart 200" value="#ecceff" cssVar="--purple-heart-200" />
            <ColorSwatch name="Purple Heart 300" value="#dda7ff" cssVar="--purple-heart-300" />
            <ColorSwatch name="Purple Heart 400" value="#c86fff" cssVar="--purple-heart-400" />
            <ColorSwatch name="Purple Heart 500" value="#b439ff" cssVar="--purple-heart-500" />
            <ColorSwatch
              name="Purple Heart 600"
              value="#a213ff"
              cssVar="--purple-heart-600"
              textClass="text-zinc-50"
            />
            <ColorSwatch
              name="Purple Heart 700"
              value="#8d04ec"
              cssVar="--purple-heart-700"
              textClass="text-zinc-50"
            />
            <ColorSwatch
              name="Purple Heart 800"
              value="#7209b7"
              cssVar="--purple-heart-800"
              textClass="text-zinc-50"
            />
            <ColorSwatch
              name="Purple Heart 900"
              value="#62099a"
              cssVar="--purple-heart-900"
              textClass="text-zinc-50"
            />
            <ColorSwatch
              name="Purple Heart 950"
              value="#430074"
              cssVar="--purple-heart-950"
              textClass="text-zinc-50"
            />
          </div>
        </Card>

        {/* Caribbean Green Palette */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Caribbean Green Palette</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Success/positive color palette. Primary shade is 400.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ColorSwatch name="Caribbean Green 50" value="#eafff8" cssVar="--caribbean-green-50" />
            <ColorSwatch name="Caribbean Green 100" value="#cdfeeb" cssVar="--caribbean-green-100" />
            <ColorSwatch name="Caribbean Green 200" value="#9ffbdd" cssVar="--caribbean-green-200" />
            <ColorSwatch name="Caribbean Green 300" value="#61f4cd" cssVar="--caribbean-green-300" />
            <ColorSwatch name="Caribbean Green 400" value="#27e4b8" cssVar="--caribbean-green-400" />
            <ColorSwatch name="Caribbean Green 500" value="#00cba2" cssVar="--caribbean-green-500" />
            <ColorSwatch
              name="Caribbean Green 600"
              value="#00a585"
              cssVar="--caribbean-green-600"
              textClass="text-zinc-50"
            />
            <ColorSwatch
              name="Caribbean Green 700"
              value="#00846d"
              cssVar="--caribbean-green-700"
              textClass="text-zinc-50"
            />
            <ColorSwatch
              name="Caribbean Green 800"
              value="#006858"
              cssVar="--caribbean-green-800"
              textClass="text-zinc-50"
            />
            <ColorSwatch
              name="Caribbean Green 900"
              value="#00554a"
              cssVar="--caribbean-green-900"
              textClass="text-zinc-50"
            />
            <ColorSwatch
              name="Caribbean Green 950"
              value="#00302a"
              cssVar="--caribbean-green-950"
              textClass="text-zinc-50"
            />
          </div>
        </Card>

        {/* Flush Orange Palette */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Flush Orange Palette</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Warning color palette. Primary shades are 600 (light) and 500 (dark).
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ColorSwatch name="Flush Orange 50" value="#fffaec" cssVar="--flush-orange-50" />
            <ColorSwatch name="Flush Orange 100" value="#fff4d3" cssVar="--flush-orange-100" />
            <ColorSwatch name="Flush Orange 200" value="#ffe5a5" cssVar="--flush-orange-200" />
            <ColorSwatch name="Flush Orange 300" value="#ffd16d" cssVar="--flush-orange-300" />
            <ColorSwatch name="Flush Orange 400" value="#ffb232" cssVar="--flush-orange-400" />
            <ColorSwatch name="Flush Orange 500" value="#ff980a" cssVar="--flush-orange-500" />
            <ColorSwatch
              name="Flush Orange 600"
              value="#ff8000"
              cssVar="--flush-orange-600"
              textClass="text-zinc-50"
            />
            <ColorSwatch
              name="Flush Orange 700"
              value="#cc5d02"
              cssVar="--flush-orange-700"
              textClass="text-zinc-50"
            />
            <ColorSwatch
              name="Flush Orange 800"
              value="#a1480b"
              cssVar="--flush-orange-800"
              textClass="text-zinc-50"
            />
            <ColorSwatch
              name="Flush Orange 900"
              value="#823d0c"
              cssVar="--flush-orange-900"
              textClass="text-zinc-50"
            />
            <ColorSwatch
              name="Flush Orange 950"
              value="#461d04"
              cssVar="--flush-orange-950"
              textClass="text-zinc-50"
            />
          </div>
        </Card>

        {/* Azure Radiance Palette */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Azure Radiance Palette</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Info color palette. Primary shades are 500 (light) and 400 (dark).
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ColorSwatch name="Azure Radiance 50" value="#eff7ff" cssVar="--azure-radiance-50" />
            <ColorSwatch name="Azure Radiance 100" value="#daedff" cssVar="--azure-radiance-100" />
            <ColorSwatch name="Azure Radiance 200" value="#bee1ff" cssVar="--azure-radiance-200" />
            <ColorSwatch name="Azure Radiance 300" value="#91cfff" cssVar="--azure-radiance-300" />
            <ColorSwatch name="Azure Radiance 400" value="#5db3fd" cssVar="--azure-radiance-400" />
            <ColorSwatch name="Azure Radiance 500" value="#3792fa" cssVar="--azure-radiance-500" />
            <ColorSwatch
              name="Azure Radiance 600"
              value="#2e7cf0"
              cssVar="--azure-radiance-600"
              textClass="text-zinc-50"
            />
            <ColorSwatch
              name="Azure Radiance 700"
              value="#195ddc"
              cssVar="--azure-radiance-700"
              textClass="text-zinc-50"
            />
            <ColorSwatch
              name="Azure Radiance 800"
              value="#1b4bb2"
              cssVar="--azure-radiance-800"
              textClass="text-zinc-50"
            />
            <ColorSwatch
              name="Azure Radiance 900"
              value="#1c438c"
              cssVar="--azure-radiance-900"
              textClass="text-zinc-50"
            />
            <ColorSwatch
              name="Azure Radiance 950"
              value="#162a55"
              cssVar="--azure-radiance-950"
              textClass="text-zinc-50"
            />
          </div>
        </Card>

        {/* Semantic Colors */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Semantic Colors</h2>
          <p className="text-sm text-muted-foreground mb-4">
            These colors adapt between light and dark themes. Background/foreground
            pairs are designed to work together.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SemanticColorRow
              name="Background"
              bgVar="--background"
              fgVar="--foreground"
              description="Main app background"
            />
            <SemanticColorRow
              name="Card"
              bgVar="--card"
              fgVar="--card-foreground"
              description="Card surfaces"
            />
            <SemanticColorRow
              name="Popover"
              bgVar="--popover"
              fgVar="--popover-foreground"
              description="Dropdowns, tooltips"
            />
            <SemanticColorRow
              name="Primary"
              bgVar="--primary"
              fgVar="--primary-foreground"
              description="Primary buttons, actions"
            />
            <SemanticColorRow
              name="Secondary"
              bgVar="--secondary"
              fgVar="--secondary-foreground"
              description="Secondary buttons"
            />
            <SemanticColorRow
              name="Muted"
              bgVar="--muted"
              fgVar="--muted-foreground"
              description="Subtle backgrounds, muted text"
            />
            <SemanticColorRow
              name="Accent"
              bgVar="--accent"
              fgVar="--accent-foreground"
              description="Highlights, focus states"
            />
            <SemanticColorRow
              name="Destructive"
              bgVar="--destructive"
              fgVar="--destructive-foreground"
              description="Delete actions, errors"
            />
          </div>
        </Card>

        {/* Live Semantic Preview */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Live Semantic Preview</h2>
          <p className="text-sm text-muted-foreground mb-4">
            These swatches use CSS variables and will automatically update with
            theme changes.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-md bg-background text-foreground border border-border">
              <p className="text-xs font-medium">background</p>
              <p className="text-xs text-muted-foreground">foreground</p>
            </div>
            <div className="p-3 rounded-md bg-card text-card-foreground border border-border">
              <p className="text-xs font-medium">card</p>
              <p className="text-xs text-muted-foreground">card-foreground</p>
            </div>
            <div className="p-3 rounded-md bg-muted text-muted-foreground">
              <p className="text-xs font-medium">muted</p>
              <p className="text-xs">muted-foreground</p>
            </div>
            <div className="p-3 rounded-md bg-accent text-accent-foreground">
              <p className="text-xs font-medium">accent</p>
              <p className="text-xs">accent-foreground</p>
            </div>
            <div className="p-3 rounded-md bg-primary text-primary-foreground">
              <p className="text-xs font-medium">primary</p>
              <p className="text-xs">primary-foreground</p>
            </div>
            <div className="p-3 rounded-md bg-secondary text-secondary-foreground">
              <p className="text-xs font-medium">secondary</p>
              <p className="text-xs">secondary-foreground</p>
            </div>
            <div className="p-3 rounded-md bg-destructive text-destructive-foreground">
              <p className="text-xs font-medium">destructive</p>
              <p className="text-xs">destructive-foreground</p>
            </div>
            <div className="p-3 rounded-md border-2 border-border bg-background">
              <p className="text-xs font-medium">border</p>
              <p className="text-xs text-muted-foreground">subtle</p>
            </div>
          </div>
        </Card>

        {/* Border System */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Border System</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Two-tier border system: subtle borders for general UI, semi-transparent borders for floating elements.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium mb-3">General Borders</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-10 rounded-md border-2 border-border bg-card" />
                  <div>
                    <p className="text-sm font-medium">--border</p>
                    <p className="text-xs text-muted-foreground">Light: zinc-100 / Dark: zinc-900</p>
                    <p className="text-xs text-muted-foreground/70">Cards, dividers, general UI</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-10 rounded-md border-2 border-input bg-white dark:bg-input/30" />
                  <div>
                    <p className="text-sm font-medium">--input</p>
                    <p className="text-xs text-muted-foreground">Light: zinc-100 / Dark: zinc-900</p>
                    <p className="text-xs text-muted-foreground/70">Form inputs (matches --border)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-10 rounded-md ring-2 ring-ring bg-card" />
                  <div>
                    <p className="text-sm font-medium">--ring</p>
                    <p className="text-xs text-muted-foreground">Light: zinc-600 / Dark: zinc-400</p>
                    <p className="text-xs text-muted-foreground/70">Focus states, outlines</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-3">Floating Element Borders</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-10 rounded-md border-2 border-border-floating bg-popover shadow-md" />
                  <div>
                    <p className="text-sm font-medium">--border-floating</p>
                    <p className="text-xs text-muted-foreground">Semi-transparent (50% opacity)</p>
                    <p className="text-xs text-muted-foreground/70">Tooltips, selects, popovers</p>
                  </div>
                </div>
                <div className="mt-4 p-3 rounded-md border border-border-floating bg-popover shadow-md">
                  <p className="text-xs font-medium">Floating preview</p>
                  <p className="text-xs text-muted-foreground">Border allows color bleed-through</p>
                </div>
                <div
                  className="mt-2 p-3 rounded-md border border-border-floating shadow-md"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--tone-collectible) 20%, var(--popover))' }}
                >
                  <p className="text-xs font-medium" style={{ color: 'var(--tone-collectible)' }}>On colored background</p>
                  <p className="text-xs text-muted-foreground">Border blends with content</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Highlight/Accent Color */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Highlight Color</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Theme-aware highlight for text selection, Privy integration, and special accents.
            Uses purple-heart-700 in light mode, purple-heart-600 in dark mode.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-md border border-border shrink-0"
                style={{ backgroundColor: 'var(--highlight)' }}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium">Highlight</p>
                <p className="text-xs text-muted-foreground font-mono">var(--highlight)</p>
                <p className="text-xs text-muted-foreground/70 font-mono">Theme-aware</p>
              </div>
            </div>
            <div className="col-span-1 md:col-span-2">
              <p className="text-sm font-medium mb-2">Usage Examples</p>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="selection:bg-[var(--highlight)] selection:text-white">
                    Select this text to see the highlight color in action.
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Used in: text selection, Privy modal accent
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Post Type Tone Colors */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Post Type Tones</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Theme-aware tone colors for each post type. Adapts for optimal visibility:
            darker shades in light mode, lighter shades in dark mode.
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-md shrink-0"
                style={{ backgroundColor: 'var(--tone-standard)' }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-circle-plus" style={{ color: 'var(--tone-standard)' }} />
                  <span className="font-medium">Standard Post</span>
                  <span className="text-sm font-mono" style={{ color: 'var(--tone-standard)' }}>--tone-standard</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Light: caribbean-green-500 / Dark: caribbean-green-400
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-md shrink-0"
                style={{ backgroundColor: 'var(--tone-collectible)' }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-gem" style={{ color: 'var(--tone-collectible)' }} />
                  <span className="font-medium">Collectible</span>
                  <span className="text-sm font-mono" style={{ color: 'var(--tone-collectible)' }}>--tone-collectible</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Light: blue-gem-600 / Dark: blue-gem-500
                </p>
                <div
                  className="mt-1 inline-block px-2 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--tone-collectible) 10%, transparent)',
                    color: 'var(--tone-collectible)'
                  }}
                >
                  Accent bg example
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-md shrink-0"
                style={{ backgroundColor: 'var(--tone-edition)' }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-image-stack" style={{ color: 'var(--tone-edition)' }} />
                  <span className="font-medium">Edition</span>
                  <span className="text-sm font-mono" style={{ color: 'var(--tone-edition)' }}>--tone-edition</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Light: purple-heart-700 / Dark: purple-heart-600
                </p>
                <div
                  className="mt-1 inline-block px-2 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--tone-edition) 10%, transparent)',
                    color: 'var(--tone-edition)'
                  }}
                >
                  Accent bg example
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Sidebar Colors */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Sidebar Colors</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Dedicated sidebar palette for navigation components.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-md bg-sidebar text-sidebar-foreground border border-sidebar-border">
              <p className="text-xs font-medium">sidebar</p>
              <p className="text-xs opacity-70">foreground</p>
            </div>
            <div className="p-3 rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <p className="text-xs font-medium">primary</p>
              <p className="text-xs opacity-70">primary-fg</p>
            </div>
            <div className="p-3 rounded-md bg-sidebar-accent text-sidebar-accent-foreground">
              <p className="text-xs font-medium">accent</p>
              <p className="text-xs opacity-70">accent-fg</p>
            </div>
            <div className="p-3 rounded-md border-2 border-sidebar-border bg-sidebar">
              <p className="text-xs font-medium text-sidebar-foreground">border</p>
              <p className="text-xs text-sidebar-foreground/70">ring</p>
            </div>
          </div>
        </Card>

        {/* Utility Colors */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Utility & State Colors</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Common utility colors from Tailwind used throughout the app.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium mb-2">Success/Positive</p>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded" style={{ backgroundColor: 'var(--tone-standard)' }} title="--tone-standard" />
                <div className="w-8 h-8 rounded border" style={{ backgroundColor: 'color-mix(in srgb, var(--tone-standard) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--tone-standard) 30%, transparent)' }} title="--tone-standard/10" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">--tone-standard</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Warning</p>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded" style={{ backgroundColor: 'var(--tone-warning)' }} title="--tone-warning" />
                <div className="w-8 h-8 rounded border" style={{ backgroundColor: 'color-mix(in srgb, var(--tone-warning) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--tone-warning) 30%, transparent)' }} title="--tone-warning/10" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">--tone-warning</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Error/Destructive</p>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded bg-destructive" title="destructive" />
                <div className="w-8 h-8 rounded bg-destructive/10 border border-destructive/30" title="destructive/10" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">--destructive</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Info</p>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded" style={{ backgroundColor: 'var(--tone-info)' }} title="--tone-info" />
                <div className="w-8 h-8 rounded border" style={{ backgroundColor: 'color-mix(in srgb, var(--tone-info) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--tone-info) 30%, transparent)' }} title="--tone-info/10" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">--tone-info</p>
            </div>
          </div>
        </Card>

        {/* Color Audit Summary */}
        <Card className="p-6" style={{ backgroundColor: 'color-mix(in srgb, var(--tone-standard) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--tone-standard) 30%, transparent)', borderWidth: '1px' }}>
          <h3 className="text-lg font-semibold mb-2">Color System Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">Zinc Palette:</span>
              <span>11 tokens (zinc-50 to zinc-950) - Tailwind's Zinc scale</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">Semantic:</span>
              <span>8 bg/fg pairs (background, card, primary, secondary, muted, accent, popover, destructive)</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">Theme-aware:</span>
              <span>--highlight, --tone-standard, --tone-collectible, --tone-edition, --tone-warning, --tone-info</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">Color Palettes:</span>
              <span>Torch Red (destructive), Caribbean Green (success), Blue Gem (collectible), Purple Heart (edition), Flush Orange (warning), Azure Radiance (info)</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">Borders:</span>
              <span>--border (subtle), --border-floating (semi-transparent), --input, --ring</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">Sidebar:</span>
              <span>Dedicated palette using Zinc, mirrors main semantic tokens</span>
            </div>
          </div>
        </Card>

        {/* Hardcoded Colors Warning */}
        <Card className="p-6 bg-[var(--tone-warning)]/10 border border-[var(--tone-warning)]/30">
          <h3 className="text-lg font-semibold mb-2">Hardcoded Color Audit</h3>
          <p className="text-sm text-muted-foreground mb-3">
            The following hardcoded hex values are used outside of CSS variables:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <code className="text-xs bg-muted px-1 rounded">#09090b</code>
              <span>PWA theme color (zinc-950)</span>
            </li>
            <li className="flex gap-2">
              <code className="text-xs bg-muted px-1 rounded">#fafafa / #09090b</code>
              <span>Privy logo colors (zinc-50/zinc-950)</span>
            </li>
            <li className="flex gap-2">
              <code className="text-xs bg-muted px-1 rounded">border-zinc-700</code>
              <span>Header mobile nav (intentionally dark-themed sidebar)</span>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground mt-3">
            Post type tones and highlight colors now use CSS variables for theme awareness.
            The remaining hardcoded values are for contexts where CSS variables are not available
            or for components with fixed color schemes.
          </p>
        </Card>
      </div>
    </div>
  )
}
