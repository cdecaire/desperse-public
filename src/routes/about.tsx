/**
 * About Page
 * A short, editorial explanation of what Desperse is, how it works, and who
 * it's for — not a sales funnel. Full narrative lives here; the home gallery
 * (`/`) links in via its header nav and creator-recruitment band.
 */

import { createFileRoute } from '@tanstack/react-router'
import { usePrivy } from '@privy-io/react-auth'
import { PageHeader } from '@cdecaire/sable'
import { Stack, Row } from '@cdecaire/sable/layout'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

const STEPS = [
  {
    icon: 'envelope' as const,
    title: 'Sign up with email',
    desc: 'Or Google, Apple, X — no wallet needed.',
  },
  {
    icon: 'wallet' as const,
    title: 'Wallet ready instantly',
    desc: 'Created for you automatically, secured by Privy.',
  },
  {
    icon: 'link-simple' as const,
    title: 'Connect your own wallet — optional',
    desc: 'Phantom, Solflare, or any Solana wallet, any time.',
  },
  {
    icon: 'key' as const,
    title: 'You own everything',
    desc: 'Your keys, your collectibles, your data.',
  },
]

const TRUST_ROW = [
  {
    icon: 'rocket' as const,
    title: 'Solana',
    desc: 'Fast, low-cost transactions.',
  },
  {
    icon: 'cube' as const,
    title: 'Metaplex',
    desc: 'The NFT standard, interoperable across Solana.',
  },
  {
    icon: 'shield-check' as const,
    title: 'Non-custodial',
    desc: 'Embedded wallets powered by Privy — you own your keys.',
  },
]

const COMPARISON = [
  { bad: 'Ads', good: 'Never. You only see creators you follow.' },
  { bad: 'Data harvesting', good: "We don't scrape, sell, or share your data." },
  { bad: 'Algorithmic feeds', good: 'You see what you follow, not what drives engagement.' },
  { bad: 'Spam DMs', good: 'Messaging costs a small fee — no spam.' },
]

function AboutPage() {
  const { login, ready } = usePrivy()

  return (
    <StaticPageLayout>
      <Stack gap={12}>
        <Stack gap={6}>
          <PageHeader
            title="What Desperse is"
            description="A platform where creative work becomes collectible."
          />

          <Stack gap={4}>
            <p className="text-body-lg text-muted-foreground max-w-[65ch]">
              Desperse is a place for artists to publish work directly and for
              collectors to own it. Creators post photos, videos, and art; anyone
              can mint a piece onchain and hold it in their own wallet, tied
              directly back to the creator who made it.
            </p>
            <p className="text-body-lg text-muted-foreground max-w-[65ch]">
              No algorithm decides who sees your work, and nothing is optimized
              for engagement. You see what you follow. Creators keep 95% of
              every sale.
            </p>
          </Stack>
        </Stack>

        <Stack gap={6}>
          <h2 className="text-heading-2">How it works</h2>
          <Stack gap={5} className="max-w-[65ch]">
            {STEPS.map((step) => (
              <Row key={step.title} gap={4} align="start">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Icon name={step.icon} variant="regular" className="text-base" />
                </span>
                <Stack gap={1}>
                  <p className="text-label-lg">{step.title}</p>
                  <p className="text-body-sm text-muted-foreground">{step.desc}</p>
                </Stack>
              </Row>
            ))}
          </Stack>
        </Stack>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <Stack gap={3}>
            <h2 className="text-heading-2">For creators</h2>
            <p className="text-body-md text-muted-foreground">
              Publish free posts, open editions, or limited drops. Collectors
              mint directly from you — no ads, no intermediaries, no algorithm
              deciding your reach.
            </p>
            <Row gap={6} className="pt-2">
              <div>
                <p className="text-heading-2">95%</p>
                <p className="text-label-xs text-muted-foreground">of every sale</p>
              </div>
              <div>
                <p className="text-heading-2 text-muted-foreground">5%</p>
                <p className="text-label-xs text-muted-foreground">platform fee</p>
              </div>
            </Row>
          </Stack>
          <Stack gap={3}>
            <h2 className="text-heading-2">For collectors</h2>
            <p className="text-body-md text-muted-foreground">
              Discover work from creators you follow, collect pieces that
              resonate, and own them onchain — every collectible is tied
              directly to the creator and lives in your wallet.
            </p>
          </Stack>
        </div>

        <Stack gap={6}>
          <h2 className="text-heading-2">Built on Solana</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TRUST_ROW.map((item) => (
              <Stack key={item.title} gap={2} className="rounded-xl border border-border p-5">
                <Icon name={item.icon} variant="regular" className="text-lg text-muted-foreground" />
                <p className="text-label-lg">{item.title}</p>
                <p className="text-body-sm text-muted-foreground">{item.desc}</p>
              </Stack>
            ))}
          </div>
        </Stack>

        <Stack gap={6}>
          <h2 className="text-heading-2">What we don't do</h2>
          <div className="border border-border rounded-xl overflow-hidden">
            {COMPARISON.map((row, i) => (
              <div
                key={row.bad}
                className={`grid grid-cols-2 ${i < COMPARISON.length - 1 ? 'border-b border-border' : ''}`}
              >
                <div className="px-4 py-4 border-r border-border flex items-center gap-2">
                  <span className="text-destructive text-lg">&times;</span>
                  <span className="text-body-sm text-muted-foreground">{row.bad}</span>
                </div>
                <div className="px-4 py-4">
                  <span className="text-body-sm">{row.good}</span>
                </div>
              </div>
            ))}
          </div>
        </Stack>

        <Stack gap={4} className="items-center text-center border-t border-border pt-12">
          <p className="text-heading-2 font-light text-muted-foreground">
            Start creating and collecting today.
          </p>
          <Button size="cta" onClick={() => login()} disabled={!ready}>
            Get Started — It's Free
          </Button>
        </Stack>
      </Stack>
    </StaticPageLayout>
  )
}
