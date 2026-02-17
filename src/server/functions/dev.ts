/**
 * Development server functions for testing database connection and wallet functionality
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { sql } from 'drizzle-orm';
import { checkSolBalance } from '@/server/services/blockchain/solanaClient';

/**
 * Ping database to test connection
 * Returns connection status and user count
 */
export const pingDb = createServerFn({
  method: 'GET',
}).handler(async () => {
  try {
    // Test basic connection with a simple query
    await db.execute(sql`SELECT 1`);
    
    // Get user count using count aggregation
    const userCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    const userCount = Number(userCountResult[0]?.count ?? 0);

    return {
      success: true,
      connected: true,
      userCount,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
});

/**
 * Get SOL balance for a wallet address
 * Used for wallet testing and debugging
 */
export const getWalletBalance = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input 
      ? (input as { data: unknown }).data 
      : input
    const { walletAddress } = z.object({ 
      walletAddress: z.string(),
    }).parse(rawData);

    const result = await checkSolBalance(walletAddress, BigInt(0));
    
    return {
      success: true,
      balance: result.balance.toString(), // Convert bigint to string for JSON serialization
      sufficient: result.sufficient,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

