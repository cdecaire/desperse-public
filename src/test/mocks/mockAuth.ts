/**
 * Mock authentication utilities for testing
 *
 * Provides mock implementations for Privy authentication
 * and user context in server functions.
 */

import { vi } from "vitest";

// ============================================================================
// Types
// ============================================================================

export interface MockUser {
	privyId: string;
	userId: string;
	email?: string;
	walletAddress?: string;
}

export interface MockPrivyUser {
	id: string;
	wallet?: {
		address: string;
		chainType: string;
	};
	email?: {
		address: string;
	};
	linkedAccounts: Array<{
		type: string;
		address?: string;
	}>;
}

// ============================================================================
// Mock User Factories
// ============================================================================

/**
 * Create a mock authenticated user
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
	return {
		privyId: "did:privy:test-user-123",
		userId: "user-uuid-123",
		email: "test@example.com",
		walletAddress: "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK",
		...overrides,
	};
}

/**
 * Create a mock Privy user (as returned by Privy SDK)
 */
export function createMockPrivyUser(
	overrides: Partial<MockPrivyUser> = {}
): MockPrivyUser {
	return {
		id: "did:privy:test-user-123",
		wallet: {
			address: "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK",
			chainType: "solana",
		},
		email: {
			address: "test@example.com",
		},
		linkedAccounts: [
			{ type: "wallet", address: "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK" },
			{ type: "email", address: "test@example.com" },
		],
		...overrides,
	};
}

/**
 * Create a mock user without wallet (email-only auth)
 */
export function createMockUserNoWallet(): MockUser {
	return {
		privyId: "did:privy:email-user-456",
		userId: "user-uuid-456",
		email: "emailonly@example.com",
		walletAddress: undefined,
	};
}

/**
 * Create a mock admin user
 */
export function createMockAdminUser(): MockUser {
	return {
		privyId: "did:privy:admin-789",
		userId: "admin-uuid-789",
		email: "admin@example.com",
		walletAddress: "AdminWa11etAddressXXXXXXXXXXXXXXXXXXXXXXXXX",
	};
}

// ============================================================================
// Auth Token Factories
// ============================================================================

/**
 * Create a mock authorization token
 * In production, this would be a real Privy JWT
 */
export function createMockAuthToken(userId = "test-user-123"): string {
	// Format: mock-token-{userId}-{timestamp}
	return `mock-token-${userId}-${Date.now()}`;
}

/**
 * Create an expired mock token
 */
export function createExpiredAuthToken(): string {
	return "mock-token-expired-0";
}

/**
 * Create an invalid mock token
 */
export function createInvalidAuthToken(): string {
	return "invalid-token";
}

// ============================================================================
// Mock Auth Handlers
// ============================================================================

/**
 * Mock implementation of withAuth wrapper
 *
 * Usage:
 * ```ts
 * vi.mock('@/server/auth', () => ({
 *   withAuth: mockWithAuth(createMockUser()),
 *   withOptionalAuth: mockWithOptionalAuth(createMockUser()),
 * }))
 * ```
 */
export function mockWithAuth(mockUser: MockUser | null = createMockUser()) {
	return <T, D>(
			handler: (ctx: { data: D; user: MockUser }) => Promise<T>
		) =>
		async (ctx: { data: D }): Promise<T> => {
			if (!mockUser) {
				throw new Error("Unauthorized");
			}
			return handler({ ...ctx, user: mockUser });
		};
}

/**
 * Mock implementation of withOptionalAuth wrapper
 */
export function mockWithOptionalAuth(
	mockUser: MockUser | null = createMockUser()
) {
	return <T, D>(
			handler: (ctx: { data: D; user: MockUser | null }) => Promise<T>
		) =>
		async (ctx: { data: D }): Promise<T> => {
			return handler({ ...ctx, user: mockUser });
		};
}

/**
 * Create a mock server auth module
 */
export function mockServerAuthModule(mockUser: MockUser | null = createMockUser()) {
	return {
		withAuth: mockWithAuth(mockUser),
		withOptionalAuth: mockWithOptionalAuth(mockUser),
		validateAuthToken: vi.fn().mockResolvedValue(mockUser ? { userId: mockUser.privyId } : null),
		getAuthTokenFromRequest: vi.fn().mockReturnValue("mock-token"),
	};
}

// ============================================================================
// Request Context Mocks
// ============================================================================

/**
 * Create a mock request context with authorization
 */
export function createMockRequestContext(
	data: Record<string, unknown> = {},
	authToken = createMockAuthToken()
) {
	return {
		data: {
			...data,
			_authorization: authToken,
		},
	};
}

/**
 * Create a mock request context without authorization
 */
export function createUnauthenticatedContext(data: Record<string, unknown> = {}) {
	return {
		data,
	};
}

// ============================================================================
// Privy SDK Mocks
// ============================================================================

/**
 * Mock PrivyClient for server-side verification
 */
export function createMockPrivyClient(mockUser: MockPrivyUser | null = createMockPrivyUser()) {
	return {
		verifyAuthToken: vi.fn().mockResolvedValue(
			mockUser
				? {
						userId: mockUser.id,
						appId: "test-app-id",
						issuer: "privy.io",
					}
				: null
		),
		getUser: vi.fn().mockResolvedValue(mockUser),
		getUserByWalletAddress: vi.fn().mockResolvedValue(mockUser),
	};
}

/**
 * Mock the Privy server auth module
 */
export function mockPrivyServerAuthModule(mockUser: MockPrivyUser | null = createMockPrivyUser()) {
	const client = createMockPrivyClient(mockUser);
	return {
		PrivyClient: vi.fn().mockImplementation(() => client),
		__mockClient: client, // Expose for test assertions
	};
}
