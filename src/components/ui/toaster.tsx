import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      // Offset to center within content area on desktop (accounting for 256px sidebar)
      className="lg:!left-[calc(50%+128px)]"
      // Push below the status bar on PWA/notched devices
      style={{ top: 'calc(0.5rem + env(safe-area-inset-top, 0px))' }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: 'w-full max-w-[420px]',
        },
      }}
    />
  )
}
