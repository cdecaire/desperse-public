import { toastSuccess, toastError, toastInfo, toastWarning, dismissToast } from '@/lib/toast'

// Create a toast object that matches the old API (toast.success, toast.error, etc.)
function toast(message: string, options?: { duration?: number }) {
  return toastInfo(message, options)
}

toast.success = toastSuccess
toast.error = toastError
toast.info = toastInfo
toast.warning = toastWarning

// Hook for components that need the dismiss function
function useToast() {
  return {
    toast,
    dismiss: dismissToast,
  }
}

export { useToast, toast }
