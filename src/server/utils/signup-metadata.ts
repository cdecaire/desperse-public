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
