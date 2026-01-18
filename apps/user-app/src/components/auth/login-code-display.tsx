import { ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { TelegramIcon } from "./telegram-icon";
import { LoginStep } from "./login-step";

interface LoginCodeDisplayProps {
  code: string;
  expiresAt: Date | null;
  isPolling: boolean;
  isGenerating: boolean;
  botUsername: string;
  onGenerateNew: () => void;
}

export function LoginCodeDisplay({
  code,
  expiresAt,
  isPolling,
  isGenerating,
  botUsername,
  onGenerateNew,
}: LoginCodeDisplayProps) {
  const telegramLink = `https://t.me/${botUsername}`;
  const minutesRemaining = expiresAt
    ? Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 1000 / 60))
    : 5;

  return (
    <div className="space-y-6">
      {/* Code display */}
      <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-6 text-center">
        <p className="text-sm text-[var(--text-secondary)] mb-2">
          Your login code:
        </p>
        <div className="text-4xl font-mono font-bold tracking-[0.3em] text-[var(--accent-primary)]">
          {code}
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mt-3">
          Expires in {minutesRemaining} minutes
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        <LoginStep number={1}>
          Open our bot{" "}
          <a
            href={telegramLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--text-link)] hover:underline font-medium"
          >
            @{botUsername}
          </a>{" "}
          in Telegram
        </LoginStep>
        <LoginStep number={2}>
          Send the code{" "}
          <span className="font-mono font-semibold text-[var(--text-primary)]">
            {code}
          </span>{" "}
          to the bot
        </LoginStep>
        <LoginStep number={3}>
          You'll be automatically redirected once verified
        </LoginStep>
      </div>

      {/* Primary CTA */}
      <Button asChild className="w-full" size="lg">
        <a href={telegramLink} target="_blank" rel="noopener noreferrer">
          <TelegramIcon className="h-5 w-5" />
          Open Telegram Bot
          <ExternalLink className="h-4 w-4 ml-1" />
        </a>
      </Button>

      {/* Polling indicator */}
      {isPolling && (
        <p className="text-center text-sm text-[var(--text-secondary)] flex items-center justify-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[var(--status-online)] animate-pulse" />
          Waiting for verification...
        </p>
      )}

      {/* Generate new code */}
      <Button
        variant="ghost"
        onClick={onGenerateNew}
        disabled={isGenerating}
        className="w-full"
      >
        <RefreshCw className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
        Generate new code
      </Button>
    </div>
  );
}
