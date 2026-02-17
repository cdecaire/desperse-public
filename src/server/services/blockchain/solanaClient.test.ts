/**
 * Tests for solanaClient utilities
 *
 * Tests unit conversion functions and utility helpers.
 * RPC-dependent functions are tested separately with mocks.
 */

import { describe, it, expect } from "vitest";
import {
	LAMPORTS_PER_SOL,
	USDC_DECIMALS,
	USDC_BASE_UNITS,
	lamportsToSol,
	solToLamports,
	baseUnitsToUsdc,
	usdcToBaseUnits,
	formatAddress,
	getExplorerUrl,
} from "./solanaClient";

describe("solanaClient", () => {
	describe("constants", () => {
		it("should have correct LAMPORTS_PER_SOL value", () => {
			expect(LAMPORTS_PER_SOL).toBe(1_000_000_000);
		});

		it("should have correct USDC_DECIMALS value", () => {
			expect(USDC_DECIMALS).toBe(6);
		});

		it("should have correct USDC_BASE_UNITS value", () => {
			expect(USDC_BASE_UNITS).toBe(1_000_000);
		});
	});

	describe("lamportsToSol", () => {
		it("should convert lamports to SOL correctly", () => {
			expect(lamportsToSol(1_000_000_000)).toBe(1);
			expect(lamportsToSol(500_000_000)).toBe(0.5);
			expect(lamportsToSol(100_000_000)).toBe(0.1);
			expect(lamportsToSol(1_000_000)).toBe(0.001);
			expect(lamportsToSol(1)).toBe(0.000000001);
		});

		it("should handle bigint input", () => {
			expect(lamportsToSol(BigInt(1_000_000_000))).toBe(1);
			expect(lamportsToSol(BigInt(2_500_000_000))).toBe(2.5);
		});

		it("should handle zero", () => {
			expect(lamportsToSol(0)).toBe(0);
			expect(lamportsToSol(BigInt(0))).toBe(0);
		});

		it("should handle large values", () => {
			// 1000 SOL
			expect(lamportsToSol(1_000_000_000_000)).toBe(1000);
			// Max safe integer worth of lamports
			expect(lamportsToSol(Number.MAX_SAFE_INTEGER)).toBeCloseTo(
				Number.MAX_SAFE_INTEGER / LAMPORTS_PER_SOL,
				5
			);
		});
	});

	describe("solToLamports", () => {
		it("should convert SOL to lamports correctly", () => {
			expect(solToLamports(1)).toBe(BigInt(1_000_000_000));
			expect(solToLamports(0.5)).toBe(BigInt(500_000_000));
			expect(solToLamports(0.1)).toBe(BigInt(100_000_000));
			expect(solToLamports(0.001)).toBe(BigInt(1_000_000));
		});

		it("should handle zero", () => {
			expect(solToLamports(0)).toBe(BigInt(0));
		});

		it("should handle large values", () => {
			expect(solToLamports(1000)).toBe(BigInt(1_000_000_000_000));
		});

		it("should round fractional lamports", () => {
			// 0.0000000001 SOL = 0.1 lamports, should round to 0
			expect(solToLamports(0.0000000001)).toBe(BigInt(0));
			// 0.0000000005 SOL = 0.5 lamports, should round to 1
			expect(solToLamports(0.0000000005)).toBe(BigInt(1));
			// 0.0000000009 SOL = 0.9 lamports, should round to 1
			expect(solToLamports(0.0000000009)).toBe(BigInt(1));
		});

		it("should be inverse of lamportsToSol for whole numbers", () => {
			const testValues = [1, 10, 100, 0.5, 0.25, 0.001];
			for (const sol of testValues) {
				const lamports = solToLamports(sol);
				expect(lamportsToSol(lamports)).toBeCloseTo(sol, 9);
			}
		});
	});

	describe("baseUnitsToUsdc", () => {
		it("should convert base units to USDC correctly", () => {
			expect(baseUnitsToUsdc(1_000_000)).toBe(1);
			expect(baseUnitsToUsdc(500_000)).toBe(0.5);
			expect(baseUnitsToUsdc(100_000)).toBe(0.1);
			expect(baseUnitsToUsdc(10_000)).toBe(0.01);
			expect(baseUnitsToUsdc(1)).toBe(0.000001);
		});

		it("should handle bigint input", () => {
			expect(baseUnitsToUsdc(BigInt(1_000_000))).toBe(1);
			expect(baseUnitsToUsdc(BigInt(2_500_000))).toBe(2.5);
		});

		it("should handle zero", () => {
			expect(baseUnitsToUsdc(0)).toBe(0);
			expect(baseUnitsToUsdc(BigInt(0))).toBe(0);
		});

		it("should handle typical USDC amounts", () => {
			// $100 USDC
			expect(baseUnitsToUsdc(100_000_000)).toBe(100);
			// $0.01 USDC (1 cent)
			expect(baseUnitsToUsdc(10_000)).toBe(0.01);
		});
	});

	describe("usdcToBaseUnits", () => {
		it("should convert USDC to base units correctly", () => {
			expect(usdcToBaseUnits(1)).toBe(BigInt(1_000_000));
			expect(usdcToBaseUnits(0.5)).toBe(BigInt(500_000));
			expect(usdcToBaseUnits(0.1)).toBe(BigInt(100_000));
			expect(usdcToBaseUnits(0.01)).toBe(BigInt(10_000));
		});

		it("should handle zero", () => {
			expect(usdcToBaseUnits(0)).toBe(BigInt(0));
		});

		it("should handle large values", () => {
			// $1,000,000 USDC
			expect(usdcToBaseUnits(1_000_000)).toBe(BigInt(1_000_000_000_000));
		});

		it("should round fractional base units", () => {
			// 0.0000001 USDC = 0.1 base units, should round to 0
			expect(usdcToBaseUnits(0.0000001)).toBe(BigInt(0));
			// 0.0000005 USDC = 0.5 base units, should round to 1
			expect(usdcToBaseUnits(0.0000005)).toBe(BigInt(1));
		});

		it("should be inverse of baseUnitsToUsdc for whole numbers", () => {
			const testValues = [1, 10, 100, 0.5, 0.25, 0.01];
			for (const usdc of testValues) {
				const baseUnits = usdcToBaseUnits(usdc);
				expect(baseUnitsToUsdc(baseUnits)).toBeCloseTo(usdc, 6);
			}
		});
	});

	describe("formatAddress", () => {
		const validAddress = "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK";

		it("should truncate address with default chars (4)", () => {
			const formatted = formatAddress(validAddress);
			expect(formatted).toBe("DYw8...NSKK");
		});

		it("should truncate address with custom chars", () => {
			// "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK" (44 chars)
			// chars=6: first 6 + "..." + last 6
			expect(formatAddress(validAddress, 6)).toBe("DYw8jC...5CNSKK");
			// chars=8: first 8 + "..." + last 8
			expect(formatAddress(validAddress, 8)).toBe("DYw8jCTf...mG5CNSKK");
		});

		it("should return unchanged for short addresses", () => {
			expect(formatAddress("short")).toBe("short");
			expect(formatAddress("abc")).toBe("abc");
		});

		it("should handle empty string", () => {
			expect(formatAddress("")).toBe("");
		});

		it("should handle address at minimum length", () => {
			// With chars=4, minimum is 4+4+3 = 11 chars
			const exactLength = "12345678901"; // 11 chars
			expect(formatAddress(exactLength, 4)).toBe("1234...8901");

			const tooShort = "1234567890"; // 10 chars
			expect(formatAddress(tooShort, 4)).toBe("1234567890");
		});
	});

	describe("getExplorerUrl", () => {
		const signature = "5xYz...mockSignature";
		const address = "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK";

		it("should return transaction URL by default", () => {
			const url = getExplorerUrl(signature);
			expect(url).toBe(`https://www.orbmarkets.io/tx/${signature}`);
		});

		it("should return transaction URL when type is tx", () => {
			const url = getExplorerUrl(signature, "tx");
			expect(url).toBe(`https://www.orbmarkets.io/tx/${signature}`);
		});

		it("should return address/token URL when type is address", () => {
			const url = getExplorerUrl(address, "address");
			expect(url).toBe(
				`https://www.orbmarkets.io/token/${address}/history?hideSpam=true`
			);
		});

		it("should handle various signature formats", () => {
			const signatures = [
				"5UfDuX8xvdKznwVGEDanKa3SKkVsLYmTJKfHWsDNQWNMBkmkwsLsknpPYVUxY6UwVRLTZWTZKMCv7nXwvyQxr4H9",
				"abc123",
				"",
			];

			for (const sig of signatures) {
				expect(getExplorerUrl(sig)).toBe(`https://www.orbmarkets.io/tx/${sig}`);
			}
		});
	});
});
