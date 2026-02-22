/**
 * Global test setup for Vitest
 *
 * - Freezes time for deterministic tests (nonce expiration, retry backoff)
 * - Stubs randomness for reproducible tests
 * - Sets up global cleanup hooks
 */

import { vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";

// ============================================================================
// Time Control
// ============================================================================

/**
 * Fixed timestamp for tests: 2024-01-15T12:00:00.000Z
 * Using a fixed date ensures tests don't flake based on when they run.
 */
export const FIXED_TIMESTAMP = new Date("2024-01-15T12:00:00.000Z").getTime();

/**
 * Enable fake timers before all tests
 * Individual tests can use vi.advanceTimersByTime() to simulate time passing
 */
beforeAll(() => {
	vi.useFakeTimers();
	vi.setSystemTime(FIXED_TIMESTAMP);
});

afterAll(() => {
	vi.useRealTimers();
});

// ============================================================================
// Deterministic Randomness
// ============================================================================

/**
 * Seed for deterministic Math.random()
 * Uses a simple LCG (Linear Congruential Generator) for reproducibility
 */
let randomSeed = 12345;

function seededRandom(): number {
	// LCG parameters (same as glibc)
	randomSeed = (randomSeed * 1103515245 + 12345) & 0x7fffffff;
	return randomSeed / 0x7fffffff;
}

/**
 * Reset random seed before each test for isolation
 */
beforeEach(() => {
	randomSeed = 12345;

	// Mock Math.random
	vi.spyOn(Math, "random").mockImplementation(seededRandom);

	// Mock crypto.randomUUID if available (Node 19+)
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		let uuidCounter = 0;
		vi.spyOn(crypto, "randomUUID").mockImplementation(() => {
			uuidCounter++;
			// Generate deterministic UUIDs based on counter
			const hex = uuidCounter.toString(16).padStart(32, "0");
			return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}` as `${string}-${string}-${string}-${string}-${string}`;
		});
	}
});

afterEach(() => {
	vi.restoreAllMocks();
});

// ============================================================================
// Console Control
// ============================================================================

/**
 * Suppress console.log during tests by default
 * Tests can opt-in to logs with DEBUG=true env var
 */
const originalConsole = {
	log: console.log,
	info: console.info,
	warn: console.warn,
	error: console.error,
};

beforeAll(() => {
	if (!process.env.DEBUG) {
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "info").mockImplementation(() => {});
		// Keep warn and error for debugging test failures
	}
});

/**
 * Helper to enable console output in a specific test
 */
export function enableConsole() {
	vi.spyOn(console, "log").mockImplementation(originalConsole.log);
	vi.spyOn(console, "info").mockImplementation(originalConsole.info);
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Advance timers and flush promises
 * Useful for testing async code that uses setTimeout
 */
export async function advanceTimersAndFlush(ms: number): Promise<void> {
	vi.advanceTimersByTime(ms);
	// Flush pending promises
	await vi.runAllTimersAsync();
}

/**
 * Run all pending timers without advancing specific time
 */
export async function flushAllTimers(): Promise<void> {
	await vi.runAllTimersAsync();
}

/**
 * Create a deferred promise for testing async flows
 */
export function createDeferred<T>(): {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (error: unknown) => void;
} {
	let resolve: (value: T) => void = () => {};
	let reject: (error: unknown) => void = () => {};

	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	return { promise, resolve, reject };
}

// ============================================================================
// Environment Variable Helpers
// ============================================================================

/**
 * Temporarily set environment variables for a test
 */
export function withEnv<T>(
	vars: Record<string, string | undefined>,
	fn: () => T
): T {
	const originalValues: Record<string, string | undefined> = {};

	// Save and set
	for (const [key, value] of Object.entries(vars)) {
		originalValues[key] = process.env[key];
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}

	try {
		return fn();
	} finally {
		// Restore
		for (const [key, value] of Object.entries(originalValues)) {
			if (value === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = value;
			}
		}
	}
}
