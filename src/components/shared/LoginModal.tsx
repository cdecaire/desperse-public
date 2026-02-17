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
import { useAuth } from '@/hooks/useAuth'
import { Logo } from './Logo'

interface LoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  message?: string
}

export function LoginModal({ open, onOpenChange, message }: LoginModalProps) {
  const { login, ready } = usePrivy()
  const { isAuthenticated } = useAuth()

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

          <p className="text-center text-xs text-muted-foreground">
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

