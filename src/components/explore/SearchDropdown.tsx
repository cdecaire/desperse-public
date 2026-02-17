/**
 * SearchDropdown Component
 * Dropdown showing recent searches and live search results
 */

interface SearchUser {
  id: string
  usernameSlug: string
  displayName: string | null
  avatarUrl: string | null
}

interface SearchHashtag {
  id: string
  slug: string
  display: string | null
  usageCount: number
}

interface SearchDropdownProps {
  query: string
  recentSearches: string[]
  users: SearchUser[]
  hashtags: SearchHashtag[]
  categories: string[]
  isLoading: boolean
  onSelectUser: (usernameSlug: string) => void
  onSelectHashtag: (tagSlug: string) => void
  onSelectCategory: (categorySlug: string) => void
  onSelectRecent: (query: string) => void
  onRemoveRecent: (query: string, e: React.MouseEvent) => void
  onClearAllRecent: () => void
  onGoToQuery: () => void
  onGoToHashtag: () => void
}

export function SearchDropdown({
  query,
  recentSearches,
  users,
  hashtags,
  categories,
  isLoading,
  onSelectUser,
  onSelectHashtag,
  onSelectCategory,
  onSelectRecent,
  onRemoveRecent,
  onClearAllRecent,
  onGoToQuery,
  onGoToHashtag,
}: SearchDropdownProps) {
  const hasQuery = query.length > 0
  const hasRecentSearches = recentSearches.length > 0
  const hasUserResults = users.length > 0
  const hasHashtagResults = hashtags.length > 0
  const hasCategoryResults = categories.length > 0
  const hasResults = hasUserResults || hasHashtagResults || hasCategoryResults

  // Don't show dropdown if no content to display
  if (!hasQuery && !hasRecentSearches) {
    return null
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-lg overflow-hidden z-50">
      {/* Recent searches section - only show when no query */}
      {!hasQuery && hasRecentSearches && (
        <div>
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
            <span className="text-sm font-semibold text-foreground">Recent</span>
            <button
              onClick={onClearAllRecent}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Clear all
            </button>
          </div>
          <div className="py-1">
            {recentSearches.map((search) => (
              <button
                key={search}
                onClick={() => onSelectRecent(search)}
                className="w-full flex items-center gap-3 px-4 py-2.5 mx-1 rounded-lg hover:bg-accent transition-colors text-left"
                style={{ width: 'calc(100% - 8px)' }}
              >
                <i className="fa-regular fa-clock text-muted-foreground w-5 text-center" aria-hidden="true" />
                <span className="flex-1 text-sm text-foreground truncate">{search}</span>
                <button
                  onClick={(e) => onRemoveRecent(search, e)}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Remove from recent"
                >
                  <i className="fa-solid fa-xmark text-xs" aria-hidden="true" />
                </button>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search suggestions - show when typing */}
      {hasQuery && (
        <>
          {/* Search for query option */}
          <button
            onClick={() => onSelectRecent(query)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left border-b border-border/50"
          >
            <i className="fa-regular fa-magnifying-glass text-muted-foreground w-5 text-center" aria-hidden="true" />
            <span className="text-sm text-foreground">
              Search for "<span className="font-semibold">{query}</span>"
            </span>
          </button>

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <i className="fa-solid fa-spinner-third fa-spin text-muted-foreground" aria-hidden="true" />
            </div>
          )}

          {/* Category results */}
          {!isLoading && hasCategoryResults && (
            <div className="py-1">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => onSelectCategory(category)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 mx-1 rounded-lg hover:bg-accent transition-colors text-left"
                  style={{ width: 'calc(100% - 8px)' }}
                >
                  {/* Category icon */}
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-folder text-muted-foreground" aria-hidden="true" />
                  </div>

                  {/* Category name */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {category}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      Category
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Hashtag results */}
          {!isLoading && hasHashtagResults && (
            <div className="py-1">
              {hashtags.slice(0, 3).map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => onSelectHashtag(tag.slug)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 mx-1 rounded-lg hover:bg-accent transition-colors text-left"
                  style={{ width: 'calc(100% - 8px)' }}
                >
                  {/* Hashtag icon */}
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-hashtag text-muted-foreground" aria-hidden="true" />
                  </div>

                  {/* Tag name and count */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">
                      #{tag.display || tag.slug}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {tag.usageCount > 0
                        ? tag.usageCount === 1 ? '1 post' : `${tag.usageCount.toLocaleString()} posts`
                        : 'Hashtag'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* User results */}
          {!isLoading && hasUserResults && (
            <div className="py-1">
              {users.slice(0, 5).map((user) => (
                <button
                  key={user.id}
                  onClick={() => onSelectUser(user.usernameSlug)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 mx-1 rounded-lg hover:bg-accent transition-colors text-left"
                  style={{ width: 'calc(100% - 8px)' }}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.displayName || user.usernameSlug}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <i className="fa-regular fa-user text-muted-foreground" aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  {/* Name and username */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {user.displayName || user.usernameSlug}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      @{user.usernameSlug}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {!isLoading && !hasResults && query.length >= 2 && (
            <div className="px-4 py-4 text-sm text-muted-foreground text-center">
              No results found
            </div>
          )}

          {/* Go to #hashtag option */}
          {query.length > 0 && (
            <button
              onClick={onGoToHashtag}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left border-t border-border/50"
            >
              <i className="fa-solid fa-hashtag text-muted-foreground w-5 text-center" aria-hidden="true" />
              <span className="text-sm text-primary">
                Go to #{query.replace(/^#/, '').toLowerCase()}
              </span>
            </button>
          )}

          {/* Go to @query option */}
          {query.length > 0 && (
            <button
              onClick={onGoToQuery}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left border-t border-border/50"
            >
              <i className="fa-regular fa-at text-muted-foreground w-5 text-center" aria-hidden="true" />
              <span className="text-sm text-primary">
                Go to @{query.replace(/^@/, '')}
              </span>
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default SearchDropdown
