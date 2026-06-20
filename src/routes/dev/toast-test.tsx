/**
 * Development route to test toast notifications
 * Route: /dev/toast-test
 */

import { PageHeader } from '@cdecaire/sable'
import { Grid, Region, Row, Stack } from '@cdecaire/sable/layout'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toastSuccess, toastError, toastInfo, toastWarning } from '@/lib/toast'

export const Route = createFileRoute('/dev/toast-test')({
  component: ToastTestPage,
})

function ToastTestPage() {
  const [persistentMode, setPersistentMode] = useState(false)

  // Helper to get toast options based on persistent mode
  const getToastOpts = () => (persistentMode ? { duration: Infinity } : {})

  return (
    <Region max="56rem" inset className="py-6">
      <Stack gap={3}>
        <PageHeader
          title="Toast Notification Test"
          description="Test all toast types and variations to inspect styling and behavior."
        />

        {/* Persistent Mode Toggle */}
        <Card className="p-4">
          <Row align="center" justify="between">
            <div>
              <h3 className="font-semibold mb-1">Persistent Mode</h3>
              <p className="text-sm text-muted-foreground">
                When enabled, toasts will remain visible indefinitely for inspection.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={persistentMode}
                onChange={(e) => setPersistentMode(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300"
              />
              <span className="text-sm font-medium">
                {persistentMode ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </Row>
        </Card>

        {/* Custom Toast Functions */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Custom Toast Functions</h2>
          <Grid minItemWidth="20rem" gap={2}>
            <Stack gap={1}>
              <h3 className="font-medium text-sm text-muted-foreground">Success Toasts</h3>
              <Row gap={1} wrap>
                <Button
                  onClick={() =>
                    toastSuccess('Operation completed successfully', getToastOpts())
                  }
                  variant="default"
                >
                  Short Success
                </Button>
                <Button
                  onClick={() =>
                    toastSuccess(
                      'Your profile has been updated successfully. All changes have been saved and are now live.',
                      getToastOpts(),
                    )
                  }
                  variant="default"
                >
                  Long Success
                </Button>
              </Row>
            </Stack>

            <Stack gap={1}>
              <h3 className="font-medium text-sm text-muted-foreground">Error Toasts</h3>
              <Row gap={1} wrap>
                <Button
                  onClick={() => toastError('Something went wrong', getToastOpts())}
                  variant="destructive"
                >
                  Short Error
                </Button>
                <Button
                  onClick={() =>
                    toastError(
                      'Failed to process your request. Please check your connection and try again. If the problem persists, contact support.',
                      getToastOpts(),
                    )
                  }
                  variant="destructive"
                >
                  Long Error
                </Button>
              </Row>
            </Stack>

            <Stack gap={1}>
              <h3 className="font-medium text-sm text-muted-foreground">Info Toasts</h3>
              <Row gap={1} wrap>
                <Button
                  onClick={() => toastInfo('New features available', getToastOpts())}
                  variant="outline"
                >
                  Short Info
                </Button>
                <Button
                  onClick={() =>
                    toastInfo(
                      'We have updated our terms of service. Please review the changes at your earliest convenience.',
                      getToastOpts(),
                    )
                  }
                  variant="outline"
                >
                  Long Info
                </Button>
              </Row>
            </Stack>

            <Stack gap={1}>
              <h3 className="font-medium text-sm text-muted-foreground">Warning Toasts</h3>
              <Row gap={1} wrap>
                <Button
                  onClick={() => toastWarning('Please review this action', getToastOpts())}
                  variant="outline"
                >
                  Short Warning
                </Button>
                <Button
                  onClick={() =>
                    toastWarning(
                      'This action cannot be undone. Are you sure you want to proceed? All associated data will be permanently deleted.',
                      getToastOpts(),
                    )
                  }
                  variant="outline"
                >
                  Long Warning
                </Button>
              </Row>
            </Stack>
          </Grid>
        </Card>

        {/* Real-world Examples */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Real-world Examples</h2>
          <Grid minItemWidth="20rem" gap={2}>
            <Stack gap={1}>
              <h3 className="font-medium text-sm text-muted-foreground">User Actions</h3>
              <Stack gap={1}>
                <Button
                  onClick={() => toastSuccess('Profile updated', getToastOpts())}
                  variant="default"
                  className="w-full"
                >
                  Profile Updated
                </Button>
                <Button
                  onClick={() => toastSuccess('Avatar updated', getToastOpts())}
                  variant="default"
                  className="w-full"
                >
                  Avatar Updated
                </Button>
                <Button
                  onClick={() => toastSuccess('Comment added', getToastOpts())}
                  variant="default"
                  className="w-full"
                >
                  Comment Added
                </Button>
                <Button
                  onClick={() => toastSuccess('Transaction ID copied', getToastOpts())}
                  variant="default"
                  className="w-full"
                >
                  Transaction ID Copied
                </Button>
              </Stack>
            </Stack>

            <Stack gap={1}>
              <h3 className="font-medium text-sm text-muted-foreground">Error Scenarios</h3>
              <Stack gap={1}>
                <Button
                  onClick={() =>
                    toastError(
                      'Wallet not connected. Please connect your wallet.',
                      getToastOpts(),
                    )
                  }
                  variant="destructive"
                  className="w-full"
                >
                  Wallet Not Connected
                </Button>
                <Button
                  onClick={() =>
                    toastError('Avatar must be 2MB or smaller.', getToastOpts())
                  }
                  variant="destructive"
                  className="w-full"
                >
                  File Size Error
                </Button>
                <Button
                  onClick={() =>
                    toastError(
                      'Failed to update 3 NFTs. You can try again later.',
                      getToastOpts(),
                    )
                  }
                  variant="destructive"
                  className="w-full"
                >
                  Batch Update Error
                </Button>
                <Button
                  onClick={() =>
                    toastError('Transaction failed. You can try again.', getToastOpts())
                  }
                  variant="destructive"
                  className="w-full"
                >
                  Transaction Failed
                </Button>
              </Stack>
            </Stack>
          </Grid>
        </Card>

        {/* Multi-line Test */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Multi-line Toast Test</h2>
          <p className="text-sm text-muted-foreground mb-4">
            These toasts should use rounded-lg instead of rounded-full due to multiple lines.
          </p>
          <Row gap={1} wrap>
            <Button
              onClick={() =>
                toastSuccess(
                  'Your post has been published successfully. It is now visible to all users in your feed and will appear in search results.',
                  getToastOpts(),
                )
              }
              variant="default"
            >
              Multi-line Success
            </Button>
            <Button
              onClick={() =>
                toastError(
                  'An unexpected error occurred while processing your request. Our team has been notified and will investigate the issue. Please try again in a few moments or contact support if the problem persists.',
                  getToastOpts(),
                )
              }
              variant="destructive"
            >
              Multi-line Error
            </Button>
            <Button
              onClick={() =>
                toastInfo(
                  'We have made significant improvements to our platform. New features include enhanced search capabilities, improved performance, and a redesigned user interface. Check out the changelog for more details.',
                  getToastOpts(),
                )
              }
              variant="outline"
            >
              Multi-line Info
            </Button>
          </Row>
        </Card>

        {/* Info Section */}
        <Card className="p-6 bg-muted/50">
          <h3 className="text-lg font-semibold mb-2">What to Inspect:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Toast styling matches NewPostsToast design (colors, shadows, hover effects)</li>
            <li>Close button is positioned inline on the right (not top-left)</li>
            <li>Single-line toasts use rounded-full</li>
            <li>Multi-line toasts use rounded-lg</li>
            <li>Icons display correctly with colored circle backgrounds</li>
            <li>Hover and active states work properly</li>
            <li>Dark mode styling is correct</li>
            <li>Toast positioning and spacing</li>
          </ul>
        </Card>
      </Stack>
    </Region>
  )
}
