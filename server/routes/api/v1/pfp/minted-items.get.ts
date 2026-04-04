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
import { echoesEnv } from "@/config/echoes-env";
import { getEchoesHeliusRpcUrl } from "@/config/echoes-env";

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
	nftMintAddress?: string
}

// In-memory metadata cache — keyed by item index
const metadataCache = new Map<number, MintedItemMetadata>();

// Cache for index → nftMintAddress mapping (from DAS)
let mintAddressCache: Map<number, string> | null = null
let mintAddressCacheTime = 0
const MINT_ADDRESS_CACHE_TTL = 60_000 // 1 minute

async function getMintAddressMap(): Promise<Map<number, string>> {
	if (mintAddressCache && Date.now() - mintAddressCacheTime < MINT_ADDRESS_CACHE_TTL) {
		return mintAddressCache
	}

	const collectionAddress = echoesEnv.PFP_COLLECTION_ADDRESS
	if (!collectionAddress) return new Map()

	try {
		const rpcUrl = getEchoesHeliusRpcUrl()
		const res = await fetch(rpcUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "getAssetsByGroup",
				params: { groupKey: "collection", groupValue: collectionAddress, limit: 1000 },
			}),
			signal: AbortSignal.timeout(10_000),
		})
		const json = await res.json() as any
		const assets = json?.result?.items ?? []

		const map = new Map<number, string>()
		for (const asset of assets) {
			// Parse index from name like "Echo #  42" or "Echo #42"
			const match = asset.content?.metadata?.name?.match(/\d+/)
			if (match) {
				map.set(parseInt(match[0], 10), asset.id)
			}
		}

		mintAddressCache = map
		mintAddressCacheTime = Date.now()
		return map
	} catch (err) {
		console.warn("[pfp-minted-items] Failed to fetch collection assets for mint addresses:", err instanceof Error ? err.message : err)
		return mintAddressCache ?? new Map()
	}
}

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

		// Fetch all metadata + mint addresses in parallel
		const [metadataResults, mintAddressMap] = await Promise.all([
			Promise.all(metadataFetches),
			getMintAddressMap(),
		])
		const mintedMetadata = metadataResults
			.filter((m): m is MintedItemMetadata => m !== null)
			.map((m) => ({ ...m, nftMintAddress: mintAddressMap.get(m.index) }))

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
