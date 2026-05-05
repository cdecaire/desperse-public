import { createFileRoute } from '@tanstack/react-router'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'

export const Route = createFileRoute('/fees')({
  component: FeesPage,
})

function FeesPage() {
  return (
    <StaticPageLayout>
      <article className="max-w-none [&>p]:text-body-lg [&>p]:mb-4 [&>ul]:mb-4 [&>ul]:pl-6 [&>ul]:list-disc [&>ul]:space-y-1 [&_li]:text-body-lg">
        <h1 className="text-heading-1 mb-2">Fees & Pricing</h1>
        <p className="text-body-sm! text-muted-foreground mb-8">Last updated: December 31, 2024</p>

        <p>
          This page explains how pricing and fees work on Desperse, including the difference between
          Collectibles and Editions.
        </p>

        <h2 className="text-heading-2 mt-12 mb-3">Overview</h2>
        <p>Desperse supports two types of content:</p>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>
            <strong>Collectibles</strong> – Free to collect, designed for discovery and engagement
          </li>
          <li>
            <strong>Editions</strong> – Paid, limited works designed for monetization
          </li>
        </ul>
        <p>Each has a different cost structure, outlined below.</p>

        <h2 className="text-heading-2 mt-12 mb-3">Collectibles</h2>
        <p>Collectibles are free to collect.</p>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>
            <strong>User cost:</strong> Free
          </li>
          <li>
            <strong>Creator earnings:</strong> None
          </li>
          <li>
            <strong>Platform fees:</strong> None
          </li>
        </ul>
        <p>
          To keep Collectibles accessible, Desperse currently covers the underlying network and
          protocol costs required to mint them. Because of this, Collectibles may be subject to
          usage limits or restrictions to prevent abuse.
        </p>
        <p>Collectibles are intended for:</p>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>Free distribution</li>
          <li>Community engagement</li>
          <li>Discovery and experimentation</li>
        </ul>

        <h2 className="text-heading-2 mt-12 mb-3">Editions</h2>
        <p>Editions are paid, limited digital works listed by creators.</p>
        <p>When you purchase an Edition:</p>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>
            <strong>Creators receive:</strong> 95% of the listed price
          </li>
          <li>
            <strong>Platform fee:</strong> 5% of the listed price
          </li>
          <li>
            <strong>Minting & network fee:</strong> 0.01 SOL, added at checkout to cover on-chain
            minting costs
          </li>
        </ul>
        <p>
          The minting and network fee is shown during checkout and before you approve the
          transaction.
        </p>

        <h3 className="text-heading-3 mt-8 mb-2">Example: SOL Payment</h3>
        <p>If an Edition is listed at 0.1 SOL:</p>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>Listed price: 0.1 SOL</li>
          <li>Platform fee (5%): 0.005 SOL</li>
          <li>Minting & network fee: 0.01 SOL</li>
          <li>
            <strong>Total paid by buyer:</strong> ~0.11 SOL
          </li>
          <li>
            <strong>Creator receives:</strong> 0.095 SOL
          </li>
        </ul>

        <h3 className="text-heading-3 mt-8 mb-2">Example: USDC Payment</h3>
        <p>If an Edition is listed at $20 USDC:</p>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>Listed price: $20 USDC</li>
          <li>Platform fee (5%): $1 USDC</li>
          <li>Minting & network fee: 0.01 SOL (paid in SOL)</li>
          <li>
            <strong>Total paid by buyer:</strong> $20 USDC + ~0.01 SOL
          </li>
          <li>
            <strong>Creator receives:</strong> $19 USDC
          </li>
        </ul>

        <h3 className="text-heading-3 mt-8 mb-2">SOL Required for All Transactions</h3>
        <p>
          Even when paying with USDC, you will need a small amount of SOL in your wallet to cover
          Solana network transaction fees and the minting fee. This is standard for all transactions
          on Solana and typically amounts to approximately 0.01 SOL.
        </p>

        <h2 className="text-heading-2 mt-12 mb-3">Minimum Pricing</h2>
        <p>To cover minting and network costs and ensure Editions remain sustainable:</p>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>
            <strong>Editions must be priced at a minimum of $15 USD</strong> (paid in USDC or the
            equivalent value in SOL, approximately 0.1 SOL)
          </li>
          <li>Free or near-free Editions are not supported</li>
        </ul>
        <p>This helps ensure:</p>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>On-chain minting costs are covered</li>
          <li>Creators are paid fairly for their work</li>
          <li>A clear distinction between free Collectibles and paid Editions</li>
        </ul>

        <h2 className="text-heading-2 mt-12 mb-3">Transparency</h2>
        <p>Desperse aims to be transparent about fees:</p>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>Listing prices are shown clearly</li>
          <li>Platform fees are disclosed</li>
          <li>Minting and network fees are shown before transaction approval</li>
        </ul>
        <p>No fees are hidden or charged without your explicit confirmation.</p>

        <h2 className="text-heading-2 mt-12 mb-3">Changes to Fees</h2>
        <p>
          Fees and limits may change over time as the platform evolves. Any updates will be
          reflected on this page, and continued use of the App constitutes acceptance of those
          changes.
        </p>

        <h2 className="text-heading-2 mt-12 mb-3">Contact</h2>
        <p>If you have questions about pricing or fees, contact:</p>
        <p>
          <a
            href="mailto:support@desperse.app"
            className="text-foreground underline hover:no-underline"
          >
            support@desperse.app
          </a>
        </p>
      </article>
    </StaticPageLayout>
  )
}
