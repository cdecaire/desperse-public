/**
 * Hook for polling post counts (collect counts and supply) for visible posts
 * Polls every 5-10 seconds to keep feed data fresh
 */

import { useQuery } from '@tanstack/react-query';
import { getPostCounts } from '@/server/functions/posts';

export interface PostCounts {
  collectCount: number;
  currentSupply: number;
}

interface UsePostCountsPollingOptions {
  /** Post IDs to poll for */
  postIds: string[];
  /** Whether polling is enabled */
  enabled?: boolean;
  /** Polling interval in milliseconds (default: 8 seconds) */
  intervalMs?: number;
}

/**
 * Hook that polls for post counts
 * Polls all provided post IDs every intervalMs
 * Returns a map of postId -> counts
 */
export function usePostCountsPolling({
  postIds,
  enabled = true,
  intervalMs = 8000, // 8 seconds - good balance between freshness and server load
}: UsePostCountsPollingOptions): Record<string, PostCounts> {
  const { data } = useQuery({
    queryKey: ['postCounts', [...postIds].sort().join(',')],
    queryFn: async () => {
      if (postIds.length === 0) {
        return { success: true, counts: {} };
      }
      
      // Split into batches of 50 (server limit)
      const batches: string[][] = [];
      for (let i = 0; i < postIds.length; i += 50) {
        batches.push(postIds.slice(i, i + 50));
      }
      
      const allCounts: Record<string, PostCounts> = {};
      
      await Promise.all(
        batches.map(async (batch) => {
          const result = await getPostCounts({
            data: { postIds: batch },
          });
          
          if (result.success) {
            Object.assign(allCounts, result.counts);
          }
        })
      );
      
      return { success: true, counts: allCounts };
    },
    enabled: enabled && postIds.length > 0,
    refetchInterval: intervalMs,
    staleTime: intervalMs / 2,
    gcTime: 30 * 1000,
  });

  return data?.counts || {};
}

