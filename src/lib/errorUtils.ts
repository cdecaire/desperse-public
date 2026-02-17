/**
 * Error parsing utilities for consistent error handling across the app
 */

export interface ParsedError {
  message: string
  isRateLimit: boolean
  minutesUntilReset?: number
  isNetworkError: boolean
  isAuthError: boolean
}

/**
 * Parse application errors to extract user-friendly messages and metadata
 */
export function parseAppError(error: unknown): ParsedError {
  const defaultMessage = 'Something went wrong. Please try again.'
  
  // Handle Error objects
  if (error instanceof Error) {
    const errorMsg = error.message.toLowerCase()
    
    // Rate limit detection
    const rateLimitMatch = errorMsg.match(/try again in (\d+) minutes?/i)
    if (rateLimitMatch) {
      const minutes = parseInt(rateLimitMatch[1], 10)
      return {
        message: error.message, // Keep original message which should have "try again in X minutes"
        isRateLimit: true,
        minutesUntilReset: minutes,
        isNetworkError: false,
        isAuthError: false,
      }
    }
    
    // Check for rate limit keywords
    if (
      errorMsg.includes('rate limit') ||
      errorMsg.includes('too many') ||
      errorMsg.includes('too often') ||
      errorMsg.includes('rate limited')
    ) {
      // Try to extract minutes from various formats
      const minutesMatch = errorMsg.match(/(\d+)\s*(?:minutes?|mins?)/i)
      const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : undefined
      
      return {
        message: error.message || 'You\'re doing that too often. Please try again later.',
        isRateLimit: true,
        minutesUntilReset: minutes,
        isNetworkError: false,
        isAuthError: false,
      }
    }
    
    // Network errors
    if (
      errorMsg.includes('network') ||
      errorMsg.includes('connection') ||
      errorMsg.includes('fetch') ||
      errorMsg.includes('rpc') ||
      errorMsg.includes('timeout')
    ) {
      return {
        message: 'Network error. Please check your connection and try again.',
        isRateLimit: false,
        isNetworkError: true,
        isAuthError: false,
      }
    }
    
    // Auth errors
    if (
      errorMsg.includes('unauthorized') ||
      errorMsg.includes('authentication') ||
      errorMsg.includes('not authenticated')
    ) {
      return {
        message: 'Please sign in to continue.',
        isRateLimit: false,
        isNetworkError: false,
        isAuthError: true,
      }
    }
    
    // Return the error message if it's user-friendly, otherwise use default
    return {
      message: error.message || defaultMessage,
      isRateLimit: false,
      isNetworkError: false,
      isAuthError: false,
    }
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return parseAppError(new Error(error))
  }
  
  // Handle objects with error properties (common in API responses)
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>
    
    // Check for error.message
    if (errorObj.message && typeof errorObj.message === 'string') {
      return parseAppError(new Error(errorObj.message))
    }
    
    // Check for error.error
    if (errorObj.error && typeof errorObj.error === 'string') {
      return parseAppError(new Error(errorObj.error))
    }
  }
  
  // Fallback
  return {
    message: defaultMessage,
    isRateLimit: false,
    isNetworkError: false,
    isAuthError: false,
  }
}

/**
 * Format rate limit message with time remaining
 */
export function formatRateLimitMessage(minutes?: number): string {
  if (minutes !== undefined && minutes > 0) {
    return `You're doing that too often. Try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`
  }
  return "You're doing that too often. Please try again later."
}

