import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-text)]",
        primary: "bg-[var(--badge-info-bg)] text-[var(--badge-info-text)]",
        success: "bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]",
        warning: "bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)]",
        error: "bg-[var(--badge-error-bg)] text-[var(--badge-error-text)]",
        info: "bg-[var(--badge-info-bg)] text-[var(--badge-info-text)]",
        purple: "bg-[var(--badge-purple-bg)] text-[var(--badge-purple-text)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  icon?: ReactNode;
}

function Badge({ className, variant, icon, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {icon}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
