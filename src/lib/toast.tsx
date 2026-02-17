import { toast as sonnerToast } from 'sonner'

interface ToastOptions {
  duration?: number
}

// Icon component matching current design
function ToastIcon({ variant }: { variant: 'success' | 'error' | 'info' | 'warning' }) {
  const config = {
    success: { icon: 'fa-check', bgColor: 'rgb(34, 197, 94)' },
    error: { icon: 'fa-exclamation', bgColor: 'rgb(239, 68, 68)' },
    info: { icon: 'fa-info', bgColor: 'rgb(59, 130, 246)' },
    warning: { icon: 'fa-exclamation', bgColor: 'rgb(234, 179, 8)' },
  }[variant]

  return (
    <div
      className="flex items-center justify-center rounded-full flex-shrink-0"
      style={{ backgroundColor: config.bgColor, width: '20px', height: '20px' }}
    >
      <i
        className={`fa-solid ${config.icon}`}
        style={{ color: 'white', fontSize: '10px' }}
        aria-hidden="true"
      />
    </div>
  )
}

// Close button matching current design
function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-auto flex-shrink-0 w-6 h-6 flex items-center justify-center opacity-70 transition-opacity hover:opacity-100 focus:outline-none bg-transparent border-0 p-0 cursor-pointer"
      aria-label="Close"
    >
      <i className="fa-solid fa-xmark text-primary-foreground text-sm" aria-hidden="true" />
    </button>
  )
}

// Custom toast renderer
function CustomToast({
  message,
  variant,
  toastId,
}: {
  message: string
  variant: 'success' | 'error' | 'info' | 'warning'
  toastId: string | number
}) {
  // Detect if message will be multiline (rough heuristic: > 60 chars)
  const isMultiline = message.length > 60
  const borderRadius = isMultiline ? 'rounded-lg' : 'rounded-full'

  return (
    <div
      className={`flex w-full items-center gap-2.5 px-4 py-2.5 bg-primary text-primary-foreground ${borderRadius} shadow-lg shadow-black/10 dark:shadow-black/30 hover:scale-105 hover:shadow-xl active:scale-95 transform-gpu transition-all min-h-[44px] font-['Figtree',system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif]`}
    >
      <ToastIcon variant={variant} />
      <span className="text-sm font-semibold flex-1 leading-tight">{message}</span>
      <CloseButton onClick={() => sonnerToast.dismiss(toastId)} />
    </div>
  )
}

function createToast(message: string, variant: 'success' | 'error' | 'info' | 'warning', options?: ToastOptions) {
  return sonnerToast.custom(
    (id) => <CustomToast message={message} variant={variant} toastId={id} />,
    {
      duration: options?.duration ?? 5000,
    }
  )
}

export function toastSuccess(message: string, options?: ToastOptions) {
  return createToast(message, 'success', options)
}

export function toastError(message: string, options?: ToastOptions) {
  return createToast(message, 'error', options)
}

export function toastInfo(message: string, options?: ToastOptions) {
  return createToast(message, 'info', options)
}

export function toastWarning(message: string, options?: ToastOptions) {
  return createToast(message, 'warning', options)
}

// Re-export dismiss for manual control
export const dismissToast = sonnerToast.dismiss
