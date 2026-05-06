import type { H3Event } from 'h3'
import { getHeader, getRequestIP } from 'h3'

export type SignupMetadata = {
	ip: string | null
	country: string | null
	userAgent: string | null
}

export function extractSignupMetadata(event: H3Event): SignupMetadata {
	const ip = getRequestIP(event, { xForwardedFor: true }) || null
	const country = getHeader(event, 'x-vercel-ip-country') || null
	const userAgent = getHeader(event, 'user-agent') || null
	return { ip, country, userAgent }
}

export function extractSignupMetadataFromHeaders(headers: Headers): SignupMetadata {
	const xff = headers.get('x-forwarded-for')
	const ip = xff ? xff.split(',')[0].trim() : (headers.get('x-real-ip') || null)
	const country = headers.get('x-vercel-ip-country') || null
	const userAgent = headers.get('user-agent') || null
	return { ip, country, userAgent }
}
