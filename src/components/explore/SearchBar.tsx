/**
 * SearchBar Component
 * Search input with dropdown for live results and recent searches
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Icon } from '@/components/ui/icon'
import { useNavigate } from '@tanstack/react-router'
import { Input } from '@/components/ui/input'
import { SearchDropdown } from './SearchDropdown'
import { useSearch } from '@/hooks/useExploreQuery'
import { useHashtagSearch } from '@/hooks/useHashtagSearch'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { PRESET_CATEGORIES, normalizeCategoryKey, categoryToSlug } from '@/constants/categories'
import {
  getRecentSearches,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} from '@/lib/recentSearches'

interface SearchBarProps {
  placeholder?: string
  autoFocus?: boolean
  initialQuery?: string
  onQueryChange?: (query: string) => void
}

export function SearchBar({
  placeholder = 'Search',
  autoFocus = false,
  initialQuery = '',
  onQueryChange,
}: SearchBarProps) {
  const navigate = useNavigate()
  const { user: currentUser } = useCurrentUser()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // Fetch search results when debounced query changes
  const { data: searchResults, isLoading } = useSearch(
    debouncedQuery,
    'all',
    currentUser?.id
  )

  // Also search for hashtags
  const { data: hashtagResults, isLoading: isLoadingHashtags } = useHashtagSearch(
    debouncedQuery,
    debouncedQuery.length > 0
  )

  // Filter categories locally (they're a fixed preset list)
  const categoryResults = useMemo(() => {
    if (!debouncedQuery) return []
    const queryKey = normalizeCategoryKey(debouncedQuery)
    return PRESET_CATEGORIES.filter(cat =>
      normalizeCategoryKey(cat).includes(queryKey)
    ).slice(0, 3)
  }, [debouncedQuery])

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches())
  }, [])

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    onQueryChange?.(value)
    if (!isOpen) setIsOpen(true)
  }, [isOpen, onQueryChange])

  // Handle form submit (Enter key)
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed) {
      addRecentSearch(trimmed)
      setRecentSearches(getRecentSearches())
      setIsOpen(false)
      navigate({ to: '/search', search: { q: trimmed } })
    }
  }, [query, navigate])

  // Handle clear
  const handleClear = useCallback(() => {
    setQuery('')
    setDebouncedQuery('')
    onQueryChange?.('')
    inputRef.current?.focus()
  }, [onQueryChange])

  // Handle focus
  const handleFocus = useCallback(() => {
    setIsOpen(true)
    setRecentSearches(getRecentSearches())
  }, [])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle selecting a user from dropdown
  const handleSelectUser = useCallback((usernameSlug: string) => {
    setIsOpen(false)
    navigate({ to: '/profile/$slug', params: { slug: usernameSlug } })
  }, [navigate])

  // Handle selecting a hashtag from dropdown
  const handleSelectHashtag = useCallback((tagSlug: string) => {
    setIsOpen(false)
    navigate({ to: '/tag/$tagSlug', params: { tagSlug } })
  }, [navigate])

  // Handle selecting a category from dropdown
  const handleSelectCategory = useCallback((category: string) => {
    setIsOpen(false)
    navigate({ to: '/category/$categorySlug', params: { categorySlug: categoryToSlug(category) } })
  }, [navigate])

  // Handle selecting a recent search
  const handleSelectRecent = useCallback((searchQuery: string) => {
    setQuery(searchQuery)
    addRecentSearch(searchQuery)
    setRecentSearches(getRecentSearches())
    setIsOpen(false)
    navigate({ to: '/search', search: { q: searchQuery } })
  }, [navigate])

  // Handle removing a recent search
  const handleRemoveRecent = useCallback((searchQuery: string, e: React.MouseEvent) => {
    e.stopPropagation()
    removeRecentSearch(searchQuery)
    setRecentSearches(getRecentSearches())
  }, [])

  // Handle clearing all recent searches
  const handleClearAllRecent = useCallback(() => {
    clearRecentSearches()
    setRecentSearches([])
  }, [])

  // Handle "Go to @query" action
  const handleGoToQuery = useCallback(() => {
    const trimmed = query.trim().replace(/^@/, '')
    if (trimmed) {
      setIsOpen(false)
      navigate({ to: '/profile/$slug', params: { slug: trimmed } })
    }
  }, [query, navigate])

  // Handle "Go to #hashtag" action
  const handleGoToHashtag = useCallback(() => {
    const trimmed = query.trim().replace(/^#/, '').toLowerCase()
    if (trimmed) {
      setIsOpen(false)
      navigate({ to: '/tag/$tagSlug', params: { tagSlug: trimmed } })
    }
  }, [query, navigate])

  // Build flat list of actionable items for keyboard navigation
  const isSearchLoading = (isLoading || isLoadingHashtags) && debouncedQuery.length > 0
  const flatItems = useMemo(() => {
    const items: Array<{ action: () => void }> = []
    const hasQuery = query.trim().length > 0

    if (!hasQuery && recentSearches.length > 0) {
      recentSearches.forEach(search => {
        items.push({ action: () => handleSelectRecent(search) })
      })
    }

    if (hasQuery) {
      items.push({ action: () => handleSelectRecent(query.trim()) })
      if (!isSearchLoading) {
        categoryResults.forEach(cat => items.push({ action: () => handleSelectCategory(cat) }))
        ;(hashtagResults || []).slice(0, 3).forEach(tag => items.push({ action: () => handleSelectHashtag(tag.slug) }))
        ;(searchResults?.users || []).slice(0, 5).forEach(user => items.push({ action: () => handleSelectUser(user.usernameSlug) }))
      }
      items.push({ action: handleGoToHashtag })
      items.push({ action: handleGoToQuery })
    }

    return items
  }, [query, recentSearches, categoryResults, hashtagResults, searchResults, isSearchLoading, handleSelectRecent, handleSelectCategory, handleSelectHashtag, handleSelectUser, handleGoToHashtag, handleGoToQuery])

  // Reset activeIndex when items change or dropdown closes
  useEffect(() => {
    setActiveIndex(-1)
  }, [flatItems.length, isOpen])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(prev => (prev < flatItems.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(prev => (prev > 0 ? prev - 1 : flatItems.length - 1))
        break
      case 'Enter':
        if (activeIndex >= 0 && activeIndex < flatItems.length) {
          e.preventDefault()
          flatItems[activeIndex].action()
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setActiveIndex(-1)
        break
    }
  }, [isOpen, flatItems, activeIndex])

  return (
    <div ref={containerRef} className="relative">
      <form onSubmit={handleSubmit}>
        <div className="relative flex items-center">
          {/* Search icon */}
          <Icon name="magnifying-glass" variant="regular" className="absolute left-3 text-muted-foreground pointer-events-none z-10" />

          {/* Input */}
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="pl-10 pr-10 h-11 bg-muted/50 border border-border focus-visible:ring-1 focus-visible:ring-ring rounded-full"
            role="combobox"
            aria-label="Search"
            aria-expanded={isOpen}
            aria-controls="search-results"
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? `search-option-${activeIndex}` : undefined}
            autoComplete="off"
          />

          {/* Clear button - shown when query exists */}
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 p-1.5 text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none transition-colors"
              aria-label="Clear search"
            >
              <Icon name="circle-xmark" />
            </button>
          )}
        </div>
      </form>

      {/* Dropdown */}
      {isOpen && (
        <SearchDropdown
          query={query.trim()}
          recentSearches={recentSearches}
          users={searchResults?.users || []}
          hashtags={hashtagResults || []}
          categories={categoryResults}
          isLoading={isSearchLoading}
          activeIndex={activeIndex}
          onSelectUser={handleSelectUser}
          onSelectHashtag={handleSelectHashtag}
          onSelectCategory={handleSelectCategory}
          onSelectRecent={handleSelectRecent}
          onRemoveRecent={handleRemoveRecent}
          onClearAllRecent={handleClearAllRecent}
          onGoToQuery={handleGoToQuery}
          onGoToHashtag={handleGoToHashtag}
        />
      )}
    </div>
  )
}

export default SearchBar
