/**
 * Hook for managing mention autocomplete state and behavior
 * Handles token detection, keyboard navigation, and selection
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useMentionSearch, type MentionUser } from './useMentionSearch'

// Characters allowed in username slugs
const USERNAME_CHARS = /^[a-z0-9_.-]$/i

// Characters that precede a valid @ trigger
const VALID_PRECEDING_CHARS = /^[\s\(\[\{\"\'']$/

interface MentionToken {
  start: number // Position of @ in the text
  query: string // Characters after @ (the search query)
}

interface UseMentionAutocompleteOptions {
  value: string
  selectionStart: number | null
  onValueChange: (value: string) => void
  onSelectionChange?: (position: number) => void
}

export function useMentionAutocomplete({
  value,
  selectionStart,
  onValueChange,
  onSelectionChange,
}: UseMentionAutocompleteOptions) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [debouncedQuery, setDebouncedQuery] = useState<string | undefined>(undefined)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Detect the current mention token at cursor position
  const detectMentionToken = useCallback((): MentionToken | null => {
    if (selectionStart === null || selectionStart === undefined) return null

    // Scan backward from cursor to find @
    let tokenStart = -1
    let query = ''

    for (let i = selectionStart - 1; i >= 0; i--) {
      const char = value[i]

      // Found @
      if (char === '@') {
        // Check if @ is in a valid position
        // Valid if: at start of text, OR preceded by whitespace/delimiter
        const precedingChar = i > 0 ? value[i - 1] : null

        if (i === 0 || (precedingChar && VALID_PRECEDING_CHARS.test(precedingChar))) {
          tokenStart = i
          query = value.slice(i + 1, selectionStart).toLowerCase()
          break
        } else {
          // @ is preceded by an invalid character (e.g., letter for email)
          return null
        }
      }

      // If we hit a non-username character before finding @, no valid token
      if (!USERNAME_CHARS.test(char)) {
        return null
      }
    }

    if (tokenStart === -1) return null

    // Validate query length (max 32 chars for username)
    if (query.length > 32) return null

    return { start: tokenStart, query }
  }, [value, selectionStart])

  const currentToken = detectMentionToken()

  // Update debounced query when token changes
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (currentToken) {
      // Open immediately when @ is typed, debounce query updates
      if (!isOpen) {
        setIsOpen(true)
        setSelectedIndex(0)
        setDebouncedQuery(currentToken.query || undefined)
      } else {
        debounceTimerRef.current = setTimeout(() => {
          setDebouncedQuery(currentToken.query || undefined)
        }, 150) // 150ms debounce for query changes
      }
    } else {
      setIsOpen(false)
      setDebouncedQuery(undefined)
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [currentToken?.start, currentToken?.query, isOpen])

  // Search users
  const { data: users = [], isLoading } = useMentionSearch(debouncedQuery, isOpen)

  // Reset selected index when users change
  useEffect(() => {
    setSelectedIndex(0)
  }, [users])

  // Insert a mention at the current token position
  const insertMention = useCallback(
    (user: MentionUser) => {
      if (!currentToken) return

      const before = value.slice(0, currentToken.start)
      const after = value.slice(selectionStart ?? currentToken.start + currentToken.query.length + 1)

      // Insert @username with trailing space
      const mention = `@${user.usernameSlug} `
      const newValue = before + mention + after
      const newCursorPosition = before.length + mention.length

      onValueChange(newValue)
      onSelectionChange?.(newCursorPosition)
      setIsOpen(false)
    },
    [currentToken, value, selectionStart, onValueChange, onSelectionChange]
  )

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): boolean => {
      if (!isOpen || users.length === 0) return false

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % users.length)
          return true

        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + users.length) % users.length)
          return true

        case 'Enter':
        case 'Tab':
          e.preventDefault()
          const selectedUser = users[selectedIndex]
          if (selectedUser) {
            insertMention(selectedUser)
          }
          return true

        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          return true

        default:
          return false
      }
    },
    [isOpen, users, selectedIndex, insertMention]
  )

  // Close on blur
  const handleBlur = useCallback(() => {
    // Delay close to allow click on popover items
    setTimeout(() => {
      setIsOpen(false)
    }, 150)
  }, [])

  // Manual close
  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  return {
    isOpen,
    users,
    isLoading,
    selectedIndex,
    setSelectedIndex,
    currentToken,
    query: debouncedQuery,
    handleKeyDown,
    handleBlur,
    insertMention,
    close,
    // For "no matches" display
    showNoMatches: isOpen && !isLoading && users.length === 0 && (debouncedQuery?.length ?? 0) >= 2,
  }
}
