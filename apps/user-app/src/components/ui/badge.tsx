import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]",
        primary: "bg-[var(--accent-tertiary)] text-[var(--accent-primary)]",
        success: "bg-[#d4edda] text-[#155724]",
        warning: "bg-[#fff3cd] text-[#856404]",
        error: "bg-[#f8d7da] text-[#721c24]",
        info: "bg-[#cce5ff] text-[#004085]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
