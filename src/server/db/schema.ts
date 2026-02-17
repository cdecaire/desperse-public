/**
 * Database schema definitions using Drizzle ORM
 * This schema includes all MVP tables as specified in project.md
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  bigint,
  pgEnum,
  index,
  jsonb,
  uniqueIndex,
  unique,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Enums
export const postTypeEnum = pgEnum('post_type_enum', ['post', 'collectible', 'edition']);

export const currencyEnum = pgEnum('currency_enum', ['SOL', 'USDC']);

export const userRoleEnum = pgEnum('user_role_enum', ['user', 'moderator', 'admin']);

export const contentTypeEnum = pgEnum('content_type_enum', ['post', 'comment', 'dm_thread', 'dm_message']);

export const reportStatusEnum = pgEnum('report_status_enum', ['open', 'reviewing', 'resolved', 'rejected']);

export const reportResolutionEnum = pgEnum('report_resolution_enum', ['removed', 'no_action']);

export const notificationTypeEnum = pgEnum('notification_type_enum', [
  'follow',
  'like',
  'comment',
  'collect',
  'purchase',
  'mention',
]);

export const notificationReferenceTypeEnum = pgEnum('notification_reference_type_enum', [
  'post',
  'comment',
]);

export const feedbackStatusEnum = pgEnum('feedback_status_enum', ['new', 'reviewed'])

// Asset role enum for multi-asset posts
export const assetRoleEnum = pgEnum('asset_role_enum', ['media', 'download']);

// Users table
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    walletAddress: text('wallet_address').notNull().unique(),
    privyId: text('privy_id').notNull().unique(),
    usernameSlug: text('username_slug').notNull().unique(),
    displayName: text('display_name'),
    bio: text('bio'),
    avatarUrl: text('avatar_url'),
    headerBgUrl: text('header_bg_url'),
    link: text('link'),
    role: userRoleEnum('role').notNull().default('user'),
    preferences: jsonb('preferences').$type<UserPreferencesJson>().notNull().default({}),
    // Username change tracking - null means never changed (first change is free)
    usernameLastChangedAt: timestamp('username_last_changed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    walletAddressIdx: index('users_wallet_address_idx').on(table.walletAddress),
    privyIdIdx: index('users_privy_id_idx').on(table.privyId),
    usernameSlugIdx: index('users_username_slug_idx').on(table.usernameSlug),
  }),
);

// Posts table
export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: postTypeEnum('type').notNull(),
    mediaUrl: text('media_url').notNull(),
    coverUrl: text('cover_url'), // Cover image for audio/document/3D posts
    caption: text('caption'),
    categories: text('categories').array(), // Content categories (e.g., Photography, Comics, Music)
    metadataUrl: text('metadata_url'), // Vercel Blob URL for NFT metadata JSON
    price: bigint('price', { mode: 'number' }), // Base units: lamports for SOL, base units for USDC
    currency: currencyEnum('currency'), // Required for editions
    maxSupply: integer('max_supply'), // null = open/unlimited edition
    currentSupply: integer('current_supply').notNull().default(0), // For editions only
    // NFT metadata fields (edition-specific in UI, but stored on all posts)
    nftName: text('nft_name'), // Custom NFT name (max 32 chars on-chain)
    nftSymbol: text('nft_symbol'), // Custom symbol (max 10 chars on-chain)
    nftDescription: text('nft_description'), // Separate from caption for NFT metadata
    sellerFeeBasisPoints: integer('seller_fee_basis_points'), // Creator royalties (0-10000), separate from platform fee
    isMutable: boolean('is_mutable').notNull().default(true), // Metadata mutability (default true)
    collectionAddress: text('collection_address'), // Optional collection association (future use)
    // Edition master mint fields
    masterMint: text('master_mint'), // Master edition mint address (set on first purchase)
    masterMetadataPda: text('master_metadata_pda'), // Master metadata PDA (optional, for debugging)
    masterEditionPda: text('master_edition_pda'), // Master edition PDA (optional, for debugging)
    creatorWallet: text('creator_wallet'), // Creator wallet address (canonical update authority target, set at post creation)
    // Minted snapshot fields (write-once at first confirmed mint)
    mintedAt: timestamp('minted_at'), // When first mint was confirmed
    mintedTxSignature: text('minted_tx_signature'), // First mint transaction signature
    mintedMetadataUri: text('minted_metadata_uri'), // The metadata URL used at mint time
    mintedMetadataJson: jsonb('minted_metadata_json'), // Full Metaplex JSON snapshot
    mintedIsMutable: boolean('minted_is_mutable'), // The actual mutability that was minted
    // On-chain sync tracking (for mutable NFTs)
    lastOnchainSyncAt: timestamp('last_onchain_sync_at'), // When metadata was last synced on-chain
    onchainSyncStatus: text('onchain_sync_status'), // 'synced' | 'pending' | 'failed'
    lastOnchainTxSignature: text('last_onchain_tx_signature'), // Last successful on-chain update tx
    isDeleted: boolean('is_deleted').notNull().default(false),
    isHidden: boolean('is_hidden').notNull().default(false),
    hiddenReason: text('hidden_reason'),
    hiddenAt: timestamp('hidden_at'), // When post was hidden
    hiddenByUserId: uuid('hidden_by_user_id').references(() => users.id), // User who hid the post
    reportCount: integer('report_count').notNull().default(0), // Number of reports for this post
    deletedAt: timestamp('deleted_at'), // Set when post is deleted
    deletedByUserId: uuid('deleted_by_user_id').references(() => users.id), // User who deleted the post
    deleteReason: text('delete_reason'), // Reason for deletion
    editedAt: timestamp('edited_at'), // Set when post is edited
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('posts_user_id_idx').on(table.userId),
    typeIdx: index('posts_type_idx').on(table.type),
    createdAtIdx: index('posts_created_at_idx').on(table.createdAt),
    filteredFeedIdx: index('posts_filtered_feed_idx').on(
      table.isDeleted,
      table.isHidden,
      table.createdAt,
    ),
  }),
);

// Collections table (for free collectibles - cNFTs)
export const collections = pgTable(
  'collections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    nftMint: text('nft_mint'), // Solana mint address, nullable for pending mints
    txSignature: text('tx_signature'), // Solana transaction signature for webhook correlation
    walletAddress: text('wallet_address'), // Wallet that received the cNFT (nullable for legacy rows)
    status: text('status').notNull().default('pending'), // 'pending' | 'confirmed' | 'failed'
    ipAddress: text('ip_address'), // Client IP for rate limiting (protects against wallet rotation)
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    // Unique index prevents duplicate collects per user per post
    userPostUniqueIdx: uniqueIndex('collections_user_post_unique_idx').on(
      table.userId,
      table.postId,
    ),
    userIdIdx: index('collections_user_id_idx').on(table.userId),
    postIdIdx: index('collections_post_id_idx').on(table.postId),
    statusIdx: index('collections_status_idx').on(table.status),
    ipAddressIdx: index('collections_ip_address_idx').on(table.ipAddress),
  }),
);

// Purchases table (for paid editions)
export const purchases = pgTable(
  'purchases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    nftMint: text('nft_mint'), // Solana mint address - only set after transaction confirmation
    buyerWalletAddress: text('buyer_wallet_address'), // Wallet that signed the payment (for multi-wallet support)
    amountPaid: bigint('amount_paid', { mode: 'number' }).notNull(), // Base units: lamports for SOL, base units for USDC
    currency: currencyEnum('currency').notNull(),
    txSignature: text('tx_signature'), // Payment transaction signature (user-signed)
    masterTxSignature: text('master_tx_signature'), // Master creation transaction signature (platform-signed, first purchase only)
    printTxSignature: text('print_tx_signature'), // Print creation transaction signature (platform-signed)
    status: text('status').notNull().default('reserved'), // 'reserved' | 'submitted' | 'awaiting_fulfillment' | 'minting' | 'master_created' | 'confirmed' | 'failed' | 'abandoned' | 'blocked_missing_master'
    // Fulfillment claim fields (prevents duplicate minting)
    fulfillmentKey: text('fulfillment_key'), // Unique key for current fulfillment attempt
    fulfillmentClaimedAt: timestamp('fulfillment_claimed_at'), // When fulfillment was claimed
    // Timestamps for each status milestone
    reservedAt: timestamp('reserved_at').notNull().defaultNow(), // When purchase was initiated (supply reserved)
    submittedAt: timestamp('submitted_at'), // When transaction was signed and submitted
    paymentConfirmedAt: timestamp('payment_confirmed_at'), // When payment transaction was confirmed on-chain
    mintingStartedAt: timestamp('minting_started_at'), // When minting process started
    mintConfirmedAt: timestamp('mint_confirmed_at'), // When NFT mint was confirmed on-chain (final success)
    confirmedAt: timestamp('confirmed_at'), // DEPRECATED: Use paymentConfirmedAt/mintConfirmedAt. Kept for migration compatibility.
    failedAt: timestamp('failed_at'), // When transaction failed or was abandoned
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('purchases_user_id_idx').on(table.userId),
    postIdIdx: index('purchases_post_id_idx').on(table.postId),
    statusIdx: index('purchases_status_idx').on(table.status),
    fulfillmentKeyIdx: index('purchases_fulfillment_key_idx').on(table.fulfillmentKey),
    txSignatureIdx: index('purchases_tx_signature_idx').on(table.txSignature),
  }),
);

// Follows table (for social graph - MVP scope)
export const follows = pgTable(
  'follows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    followerId: uuid('follower_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    followingId: uuid('following_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    // Unique index prevents duplicate follows
    followerFollowingUniqueIdx: uniqueIndex('follows_follower_following_unique_idx').on(
      table.followerId,
      table.followingId,
    ),
    followerIdIdx: index('follows_follower_id_idx').on(table.followerId),
    followingIdIdx: index('follows_following_id_idx').on(table.followingId),
  }),
);

// Likes table (for post likes)
export const likes = pgTable(
  'likes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    // Unique index prevents duplicate likes
    userPostUniqueIdx: uniqueIndex('likes_user_post_unique_idx').on(
      table.userId,
      table.postId,
    ),
    postIdIdx: index('likes_post_id_idx').on(table.postId),
    userIdIdx: index('likes_user_id_idx').on(table.userId),
  }),
);

// Comments table (for post comments)
export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    content: text('content').notNull(), // Max 280 characters enforced in application layer
    // Moderation fields
    isHidden: boolean('is_hidden').notNull().default(false),
    hiddenAt: timestamp('hidden_at'),
    hiddenByUserId: uuid('hidden_by_user_id').references(() => users.id),
    hiddenReason: text('hidden_reason'),
    isDeleted: boolean('is_deleted').notNull().default(false),
    deletedAt: timestamp('deleted_at'),
    deletedByUserId: uuid('deleted_by_user_id').references(() => users.id),
    deleteReason: text('delete_reason'),
    reportCount: integer('report_count').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    postIdIdx: index('comments_post_id_idx').on(table.postId),
    userIdIdx: index('comments_user_id_idx').on(table.userId),
    createdAtIdx: index('comments_created_at_idx').on(table.createdAt),
  }),
);

// Content reports table (for reporting posts and comments)
export const contentReports = pgTable(
  'content_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contentType: contentTypeEnum('content_type').notNull(), // 'post' | 'comment'
    contentId: uuid('content_id').notNull(), // Post ID or comment ID
    reportedByUserId: uuid('reported_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reasons: text('reasons').array().notNull(), // Array of report reasons
    details: text('details'), // Optional details (required if "Other" reason selected)
    status: reportStatusEnum('status').notNull().default('open'), // 'open' | 'reviewing' | 'resolved' | 'rejected'
    resolution: reportResolutionEnum('resolution'), // 'removed' | 'no_action' (set when resolved)
    resolvedByUserId: uuid('resolved_by_user_id').references(() => users.id), // Moderator/admin who resolved
    resolvedAt: timestamp('resolved_at'), // When report was resolved
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    // Unique constraint: one report per user per content item
    contentUserUniqueIdx: uniqueIndex('content_reports_content_user_unique_idx').on(
      table.contentType,
      table.contentId,
      table.reportedByUserId,
    ),
    // Index for querying reports by status and creation date
    statusCreatedIdx: index('content_reports_status_created_idx').on(table.status, table.createdAt),
    // Index for querying all reports for a specific content item
    contentIdx: index('content_reports_content_idx').on(table.contentType, table.contentId),
    reportedByUserIdIdx: index('content_reports_reported_by_user_id_idx').on(table.reportedByUserId),
  }),
);

// Notifications table (for user notifications)
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    referenceType: notificationReferenceTypeEnum('reference_type'),
    referenceId: uuid('reference_id'),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userReadCreatedIdx: index('notifications_user_read_created_idx').on(
      table.userId,
      table.isRead,
      table.createdAt,
    ),
    userCreatedIdx: index('notifications_user_created_idx').on(table.userId, table.createdAt),
    actorIdIdx: index('notifications_actor_id_idx').on(table.actorId),
  }),
);

// Push tokens table (for FCM push notifications)
export const pushTokens = pgTable(
  'push_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    platform: text('platform').notNull().default('android'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('push_tokens_user_idx').on(table.userId),
    tokenUnique: uniqueIndex('push_tokens_token_unique').on(table.token),
  }),
);

// Tags table (for hashtags - canonical storage)
export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(), // lowercase, no # (e.g., "photography")
    display: text('display'), // Optional original casing (e.g., "Photography")
    usageCount: integer('usage_count').notNull().default(0), // Maintained by DB triggers
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex('tags_slug_idx').on(table.slug),
    usageCountIdx: index('tags_usage_count_idx').on(table.usageCount),
  }),
);

// Post-tag junction table (for hashtag discovery)
export const postTags = pgTable(
  'post_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    postTagUniqueIdx: uniqueIndex('post_tags_post_tag_unique_idx').on(table.postId, table.tagId),
    tagIdIdx: index('post_tags_tag_id_idx').on(table.tagId),
    postIdIdx: index('post_tags_post_id_idx').on(table.postId),
  }),
);

// Mentions table (for @user mentions in posts and comments)
export const mentions = pgTable(
  'mentions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mentionedUserId: uuid('mentioned_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mentionerUserId: uuid('mentioner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    referenceType: notificationReferenceTypeEnum('reference_type').notNull(), // 'post' | 'comment'
    referenceId: uuid('reference_id').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    // Prevent duplicate mentions of same user in same content
    mentionedReferenceUniqueIdx: uniqueIndex('mentions_user_reference_unique_idx').on(
      table.mentionedUserId,
      table.referenceType,
      table.referenceId,
    ),
    mentionedUserIdIdx: index('mentions_mentioned_user_id_idx').on(table.mentionedUserId),
    referenceIdx: index('mentions_reference_idx').on(table.referenceType, table.referenceId),
  }),
);

// Post assets table (for multi-asset posts and gated downloads)
export const postAssets = pgTable(
  'post_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    storageProvider: text('storage_provider').notNull(), // 'vercel-blob' | 'r2' | 's3'
    storageKey: text('storage_key').notNull(), // Storage provider key/URL
    mimeType: text('mime_type').notNull(),
    fileSize: integer('file_size'), // Size in bytes
    sha256: text('sha256'), // SHA256 hash for integrity verification
    downloadName: text('download_name'), // Optional custom download filename
    isGated: boolean('is_gated').notNull().default(true), // Whether download requires NFT ownership
    // Multi-asset support fields
    sortOrder: integer('sort_order').notNull().default(0), // Display order (0-indexed)
    role: assetRoleEnum('role').notNull().default('media'), // 'media' (carousel) or 'download' (download-only)
    isPreviewable: boolean('is_previewable').notNull().default(true), // Whether asset can be previewed in carousel
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    postIdIdx: index('post_assets_post_id_idx').on(table.postId),
    postSortIdx: index('post_assets_post_sort_idx').on(table.postId, table.sortOrder),
    postRoleSortIdx: index('post_assets_post_role_sort_idx').on(table.postId, table.role, table.sortOrder),
  }),
);

// Download nonces table (for gated download authentication)
export const downloadNonces = pgTable(
  'download_nonces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nonce: text('nonce').notNull().unique(),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => postAssets.id, { onDelete: 'cascade' }),
    wallet: text('wallet').notNull(), // Wallet address requesting download
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'), // When nonce was used (single-use)
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    nonceIdx: uniqueIndex('download_nonces_nonce_idx').on(table.nonce),
    assetIdIdx: index('download_nonces_asset_id_idx').on(table.assetId),
    expiresAtIdx: index('download_nonces_expires_at_idx').on(table.expiresAt),
  }),
);

// Download tokens table (for gated download authorization)
export const downloadTokens = pgTable(
  'download_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    token: text('token').notNull().unique(),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => postAssets.id, { onDelete: 'cascade' }),
    wallet: text('wallet').notNull(), // Wallet address that authenticated
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'), // Optional: track usage (tokens can be reused within TTL)
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    tokenIdx: uniqueIndex('download_tokens_token_idx').on(table.token),
    assetIdIdx: index('download_tokens_asset_id_idx').on(table.assetId),
    expiresAtIdx: index('download_tokens_expires_at_idx').on(table.expiresAt),
  }),
);

// Beta feedback table (lightweight feedback inbox)
export const betaFeedback = pgTable(
  'beta_feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    displayName: text('display_name'), // Captured at submission time

    // All optional - require at least one in app logic
    rating: integer('rating'), // 1-5, nullable
    message: text('message'), // Max 1000 chars enforced in app, nullable
    imageUrl: text('image_url'), // Screenshot, nullable

    // Context (auto-captured, all optional)
    pageUrl: text('page_url'),
    appVersion: text('app_version'),
    userAgent: text('user_agent'),

    // Minimal status workflow
    status: feedbackStatusEnum('status').notNull().default('new'),
    reviewedAt: timestamp('reviewed_at'),
    reviewedByUserId: uuid('reviewed_by_user_id').references(() => users.id),

    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('beta_feedback_user_id_idx').on(table.userId),
    statusCreatedIdx: index('beta_feedback_status_created_idx').on(table.status, table.createdAt),
    ratingCheck: check('rating_range_check', sql`rating IS NULL OR (rating >= 1 AND rating <= 5)`),
  }),
);

// DM Threads table (one thread per user pair)
export const dmThreads = pgTable(
  'dm_threads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Unified model: user_a_id < user_b_id (sorted by UUID)
    userAId: uuid('user_a_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    userBId: uuid('user_b_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    // Who this conversation is "about" (for eligibility check at creation)
    contextCreatorId: uuid('context_creator_id').references(() => users.id, { onDelete: 'set null' }),
    // Who initiated (for rate limiting)
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    // Denormalized for list display
    lastMessageAt: timestamp('last_message_at'),
    lastMessagePreview: text('last_message_preview'), // ~100 chars, server-side only
    // Thread-level read receipts
    userALastReadAt: timestamp('user_a_last_read_at'),
    userBLastReadAt: timestamp('user_b_last_read_at'),
    // Archive state per user
    userAArchived: boolean('user_a_archived').notNull().default(false),
    userBArchived: boolean('user_b_archived').notNull().default(false),
    // Block state per user (user_a blocked user_b, etc.)
    userABlocked: boolean('user_a_blocked').notNull().default(false),
    userBBlocked: boolean('user_b_blocked').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // Unique constraint: one thread per user pair
    userPairUniqueIdx: uniqueIndex('dm_threads_user_pair_unique_idx').on(table.userAId, table.userBId),
    // For thread list queries
    userALastMessageIdx: index('dm_threads_user_a_last_message_idx').on(table.userAId, table.lastMessageAt),
    userBLastMessageIdx: index('dm_threads_user_b_last_message_idx').on(table.userBId, table.lastMessageAt),
    // For rate limiting query
    createdByUserIdIdx: index('dm_threads_created_by_user_id_idx').on(table.createdByUserId),
  }),
);

// DM Messages table
export const dmMessages = pgTable(
  'dm_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => dmThreads.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    content: text('content').notNull(), // Max 2000 chars enforced in app
    isDeleted: boolean('is_deleted').notNull().default(false),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    threadIdIdx: index('dm_messages_thread_id_idx').on(table.threadId),
    senderIdIdx: index('dm_messages_sender_id_idx').on(table.senderId),
    // For paginated message queries within a thread
    threadCreatedAtIdx: index('dm_messages_thread_created_at_idx').on(table.threadId, table.createdAt),
  }),
);

// User wallets table (multi-wallet support)
export const userWallets = pgTable('user_wallets', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  address: text('address').notNull(),
  type: text('type').notNull(), // 'embedded' | 'external'
  connector: text('connector'), // 'mwa', 'privy', etc.
  label: text('label'),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_wallets_user_id_idx').on(table.userId),
  uniqueUserAddress: unique('user_wallets_user_address_unique').on(table.userId, table.address),
}))

// Tips table (Seeker token tips between users)
export const tipStatusEnum = pgEnum('tip_status_enum', ['pending', 'confirmed', 'failed']);

export const tips = pgTable(
  'tips',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromUserId: uuid('from_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    toUserId: uuid('to_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    amount: bigint('amount', { mode: 'bigint' }).notNull(), // Raw token amount (smallest unit)
    tokenMint: text('token_mint').notNull(), // SPL token mint address (SKR)
    txSignature: text('tx_signature'), // Solana transaction signature
    status: tipStatusEnum('status').notNull().default('pending'),
    context: text('context'), // 'profile' | 'message_unlock'
    createdAt: timestamp('created_at').notNull().defaultNow(),
    confirmedAt: timestamp('confirmed_at'),
  },
  (table) => ({
    fromUserIdIdx: index('tips_from_user_id_idx').on(table.fromUserId),
    toUserIdIdx: index('tips_to_user_id_idx').on(table.toUserId),
    statusIdx: index('tips_status_idx').on(table.status),
    // For eligibility checks: sum confirmed tips from viewer to creator
    fromToStatusIdx: index('tips_from_to_status_idx').on(table.fromUserId, table.toUserId, table.status),
    txSignatureIdx: index('tips_tx_signature_idx').on(table.txSignature),
  }),
);

// Export types for use in queries
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;
export type Purchase = typeof purchases.$inferSelect;
export type NewPurchase = typeof purchases.$inferInsert;
export type Follow = typeof follows.$inferSelect;
export type NewFollow = typeof follows.$inferInsert;
export type Like = typeof likes.$inferSelect;
export type NewLike = typeof likes.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type ContentReport = typeof contentReports.$inferSelect;
export type NewContentReport = typeof contentReports.$inferInsert;
export type PostAsset = typeof postAssets.$inferSelect;
export type NewPostAsset = typeof postAssets.$inferInsert;
export type DownloadNonce = typeof downloadNonces.$inferSelect;
export type NewDownloadNonce = typeof downloadNonces.$inferInsert;
export type DownloadToken = typeof downloadTokens.$inferSelect;
export type NewDownloadToken = typeof downloadTokens.$inferInsert;
export type BetaFeedback = typeof betaFeedback.$inferSelect;
export type NewBetaFeedback = typeof betaFeedback.$inferInsert;
export type Mention = typeof mentions.$inferSelect;
export type NewMention = typeof mentions.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type PostTag = typeof postTags.$inferSelect;
export type NewPostTag = typeof postTags.$inferInsert;
export type DmThread = typeof dmThreads.$inferSelect;
export type NewDmThread = typeof dmThreads.$inferInsert;
export type DmMessage = typeof dmMessages.$inferSelect;
export type NewDmMessage = typeof dmMessages.$inferInsert;
export type UserWallet = typeof userWallets.$inferSelect;
export type NewUserWallet = typeof userWallets.$inferInsert;
export type Tip = typeof tips.$inferSelect;
export type NewTip = typeof tips.$inferInsert;
export type PushToken = typeof pushTokens.$inferSelect;
export type NewPushToken = typeof pushTokens.$inferInsert;

// User preferences type (stored as JSONB in users.preferences)
export type UserPreferencesJson = {
  theme?: 'light' | 'dark' | 'system'
  explorer?: 'orb' | 'solscan' | 'solana-explorer' | 'solanafm'
  notifications?: {
    follows?: boolean
    likes?: boolean
    comments?: boolean
    collects?: boolean
    purchases?: boolean
    mentions?: boolean
    messages?: boolean
  }
  messaging?: {
    dmEnabled?: boolean // default true - master toggle
    allowBuyers?: boolean // default true
    allowCollectors?: boolean // default true
    collectorMinCount?: number // default 3
    allowTippers?: boolean // default true - allow tippers to message
    tipMinAmount?: number // min SKR tokens to unlock DMs (human-readable, e.g. 5 = 5 SKR)
  }
}

