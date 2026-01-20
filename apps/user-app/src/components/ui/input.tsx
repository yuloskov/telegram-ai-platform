import * as React from "react";
import { cn } from "~/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-[var(--radius-md)] border border-[var(--border-secondary)]/50 bg-[var(--bg-primary)] px-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors duration-150",
          "hover:border-[var(--border-primary)]",
          "focus:outline-none focus:border-[var(--accent-primary)] focus:ring-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-[var(--status-error)] focus:border-[var(--status-error)]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
