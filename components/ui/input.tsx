import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:border-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-700/40 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
