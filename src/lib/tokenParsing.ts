/**
 * Shared token parsing utilities for @mentions and #hashtags
 * Used by both backend (server functions) and frontend (components)
 *
 * IMPORTANT: Keep regex patterns identical across all usages.
 * Any changes here must be reflected in:
 * - Backend: src/server/functions/mentions.ts, hashtags.ts
 * - Frontend: src/components/shared/TokenText.tsx, TokenAutocomplete.tsx
 */

// =============================================================================
// MENTION PARSING
// =============================================================================

/**
 * Regex for parsing @mentions
 * - Matches @username where username is 1-32 chars of [a-z0-9_.-]
 * - Must be preceded by line start or non-username character
 * - Must be followed by line end or non-username character
 *
 * Character set matches usernameSlug validation rules
 */
export const MENTION_REGEX = /(^|[^a-z0-9_.-])@([a-z0-9_.-]{1,32})(?=$|[^a-z0-9_.-])/gi;

/**
 * Parse @mentions from text content
 * Returns unique lowercase usernameSlugs found in the text
 */
export function parseMentions(text: string): string[] {
  if (!text) return [];

  const matches: string[] = [];
  let match: RegExpExecArray | null;

  // Reset regex lastIndex for multiple calls
  MENTION_REGEX.lastIndex = 0;

  while ((match = MENTION_REGEX.exec(text)) !== null) {
    // Group 2 is the username (without the @ and without the preceding character)
    const username = match[2].toLowerCase();
    if (!matches.includes(username)) {
      matches.push(username);
    }
  }

  return matches;
}

// =============================================================================
// HASHTAG PARSING
// =============================================================================

/**
 * Maximum length for a hashtag (excluding the # symbol)
 */
export const HASHTAG_MAX_LENGTH = 32;

/**
 * Maximum number of hashtags allowed per text (caption/comment)
 */
export const HASHTAG_MAX_COUNT = 10;

/**
 * Regex for parsing #hashtags
 * - Matches #tag where tag is 1-32 chars of [a-z0-9_]
 * - Must be preceded by line start or non-tag character
 * - Must be followed by line end or non-tag character
 *
 * Character set: lowercase letters, numbers, underscore only
 * No dots, hyphens, or other characters allowed
 */
export const HASHTAG_REGEX = /(^|[^a-z0-9_])#([a-z0-9_]{1,32})(?=$|[^a-z0-9_])/gi;

/**
 * Parse #hashtags from text content
 * Returns unique lowercase tag slugs found in the text (max HASHTAG_MAX_COUNT)
 */
export function parseHashtags(text: string): string[] {
  if (!text) return [];

  const matches: string[] = [];
  let match: RegExpExecArray | null;

  // Reset regex lastIndex for multiple calls
  HASHTAG_REGEX.lastIndex = 0;

  while ((match = HASHTAG_REGEX.exec(text)) !== null) {
    // Group 2 is the tag (without the # and without the preceding character)
    const tag = match[2].toLowerCase();
    if (!matches.includes(tag)) {
      matches.push(tag);
      // Enforce max count
      if (matches.length >= HASHTAG_MAX_COUNT) {
        break;
      }
    }
  }

  return matches;
}

// =============================================================================
// COMBINED TOKEN PARSING (for rendering)
// =============================================================================

export type TokenType = 'text' | 'mention' | 'hashtag';

export interface ParsedToken {
  type: TokenType;
  value: string;
  /** For mentions: the username slug. For hashtags: the tag slug */
  slug?: string;
}

/**
 * Parse text into tokens for rendering
 * Returns an array of text, mention, and hashtag tokens in order
 */
export function parseTokens(text: string): ParsedToken[] {
  if (!text) return [];

  const tokens: ParsedToken[] = [];

  // Combined regex to match both mentions and hashtags
  // We need to capture both types and their positions
  const combinedRegex = /(^|[^a-z0-9_.-])(@[a-z0-9_.-]{1,32})(?=$|[^a-z0-9_.-])|(^|[^a-z0-9_])(#[a-z0-9_]{1,32})(?=$|[^a-z0-9_])/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  combinedRegex.lastIndex = 0;

  while ((match = combinedRegex.exec(text)) !== null) {
    // Determine if this is a mention or hashtag match
    const isMention = match[2] !== undefined;
    const prefix = isMention ? match[1] : match[3];
    const token = isMention ? match[2] : match[4];

    if (!token) continue;

    // The actual match starts after the prefix character
    const matchStart = match.index + (prefix?.length || 0);

    // Add any text before this token
    if (matchStart > lastIndex) {
      tokens.push({
        type: 'text',
        value: text.slice(lastIndex, matchStart),
      });
    }

    // Add the token
    if (isMention) {
      tokens.push({
        type: 'mention',
        value: token, // includes the @
        slug: token.slice(1).toLowerCase(), // remove @ and lowercase
      });
    } else {
      tokens.push({
        type: 'hashtag',
        value: token, // includes the #
        slug: token.slice(1).toLowerCase(), // remove # and lowercase
      });
    }

    lastIndex = matchStart + token.length;
  }

  // Add any remaining text
  if (lastIndex < text.length) {
    tokens.push({
      type: 'text',
      value: text.slice(lastIndex),
    });
  }

  return tokens;
}
