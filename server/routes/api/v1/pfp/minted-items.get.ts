/**
 * GET /api/v1/pfp/minted-items
 *
 * Returns which Candy Machine item indices have been minted.
 * Public endpoint — no auth required (collection reveal state is public info).
 */

import {
	defineEventHandler,
	setHeaders,
} from "h3";
import { getEchoesUmi, getCandyMachinePublicKey } from "@/server/services/blockchain/echoes/echoesUmiClient";
import { fetchCandyMachine } from "@metaplex-foundation/mpl-core-candy-machine";

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`;

	setHeaders(event, {
		"X-Request-Id": requestId,
		"X-Api-Version": "1",
		// Cache for 30s — minted state doesn't change rapidly
		"Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
	});

	try {
		const umi = getEchoesUmi();
		const cmPublicKey = getCandyMachinePublicKey();
		const cm = await fetchCandyMachine(umi, cmPublicKey);

		const mintedIndices: number[] = [];
		for (let i = 0; i < cm.items.length; i++) {
			if (cm.items[i].minted) {
				mintedIndices.push(i);
			}
		}

		return {
			success: true,
			data: {
				mintedIndices,
				total: Number(cm.data.itemsAvailable),
				minted: mintedIndices.length,
			},
			requestId,
		};
	} catch (error) {
		// Pre-mint / no CM configured — return empty set (nothing revealed)
		console.warn(
			`[pfp-minted-items][${requestId}] CM not available, returning empty:`,
			error instanceof Error ? error.message : String(error),
		);
		return {
			success: true,
			data: {
				mintedIndices: [],
				total: 0,
				minted: 0,
			},
			requestId,
		};
	}
});
