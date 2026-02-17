/**
 * MentionAutocomplete Component
 * A textarea with @mention autocomplete functionality
 *
 * Features:
 * - Detects @mentions while typing
 * - Shows popover with user suggestions
 * - Keyboard navigation (up/down/enter/escape)
 * - Inserts selected user's usernameSlug
 */

import { useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useMentionAutocomplete } from '@/hooks/useMentionAutocomplete'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { MentionUser } from '@/hooks/useMentionSearch'

interface MentionAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
  className?: string
  disabled?: boolean
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

export interface MentionAutocompleteRef {
  focus: () => void
  blur: () => void
}

export const MentionAutocomplete = forwardRef<MentionAutocompleteRef, MentionAutocompleteProps>(
  function MentionAutocomplete(
    { value, onChange, placeholder, maxLength, className, disabled, onKeyDown },
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

    // Set cursor position after mention insertion
    const handleSelectionUpdate = useCallback((position: number) => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = position
        textareaRef.current.selectionEnd = position
        setSelectionStart(position)
      }
    }, [])

    const {
      isOpen,
      users,
      isLoading,
      selectedIndex,
      setSelectedIndex,
      handleKeyDown: handleMentionKeyDown,
      handleBlur,
      insertMention,
      showNoMatches,
    } = useMentionAutocomplete({
      value,
      selectionStart,
      onValueChange: onChange,
      onSelectionChange: handleSelectionUpdate,
    })

    // Combined keydown handler
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Let mention autocomplete handle its keys first
      if (handleMentionKeyDown(e)) {
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
                No users found
              </div>
            )}

            {!isLoading && users.length > 0 && (
              <ul className="py-1">
                {users.map((user, index) => (
                  <MentionUserItem
                    key={user.id}
                    user={user}
                    isSelected={index === selectedIndex}
                    onSelect={() => insertMention(user)}
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
            <i className="fa-regular fa-user text-xs text-muted-foreground" />
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
