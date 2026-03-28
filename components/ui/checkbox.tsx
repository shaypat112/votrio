"use client";

import * as React from "react";
import { cn } from "@/app/lib/utils";

export type CheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "type"
> & {
  onCheckedChange?: (checked: boolean) => void;
};

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, checked, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          "h-4 w-4 rounded border border-zinc-700 bg-zinc-950 text-white",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600",
          className,
        )}
        checked={checked}
        onChange={(event) => {
          onCheckedChange?.(event.target.checked);
          props.onChange?.(event);
        }}
        {...props}
      />
    );
  },
);

Checkbox.displayName = "Checkbox";
