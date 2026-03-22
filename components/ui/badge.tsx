import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/app/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border border-zinc-700/60 bg-zinc-900 px-2.5 py-0.5 text-xs font-medium text-zinc-200",
  {
    variants: {
      variant: {
        default: "bg-zinc-900 text-zinc-200",
        outline: "bg-transparent text-zinc-300",
        subtle: "bg-zinc-800/60 text-zinc-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props} />
  );
}

export { Badge, badgeVariants };
