/**
 * MessageInput Component
 * Text input with send button for composing messages
 */

import { useState, useRef, useCallback, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui/icon'

interface MessageInputProps {
  onSend: (content: string) => void
  disabled?: boolean
  placeholder?: string
  isLoading?: boolean
}

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
  isLoading = false,
}: MessageInputProps) {
  const [content, setContent] = useState('')
  const [isMultiline, setIsMultiline] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = content.trim()
    if (!trimmed || disabled || isLoading) return

    onSend(trimmed)
    setContent('')
    setIsMultiline(false)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [content, disabled, isLoading, onSend])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Auto-resize textarea
    textarea.style.height = 'auto'
    const newHeight = Math.min(textarea.scrollHeight, 120)
    textarea.style.height = `${newHeight}px`
    setIsMultiline(newHeight > 44)
  }, [])

  const canSend = content.trim().length > 0 && !disabled && !isLoading

  return (
    <div className="flex items-center gap-2 p-3 border-t bg-background">
      <div className="relative flex-1">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          maxLength={2000}
          rows={1}
          className={cn(
            'min-h-[36px] max-h-[120px] px-4 py-2 resize-none',
            'bg-transparent',
            isMultiline ? 'rounded-2xl' : 'rounded-full',
            'text-base md:text-sm leading-snug',
            'focus:ring-offset-2'
          )}
        />
      </div>
      <Button
        type="button"
        size="icon"
        onClick={handleSend}
        disabled={!canSend}
        aria-label="Send message"
        className="rounded-full flex-shrink-0"
      >
        {isLoading ? (
          <Icon name="spinner" spin className="text-sm" />
        ) : (
          <Icon name="paper-plane" variant="regular" className="text-sm -translate-x-px translate-y-px" />
        )}
      </Button>
    </div>
  )
}
