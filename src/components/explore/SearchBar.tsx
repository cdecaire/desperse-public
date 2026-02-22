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
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="pl-10 pr-10 h-11 bg-muted/50 border border-border focus-visible:ring-1 focus-visible:ring-ring rounded-full"
            aria-label="Search"
            autoComplete="off"
          />

          {/* Clear button - shown when query exists */}
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 p-1 text-muted-foreground hover:text-foreground transition-colors"
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
          isLoading={(isLoading || isLoadingHashtags) && debouncedQuery.length > 0}
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
