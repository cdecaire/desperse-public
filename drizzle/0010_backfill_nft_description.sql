-- Backfill nftDescription with caption for existing edition/collectible posts that don't have it set
UPDATE posts 
SET nft_description = caption 
WHERE (type = 'edition' OR type = 'collectible') 
  AND nft_description IS NULL 
  AND caption IS NOT NULL;

