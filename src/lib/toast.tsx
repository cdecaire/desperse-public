import { toast as sableToast } from '@cdecaire/sable'

interface ToastOptions {
  /**
   * Auto-dismiss time in ms. Pass `Infinity` (or `0`) to keep the toast until
   * dismissed. Mapped to Sable's `timeout` under the hood.
   *
   * NOTE: The legacy Sonner wrapper used `duration`; we keep that name here so
   * every existing call site (e.g. `toastSuccess(msg, { duration })`) stays
   * unchanged. Internally it becomes `timeout`.
   */
  duration?: number
}

// Sonner used `Infinity` for "persist forever"; Sable/Base UI uses `0`.
function toSableTimeout(duration?: number): number | undefined {
  if (duration === undefined) return undefined
  if (duration === Number.POSITIVE_INFINITY) return 0
  return duration
}

function show(
  variant: 'success' | 'error' | 'info' | 'warning',
  message: string,
  options?: ToastOptions
): string {
  const timeout = toSableTimeout(options?.duration)
  const opts = timeout === undefined ? undefined : { timeout }
  // Sable maps `type` → accent (success/error/warning/info) and shows the
  // message as the toast title. Default timeout (5000ms) matches the old wrapper.
  return sableToast[variant](message, opts)
}

export function toastSuccess(message: string, options?: ToastOptions) {
  return show('success', message, options)
}

export function toastError(message: string, options?: ToastOptions) {
  return show('error', message, options)
}

export function toastInfo(message: string, options?: ToastOptions) {
  return show('info', message, options)
}

export function toastWarning(message: string, options?: ToastOptions) {
  return show('warning', message, options)
}

// Re-export dismiss for manual control. Sable's `dismiss(id?)` closes a single
// toast by id, or all toasts when called with no id — same contract as Sonner's.
export const dismissToast = sableToast.dismiss
