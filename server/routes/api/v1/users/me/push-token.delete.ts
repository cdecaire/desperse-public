import { defineEventHandler, getHeader, readBody, setResponseStatus } from 'h3'
import { unregisterPushTokenDirect } from '@/server/utils/pushTokens'

export default defineEventHandler(async (event) => {
  const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

  try {
    const token = getHeader(event, 'authorization')?.replace('Bearer ', '')
    if (!token) {
      setResponseStatus(event, 401)
      return {
        success: false,
        error: { code: 'unauthorized', message: 'Authentication required' },
        requestId,
      }
    }

    const body = await readBody(event)
    if (!body?.token) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: { code: 'bad_request', message: 'Push token is required' },
        requestId,
      }
    }

    const result = await unregisterPushTokenDirect(token, body.token)

    if (!result.success) {
      setResponseStatus(event, 401)
      return {
        success: false,
        error: { code: 'unauthorized', message: result.error },
        requestId,
      }
    }

    return { success: true, data: {}, requestId }
  } catch (error) {
    console.error('[push-token.delete] Error:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      error: {
        code: 'internal_error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      requestId,
    }
  }
})
