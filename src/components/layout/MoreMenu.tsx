/**
 * More Menu Component
 * - Desktop (sidebar): Popover menu anchored to bottom
 * - Mobile (bottomnav): Native-feeling bottom sheet
 */

import { Link, useNavigate } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import { useTheme } from '../providers/ThemeProvider'
import { useAuth } from '../../hooks/useAuth'
import { Icon } from '@/components/ui/icon'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { BetaFeedbackModal } from '@/components/forms/BetaFeedbackModal'

interface MoreMenuProps {
  /** Display variant - sidebar for desktop, bottomnav for mobile */
  variant?: 'sidebar' | 'bottomnav'
}

export default function MoreMenu({ variant = 'sidebar' }: MoreMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { logout, login, isAuthenticated } = useAuth()
  const isSystemTheme = theme === 'system' || theme === undefined
  const activeTheme = isSystemTheme ? (resolvedTheme || 'dark') : theme

  const isMobile = variant === 'bottomnav'

  // Close popover menu when clicking outside (desktop only)
  useEffect(() => {
    if (isMobile) return // Sheet handles its own outside clicks

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, isMobile])

  // Close menu on escape
  useEffect(() => {
    if (isMobile) return // Sheet handles its own escape key

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, isMobile])

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const handleLogout = async () => {
    setIsOpen(false)
    await logout()
    navigate({ to: '/' })
  }

  const handleAuth = () => {
    setIsOpen(false)
    login()
  }

  const handleOpenFeedback = () => {
    setIsOpen(false)
    setShowFeedbackModal(true)
  }

  // Shared menu content
  const MenuContent = () => (
    <div className="space-y-1">
      {isAuthenticated && (
        <Link
          to="/settings"
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-accent dark:hover:bg-zinc-800 rounded-md hover-fade"
          role="menuitem"
        >
          <Icon name="user-gear" variant="regular" className="w-5 text-center" />
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-none">Settings</span>
            <span className="text-xs text-muted-foreground leading-none">Account, preferences, help</span>
          </div>
        </Link>
      )}

      {/* Theme Switcher */}
      {isSystemTheme ? (
        <Link
          to="/settings/account/app"
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-accent dark:hover:bg-zinc-800 rounded-md hover-fade"
          role="menuitem"
        >
          <Icon name={activeTheme === 'light' ? 'sun-bright' : 'moon'} variant="regular" className="w-5 text-center" />
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-none">Theme</span>
            <span className="text-xs text-muted-foreground leading-none">
              System ({activeTheme === 'light' ? 'Light' : 'Dark'})
            </span>
          </div>
        </Link>
      ) : (
        <button
          onClick={handleThemeToggle}
          className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-accent dark:hover:bg-zinc-800 rounded-md hover-fade"
          role="menuitem"
        >
          <div className="flex items-center gap-3">
            <Icon name={theme === 'light' ? 'sun-bright' : 'moon'} variant="regular" className="w-5 text-center" />
            <span className="text-sm font-medium">Theme</span>
          </div>
          <Switch
            checked={theme === 'dark'}
            onCheckedChange={handleThemeToggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          />
        </button>
      )}

      {isAuthenticated ? (
        <>
          <Link
            to="/settings/help"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-accent dark:hover:bg-zinc-800 rounded-md hover-fade"
            role="menuitem"
          >
            <Icon name="circle-info" variant="regular" className="w-5 text-center" />
            <span className="text-sm font-medium">Help</span>
          </Link>
          <button
            onClick={handleOpenFeedback}
            className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-accent dark:hover:bg-zinc-800 rounded-md hover-fade"
            role="menuitem"
          >
            <Icon name="message-lines" variant="regular" className="w-5 text-center" />
            <span className="text-sm font-medium">Send beta feedback</span>
          </button>
        </>
      ) : (
        <>
          <Link
            to="/privacy"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-accent dark:hover:bg-zinc-800 rounded-md hover-fade"
            role="menuitem"
          >
            <Icon name="shield-check" variant="regular" className="w-5 text-center" />
            <span className="text-sm font-medium">Privacy Policy</span>
          </Link>
          <Link
            to="/terms"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-accent dark:hover:bg-zinc-800 rounded-md hover-fade"
            role="menuitem"
          >
            <Icon name="file-contract" variant="regular" className="w-5 text-center" />
            <span className="text-sm font-medium">Terms of Service</span>
          </Link>
        </>
      )}

      <div className="border-t border-border/50 my-1" />

      {isAuthenticated ? (
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-accent dark:hover:bg-zinc-800 rounded-md hover-fade"
          role="menuitem"
        >
          <Icon name="arrow-right-from-bracket" variant="regular" className="w-5 text-center" />
          <span className="text-sm font-medium">Sign out</span>
        </button>
      ) : (
        <button
          onClick={handleAuth}
          className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-accent dark:hover:bg-zinc-800 rounded-md hover-fade"
          role="menuitem"
        >
          <Icon name="right-to-bracket" variant="regular" className="w-5 text-center" />
          <span className="text-sm font-medium">Log in or Sign up</span>
        </button>
      )}
    </div>
  )

  // Mobile: Bottom Sheet
  if (isMobile) {
    return (
      <>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button
              className="flex items-center justify-center rounded-lg transition-colors min-w-[44px] min-h-[44px] text-foreground"
              aria-label="More"
            >
              <span className="w-6 h-6 grid place-items-center">
                <Icon name="bars" variant={isOpen ? 'solid' : 'regular'} className="text-xl" />
              </span>
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="rounded-t-3xl pb-8 max-h-[80vh] overflow-hidden flex flex-col"
            showClose={false}
          >
            <SheetHeader className="sr-only">
              <SheetTitle>More</SheetTitle>
            </SheetHeader>
            <div className="px-3 pt-4 flex flex-col flex-1 min-h-0" role="menu">
              <MenuContent />
            </div>
          </SheetContent>
        </Sheet>
        <BetaFeedbackModal open={showFeedbackModal} onOpenChange={setShowFeedbackModal} />
      </>
    )
  }

  // Desktop: Popover Menu
  return (
    <>
      <div ref={menuRef} className="relative">
        {/* Menu Dropdown */}
        {isOpen && (
          <div
            className="absolute bottom-full left-0 right-0 mb-2 mx-3 bg-popover border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="more-button"
          >
            <div className="p-2">
              <MenuContent />
            </div>
          </div>
        )}

        {/* More Button */}
        <button
          id="more-button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-3 px-3 py-2.5 mx-3 w-[calc(100%-1.5rem)] text-left rounded-md hover-fade text-foreground hover:bg-accent hover:text-accent-foreground ${
            isOpen ? 'font-semibold' : 'font-medium'
          }`}
          aria-expanded={isOpen}
          aria-haspopup="menu"
        >
          <span className="w-6 h-6 grid place-items-center">
            <Icon name="bars" variant={isOpen ? 'solid' : 'regular'} className="text-xl" />
          </span>
          <span className="text-sm leading-none">More</span>
        </button>
      </div>
      <BetaFeedbackModal open={showFeedbackModal} onOpenChange={setShowFeedbackModal} />
    </>
  )
}

