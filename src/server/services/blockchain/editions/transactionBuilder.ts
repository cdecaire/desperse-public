import { Connection, PublicKey, SystemProgram, TransactionInstruction, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { Buffer } from 'buffer';
import { env, getHeliusRpcUrl } from '@/config/env';
import { validateAddress } from '@/server/services/blockchain/addressUtils';

// USDC mainnet mint address (6 decimals)
export const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// Payment-only transaction types (Core minting happens server-side after payment confirms)
export interface EditionPaymentTxParams {
  buyer: string;
  creator: string;
  platform: string;
  price: number; // base units: lamports for SOL, base units for USDC
  currency: 'SOL' | 'USDC';
}

export interface EditionPaymentTxResult {
  transactionBase64: string;
  blockhash: string;
  lastValidBlockHeight: number;
}

// Minting fee in lamports - covers Core asset creation costs
// First purchase creates a Collection (~0.025 SOL), subsequent editions ~0.003 SOL
// 0.01 SOL covers the average case and ensures platform doesn't lose money on first mints
export const MINTING_FEE_LAMPORTS = 10_000_000; // 0.01 SOL

/**
 * Build a payment-only transaction for an edition purchase.
 * User signs this transaction to pay for the edition.
 * Includes: price to creator, platform fee, and minting fee (SOL for Core minting).
 */
export async function buildEditionPaymentTransaction(params: EditionPaymentTxParams): Promise<EditionPaymentTxResult> {
  try {
    const rpcUrl = getHeliusRpcUrl();
    if (!rpcUrl || rpcUrl.includes('api.mainnet-beta.solana.com') && !env.HELIUS_API_KEY) {
      throw new Error('HELIUS_API_KEY is required for production. Please set HELIUS_API_KEY environment variable.');
    }

    const connection = new Connection(rpcUrl, 'confirmed');

    // Validate addresses before creating PublicKey objects (Phase 4c migration)
    if (!validateAddress(params.buyer)) {
      throw new Error(`Invalid buyer address: ${params.buyer}`);
    }
    if (!validateAddress(params.creator)) {
      throw new Error(`Invalid creator address: ${params.creator}`);
    }
    if (!validateAddress(params.platform)) {
      throw new Error(`Invalid platform address: ${params.platform}`);
    }

    const buyer = new PublicKey(params.buyer);
    const creator = new PublicKey(params.creator);
    const platform = new PublicKey(params.platform);

    // Wrap RPC call with retry logic for transient network/RPC errors
    const { retryWithBackoff } = await import('@/lib/retryUtils');
    const latestBlockhash = await retryWithBackoff(
      () => connection.getLatestBlockhash(),
      { maxRetries: 3, baseDelayMs: 1000 }
    );

    const instructions: TransactionInstruction[] = [];

    // Payments only - no minting
    const platformFeeAmount = Math.floor((params.price * env.PLATFORM_FEE_BPS) / 10_000);
    const amountToCreator = params.price - platformFeeAmount;

    if (params.currency === 'SOL') {
      if (amountToCreator > 0) {
        instructions.push(
          SystemProgram.transfer({
            fromPubkey: buyer,
            toPubkey: creator,
            lamports: amountToCreator,
          }),
        );
      }

      if (platformFeeAmount > 0 && params.platform) {
        instructions.push(
          SystemProgram.transfer({
            fromPubkey: buyer,
            toPubkey: platform,
            lamports: platformFeeAmount,
          }),
        );
      }

      // Minting fee - covers Core asset creation cost
      instructions.push(
        SystemProgram.transfer({
          fromPubkey: buyer,
          toPubkey: platform,
          lamports: MINTING_FEE_LAMPORTS,
        }),
      );
    } else {
      // USDC (SPL)
      const buyerUsdcAta = await getAssociatedTokenAddress(USDC_MINT, buyer, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const creatorUsdcAta = await getAssociatedTokenAddress(USDC_MINT, creator, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const platformUsdcAta = await getAssociatedTokenAddress(USDC_MINT, platform, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

      // Ensure ATAs exist (idempotent)
      instructions.push(
        createAssociatedTokenAccountIdempotentInstruction(
          buyer,
          buyerUsdcAta,
          buyer,
          USDC_MINT,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        ),
      );
      instructions.push(
        createAssociatedTokenAccountIdempotentInstruction(
          buyer,
          creatorUsdcAta,
          creator,
          USDC_MINT,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        ),
      );

      if (platformFeeAmount > 0 && params.platform) {
        instructions.push(
          createAssociatedTokenAccountIdempotentInstruction(
            buyer,
            platformUsdcAta,
            platform,
            USDC_MINT,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
          ),
        );
      }

      if (amountToCreator > 0) {
        instructions.push(
          createTransferInstruction(
            buyerUsdcAta,
            creatorUsdcAta,
            buyer,
            BigInt(amountToCreator),
            [],
            TOKEN_PROGRAM_ID,
          ),
        );
      }

      if (platformFeeAmount > 0 && params.platform) {
        instructions.push(
          createTransferInstruction(
            buyerUsdcAta,
            platformUsdcAta,
            buyer,
            BigInt(platformFeeAmount),
            [],
            TOKEN_PROGRAM_ID,
          ),
        );
      }

      // Minting fee in SOL - covers Core asset creation cost (even for USDC payments)
      instructions.push(
        SystemProgram.transfer({
          fromPubkey: buyer,
          toPubkey: platform,
          lamports: MINTING_FEE_LAMPORTS,
        }),
      );
    }

    // Build and return payment transaction (unsigned - user signs)
    const messageV0 = new TransactionMessage({
      payerKey: buyer,
      recentBlockhash: latestBlockhash.blockhash,
      instructions,
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    const serialized = transaction.serialize();

    return {
      transactionBase64: Buffer.from(serialized).toString('base64'),
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    };
  } catch (error) {
    console.error('Error in buildEditionPaymentTransaction:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
      throw new Error(`Failed to build payment transaction: ${error.message}`);
    }
    throw error;
  }
}
