import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { whoami } from '@/server/functions/whoami'
import { useAuth } from '@/hooks/useAuth'

export const Route = createFileRoute('/dev/auth-test')({
  component: AuthTestPage,
})

function AuthTestPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const { isAuthenticated, getAuthHeaders, privyId } = useAuth()

  const runTest = async () => {
    setLoading(true)
    try {
      // Get auth token and pass it in the data payload
      const headers = await getAuthHeaders()
      const authorization = (headers as Record<string, string>)['Authorization'] || ''
      const testResult = await whoami({ data: { authorization } } as never)
      setResult(testResult)
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Test failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="py-6 max-w-4xl mx-auto px-4">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Server-Side Authentication Test</h1>
          <p className="text-muted-foreground">
            This page tests whether the server can identify you via Privy token.
          </p>
        </div>

        <div className="border rounded-lg p-6 bg-card">
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">Client Auth Status:</span>
              <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>
                {isAuthenticated ? '✓ Authenticated' : '✗ Not authenticated'}
              </span>
            </div>
            {privyId && (
              <div className="text-sm text-muted-foreground">
                Privy ID: <code className="bg-muted px-1 rounded">{privyId}</code>
              </div>
            )}
          </div>

          <button
            onClick={runTest}
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Server Auth'}
          </button>

          {result && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Server Response:</h3>
              <pre className="bg-muted p-4 rounded overflow-auto text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
              
              {result.authenticated && (
                <div className="mt-2 p-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded">
                  ✓ Server successfully identified you!
                </div>
              )}
              
              {!result.authenticated && result.hasAuthorizationHeader && (
                <div className="mt-2 p-2 bg-[var(--flush-orange-100)] dark:bg-[var(--flush-orange-900)]/30 text-[var(--flush-orange-800)] dark:text-[var(--flush-orange-200)] rounded">
                  ⚠ Token was sent but authentication failed: {result.error}
                </div>
              )}
              
              {!result.hasAuthorizationHeader && isAuthenticated && (
                <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded">
                  ✗ Authorization header not received by server - token propagation issue
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border rounded-lg p-6 bg-muted/50">
          <h3 className="text-lg font-semibold mb-2">What This Tests:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Client can get Privy access token</li>
            <li>Token is sent in Authorization header</li>
            <li>Server receives and verifies the token</li>
            <li>Server finds user in database by Privy ID</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
