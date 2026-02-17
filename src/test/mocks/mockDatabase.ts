/**
 * Mock database utilities for testing
 *
 * Provides factory functions for creating mock database records
 * and a transaction rollback pattern for integration tests.
 */

import { vi } from "vitest";

// ============================================================================
// Types (matching schema.ts)
// ============================================================================

export interface MockPost {
	id: string;
	userId: string;
	type: "post" | "collectible" | "edition";
	caption: string | null;
	mediaUrl: string | null;
	metadataUrl: string | null;
	masterMint: string | null;
	price: number | null;
	currency: "SOL" | "USDC" | null;
	maxSupply: number | null;
	currentSupply: number;
	createdAt: Date;
	updatedAt: Date;
	isHidden: boolean;
}

export interface MockUser {
	id: string;
	privyId: string;
	username: string | null;
	displayName: string | null;
	bio: string | null;
	avatarUrl: string | null;
	walletAddress: string | null;
	email: string | null;
	role: "user" | "moderator" | "admin";
	createdAt: Date;
	updatedAt: Date;
}

export interface MockPurchase {
	id: string;
	postId: string;
	userId: string;
	buyerWallet: string;
	price: number;
	currency: "SOL" | "USDC";
	status:
		| "reserved"
		| "submitted"
		| "awaiting_fulfillment"
		| "minting"
		| "confirmed"
		| "failed"
		| "abandoned"
		| "blocked_missing_master";
	txSignature: string | null;
	nftMint: string | null;
	fulfillmentKey: string | null;
	fulfillmentClaimedAt: Date | null;
	editionNumber: number | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface MockCollection {
	id: string;
	postId: string;
	userId: string;
	collectorWallet: string;
	status: "pending" | "confirmed" | "failed";
	txSignature: string | null;
	assetId: string | null;
	createdAt: Date;
	updatedAt: Date;
}

// ============================================================================
// Record Factories
// ============================================================================

/**
 * Create a mock user record
 */
export function createMockUserRecord(
	overrides: Partial<MockUser> = {}
): MockUser {
	const now = new Date();
	return {
		id: "user-uuid-123",
		privyId: "did:privy:test-user-123",
		username: "testuser",
		displayName: "Test User",
		bio: "A test user for unit tests",
		avatarUrl: null,
		walletAddress: "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK",
		email: "test@example.com",
		role: "user",
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

/**
 * Create a mock post record
 */
export function createMockPostRecord(
	overrides: Partial<MockPost> = {}
): MockPost {
	const now = new Date();
	return {
		id: "post-uuid-123",
		userId: "user-uuid-123",
		type: "post",
		caption: "Test post caption",
		mediaUrl: "https://example.com/image.jpg",
		metadataUrl: null,
		masterMint: null,
		price: null,
		currency: null,
		maxSupply: null,
		currentSupply: 0,
		createdAt: now,
		updatedAt: now,
		isHidden: false,
		...overrides,
	};
}

/**
 * Create a mock collectible post
 */
export function createMockCollectiblePost(
	overrides: Partial<MockPost> = {}
): MockPost {
	return createMockPostRecord({
		type: "collectible",
		metadataUrl: "https://example.com/metadata.json",
		...overrides,
	});
}

/**
 * Create a mock edition post
 */
export function createMockEditionPost(
	overrides: Partial<MockPost> = {}
): MockPost {
	return createMockPostRecord({
		type: "edition",
		metadataUrl: "https://example.com/metadata.json",
		masterMint: "EditionMasterMintXXXXXXXXXXXXXXXXXXXXXXXXXX",
		price: 1_000_000_000, // 1 SOL
		currency: "SOL",
		maxSupply: 100,
		currentSupply: 5,
		...overrides,
	});
}

/**
 * Create a mock purchase record
 */
export function createMockPurchaseRecord(
	overrides: Partial<MockPurchase> = {}
): MockPurchase {
	const now = new Date();
	return {
		id: "purchase-uuid-123",
		postId: "post-uuid-123",
		userId: "user-uuid-123",
		buyerWallet: "BuyerWa11etAddressXXXXXXXXXXXXXXXXXXXXXXXXX",
		price: 1_000_000_000,
		currency: "SOL",
		status: "reserved",
		txSignature: null,
		nftMint: null,
		fulfillmentKey: null,
		fulfillmentClaimedAt: null,
		editionNumber: null,
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

/**
 * Create a mock collection (cNFT collect) record
 */
export function createMockCollectionRecord(
	overrides: Partial<MockCollection> = {}
): MockCollection {
	const now = new Date();
	return {
		id: "collection-uuid-123",
		postId: "post-uuid-123",
		userId: "user-uuid-123",
		collectorWallet: "Col1ectorWa11etAddressXXXXXXXXXXXXXXXXXXXX",
		status: "pending",
		txSignature: null,
		assetId: null,
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

// ============================================================================
// Mock Database Client
// ============================================================================

export interface MockDbClient {
	select: ReturnType<typeof vi.fn>;
	insert: ReturnType<typeof vi.fn>;
	update: ReturnType<typeof vi.fn>;
	delete: ReturnType<typeof vi.fn>;
	query: Record<string, { findFirst: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> }>;
}

/**
 * Create a mock database client
 */
export function createMockDbClient(): MockDbClient {
	const chainableMock = () => ({
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		returning: vi.fn().mockResolvedValue([]),
		limit: vi.fn().mockReturnThis(),
		offset: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		leftJoin: vi.fn().mockReturnThis(),
		innerJoin: vi.fn().mockReturnThis(),
	});

	return {
		select: vi.fn().mockReturnValue(chainableMock()),
		insert: vi.fn().mockReturnValue(chainableMock()),
		update: vi.fn().mockReturnValue(chainableMock()),
		delete: vi.fn().mockReturnValue(chainableMock()),
		query: {
			users: {
				findFirst: vi.fn().mockResolvedValue(null),
				findMany: vi.fn().mockResolvedValue([]),
			},
			posts: {
				findFirst: vi.fn().mockResolvedValue(null),
				findMany: vi.fn().mockResolvedValue([]),
			},
			purchases: {
				findFirst: vi.fn().mockResolvedValue(null),
				findMany: vi.fn().mockResolvedValue([]),
			},
			collections: {
				findFirst: vi.fn().mockResolvedValue(null),
				findMany: vi.fn().mockResolvedValue([]),
			},
		},
	};
}

/**
 * Mock the database module
 */
export function mockDatabaseModule(mockDb: MockDbClient = createMockDbClient()) {
	return {
		db: mockDb,
	};
}

// ============================================================================
// In-Memory Store (for integration-like tests)
// ============================================================================

/**
 * Simple in-memory store for testing without mocking
 * Useful for testing business logic with real-ish data flow
 */
export class InMemoryStore<T extends { id: string }> {
	private data: Map<string, T> = new Map();

	insert(record: T): T {
		this.data.set(record.id, { ...record });
		return record;
	}

	findById(id: string): T | undefined {
		const record = this.data.get(id);
		return record ? { ...record } : undefined;
	}

	findMany(predicate?: (record: T) => boolean): T[] {
		const records = Array.from(this.data.values());
		if (predicate) {
			return records.filter(predicate).map((r) => ({ ...r }));
		}
		return records.map((r) => ({ ...r }));
	}

	update(id: string, updates: Partial<T>): T | undefined {
		const existing = this.data.get(id);
		if (!existing) return undefined;
		const updated = { ...existing, ...updates };
		this.data.set(id, updated);
		return { ...updated };
	}

	delete(id: string): boolean {
		return this.data.delete(id);
	}

	clear(): void {
		this.data.clear();
	}

	size(): number {
		return this.data.size;
	}
}

/**
 * Create a pre-populated in-memory database for testing
 */
export function createTestDatabase() {
	return {
		users: new InMemoryStore<MockUser>(),
		posts: new InMemoryStore<MockPost>(),
		purchases: new InMemoryStore<MockPurchase>(),
		collections: new InMemoryStore<MockCollection>(),
	};
}
