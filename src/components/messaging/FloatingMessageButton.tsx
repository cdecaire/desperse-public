/**
 * FloatingMessageButton Component
 * Pill-shaped button with full-screen sheet on mobile, popover on desktop
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Link } from '@tanstack/react-router'
import { NotificationBadge } from '@/components/ui/notification-badge'
import { Button } from '@/components/ui/button'
import { ThreadList } from './ThreadList'
import { ConversationView } from './ConversationView'
import { NewMessageView } from './NewMessageView'
import { useMessaging } from './MessagingContext'
import { useThreads, useUnreadCount, type Thread } from '@/hooks/useMessages'
import { useScrollHideNav } from '@/hooks/useScrollHideNav'
import { cn } from '@/lib/utils'

type PopoverView = 'threads' | 'conversation' | 'new'

interface FloatingMessageButtonProps {
  className?: string
  /** Hide the trigger button but still render the popover when messaging is open */
  hideTrigger?: boolean
}

export function FloatingMessageButton({ className, hideTrigger = false }: FloatingMessageButtonProps) {
  const { isOpen, activeThread, pendingUser, openMessaging, closeMessaging, setActiveThread, clearActiveThread, clearPendingUser, shouldPollMessages } = useMessaging()
  const [view, setView] = useState<PopoverView>('threads')
  const mobileSheetRef = useRef<HTMLDivElement>(null)
  const desktopPopoverRef = useRef<HTMLDivElement>(null)
  const [viewportHeight, setViewportHeight] = useState<number | null>(null)

  const { data: threadsData, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useThreads(shouldPollMessages)
  const unreadCount = useUnreadCount(shouldPollMessages)
  const isScrollHidden = useScrollHideNav()

  // Flatten pages to get all threads
  const threads = useMemo(() => {
    if (!threadsData?.pages) return []
    return threadsData.pages.flatMap((page) => page.threads)
  }, [threadsData])

  // Get up to 3 recent conversation avatars
  const recentAvatars = useMemo(() => {
    return threads
      .slice(0, 3)
      .map((thread) => ({
        id: thread.id,
        avatarUrl: thread.otherUser.avatarUrl,
        displayName: thread.otherUser.displayName || thread.otherUser.usernameSlug || 'User',
      }))
      .filter((a) => a.avatarUrl)
  }, [threads])

  const hasAvatars = recentAvatars.length > 0

  // Sync view state when activeThread or pendingUser changes from context
  useEffect(() => {
    if (activeThread && isOpen) {
      setView('conversation')
    } else if (pendingUser && isOpen) {
      setView('new')
    }
  }, [activeThread, pendingUser, isOpen])

  // Lock body scroll on mobile only when open (desktop popover allows page scroll)
  useEffect(() => {
    if (!isOpen) return

    // Only lock scroll on mobile (below lg breakpoint = 1024px)
    const isMobile = window.matchMedia('(max-width: 1023px)').matches
    if (!isMobile) return

    // Save current scroll position and lock body
    const scrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.overflow = 'hidden'

    return () => {
      // Restore scroll position
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      document.body.style.overflow = ''
      window.scrollTo(0, scrollY)
    }
  }, [isOpen])

  // Handle visual viewport changes (keyboard open/close) on mobile
  useEffect(() => {
    if (!isOpen) return

    const vv = window.visualViewport
    if (!vv) return

    const handleResize = () => {
      setViewportHeight(vv.height)
    }

    // Set initial height
    setViewportHeight(vv.height)

    vv.addEventListener('resize', handleResize)
    return () => vv.removeEventListener('resize', handleResize)
  }, [isOpen])

  // Close popover when clicking outside (desktop only - mobile uses backdrop)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node

      // Check if click is inside either the mobile sheet or desktop popover
      if (mobileSheetRef.current?.contains(target)) {
        return
      }
      if (desktopPopoverRef.current?.contains(target)) {
        return
      }

      // Check if click is inside a Radix dropdown menu (rendered in portal)
      const dropdownContent = document.querySelector('[data-radix-popper-content-wrapper]')
      if (dropdownContent?.contains(target)) {
        return
      }

      // Check if click is inside a Radix dialog (rendered in portal)
      const dialogContent = document.querySelector('[data-slot="dialog-content"]')
      if (dialogContent?.contains(target)) {
        return
      }

      // Check if click is inside a dialog overlay (clicking the backdrop should not close messaging)
      const dialogOverlay = document.querySelector('[data-slot="dialog-overlay"]')
      if (dialogOverlay?.contains(target)) {
        return
      }

      closeMessaging()
      setTimeout(() => setView('threads'), 200)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, closeMessaging])

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (view === 'conversation') {
          clearActiveThread()
          setView('threads')
        } else if (view === 'new') {
          clearPendingUser()
          setView('threads')
        } else {
          closeMessaging()
        }
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, view, closeMessaging, clearActiveThread, clearPendingUser])

  const handleSelectThread = useCallback((thread: Thread) => {
    setActiveThread(thread)
    setView('conversation')
  }, [setActiveThread])

  const handleBack = useCallback(() => {
    clearActiveThread()
    clearPendingUser()
    setView('threads')
  }, [clearActiveThread, clearPendingUser])

  const handleClose = useCallback(() => {
    closeMessaging()
    setTimeout(() => setView('threads'), 200)
  }, [closeMessaging])

  const handleNewMessage = useCallback(() => {
    setView('new')
  }, [])

  const handleThreadCreated = useCallback((thread: Thread) => {
    setActiveThread(thread)
    setView('conversation')
  }, [setActiveThread])

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Messaging panel content (shared between mobile and desktop)
  const messagingContent = (
    <>
      {view === 'conversation' && activeThread ? (
        <ConversationView
          thread={activeThread}
          onBack={handleBack}
          onClose={handleClose}
        />
      ) : view === 'new' ? (
        <NewMessageView
          onBack={handleBack}
          onClose={handleClose}
          onThreadCreated={handleThreadCreated}
          initialUser={pendingUser}
        />
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b shrink-0 bg-background">
            <h2 className="text-base font-semibold">Messages</h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNewMessage}
                aria-label="New message"
              >
                <i className="fa-regular fa-circle-plus text-sm" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                asChild
                onClick={handleClose}
              >
                <Link to="/settings/account/messaging" aria-label="Message settings">
                  <i className="fa-regular fa-gear text-sm" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                aria-label="Close messages"
              >
                <i className="fa-solid fa-xmark text-sm" aria-hidden="true" />
              </Button>
            </div>
          </div>

          {/* Thread list */}
          <div className="flex-1 overflow-y-auto bg-background">
            <ThreadList
              threads={threads}
              activeThreadId={null}
              onSelectThread={handleSelectThread}
              hasMore={!!hasNextPage}
              isLoading={isLoading}
              isFetchingMore={isFetchingNextPage}
              onLoadMore={handleLoadMore}
            />
          </div>
        </>
      )}
    </>
  )

  return (
    <>
      {/* Mobile: Full-screen sheet */}
      {isOpen && (
        <>
          {/* Backdrop - mobile only */}
          <div
            data-messaging-backdrop
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
            onClick={handleClose}
          />

          {/* Mobile full-screen sheet */}
          <div
            ref={mobileSheetRef}
            className="fixed inset-x-0 bottom-0 z-50 lg:hidden flex flex-col bg-background rounded-t-xl shadow-lg animate-in slide-in-from-bottom duration-200"
            style={{
              height: viewportHeight ? `${viewportHeight}px` : '100dvh',
              maxHeight: '100dvh',
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
            role="dialog"
            aria-label="Messages"
          >
            {messagingContent}
          </div>

          {/* Desktop popover */}
          <div
            ref={desktopPopoverRef}
            className={cn(
              'fixed z-40 right-6 bottom-6 hidden lg:block',
              className
            )}
          >
            <div
              className="w-96 bg-popover border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 h-[480px] flex flex-col"
              role="dialog"
              aria-label="Messages"
            >
              {messagingContent}
            </div>
          </div>
        </>
      )}

      {/* Trigger Button - hidden when open, when trigger is explicitly hidden, or when scrolling hides nav (mobile only) */}
      {!isOpen && !hideTrigger && (
        <div
          className={cn(
            'fixed z-40 right-4 lg:right-6 transition-transform duration-200',
            'bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:bottom-6',
            isScrollHidden && 'translate-y-[calc(100%+1rem)] lg:translate-y-0',
            className
          )}
        >
          <button
            type="button"
            onClick={() => openMessaging()}
            className={cn(
              'flex items-center justify-center',
              hasAvatars ? 'gap-2.5 pl-3.5 pr-2.5 py-2.5' : 'p-3.5',
              'bg-white dark:bg-zinc-800 rounded-full',
              'shadow-lg border border-border/50',
              'hover:bg-zinc-50 dark:hover:bg-zinc-700',
              'transition-colors duration-200'
            )}
            aria-label={`Open messages${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            aria-expanded={isOpen}
            aria-haspopup="dialog"
          >
            {/* Paper plane icon */}
            <span className="w-6 h-6 grid place-items-center relative">
              <i className="fa-regular fa-paper-plane text-lg translate-y-0.5 -translate-x-px" aria-hidden="true" />
              {/* Unread badge on icon when no avatars */}
              {unreadCount > 0 && !hasAvatars && (
                <NotificationBadge
                  variant="destructive"
                  size="dot"
                  className="absolute -top-0.5 -right-0.5"
                />
              )}
            </span>

            {/* Avatar stack on the right */}
            {hasAvatars && (
              <div className="flex -space-x-2">
                {recentAvatars.map((avatar, index) => (
                  <div
                    key={avatar.id}
                    className="w-7 h-7 rounded-full border-2 border-white dark:border-zinc-800 overflow-hidden bg-muted"
                    style={{ zIndex: recentAvatars.length - index }}
                  >
                    <img
                      src={avatar.avatarUrl!}
                      alt={avatar.displayName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
                {/* Unread badge after avatars */}
                {unreadCount > 0 && (
                  <div className="flex items-center pl-1" style={{ zIndex: recentAvatars.length + 1 }}>
                    <NotificationBadge
                      variant="destructive"
                      size="sm"
                      count={unreadCount}
                    />
                  </div>
                )}
              </div>
            )}
          </button>
        </div>
      )}
    </>
  )
}
