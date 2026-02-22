/**
 * Retry utilities with exponential backoff
 * Used for network/RPC calls that may fail transiently
 */

export interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
  shouldRetry?: (error: unknown) => boolean
}

const DEFAULT_MAX_RETRIES = 3
const DEFAULT_BASE_DELAY_MS = 1000 // 1 second

/**
 * Check if an error is retryable (network/RPC errors)
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const errorMsg = error.message.toLowerCase()
    
    // Network errors
    if (
      errorMsg.includes('network') ||
      errorMsg.includes('connection') ||
      errorMsg.includes('fetch') ||
      errorMsg.includes('timeout') ||
      errorMsg.includes('econnrefused') ||
      errorMsg.includes('enotfound') ||
      errorMsg.includes('econnreset')
    ) {
      return true
    }
    
    // RPC errors
    if (
      errorMsg.includes('rpc') ||
      errorMsg.includes('503') ||
      errorMsg.includes('502') ||
      errorMsg.includes('504') ||
      errorMsg.includes('500')
    ) {
      return true
    }

    // Solana-specific transient errors
    if (
      errorMsg.includes('blockhash not found') ||
      errorMsg.includes('block height exceeded') ||
      errorMsg.includes('transaction was not confirmed')
    ) {
      return true
    }
  }
  
  // Check for HTTP status codes in response objects
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>
    const status = errorObj.status || errorObj.statusCode
    
    if (typeof status === 'number') {
      // Retry on 5xx errors and some 4xx errors that might be transient
      if (status >= 500 || status === 408 || status === 429) {
        return true
      }
    }
  }
  
  return false
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retry a function with exponential backoff
 * 
 * @param fn - The function to retry (should return a Promise)
 * @param options - Retry configuration
 * @returns The result of the function call
 * @throws The last error if all retries fail
 * 
 * @example
 * ```ts
 * const result = await retryWithBackoff(
 *   () => fetch('/api/data'),
 *   { maxRetries: 3, baseDelayMs: 1000 }
 * )
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    shouldRetry = isRetryableError,
  } = options

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry if:
      // - We've exhausted all retries
      // - The error is not retryable
      if (attempt >= maxRetries || !shouldRetry(error)) {
        throw error
      }

      // Calculate delay: baseDelay * 2^attempt
      // Attempt 0: 1s, Attempt 1: 2s, Attempt 2: 4s
      const delayMs = baseDelayMs * Math.pow(2, attempt)
      
      console.log(
        `Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms delay`,
        error instanceof Error ? error.message : String(error)
      )

      // Wait before retrying
      await sleep(delayMs)
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError
}

/**
 * Create a retry function with pre-configured options
 * Useful for creating retry wrappers for specific use cases
 */
export function createRetryFunction<T>(
  options: RetryOptions = {}
): (fn: () => Promise<T>) => Promise<T> {
  return (fn: () => Promise<T>) => retryWithBackoff(fn, options)
}

