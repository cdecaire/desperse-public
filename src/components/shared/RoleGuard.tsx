/**
 * RoleGuard Component
 * Protects routes that require specific user roles (moderator/admin)
 */

import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { LoadingSpinner } from './LoadingSpinner'
import { EmptyState } from './EmptyState'

interface RoleGuardProps {
  children: React.ReactNode
  /** Required role: 'moderator' allows moderators and admins, 'admin' allows only admins */
  requiredRole: 'moderator' | 'admin'
  /** Optional message to show if access is denied */
  deniedMessage?: string
}

/**
 * Wraps protected content and redirects if user doesn't have required role
 */
export function RoleGuard({ children, requiredRole, deniedMessage }: RoleGuardProps) {
  const { user: currentUser, isLoading, isInitializing } = useCurrentUser()
  const navigate = useNavigate()

  const hasAccess =
    currentUser &&
    (requiredRole === 'moderator'
      ? currentUser.role === 'moderator' || currentUser.role === 'admin'
      : currentUser.role === 'admin')

  useEffect(() => {
    if (!isLoading && currentUser && !hasAccess) {
      // Redirect to home if user doesn't have required role
      navigate({ to: '/' })
    }
  }, [isLoading, currentUser, hasAccess, navigate])

  // Show loading state only while we don't have a user yet
  // Once we have a user (even if still initializing), we can check access
  if (isLoading && !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Show error if user doesn't have access
  if (!currentUser || !hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <EmptyState
          icon={<i className="fa-regular fa-shield-halved text-4xl" />}
          title="Access Denied"
          description={
            deniedMessage ||
            `This page requires ${requiredRole === 'admin' ? 'admin' : 'moderator'} access.`
          }
          action={{ label: 'Go to Feed', to: '/' }}
        />
      </div>
    )
  }

  return <>{children}</>
}

export default RoleGuard

