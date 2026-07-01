import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { usePrivy } from '@privy-io/react-auth'
import { useExportWallet } from '@privy-io/react-auth/solana'
import { Row, Stack } from '@cdecaire/sable/layout'
import { Icon } from '@/components/ui/icon'
import { Logo } from '@/components/shared/Logo'

// Search params: `?embed=ios` enables native iOS WebView mode
const searchSchema = z.object({
  embed: z.enum(['ios']).optional(),
})

export const Route = createFileRoute('/export-wallet')({
  validateSearch: searchSchema,
  component: ExportWalletPage,
})

type ExportStatus = 'idle' | 'success' | 'error'

/**
 * Bridge native containers via standard postMessage channels.
 * - iOS WKWebView: window.webkit.messageHandlers.exportResult.postMessage(...)
 * - RN WebView (defensive — not currently used): window.ReactNativeWebView.postMessage(...)
 */
function postExportResult(status: 'success' | 'error', error?: string) {
  try {
    const payload = JSON.stringify({ status, error })
    const w = window as any
    w?.webkit?.messageHandlers?.exportResult?.postMessage?.(payload)
    w?.ReactNativeWebView?.postMessage?.(payload)
  } catch (e) {
    // Best-effort — never let bridge failures break the page
    console.warn('[export-wallet] postMessage bridge failed:', e)
  }
}

function ExportWalletPage() {
  const search = Route.useSearch()
  const { ready, authenticated, login } = usePrivy()
  const { exportWallet } = useExportWallet()

  // Embed detection: explicit query param OR custom UA fallback
  const [isEmbedIos, setIsEmbedIos] = useState(false)
  useEffect(() => {
    if (search.embed === 'ios') {
      setIsEmbedIos(true)
      return
    }
    if (typeof navigator !== 'undefined' && navigator.userAgent?.includes('Desperse-iOS')) {
      setIsEmbedIos(true)
    }
  }, [search.embed])

  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle')

  const handleExport = async () => {
    try {
      await exportWallet()
      setExportStatus('success')
      if (isEmbedIos) postExportResult('success')
    } catch (err: any) {
      const message = String(err?.message ?? err ?? 'Export failed')
      setExportStatus('error')
      if (isEmbedIos) postExportResult('error', message)
    }
  }

  // iOS embed success screen — native side dismisses the WebView
  if (isEmbedIos && exportStatus === 'success') {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <Stack gap={0} align="center" className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
            <Icon name="check" variant="regular" className="text-2xl text-muted-foreground" />
          </div>
          <h1 className="text-heading-1 mb-3">Key exported</h1>
          <p className="text-muted-foreground">
            You can close this window now.
          </p>
        </Stack>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center">
      {!isEmbedIos && (
        <header className="absolute top-8 left-0 right-0">
          <Row justify="center">
            <Logo size={20} className="text-foreground" />
          </Row>
        </header>
      )}

      <main className="flex-1 flex items-center justify-center px-4 min-h-screen">
        {!ready ? (
          <Icon name="spinner-third" spin className="text-2xl text-muted-foreground" />
        ) : authenticated ? (
          <Stack gap={0} align="center" className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
              <Icon name="key" variant="regular" className="text-2xl text-muted-foreground" />
            </div>

            <h1 className="text-heading-1 mb-3">Export Private Key</h1>

            <p className="text-muted-foreground mb-8">
              This will reveal your embedded wallet's private key. Keep it safe and never share it with anyone.
            </p>

            <button
              onClick={handleExport}
              className="bg-foreground text-background px-8 py-3 rounded-full text-label-lg hover:opacity-90 transition-opacity"
            >
              Export private key
            </button>
          </Stack>
        ) : (
          <Stack gap={0} align="center" className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
              <Icon name="key" variant="regular" className="text-2xl text-muted-foreground" />
            </div>

            <h1 className="text-heading-1 mb-3">Export Private Key</h1>

            <p className="text-muted-foreground mb-8">
              For security, private key export is only available via the web. Sign in to continue.
            </p>

            <button
              onClick={() => login()}
              className="bg-foreground text-background px-8 py-3 rounded-full text-label-lg hover:opacity-90 transition-opacity"
            >
              Sign in to continue
            </button>
          </Stack>
        )}
      </main>
    </div>
  )
}
