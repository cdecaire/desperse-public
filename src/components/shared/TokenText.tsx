/**
 * TokenText Component
 * Renders text with @mentions and #hashtags as clickable links
 *
 * Features:
 * - Parses @username patterns as profile links
 * - Parses #hashtag patterns as tag links
 * - Preserves whitespace and line breaks
 * - Uses shared parsing logic with backend
 */

import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Fragment, useMemo } from 'react'
import { parseTokens } from '@/lib/tokenParsing'

interface TokenTextProps {
  text: string
  className?: string
  mentionClassName?: string
  hashtagClassName?: string
}

export function TokenText({
  text,
  className,
  mentionClassName,
  hashtagClassName,
}: TokenTextProps) {
  const tokens = useMemo(() => parseTokens(text), [text])

  if (tokens.length === 0) {
    return <span className={className}>{text}</span>
  }

  return (
    <span className={className}>
      {tokens.map((token, index) => {
        if (token.type === 'mention' && token.slug) {
          return (
            <Link
              key={index}
              to="/profile/$slug"
              params={{ slug: token.slug }}
              className={cn(
                'text-primary hover:underline font-medium',
                mentionClassName
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {token.value}
            </Link>
          )
        }

        if (token.type === 'hashtag' && token.slug) {
          return (
            <Link
              key={index}
              to="/tag/$tagSlug"
              params={{ tagSlug: token.slug }}
              className={cn(
                'text-primary hover:underline font-medium',
                hashtagClassName
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {token.value}
            </Link>
          )
        }

        return <Fragment key={index}>{token.value}</Fragment>
      })}
    </span>
  )
}
