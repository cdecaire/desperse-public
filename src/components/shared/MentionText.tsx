/**
 * MentionText Component
 * Renders text with @mentions as clickable profile links
 *
 * Features:
 * - Parses @username patterns in text
 * - Renders mentions as profile links
 * - Preserves whitespace and line breaks
 */

import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Fragment, useMemo } from 'react'

interface MentionTextProps {
  text: string
  className?: string
  linkClassName?: string
}

// Match @username patterns with valid preceding characters
// Username chars: [a-z0-9_.-] with max 32 chars
const MENTION_PATTERN = /(^|[\s\(\[\{\"\''])(@[a-z0-9_.-]{1,32})(?=$|[^a-z0-9_.-])/gi

interface TextPart {
  type: 'text' | 'mention'
  content: string
  usernameSlug?: string
}

function parseMentions(text: string): TextPart[] {
  if (!text) return []

  const parts: TextPart[] = []
  let lastIndex = 0

  // Reset regex for each call
  MENTION_PATTERN.lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = MENTION_PATTERN.exec(text)) !== null) {
    const precedingChar = match[1]
    const mention = match[2]
    const matchStart = match.index + precedingChar.length

    // Add text before this match (including the preceding character)
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      })
    }

    // Add the preceding character if any
    if (precedingChar) {
      parts.push({
        type: 'text',
        content: precedingChar,
      })
    }

    // Add the mention
    parts.push({
      type: 'mention',
      content: mention,
      usernameSlug: mention.slice(1).toLowerCase(), // Remove @ and lowercase
    })

    lastIndex = matchStart + mention.length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex),
    })
  }

  return parts
}

export function MentionText({ text, className, linkClassName }: MentionTextProps) {
  const parts = useMemo(() => parseMentions(text), [text])

  if (parts.length === 0) {
    return <span className={className}>{text}</span>
  }

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === 'mention' && part.usernameSlug) {
          return (
            <Link
              key={index}
              to="/profile/$slug"
              params={{ slug: part.usernameSlug }}
              className={cn(
                'text-primary hover:underline font-medium',
                linkClassName
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {part.content}
            </Link>
          )
        }
        return <Fragment key={index}>{part.content}</Fragment>
      })}
    </span>
  )
}
