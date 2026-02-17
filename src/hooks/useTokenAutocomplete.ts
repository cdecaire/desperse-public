/**
 * Hook for managing token autocomplete state and behavior
 * Supports both @mentions and #hashtags
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useMentionSearch, type MentionUser } from './useMentionSearch'
import { useHashtagSearch, type HashtagTag } from './useHashtagSearch'

// Characters allowed in username slugs (mentions)
const USERNAME_CHARS = /^[a-z0-9_.-]$/i

// Characters allowed in hashtag slugs
const HASHTAG_CHARS = /^[a-z0-9_]$/i

// Characters that precede a valid @ trigger
const MENTION_PRECEDING_CHARS = /^[\s\(\[\{\"\'']$/

// Characters that precede a valid # trigger
const HASHTAG_PRECEDING_CHARS = /^[\s\(\[\{\"\'']$/

export type TokenType = 'mention' | 'hashtag'

interface Token {
  type: TokenType
  start: number // Position of @ or # in the text
  query: string // Characters after @ or # (the search query)
}

export type AutocompleteItem =
  | { type: 'mention'; user: MentionUser }
  | { type: 'hashtag'; tag: HashtagTag }

interface UseTokenAutocompleteOptions {
  value: string
  selectionStart: number | null
  onValueChange: (value: string) => void
  onSelectionChange?: (position: number) => void
  /** Which tokens to support - defaults to both */
  enabledTokens?: TokenType[]
}

export function useTokenAutocomplete({
  value,
  selectionStart,
  onValueChange,
  onSelectionChange,
  enabledTokens = ['mention', 'hashtag'],
}: UseTokenAutocompleteOptions) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [debouncedQuery, setDebouncedQuery] = useState<string | undefined>(undefined)
  const [activeTokenType, setActiveTokenType] = useState<TokenType | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mentionEnabled = enabledTokens.includes('mention')
  const hashtagEnabled = enabledTokens.includes('hashtag')

  // Detect the current token at cursor position
  const detectToken = useCallback((): Token | null => {
    if (selectionStart === null || selectionStart === undefined) return null

    // Scan backward from cursor to find @ or #
    let tokenStart = -1
    let tokenType: TokenType | null = null
    let query = ''

    for (let i = selectionStart - 1; i >= 0; i--) {
      const char = value[i]

      // Found @
      if (char === '@' && mentionEnabled) {
        // Check if @ is in a valid position
        const precedingChar = i > 0 ? value[i - 1] : null

        if (i === 0 || (precedingChar && MENTION_PRECEDING_CHARS.test(precedingChar))) {
          tokenStart = i
          tokenType = 'mention'
          query = value.slice(i + 1, selectionStart).toLowerCase()
          break
        } else {
          return null
        }
      }

      // Found #
      if (char === '#' && hashtagEnabled) {
        // Check if # is in a valid position
        const precedingChar = i > 0 ? value[i - 1] : null

        if (i === 0 || (precedingChar && HASHTAG_PRECEDING_CHARS.test(precedingChar))) {
          tokenStart = i
          tokenType = 'hashtag'
          query = value.slice(i + 1, selectionStart).toLowerCase()
          break
        } else {
          return null
        }
      }

      // Check if character is valid for the token we might be building
      // For mentions: [a-z0-9_.-]
      // For hashtags: [a-z0-9_]
      const isValidMentionChar = USERNAME_CHARS.test(char)
      const isValidHashtagChar = HASHTAG_CHARS.test(char)

      // If neither valid, no token at cursor
      if (!isValidMentionChar && !isValidHashtagChar) {
        return null
      }
    }

    if (tokenStart === -1 || !tokenType) return null

    // Validate query length (max 32 chars)
    if (query.length > 32) return null

    return { type: tokenType, start: tokenStart, query }
  }, [value, selectionStart, mentionEnabled, hashtagEnabled])

  const currentToken = detectToken()

  // Update debounced query when token changes
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (currentToken) {
      // Open immediately when trigger is typed, debounce query updates
      if (!isOpen) {
        setIsOpen(true)
        setSelectedIndex(0)
        setDebouncedQuery(currentToken.query || undefined)
        setActiveTokenType(currentToken.type)
      } else {
        debounceTimerRef.current = setTimeout(() => {
          setDebouncedQuery(currentToken.query || undefined)
          setActiveTokenType(currentToken.type)
        }, 150) // 150ms debounce for query changes
      }
    } else {
      setIsOpen(false)
      setDebouncedQuery(undefined)
      setActiveTokenType(null)
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [currentToken?.start, currentToken?.query, currentToken?.type, isOpen])

  // Search users (only enabled when mention token is active)
  const {
    data: users = [],
    isLoading: isLoadingUsers,
  } = useMentionSearch(
    activeTokenType === 'mention' ? debouncedQuery : undefined,
    isOpen && activeTokenType === 'mention'
  )

  // Search tags (only enabled when hashtag token is active)
  const {
    data: tags = [],
    isLoading: isLoadingTags,
  } = useHashtagSearch(
    activeTokenType === 'hashtag' ? debouncedQuery : undefined,
    isOpen && activeTokenType === 'hashtag'
  )

  // Combined items list
  const items: AutocompleteItem[] =
    activeTokenType === 'mention'
      ? users.map((user) => ({ type: 'mention' as const, user }))
      : activeTokenType === 'hashtag'
      ? tags.map((tag) => ({ type: 'hashtag' as const, tag }))
      : []

  const isLoading =
    activeTokenType === 'mention' ? isLoadingUsers : isLoadingTags

  // Reset selected index when items change
  useEffect(() => {
    setSelectedIndex(0)
  }, [items.length])

  // Insert a mention at the current token position
  const insertMention = useCallback(
    (user: MentionUser) => {
      if (!currentToken || currentToken.type !== 'mention') return

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

  // Insert a hashtag at the current token position
  const insertHashtag = useCallback(
    (tag: HashtagTag) => {
      if (!currentToken || currentToken.type !== 'hashtag') return

      const before = value.slice(0, currentToken.start)
      const after = value.slice(selectionStart ?? currentToken.start + currentToken.query.length + 1)

      // Insert #tag with trailing space
      const hashtag = `#${tag.slug} `
      const newValue = before + hashtag + after
      const newCursorPosition = before.length + hashtag.length

      onValueChange(newValue)
      onSelectionChange?.(newCursorPosition)
      setIsOpen(false)
    },
    [currentToken, value, selectionStart, onValueChange, onSelectionChange]
  )

  // Insert an item (user or tag)
  const insertItem = useCallback(
    (item: AutocompleteItem) => {
      if (item.type === 'mention') {
        insertMention(item.user)
      } else {
        insertHashtag(item.tag)
      }
    },
    [insertMention, insertHashtag]
  )

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): boolean => {
      if (!isOpen || items.length === 0) return false

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % items.length)
          return true

        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + items.length) % items.length)
          return true

        case 'Enter':
        case 'Tab':
          e.preventDefault()
          const selectedItem = items[selectedIndex]
          if (selectedItem) {
            insertItem(selectedItem)
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
    [isOpen, items, selectedIndex, insertItem]
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
    items,
    isLoading,
    selectedIndex,
    setSelectedIndex,
    currentToken,
    activeTokenType,
    query: debouncedQuery,
    handleKeyDown,
    handleBlur,
    insertItem,
    insertMention,
    insertHashtag,
    close,
    // For "no matches" display
    showNoMatches: isOpen && !isLoading && items.length === 0 && (debouncedQuery?.length ?? 0) >= 1,
  }
}
