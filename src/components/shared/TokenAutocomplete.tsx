/**
 * TokenAutocomplete Component
 * A textarea with @mention and #hashtag autocomplete functionality
 *
 * Features:
 * - Detects @mentions and #hashtags while typing
 * - Shows popover with suggestions
 * - Keyboard navigation (up/down/enter/escape)
 * - Inserts selected token with trailing space
 */

import { useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react'
import { Icon } from '@/components/ui/icon'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  useTokenAutocomplete,
  type AutocompleteItem,
  type TokenType,
} from '@/hooks/useTokenAutocomplete'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { MentionUser } from '@/hooks/useMentionSearch'
import type { HashtagTag } from '@/hooks/useHashtagSearch'

interface TokenAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
  className?: string
  disabled?: boolean
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  /** Which tokens to support - defaults to both mentions and hashtags */
  enabledTokens?: TokenType[]
}

export interface TokenAutocompleteRef {
  focus: () => void
  blur: () => void
}

export const TokenAutocomplete = forwardRef<TokenAutocompleteRef, TokenAutocompleteProps>(
  function TokenAutocomplete(
    {
      value,
      onChange,
      placeholder,
      maxLength,
      className,
      disabled,
      onKeyDown,
      enabledTokens = ['mention', 'hashtag'],
    },
    ref
  ) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [selectionStart, setSelectionStart] = useState<number | null>(null)

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      blur: () => textareaRef.current?.blur(),
    }))

    // Handle cursor position changes
    const handleSelectionChange = useCallback(() => {
      if (textareaRef.current) {
        setSelectionStart(textareaRef.current.selectionStart)
      }
    }, [])

    // Set cursor position after token insertion
    const handleSelectionUpdate = useCallback((position: number) => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = position
        textareaRef.current.selectionEnd = position
        setSelectionStart(position)
      }
    }, [])

    const {
      isOpen,
      items,
      isLoading,
      selectedIndex,
      setSelectedIndex,
      activeTokenType,
      handleKeyDown: handleTokenKeyDown,
      handleBlur,
      insertItem,
      showNoMatches,
    } = useTokenAutocomplete({
      value,
      selectionStart,
      onValueChange: onChange,
      onSelectionChange: handleSelectionUpdate,
      enabledTokens,
    })

    // Combined keydown handler
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Let token autocomplete handle its keys first
      if (handleTokenKeyDown(e)) {
        return
      }
      // Pass through to parent handler if not consumed
      onKeyDown?.(e)
    }

    // Handle input changes
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value)
      // Update selection after value change
      setTimeout(handleSelectionChange, 0)
    }

    return (
      <div ref={containerRef} className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onSelect={handleSelectionChange}
          onClick={handleSelectionChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          maxLength={maxLength ? maxLength + 10 : undefined}
          disabled={disabled}
          className={className}
        />

        {/* Autocomplete Popover */}
        {isOpen && (
          <div
            className={cn(
              'absolute left-0 right-0 bottom-full mb-1 z-50',
              'bg-popover border border-border rounded-lg shadow-lg',
              'max-h-[200px] overflow-y-auto'
            )}
          >
            {isLoading && (
              <div className="flex items-center justify-center py-3">
                <LoadingSpinner size="sm" />
              </div>
            )}

            {!isLoading && showNoMatches && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {activeTokenType === 'mention' ? 'No users found' : 'No tags found'}
              </div>
            )}

            {!isLoading && items.length > 0 && (
              <ul className="py-1">
                {items.map((item, index) => (
                  <AutocompleteItemComponent
                    key={item.type === 'mention' ? item.user.id : item.tag.id}
                    item={item}
                    isSelected={index === selectedIndex}
                    onSelect={() => insertItem(item)}
                    onHover={() => setSelectedIndex(index)}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    )
  }
)

interface AutocompleteItemComponentProps {
  item: AutocompleteItem
  isSelected: boolean
  onSelect: () => void
  onHover: () => void
}

function AutocompleteItemComponent({
  item,
  isSelected,
  onSelect,
  onHover,
}: AutocompleteItemComponentProps) {
  if (item.type === 'mention') {
    return (
      <MentionUserItem
        user={item.user}
        isSelected={isSelected}
        onSelect={onSelect}
        onHover={onHover}
      />
    )
  }

  return (
    <HashtagItem
      tag={item.tag}
      isSelected={isSelected}
      onSelect={onSelect}
      onHover={onHover}
    />
  )
}

interface MentionUserItemProps {
  user: MentionUser
  isSelected: boolean
  onSelect: () => void
  onHover: () => void
}

function MentionUserItem({ user, isSelected, onSelect, onHover }: MentionUserItemProps) {
  const displayName = user.displayName || user.usernameSlug

  return (
    <li
      className={cn(
        'flex items-center gap-2 px-3 py-2 cursor-pointer',
        'hover:bg-accent transition-colors',
        isSelected && 'bg-accent'
      )}
      onMouseEnter={onHover}
      onMouseDown={(e) => {
        // Prevent blur before selection
        e.preventDefault()
        onSelect()
      }}
    >
      <div className="w-8 h-8 rounded-full overflow-hidden bg-muted shrink-0">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon name="user" variant="regular" className="text-xs text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{displayName}</div>
        <div className="text-xs text-muted-foreground truncate">@{user.usernameSlug}</div>
      </div>
    </li>
  )
}

interface HashtagItemProps {
  tag: HashtagTag
  isSelected: boolean
  onSelect: () => void
  onHover: () => void
}

function HashtagItem({ tag, isSelected, onSelect, onHover }: HashtagItemProps) {
  return (
    <li
      className={cn(
        'flex items-center gap-2 px-3 py-2 cursor-pointer',
        'hover:bg-accent transition-colors',
        isSelected && 'bg-accent'
      )}
      onMouseEnter={onHover}
      onMouseDown={(e) => {
        // Prevent blur before selection
        e.preventDefault()
        onSelect()
      }}
    >
      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
        <Icon name="hashtag" className="text-sm text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">#{tag.slug}</div>
        <div className="text-xs text-muted-foreground truncate">
          {tag.usageCount === 1 ? '1 post' : `${tag.usageCount.toLocaleString()} posts`}
        </div>
      </div>
    </li>
  )
}
