/**
 * LoginModal Component
 * Displays a login modal overlay when users first visit the site unauthenticated
 * Users can login/sign up or close the modal to browse freely
 */

import { useEffect } from 'react'
import * as React from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Link } from '@tanstack/react-router'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'
import { Logo } from './Logo'

interface LoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  message?: string
}

export function LoginModal({ open, onOpenChange, message }: LoginModalProps) {
  const { login, ready } = usePrivy()
  const { isAuthenticated } = useAuth()
  const [inviteCode, setInviteCode] = React.useState('')
  const [isApplyingInvite, setIsApplyingInvite] = React.useState(false)
  const [showInviteInput, setShowInviteInput] = React.useState(false)

  // Close modal when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && open) {
      onOpenChange(false)
    }
  }, [isAuthenticated, open, onOpenChange])

  const handleLogin = () => {
    if (!ready) return
    login()
  }

  const handleApplyInviteCode = async () => {
    const trimmedCode = inviteCode.trim()
    if (!trimmedCode) {
      toast.error('Enter an invite code first.')
      return
    }

    setIsApplyingInvite(true)
    try {
      const response = await fetch('/api/v1/referrals/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: trimmedCode }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error?.message || 'Invite code not found')
      }

      const handle = payload?.data?.referrer?.slug ? `@${payload.data.referrer.slug}` : 'that inviter'
      toast.success(`Invite code saved for ${handle}`)
      setShowInviteInput(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save invite code')
    } finally {
      setIsApplyingInvite(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md"
        showCloseButton={true}
      >
        <DialogHeader>
          <div className="flex items-center justify-center mb-3">
            <Logo 
              size={48}
              className="text-foreground"
            />
          </div>
          <DialogTitle className="text-center">
            Welcome to Desperse
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Create, collect, and own your media.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {message && (
            <p className="text-sm text-(--tone-warning) bg-(--flush-orange-100) dark:bg-(--flush-orange-500)/10 px-3 py-2 rounded-lg text-center">
              {message}
            </p>
          )}

          <Button
            onClick={handleLogin}
            disabled={!ready}
            className="w-full"
          >
            {!ready ? 'Loading...' : 'Log in or Sign up'}
          </Button>

          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="w-full"
          >
            Just browsing
          </Button>

          <div className="rounded-xl border border-border/60 bg-background p-4 text-left space-y-3">
            <button
              type="button"
              onClick={() => setShowInviteInput((value) => !value)}
              className="w-full flex items-center justify-between gap-3 text-sm font-medium"
            >
              <span>Have an invite code?</span>
              <span className="text-muted-foreground">{showInviteInput ? 'Hide' : 'Enter code'}</span>
            </button>
            {showInviteInput ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Enter it before you sign up. We’ll save the attribution and carry it through login.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={inviteCode}
                    onChange={(event) => setInviteCode(event.target.value)}
                    placeholder="Enter invite code"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={32}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleApplyInviteCode}
                    disabled={isApplyingInvite}
                    className="sm:w-auto"
                  >
                    {isApplyingInvite ? 'Saving...' : 'Apply'}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <p className="text-center text-caption text-muted-foreground">
            By signing in, you agree to our{' '}
            <Link to="/terms" onClick={() => onOpenChange(false)} className="text-foreground hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" onClick={() => onOpenChange(false)} className="text-foreground hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Hook to manage login modal visibility
 * Modal is only shown when explicitly triggered by user action
 */
export function useLoginModal() {
  const { isAuthenticated } = useAuth()
  const [showModal, setShowModal] = React.useState(false)

  // Close modal when user becomes authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      setShowModal(false)
    }
  }, [isAuthenticated])

  return {
    showModal,
    setShowModal,
  }
}

export default LoginModal

