import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-(--highlight) selection:text-white bg-zinc-50 dark:bg-zinc-800 border-border dark:border-zinc-700/50 table-cell align-middle h-10 w-full min-w-0 rounded-sm border px-3 py-1 text-base font-medium leading-tight tracking-[-0.01em] transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring dark:focus-visible:border-zinc-500/50 focus-visible:ring-ring/30 focus-visible:ring-2",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
