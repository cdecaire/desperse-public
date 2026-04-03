/**
 * GET /api/v1/pfp/minted-items
 *
 * Returns which Candy Machine item indices have been minted,
 * along with their off-chain metadata (fetched from URIs and cached).
 * Public endpoint — no auth required (collection reveal state is public info).
 */

import {
	defineEventHandler,
	setHeaders,
} from "h3";
import { getEchoesUmi, getCandyMachinePublicKey } from "@/server/services/blockchain/echoes/echoesUmiClient";
import { fetchCandyMachine } from "@metaplex-foundation/mpl-core-candy-machine";

interface EchoAttribute {
	trait_type: string
	value: string | number
	display_type?: string
}

interface MintedItemMetadata {
	index: number
	name: string
	image: string
	attributes: EchoAttribute[]
}

// In-memory metadata cache — keyed by item index
const metadataCache = new Map<number, MintedItemMetadata>();

async function fetchItemMetadata(uri: string, index: number, name: string): Promise<MintedItemMetadata | null> {
	// Check cache first
	const cached = metadataCache.get(index);
	if (cached) return cached;

	try {
		const res = await fetch(uri, { signal: AbortSignal.timeout(5_000) });
		if (!res.ok) return null;
		const json = await res.json() as { name?: string; image?: string; attributes?: EchoAttribute[] };
		const meta: MintedItemMetadata = {
			index,
			name: json.name ?? name,
			image: json.image ?? `${index}.png`,
			attributes: json.attributes ?? [],
		};
		metadataCache.set(index, meta);
		return meta;
	} catch {
		return null;
	}
}

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
		const metadataFetches: Promise<MintedItemMetadata | null>[] = [];

		for (let i = 0; i < cm.items.length; i++) {
			if (cm.items[i].minted) {
				mintedIndices.push(i);
				const uri = cm.items[i].uri;
				metadataFetches.push(fetchItemMetadata(uri, i, cm.items[i].name));
			}
		}

		// Fetch all metadata in parallel
		const metadataResults = await Promise.all(metadataFetches);
		const mintedMetadata = metadataResults.filter((m): m is MintedItemMetadata => m !== null);

		return {
			success: true,
			data: {
				mintedIndices,
				total: Number(cm.data.itemsAvailable),
				minted: mintedIndices.length,
				mintedMetadata,
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
				mintedMetadata: [],
			},
			requestId,
		};
	}
});
