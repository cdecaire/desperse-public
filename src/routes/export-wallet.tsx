import { createFileRoute } from '@tanstack/react-router'
import { usePrivy } from '@privy-io/react-auth'
import { useExportWallet } from '@privy-io/react-auth/solana'
import { Icon } from '@/components/ui/icon'
import { Logo } from '@/components/shared/Logo'

export const Route = createFileRoute('/export-wallet')({
  component: ExportWalletPage,
})

function ExportWalletPage() {
  const { ready, authenticated, login } = usePrivy()
  const { exportWallet } = useExportWallet()

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center">
      <header className="pt-8 pb-4">
        <Logo size={20} className="text-foreground" />
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        {!ready ? (
          <Icon name="spinner-third" spin className="text-2xl text-muted-foreground" />
        ) : authenticated ? (
          <div className="flex flex-col items-center text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
              <Icon name="key" variant="regular" className="text-2xl text-muted-foreground" />
            </div>

            <h1 className="text-2xl md:text-3xl font-bold mb-3">Export Private Key</h1>

            <p className="text-muted-foreground mb-8">
              This will reveal your embedded wallet's private key. Keep it safe and never share it with anyone.
            </p>

            <button
              onClick={() => exportWallet()}
              className="bg-foreground text-background px-8 py-3 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Export private key
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
              <Icon name="key" variant="regular" className="text-2xl text-muted-foreground" />
            </div>

            <h1 className="text-2xl md:text-3xl font-bold mb-3">Export Private Key</h1>

            <p className="text-muted-foreground mb-8">
              For security, private key export is only available via the web. Sign in to continue.
            </p>

            <button
              onClick={() => login()}
              className="bg-foreground text-background px-8 py-3 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Sign in to continue
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
