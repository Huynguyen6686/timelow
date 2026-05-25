import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-2xl border-t border-l border-white/5 border-b border-r border-black/40 bg-slate-950/30 px-4 text-base transition-all duration-300 outline-none placeholder:text-muted-foreground/40 shadow-[inset_3px_3px_8px_rgba(0,0,0,0.5),inset_-1px_-1px_3px_rgba(255,255,255,0.01)] hover:bg-slate-950/40 text-foreground focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/10 focus-visible:shadow-[0_0_15px_rgba(52,211,153,0.12),inset_3px_3px_8px_rgba(0,0,0,0.6)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
