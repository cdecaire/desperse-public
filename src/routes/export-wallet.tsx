import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'
import { Icon } from '@/components/ui/icon'

export const Route = createFileRoute('/export-wallet')({
  component: ExportWalletPage,
})

function ExportWalletPage() {
  const { ready, authenticated, login } = usePrivy()
  const navigate = useNavigate()

  // Auto-redirect to wallets page once authenticated
  useEffect(() => {
    if (ready && authenticated) {
      navigate({ to: '/settings/account/wallets' })
    }
  }, [ready, authenticated, navigate])

  // Show loading while checking auth or redirecting
  if (!ready || authenticated) {
    return (
      <StaticPageLayout>
        <div className="flex items-center justify-center py-32">
          <Icon name="spinner-third" spin className="text-2xl text-muted-foreground" />
        </div>
      </StaticPageLayout>
    )
  }

  return (
    <StaticPageLayout>
      <div className="flex flex-col items-center text-center py-12 md:py-20 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
          <Icon name="key" variant="regular" className="text-2xl text-muted-foreground" />
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mb-3">Export Private Key</h1>

        <p className="text-muted-foreground mb-8">
          For security, private key export is only available via the web. Sign in to continue
          to your wallet settings where you can export your embedded wallet's private key.
        </p>

        <button
          onClick={() => login()}
          className="bg-foreground text-background px-8 py-3 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Sign in to continue
        </button>
      </div>
    </StaticPageLayout>
  )
}
