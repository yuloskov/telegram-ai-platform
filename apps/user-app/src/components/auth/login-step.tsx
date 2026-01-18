import type { ReactNode } from "react";

interface LoginStepProps {
  number: number;
  children: ReactNode;
}

export function LoginStep({ number, children }: LoginStepProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-tertiary)] shrink-0 mt-0.5">
        <span className="text-[var(--accent-primary)] text-sm font-semibold">
          {number}
        </span>
      </div>
      <p className="text-sm text-[var(--text-secondary)]">{children}</p>
    </div>
  );
}
