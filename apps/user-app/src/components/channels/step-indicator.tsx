import { Check } from "lucide-react";

interface StepIndicatorProps {
  number: number;
  active: boolean;
  completed?: boolean;
}

export function StepIndicator({ number, active, completed }: StepIndicatorProps) {
  return (
    <div
      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
        active
          ? "bg-[var(--accent-primary)] text-white"
          : "bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]"
      }`}
    >
      {completed ? <Check className="h-4 w-4" /> : number}
    </div>
  );
}
