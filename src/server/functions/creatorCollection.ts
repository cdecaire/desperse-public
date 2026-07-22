/**
 * Public API for editing a creator's live collectibles collection.
 *
 * Boundary-clean: this file exports only a createServerFn wrapper and delegates all
 * DB + blockchain work to the server util (updateCreatorCollection). No DB/Drizzle
 * or blockchain SDK imports here — those would leak Node-only code into the client
 * bundle (see CLAUDE.md server-function boundary rules).
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { withAuth } from '@/server/auth';
import { updateCreatorCollection } from '@/server/services/blockchain/compressed/updateCreatorCollection';

const updateCollectionSchema = z.object({
  collectionName: z.string().trim().max(50).nullable().optional(),
  collectionImageUrl: z.string().url().nullable().optional(),
});

export const updateMyCollection = createServerFn({ method: 'POST' }).handler(
  async (input: unknown) => {
    const result = await withAuth(updateCollectionSchema, input);
    if (!result) {
      return { success: false as const, status: 401, error: 'Authentication required. Please log in.' };
    }
    const { auth, input: data } = result;
    return updateCreatorCollection(auth.userId, {
      collectionName: data.collectionName ?? null,
      collectionImageUrl: data.collectionImageUrl ?? null,
    });
  },
);
