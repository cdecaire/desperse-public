/**
 * Development route to test button styles and variants
 * Route: /dev/button-test
 */

import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@cdecaire/sable'
import { Region, Stack, Row } from '@cdecaire/sable/layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'

export const Route = createFileRoute('/dev/button-test')({
  component: ButtonTestPage,
})

function ButtonTestPage() {
  return (
    <Region max="wide" inset className="py-6">
      <Stack gap={3}>
        <PageHeader
          title="Button Style Audit"
          description="All button variants, sizes, and custom patterns used in the app."
        />

        {/* Standard Variants */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Standard Variants</h2>
          <p className="text-sm text-muted-foreground mb-4">
            These are the base variants defined in the Button component.
          </p>
          <Row gap={2} wrap>
            <Button variant="default">Default</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </Row>
        </Card>

        {/* Standard Sizes */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Standard Sizes</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Responsive sizing: default, cta, icon, and icon-lg. Larger on mobile for touch targets.
          </p>
          <Row gap={2} align="center" wrap>
            <Button>Default (40/32px)</Button>
            <Button size="cta">CTA (44/32px)</Button>
            <Button size="icon"><Icon name="gear" className="text-sm" /></Button>
            <Button size="icon-lg" className="rounded-full"><Icon name="play" className="text-xl ml-1" /></Button>
          </Row>
          <div className="mt-4 p-3 bg-muted/50 border rounded-md">
            <p className="text-xs text-muted-foreground">
              <strong>Responsive:</strong> Mobile (&lt;768px) uses larger heights for touch targets.
              Desktop (≥768px) uses compact 32px height.
            </p>
          </div>
        </Card>

        {/* Disabled States */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Disabled States</h2>
          <Row gap={2} wrap>
            <Button disabled>Default Disabled</Button>
            <Button variant="destructive" disabled>
              Destructive Disabled
            </Button>
            <Button variant="outline" disabled>
              Outline Disabled
            </Button>
            <Button variant="secondary" disabled>
              Secondary Disabled
            </Button>
            <Button variant="ghost" disabled>
              Ghost Disabled
            </Button>
          </Row>
        </Card>

        {/* Buttons with Icons */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Buttons with Icons</h2>
          <Stack gap={2}>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Icon Left
              </h3>
              <Row gap={2} wrap>
                <Button>
                  <Icon name="plus" className="text-sm mr-2" />
                  Create
                </Button>
                <Button variant="outline">
                  <Icon name="download" className="text-sm mr-2" />
                  Download
                </Button>
                <Button variant="destructive">
                  <Icon name="trash-xmark" className="text-sm mr-2" />
                  Delete
                </Button>
              </Row>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Icon Right
              </h3>
              <Row gap={2} wrap>
                <Button>
                  Continue
                  <Icon name="chevron-right" className="text-sm ml-2" />
                </Button>
                <Button variant="outline">
                  Open
                  <Icon name="external-link" className="text-sm ml-2" />
                </Button>
              </Row>
            </div>
          </Stack>
        </Card>

        {/* Social Action Buttons Pattern */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            Social Action Button Pattern
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Used in LikeButton, CommentButton. Pattern: <code>gap-1 px-2</code>{' '}
            with ghost variant.
          </p>
          <Row gap={1} wrap>
            <Button variant="ghost" className="gap-1 px-2">
              <Icon name="heart" className="text-sm" />
              <span>24</span>
            </Button>
            <Button variant="ghost" className="gap-1 px-2">
              <Icon name="comment" className="text-sm" />
              <span>12</span>
            </Button>
            <Button variant="ghost" className="gap-1 px-2">
              <Icon name="share-nodes" className="text-sm" />
            </Button>
          </Row>
          <div className="mt-4 p-3 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground">
              <strong>Pattern:</strong> These use custom <code>gap-1 px-2</code> classes
              for compact icon + count layouts.
            </p>
          </div>
        </Card>

        {/* Media Control Buttons Pattern */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            Media Control Button Pattern
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Used in PostMedia for video/audio controls. Uses Font Awesome solid icons
            for better contrast. Custom overlay styling with rounded-full.
          </p>
          <div className="relative bg-zinc-800 rounded-lg p-8 flex items-center justify-center gap-4">
            {/* Large play button (video) */}
            <Button
              variant="ghost"
              size="icon-lg"
              className="rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/60 text-white"
            >
              <Icon name="play" className="text-xl ml-1" />
            </Button>

            {/* Audio play button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/60 text-white"
            >
              <Icon name="play" className="text-sm ml-0.5" />
            </Button>

            {/* Small control buttons (mute/pause) */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/60 text-white"
            >
              <Icon name="pause" className="text-sm" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/60 text-white"
            >
              <Icon name="volume-high" className="text-sm" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/60 text-white"
            >
              <Icon name="volume-xmark" className="text-sm" />
            </Button>

            {/* Small indicator (non-interactive) */}
            <div className="w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <Icon name="play" className="text-[8px] text-white ml-0.5" />
            </div>
          </div>
          <div className="mt-4 p-3 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground">
              <strong>Sizes:</strong> <code>size="icon-lg"</code> (64px video play), h-10 (audio play),
              h-9 (controls), w-6 (indicator). All use <code>bg-black/50</code> with
              <code>backdrop-blur-sm</code>. Play icons offset with <code>ml-1</code> or <code>ml-0.5</code> for optical centering.
            </p>
          </div>
        </Card>

        {/* Transaction State Patterns */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            Transaction State Patterns
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            BuyButton and CollectButton use compact mode with consistent ghost button styling.
            Status label shown outside button during loading. Text/spinner uses toneColor.
          </p>

          <Stack gap={2}>
            <Row gap={2} align="center">
              <span className="text-xs text-muted-foreground w-20">Idle:</span>
              <Button variant="ghost" className="gap-1 px-2">
                <span className="text-sm font-medium">0/5</span>
                <Icon name="image-stack" variant="regular" className="text-base" />
              </Button>
            </Row>

            <Row gap={2} align="center">
              <span className="text-xs text-muted-foreground w-20">Confirming:</span>
              <Row gap={1} align="center">
                <span className="text-[10px] text-muted-foreground animate-pulse">Confirming payment...</span>
                <Button
                  variant="ghost"
                  className="gap-1 px-2 disabled:opacity-100"
                  disabled
                  style={{ color: 'var(--tone-edition)' }}
                >
                  <Icon name="spinner-third" className="text-sm animate-spin" />
                </Button>
              </Row>
            </Row>

            <Row gap={2} align="center">
              <span className="text-xs text-muted-foreground w-20">Minting:</span>
              <Row gap={1} align="center">
                <span className="text-[10px] text-muted-foreground animate-pulse">Minting edition...</span>
                <Button
                  variant="ghost"
                  className="gap-1 px-2 disabled:opacity-100"
                  disabled
                  style={{ color: 'var(--tone-edition)' }}
                >
                  <Icon name="spinner-third" className="text-sm animate-spin" />
                </Button>
              </Row>
            </Row>

            <Row gap={2} align="center">
              <span className="text-xs text-muted-foreground w-20">Claiming:</span>
              <Button
                variant="ghost"
                className="gap-1 px-2"
                style={{ color: 'var(--tone-edition)' }}
              >
                <span className="text-sm font-semibold">Claim NFT</span>
                <Icon name="image-stack" variant="regular" className="text-base" />
              </Button>
            </Row>

            <Row gap={2} align="center">
              <span className="text-xs text-muted-foreground w-20">Purchased:</span>
              <Button variant="ghost" className="gap-1 px-2 disabled:opacity-100" disabled>
                <span className="text-sm font-medium">1/5</span>
                <span style={{ color: 'var(--tone-edition)' }}><Icon name="image-stack" className="text-base" /></span>
              </Button>
            </Row>
          </Stack>

          <div className="mt-4 p-3 bg-muted/50 border rounded-md">
            <p className="text-xs text-muted-foreground">
              <strong>Pattern:</strong> Same ghost button shell throughout all states.
              Loading states use toneColor for spinner. Purchased state shows
              filled icon with toneColor. Claiming is an error recovery state.
            </p>
          </div>
        </Card>

        {/* Full Width Buttons */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Full Width Buttons</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Used in forms and dialogs.
          </p>
          <Stack gap={1} className="max-w-md">
            <Button className="w-full">Submit</Button>
            <Button variant="outline" className="w-full">
              Cancel
            </Button>
            <Button variant="destructive" className="w-full">
              Delete Account
            </Button>
          </Stack>
        </Card>

        {/* Loading States */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Loading States</h2>
          <Row gap={2} wrap>
            <Button disabled>
              <Icon name="spinner-third" className="text-sm mr-2 animate-spin" />
              Loading...
            </Button>
            <Button variant="outline" disabled>
              <Icon name="spinner-third" className="text-sm mr-2 animate-spin" />
              Saving...
            </Button>
            <Button variant="secondary" disabled>
              <Icon name="spinner-third" className="text-sm mr-2 animate-spin" />
              Processing...
            </Button>
          </Row>
        </Card>

        {/* Icon-Only Buttons */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Icon-Only Buttons</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Various icon button patterns found in the app.
          </p>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Standard Icon Size (size="icon")
            </h3>
            <Row gap={1} wrap>
              <Button variant="ghost" size="icon">
                <Icon name="xmark" className="text-sm" />
              </Button>
              <Button variant="ghost" size="icon">
                <Icon name="gear" className="text-sm" />
              </Button>
              <Button variant="ghost" size="icon">
                <Icon name="pencil" className="text-sm" />
              </Button>
              <Button variant="ghost" size="icon">
                <Icon name="images" className="text-sm" />
              </Button>
              <Button variant="outline" size="icon">
                <Icon name="plus" className="text-sm" />
              </Button>
              <Button variant="destructive" size="icon">
                <Icon name="trash-xmark" className="text-sm" />
              </Button>
            </Row>
          </div>
        </Card>

        {/* Remaining Patterns to Consider */}
        <Card className="p-6 bg-muted/50">
          <h2 className="text-xl font-semibold mb-4">
            Patterns Using className Overrides
          </h2>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2">
              <span className="text-muted-foreground">1.</span>
              <span>
                <strong>Social action pattern:</strong> <code>gap-1 px-2</code> for
                compact icon + count layouts (LikeButton, CommentButton, etc.)
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground">2.</span>
              <span>
                <strong>Media overlay pattern:</strong> <code>rounded-full bg-black/50 backdrop-blur-sm</code> for
                video/audio controls - intentionally distinct from app buttons.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground">3.</span>
              <span>
                <strong>Transaction states:</strong> Loading states in BuyButton/CollectButton
                use toneColor for text. Same button shell, smooth transitions.
              </span>
            </li>
          </ul>
        </Card>

        {/* Full Rounded Buttons */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Full Rounded Buttons</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Buttons with <code>rounded-full</code> for pill-shaped styling.
          </p>
          <Stack gap={2}>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Standard Variants (rounded-full)
              </h3>
              <Row gap={2} wrap>
                <Button className="rounded-full">Default</Button>
                <Button variant="destructive" className="rounded-full">Destructive</Button>
                <Button variant="outline" className="rounded-full">Outline</Button>
                <Button variant="secondary" className="rounded-full">Secondary</Button>
                <Button variant="ghost" className="rounded-full">Ghost</Button>
              </Row>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                With Icons (rounded-full)
              </h3>
              <Row gap={2} wrap>
                <Button className="rounded-full">
                  <Icon name="plus" className="text-sm mr-2" />
                  Create
                </Button>
                <Button variant="outline" className="rounded-full">
                  <Icon name="download" className="text-sm mr-2" />
                  Download
                </Button>
                <Button variant="secondary" className="rounded-full">
                  Continue
                  <Icon name="chevron-right" className="text-sm ml-2" />
                </Button>
              </Row>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Icon-Only (rounded-full)
              </h3>
              <Row gap={1} align="center" wrap>
                <Button size="icon" className="rounded-full">
                  <Icon name="plus" className="text-sm" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full">
                  <Icon name="gear" className="text-sm" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Icon name="pencil" className="text-sm" />
                </Button>
                <Button variant="destructive" size="icon" className="rounded-full">
                  <Icon name="trash-xmark" className="text-sm" />
                </Button>
                <Button variant="secondary" size="icon" className="rounded-full">
                  <Icon name="heart" className="text-sm" />
                </Button>
              </Row>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                CTA Size (rounded-full)
              </h3>
              <Row gap={2} wrap>
                <Button size="cta" className="rounded-full">Get Started</Button>
                <Button size="cta" variant="outline" className="rounded-full">Learn More</Button>
                <Button size="cta" variant="secondary" className="rounded-full">
                  <Icon name="plus" className="text-sm mr-2" />
                  New Post
                </Button>
              </Row>
            </div>
          </Stack>
        </Card>

        {/* Current Variants Reference */}
        <Card className="p-6 bg-muted/50 border">
          <h3 className="text-lg font-semibold mb-2">Current Button Config (Consolidated)</h3>
          <pre className="text-xs overflow-x-auto p-3 bg-background rounded-md">
            {`variants: {
  variant: {
    default, destructive, outline,
    secondary, ghost, link
  },
  size: {
    default: "40px mobile / 32px desktop",
    cta: "44px mobile / 32px desktop",
    icon: "40×40 mobile / 32×32 desktop",
    icon-lg: "64×64 (media play button)"
  }
}`}
          </pre>
          <p className="text-xs text-muted-foreground mt-3">
            Responsive sizing: larger touch targets on mobile (&lt;768px), compact on desktop.
            Use <code>size="cta"</code> for primary call-to-action buttons.
          </p>
        </Card>
      </Stack>
    </Region>
  )
}
