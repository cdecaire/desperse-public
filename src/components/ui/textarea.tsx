import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-border dark:border-zinc-700/50 placeholder:text-muted-foreground focus-visible:border-ring dark:focus-visible:border-zinc-500/50 focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-zinc-50 dark:bg-zinc-800 flex field-sizing-content min-h-16 w-full rounded-sm border px-3 py-2 text-base font-medium leading-snug tracking-[-0.01em] transition-[color,box-shadow] outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
