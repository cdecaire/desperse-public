/**
 * Server-side Privy authentication helpers
 * Provides withAuth wrapper for verifying Privy access tokens
 * 
 * IMPORTANT: _authorization tokens are highly sensitive.
 * - Never log _authorization values
 * - Never include _authorization in error payloads
 * - Always use redactSensitiveFields() before logging input data
 */

import { PrivyClient } from '@privy-io/server-auth'
import { env } from '@/config/env'
import { db } from '@/server/db'
import { users } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import { z, type ZodSchema } from 'zod'

export interface AuthenticatedUser {
  privyId: string
  userId: string // Our internal user ID from database
  email?: string
  walletAddress?: string
}

// ============================================================================
// Token Redaction Utilities
// ============================================================================

/**
 * Fields that should never be logged or included in error payloads
 */
const SENSITIVE_FIELDS = ['_authorization', 'authorization', 'token', 'accessToken', 'password', 'secret']

/**
 * Redact sensitive fields from an object before logging or error reporting
 * Returns a new object with sensitive fields replaced with '[REDACTED]'
 */
export function redactSensitiveFields<T extends Record<string, unknown>>(input: T): T {
  if (!input || typeof input !== 'object') {
    return input
  }

  const redacted = { ...input }
  for (const field of SENSITIVE_FIELDS) {
    if (field in redacted) {
      (redacted as Record<string, unknown>)[field] = '[REDACTED]'
    }
  }
  return redacted
}

/**
 * Strip _authorization from input data (for passing to schema parsing)
 * Returns a new object without the _authorization field
 */
export function stripAuthorization<T extends Record<string, unknown>>(
  input: T
): Omit<T, '_authorization'> {
  if (!input || typeof input !== 'object') {
    return input
  }
  const { _authorization, ...rest } = input
  return rest as Omit<T, '_authorization'>
}

/**
 * Extract _authorization from input data
 */
export function extractAuthorizationFromPayload(
  input: unknown
): string | undefined {
  if (!input || typeof input !== 'object') {
    return undefined
  }
  return (input as Record<string, unknown>)._authorization as string | undefined
}

/**
 * Initialize Privy server client
 */
let privyClient: PrivyClient | null = null

export function getPrivyClient(): PrivyClient {
  if (!privyClient) {
    if (!env.PRIVY_APP_SECRET) {
      throw new Error('PRIVY_APP_SECRET is required for server-side authentication')
    }
    privyClient = new PrivyClient(env.PRIVY_APP_ID, env.PRIVY_APP_SECRET)
  }
  return privyClient
}

/**
 * Extract access token from request headers
 * Looks for Authorization: Bearer <token> header
 */
export function extractAccessToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7) // Remove 'Bearer ' prefix
}

/**
 * Verify Privy access token and get user info
 */
export async function verifyPrivyToken(accessToken: string): Promise<any> {
  try {
    const privyClient = getPrivyClient()
    const verifiedClaims = await privyClient.verifyAuthToken(accessToken)
    return verifiedClaims
  } catch (error) {
    console.error('Privy token verification failed:', error)
    throw new Error('Invalid or expired authentication token')
  }
}

/**
 * Get authenticated user from database using verified Privy ID
 */
export async function getAuthenticatedUser(privyId: string): Promise<AuthenticatedUser | null> {
  try {
    const [user] = await db
      .select({
        id: users.id,
        privyId: users.privyId,
        walletAddress: users.walletAddress,
      })
      .from(users)
      .where(eq(users.privyId, privyId))
      .limit(1)

    if (!user) {
      return null
    }

    return {
      privyId: user.privyId,
      userId: user.id,
      walletAddress: user.walletAddress || undefined,
    }
  } catch (error) {
    console.error('Error fetching authenticated user:', error)
    return null
  }
}

/**
 * Authenticate with a token passed directly (for TanStack Start server functions)
 * Token can be in "Bearer xxx" format or just the token itself
 */
export async function authenticateWithToken(authorizationOrToken: string | null | undefined): Promise<AuthenticatedUser | null> {
  if (!authorizationOrToken) {
    return null
  }

  // Extract token from Bearer format if needed
  let accessToken = authorizationOrToken
  if (authorizationOrToken.startsWith('Bearer ')) {
    accessToken = authorizationOrToken.substring(7)
  }

  // Fast path: check if this is a SIWS session token (prefixed with "siws_")
  if (accessToken.startsWith('siws_')) {
    try {
      const { authenticateWithSiwsToken } = await import('@/server/utils/siws')
      return await authenticateWithSiwsToken(accessToken)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'SIWS token verification failed'
      console.warn(`[AUTH] SIWS fallback failed: ${message}`)
      return null
    }
  }

  // Primary path: Privy token verification
  try {
    const verifiedClaims = await verifyPrivyToken(accessToken)
    const user = await getAuthenticatedUser(verifiedClaims.userId)

    if (!user) {
      console.warn(`[AUTH] User ${verifiedClaims.userId} not found in database`)
      return null
    }

    return user
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token verification failed'
    console.warn(`[AUTH] Privy verification failed: ${message}`)
    return null
  }
}

// ============================================================================
// Centralized Auth Handler Wrapper
// ============================================================================

/**
 * Result type for withAuth wrapper
 */
export interface WithAuthResult<TInput> {
  auth: AuthenticatedUser
  input: TInput
}

/**
 * Options for withAuth wrapper
 */
export interface WithAuthOptions {
  /** If true, returns null instead of throwing when auth fails */
  optional?: boolean
}

/**
 * Centralized wrapper for authenticated server functions.
 * 
 * This helper:
 * 1. Extracts raw data from TanStack Start input format
 * 2. Extracts _authorization from payload
 * 3. Verifies token and gets authenticated user
 * 4. Strips _authorization from input
 * 5. Parses input with provided schema
 * 
 * IMPORTANT: This ensures _authorization is never passed to business logic
 * and provides consistent auth handling across all server functions.
 * 
 * @example
 * ```typescript
 * export const updatePost = createServerFn({ method: 'POST' })
 *   .handler(async (input: unknown) => {
 *     const result = await withAuth(updatePostSchema, input)
 *     if (!result) return { success: false, error: 'Authentication required' }
 *     
 *     const { auth, input: data } = result
 *     // auth.userId is verified server-side
 *     // data is parsed and does NOT include _authorization
 *   })
 * ```
 */
export async function withAuth<TSchema extends ZodSchema>(
  schema: TSchema,
  rawInput: unknown,
  options?: WithAuthOptions
): Promise<WithAuthResult<z.infer<TSchema>> | null> {
  // Step 1: Extract data from TanStack Start wrapper if present
  const rawData = rawInput && typeof rawInput === 'object' && 'data' in rawInput
    ? (rawInput as { data: unknown }).data
    : rawInput

  // Ensure rawData is an object
  if (!rawData || typeof rawData !== 'object') {
    if (options?.optional) {
      return null
    }
    throw new Error('Invalid input: expected object')
  }

  const dataObj = rawData as Record<string, unknown>

  // Step 2: Extract _authorization (never log this!)
  const authorization = extractAuthorizationFromPayload(dataObj)

  // Step 3: Authenticate
  let auth: AuthenticatedUser | null = null
  
  try {
    if (authorization) {
      auth = await authenticateWithToken(authorization)
    }
  } catch (error) {
    // Log error without sensitive data
    console.error('[withAuth] Authentication error:', error instanceof Error ? error.message : 'Unknown error')
  }

  if (!auth) {
    if (options?.optional) {
      return null
    }
    throw new Error('Authentication required. Please log in.')
  }

  // Step 4: Strip _authorization before parsing (CRITICAL - never pass token to business logic)
  const cleanedData = stripAuthorization(dataObj)

  // Step 5: Parse with schema
  const parseResult = schema.safeParse(cleanedData)
  
  if (!parseResult.success) {
    // Log validation error without sensitive fields
    console.error('[withAuth] Validation error:', parseResult.error.issues)
    throw new Error(`Invalid input: ${parseResult.error.issues.map((e) => e.message).join(', ')}`)
  }

  return {
    auth,
    input: parseResult.data,
  }
}

/**
 * Wrapper for optionally authenticated server functions.
 * Returns { auth: null, input } if not authenticated, allowing anonymous access.
 */
export async function withOptionalAuth<TSchema extends ZodSchema>(
  schema: TSchema,
  rawInput: unknown
): Promise<{ auth: AuthenticatedUser | null; input: z.infer<TSchema> }> {
  // Step 1: Extract data from TanStack Start wrapper if present
  const rawData = rawInput && typeof rawInput === 'object' && 'data' in rawInput
    ? (rawInput as { data: unknown }).data
    : rawInput

  // Ensure rawData is an object
  if (!rawData || typeof rawData !== 'object') {
    throw new Error('Invalid input: expected object')
  }

  const dataObj = rawData as Record<string, unknown>

  // Step 2: Extract _authorization (never log this!)
  const authorization = extractAuthorizationFromPayload(dataObj)

  // Step 3: Try to authenticate (don't throw on failure)
  let auth: AuthenticatedUser | null = null
  
  if (authorization) {
    try {
      auth = await authenticateWithToken(authorization)
    } catch (error) {
      // Silently fail for optional auth
      console.warn('[withOptionalAuth] Token verification failed, continuing as anonymous')
    }
  }

  // Step 4: Strip _authorization before parsing
  const cleanedData = stripAuthorization(dataObj)

  // Step 5: Parse with schema
  const parseResult = schema.safeParse(cleanedData)
  
  if (!parseResult.success) {
    console.error('[withOptionalAuth] Validation error:', parseResult.error.issues)
    throw new Error(`Invalid input: ${parseResult.error.issues.map((e) => e.message).join(', ')}`)
  }

  return {
    auth,
    input: parseResult.data,
  }
}
