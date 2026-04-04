/**
 * GET /api/v1/pfp/metadata?mint=<ADDRESS>
 *
 * Fetches the off-chain metadata JSON for a minted Core NFT.
 * Reads the asset's URI from on-chain, then fetches the JSON from Arweave/Irys.
 */

import {
	defineEventHandler,
	getQuery,
	setHeaders,
	setResponseStatus,
} from "h3"
import { getEchoesUmi } from "@/server/services/blockchain/echoes/echoesUmiClient"
import { fetchAssetV1 } from "@metaplex-foundation/mpl-core"
import { publicKey as umiPublicKey } from "@metaplex-foundation/umi"
import { generateImageToken } from "@/server/utils/echoes/image-tokens"

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	setHeaders(event, {
		"X-Request-Id": requestId,
		"X-Api-Version": "1",
		"Cache-Control": "public, max-age=60",
	})

	const { mint } = getQuery(event) as { mint?: string }

	if (!mint) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: { code: "VALIDATION_ERROR", message: "mint query parameter is required" },
			requestId,
		}
	}

	try {
		const umi = getEchoesUmi()
		const asset = await fetchAssetV1(umi, umiPublicKey(mint))

		// Fetch the off-chain metadata JSON from the URI
		const metadataRes = await fetch(asset.uri, { signal: AbortSignal.timeout(10_000) })
		if (!metadataRes.ok) {
			throw new Error(`Failed to fetch metadata from ${asset.uri}: ${metadataRes.status}`)
		}

		const metadata = await metadataRes.json()

		// Override image URL to use optimized proxy instead of raw Arweave/Irys
		const itemIndex = parseInt(asset.name.replace(/\D/g, ''), 10)
		if (!isNaN(itemIndex)) {
			const token = generateImageToken(itemIndex)
			metadata.image = `/api/v1/pfp/image/${itemIndex}?t=${token}`
		}

		return {
			success: true,
			data: {
				name: asset.name,
				uri: asset.uri,
				metadata,
			},
			requestId,
		}
	} catch (error) {
		const msg = error instanceof Error ? error.message : "Unknown error"
		console.error(`[pfp-metadata][${requestId}] Error:`, msg)
		setResponseStatus(event, 500)
		return {
			success: false,
			error: { code: "FETCH_FAILED", message: msg },
			requestId,
		}
	}
})
