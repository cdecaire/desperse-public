import { track } from '@vercel/analytics'

const MAX_FIELD_LENGTH = 2_000

interface ClientErrorReport {
  source: 'react_error_boundary'
  error: Error
  componentStack?: string | null
}

function truncate(value: string | undefined | null): string | null {
  if (!value) {
    return null
  }

  return value.length > MAX_FIELD_LENGTH
    ? `${value.slice(0, MAX_FIELD_LENGTH)}…`
    : value
}

export function reportClientError({
  source,
  error,
  componentStack,
}: ClientErrorReport) {
  if (typeof window === 'undefined') {
    return
  }

  const properties = {
    source,
    message: truncate(error.message),
    name: error.name || 'Error',
    stack: truncate(error.stack),
    componentStack: truncate(componentStack),
    path: window.location.pathname,
  }

  track(source, properties)

  if (import.meta.env.DEV) {
    console.error('[client-error-reporting]', error, { componentStack })
  }
}
