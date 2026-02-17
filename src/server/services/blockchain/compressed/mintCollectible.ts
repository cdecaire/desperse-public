/**
 * Build compressed NFT mint transactions (collectibles) using Bubblegum + Umi.
 * 
 * Two modes:
 * 1. Server-paid (default): Server signs as both tree authority and payer
 * 2. User-paid: Returns unsigned transaction for user to sign as payer, server signs as tree authority
 * 
 * User-paid pattern:
 * - treeCreatorOrDelegate: Tree authority (server key - umi.identity) - server signs
 * - payer: User's Privy wallet - user signs
 * - leafOwner: User's Privy wallet (owns the NFT)
 * 
 * Server-paid pattern:
 * - treeCreatorOrDelegate: Tree authority (server key - umi.identity) - server signs
 * - payer: Server key (umi.identity) - server signs
 * - leafOwner: User's Privy wallet (owns the NFT, doesn't sign)
 */

import { db } from '@/server/db';
import { posts, users } from '@/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { getUmi, getMerkleTreePublicKey, getUmiRpcEndpoint } from './umiClient';
import { publicKey, transactionBuilder, none, createNoopSigner } from '@metaplex-foundation/umi';
import { mintV2 } from '@metaplex-foundation/mpl-bubblegum';
import bs58 from 'bs58';

/**
 * Extract asset ID from a transaction signature's logs
 * This is the reliable way to get the asset ID for a specific transaction
 */
export async function extractAssetIdFromTransaction(txSignature: string): Promise<string | null> {
  try {
    const rpcUrl = getUmiRpcEndpoint();
    const { Connection } = await import('@solana/web3.js');
    const connection = new Connection(rpcUrl, 'confirmed');
    
    const tx = await connection.getTransaction(txSignature, {
      maxSupportedTransactionVersion: 0,
    });
    
    if (!tx?.meta?.logMessages) {
      return null;
    }
    
    // Look for "Leaf asset ID: ..." in logs - case insensitive
    for (const log of tx.meta.logMessages) {
      if (log.includes('Leaf asset ID:') || log.includes('leaf asset ID:')) {
        const match = log.match(/[Ll]eaf asset ID: ([A-Za-z0-9]+)/);
        if (match && match[1]) {
          return match[1];
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('[extractAssetId] Error extracting asset ID:', error);
    return null;
  }
}

interface BuildCollectTxParams {
  postId: string;
  collectorPubkey: string;
  /** If true, user pays fees (returns unsigned tx). If false, server pays (signs and submits). */
  userPays?: boolean;
}

export async function buildCompressedCollectTransaction(
  params: BuildCollectTxParams,
): Promise<{ 
  success: boolean; 
  txSignature?: string; 
  unsignedTransaction?: string; // Base64 encoded, for user-paid mode
  assetId?: string; 
  error?: string;
  requiresUserSignature?: boolean; // True if user needs to sign
}> {
  try {
    const { postId, collectorPubkey } = params;
    const umi = getUmi();
    
    // Verify cluster/RPC endpoint (critical for debugging cluster mismatches)
    const rpcEndpoint = getUmiRpcEndpoint();
    console.info('[collect][server] Umi RPC endpoint:', rpcEndpoint);
    console.info('[collect][server] Cluster verification:', {
      endpoint: rpcEndpoint,
      isMainnet: rpcEndpoint.includes('mainnet'),
      isDevnet: rpcEndpoint.includes('devnet'),
      isTestnet: rpcEndpoint.includes('testnet'),
      isHelius: rpcEndpoint.includes('helius'),
      note: 'Privy chain must match this cluster (solana:mainnet for mainnet, solana:devnet for devnet)',
    });
    
    let tree;
    try {
      tree = getMerkleTreePublicKey();
      console.info('[collect][server] Tree address:', tree.toString());
    } catch (e) {
      console.error('[collect] Missing or invalid BUBBLEGUM_TREE_ADDRESS', e);
      return { success: false, error: 'Merkle tree address not configured' };
    }

    // 1) Load post + creator
    const postResult = await db
      .select({
        post: posts,
        creator: {
          id: users.id,
          walletAddress: users.walletAddress,
        },
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(
        and(
          eq(posts.id, postId),
          eq(posts.isDeleted, false),
          eq(posts.isHidden, false),
        ),
      )
      .limit(1);

    if (!postResult.length) {
      return { success: false, error: 'Post not found' };
    }

    const { post, creator } = postResult[0];
    if (post.type !== 'collectible') {
      return { success: false, error: 'Not a collectible' };
    }

    // CRITICAL: Must use metadataUrl, not mediaUrl fallback
    // Each post should have unique metadata JSON with post-specific info
    if (!post.metadataUrl) {
      console.error('[collect] Post missing metadataUrl:', {
        postId: post.id,
        mediaUrl: post.mediaUrl,
        caption: post.caption,
        note: 'Post was created without metadata. Cannot mint with unique metadata.',
      });
      return { 
        success: false, 
        error: 'Post is missing metadata. Please recreate the post to generate proper metadata.' 
      };
    }

    // Use nftName if set, otherwise fallback to auto-generated name
    const name = post.nftName?.trim() || `Collectible #${post.id.slice(0, 8)}`;
    const uri = post.metadataUrl; // Use ONLY metadataUrl, no fallback
    // Use post's sellerFeeBasisPoints, default to 0 for collectibles (free = no royalties expectation)
    const sellerFeeBasisPoints = post.sellerFeeBasisPoints ?? 0;
    
    console.info('[collect] Using metadata for mint:', {
      postId: post.id,
      name,
      nftName: post.nftName,
      sellerFeeBasisPoints,
      metadataUrl: uri,
      mediaUrl: post.mediaUrl, // Log for comparison
      note: 'Each post should have unique metadataUrl',
    });

    let leafOwner;
    try {
      leafOwner = publicKey(collectorPubkey);
    } catch (e) {
      console.error('[collect] Invalid collector pubkey', collectorPubkey, e);
      return { success: false, error: 'Invalid collector wallet address' };
    }

    if (!creator.walletAddress) {
      console.error('[collect] Creator walletAddress missing for post', postId);
      return { success: false, error: 'Creator wallet address missing for this post' };
    }

    let creatorPk;
    try {
      creatorPk = publicKey(creator.walletAddress);
    } catch (e) {
      console.error('[collect] Invalid creator walletAddress', creator.walletAddress, e);
      return { success: false, error: 'Invalid creator wallet address' };
    }

    const user = leafOwner; // User's Privy wallet (collector/leafOwner)
    const treeAuthority = umi.identity; // Server key (tree authority)
    const serverSigner = umi.identity; // Server key
    
    const userPays = params.userPays ?? false; // Default to server-paid for backward compatibility

    const metadata = {
      name,
      uri,
      sellerFeeBasisPoints,
      creators: [
        {
          address: creatorPk,
          verified: false,
          share: 100,
        },
      ],
      // collection omitted intentionally
    };

    // Extra validation logging before mintV2
    console.info('[collect] Pre-mintV2 validation (server-only signing)', {
      tree: tree?.toString?.() ?? 'INVALID',
      user: user?.toString?.() ?? 'INVALID',
      treeAuthority: treeAuthority?.publicKey?.toString?.() ?? 'INVALID',
      creatorPk: creatorPk?.toString?.() ?? 'INVALID',
      note: 'Server signs as both tree authority and payer, user is leafOwner only',
    });

    console.info('[collect] Building compressed mint (server-only signing)', {
      postId,
      user: user.toString(),
      treeAuthority: treeAuthority.publicKey.toString(),
      tree: tree.toString(),
      metadata,
    });

    // 2) Build the Bubblegum v2 mint builder piece
    // For user-paid: use createNoopSigner (user will sign client-side)
    // For server-paid: use serverSigner (server signs)
    const payer = userPays ? createNoopSigner(user) : serverSigner;
    
    console.info('[collect] Building mint transaction', {
      mode: userPays ? 'USER-PAID' : 'SERVER-PAID',
      payer: userPays ? user.toString() : serverSigner.publicKey.toString(),
      treeAuthority: treeAuthority.publicKey.toString(),
      leafOwner: user.toString(),
    });
    
    const mintBuilder = mintV2(umi, {
      merkleTree: tree,
      leafOwner: user,
      payer: payer,                              // noop signer (user pays) OR server signer (server pays)
      treeCreatorOrDelegate: treeAuthority,     // tree authority (server key, server signs)
      metadata: {
        name,
        uri,
        sellerFeeBasisPoints,
        creators: [
          {
            address: creatorPk,
            verified: false,
            share: 100,
          },
        ],
        collection: none(), // explicitly no collection
      },
    });

    // 3) Wrap in a TransactionBuilder and set blockhash + fee payer
    // Import retry utility once for use in multiple RPC calls
    const { retryWithBackoff } = await import('@/lib/retryUtils');
    
    // Wrap RPC call with retry logic for transient network/RPC errors
    const { blockhash } = await retryWithBackoff(
      () => umi.rpc.getLatestBlockhash(),
      { maxRetries: 3, baseDelayMs: 1000 }
    );
    let builder = transactionBuilder().add(mintBuilder);
    // Fee payer must be a Signer, so use serverSigner for builder (user will sign client-side)
    builder = builder.setBlockhash(blockhash).setFeePayer(userPays ? createNoopSigner(user) : serverSigner);

    if (userPays) {
      // User-paid mode: Return unsigned transaction for user to sign
      console.info('[collect][debug] Building unsigned transaction (user will sign as payer)...');
      const unsignedTx = await builder.build(umi);
      const serialized = umi.transactions.serialize(unsignedTx);
      const base64 = Buffer.from(serialized).toString('base64');
      
      return {
        success: true,
        unsignedTransaction: base64,
        requiresUserSignature: true,
      };
    }

    // Server-paid mode: Sign and submit automatically
    console.info('[collect][debug] Sending transaction (server signs and submits)...');
    // Wrap RPC call with retry logic for transient network/RPC errors
    const signature = await retryWithBackoff(
      () => builder.send(umi),
      { maxRetries: 3, baseDelayMs: 1000 }
    );

    // Signature from builder.send() is bytes (Uint8Array), convert to base58 string
    let signatureString: string;
    if (typeof signature === 'string') {
      // Already a string (shouldn't happen but handle it)
      signatureString = signature;
    } else if (signature instanceof Uint8Array) {
      // Direct Uint8Array - encode to base58
      signatureString = bs58.encode(signature);
    } else if (Array.isArray(signature)) {
      // Array of numbers - convert to Uint8Array then encode
      signatureString = bs58.encode(new Uint8Array(signature));
    } else {
      // If it's a TransactionSignature type with bytes property or other structure
      const sigBytes = (signature as any).bytes || (signature as any);
      if (sigBytes instanceof Uint8Array) {
        signatureString = bs58.encode(sigBytes);
      } else if (Array.isArray(sigBytes)) {
        signatureString = bs58.encode(new Uint8Array(sigBytes));
      } else {
        // Last resort: try to convert whatever it is
        signatureString = bs58.encode(new Uint8Array(Object.values(sigBytes)));
      }
    }
    
    console.info('[collect][debug] Transaction submitted successfully:', {
      signature: signatureString,
      signatureLength: signatureString.length,
    });

    // Extract asset ID from transaction logs
    // Wait a few seconds for transaction to be indexed, then try to extract
    let assetId: string | undefined;
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      assetId = await extractAssetIdFromTransaction(signatureString) || undefined;
      
      if (assetId) {
        console.info('[collect][debug] Extracted asset ID from transaction logs:', {
          assetId,
          txSignature: signatureString,
          postId,
        });
      } else {
        console.warn('[collect][debug] Asset ID not found in logs yet:', {
          txSignature: signatureString,
          postId,
          note: 'Asset ID will be populated later via webhook or polling',
        });
      }
    } catch (error) {
      console.warn('[collect][debug] Could not extract asset ID:', {
        error: error instanceof Error ? error.message : String(error),
        txSignature: signatureString,
        postId,
        note: 'Asset ID will be populated later via webhook or polling',
      });
    }

    return { 
      success: true, 
      txSignature: signatureString,
      assetId, // Return asset ID if extracted
    };
  } catch (error) {
    console.error('Error building compressed collect transaction:', {
      postId: params.postId,
      collectorPubkey: params.collectorPubkey,
      error,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

