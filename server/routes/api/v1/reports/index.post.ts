/**
 * POST /api/v1/reports
 * Create a content report (post, comment, or dm_thread)
 *
 * Body:
 * - contentType: 'post' | 'comment' | 'dm_thread'
 * - contentId: UUID of the content
 * - reasons: string[] (at least one required)
 * - details: string (optional, max 500 chars)
 *
 * Returns:
 * - reportId: UUID of the created report
 */

import { defineEventHandler, getHeader, readBody } from 'h3'
import { createReportDirect } from '@/server/utils/reports'

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	try {
		// Get auth token from header
		const authHeader = getHeader(event, 'authorization')
		const token = authHeader?.replace('Bearer ', '')

		if (!token) {
			event.node!.res!.statusCode = 401
			return {
				success: false,
				error: { code: 'unauthorized', message: 'Authentication required' },
				requestId,
			}
		}

		// Parse request body
		const body = await readBody(event) as Record<string, any>

		if (!body || typeof body !== 'object') {
			event.node!.res!.statusCode = 400
			return {
				success: false,
				error: { code: 'invalid_body', message: 'Request body is required' },
				requestId,
			}
		}

		const { contentType, contentId, reasons, details } = body

		// Validate contentType
		if (!contentType || !['post', 'comment', 'dm_thread'].includes(contentType)) {
			event.node!.res!.statusCode = 400
			return {
				success: false,
				error: { code: 'invalid_content_type', message: 'contentType must be post, comment, or dm_thread' },
				requestId,
			}
		}

		// Validate contentId
		if (!contentId || typeof contentId !== 'string') {
			event.node!.res!.statusCode = 400
			return {
				success: false,
				error: { code: 'invalid_content_id', message: 'contentId is required' },
				requestId,
			}
		}

		// Validate reasons
		if (!reasons || !Array.isArray(reasons) || reasons.length === 0) {
			event.node!.res!.statusCode = 400
			return {
				success: false,
				error: { code: 'invalid_reasons', message: 'At least one reason is required' },
				requestId,
			}
		}

		// Validate details length
		if (details && typeof details === 'string' && details.length > 500) {
			event.node!.res!.statusCode = 400
			return {
				success: false,
				error: { code: 'details_too_long', message: 'Details must be 500 characters or less' },
				requestId,
			}
		}

		const result = await createReportDirect(token, {
			contentType,
			contentId,
			reasons,
			details: details || null,
		})

		if (!result.success) {
			// Determine appropriate status code
			let statusCode = 400
			if (result.error === 'Authentication required') {
				statusCode = 401
			} else if (result.error?.includes('not found')) {
				statusCode = 404
			} else if (result.error?.includes('already reported')) {
				statusCode = 409 // Conflict
			}

			event.node!.res!.statusCode = statusCode
			return {
				success: false,
				error: { code: 'report_failed', message: result.error },
				requestId,
			}
		}

		return {
			success: true,
			data: {
				reportId: result.reportId,
			},
			requestId,
		}
	} catch (error) {
		console.error('[POST /reports] Error:', error)
		event.node!.res!.statusCode = 500
		return {
			success: false,
			error: { code: 'internal_error', message: 'Failed to create report' },
			requestId,
		}
	}
})
