import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      // Offset to center within content area on desktop (accounting for 256px sidebar)
      className="lg:!left-[calc(50%+128px)]"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: 'w-full max-w-[420px]',
        },
      }}
    />
  )
}
