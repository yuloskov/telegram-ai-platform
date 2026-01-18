import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useAuthStore } from "~/hooks/useAuth";
import { env } from "~/env";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Spinner } from "~/components/ui/spinner";
import { ExternalLink, RefreshCw } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated } = useAuthStore();
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const botUsername = env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const generateCode = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/code", { method: "POST" });
      const data = await res.json();

      if (data.success && data.data) {
        setCode(data.data.code);
        setExpiresAt(new Date(data.data.expiresAt));
        setIsPolling(true);
      } else {
        setError(data.error || "Failed to generate code");
      }
    } catch {
      setError("Failed to generate code. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Poll for verification
  useEffect(() => {
    if (!code || !isPolling) return;

    const pollInterval = setInterval(async () => {
      // Check if code expired
      if (expiresAt && new Date() > expiresAt) {
        setIsPolling(false);
        setCode(null);
        setError("Code expired. Please generate a new one.");
        return;
      }

      try {
        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const data = await res.json();

        if (data.success && data.data?.authenticated) {
          setIsPolling(false);
          setAuth(data.data.user);
          router.push("/");
        }
      } catch {
        // Continue polling on error
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [code, isPolling, expiresAt, setAuth, router]);

  // Generate code on mount
  useEffect(() => {
    generateCode();
  }, [generateCode]);

  const telegramLink = `https://t.me/${botUsername}`;

  return (
    <>
      <Head>
        <title>Login - AI Telegram Channels</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-secondary)]">
        <Card className="w-full max-w-md p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-primary)] mx-auto mb-4">
              <TelegramIcon className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">
              Login with Telegram
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-2">
              Authenticate securely via our Telegram bot
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-[#f8d7da] text-[#721c24] p-4 rounded-[var(--radius-md)] mb-6 text-sm">
              {error}
            </div>
          )}

          {code ? (
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
                  Expires in{" "}
                  {expiresAt
                    ? Math.max(
                        0,
                        Math.round((expiresAt.getTime() - Date.now()) / 1000 / 60)
                      )
                    : 5}{" "}
                  minutes
                </p>
              </div>

              {/* Steps */}
              <div className="space-y-4">
                <Step number={1}>
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
                </Step>
                <Step number={2}>
                  Send the code{" "}
                  <span className="font-mono font-semibold text-[var(--text-primary)]">
                    {code}
                  </span>{" "}
                  to the bot
                </Step>
                <Step number={3}>
                  You'll be automatically redirected once verified
                </Step>
              </div>

              {/* Primary CTA */}
              <Button asChild className="w-full" size="lg">
                <a
                  href={telegramLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
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
              <button
                onClick={generateCode}
                disabled={isGenerating}
                className="w-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm py-2 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
                Generate new code
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-4">
                  <Spinner size="lg" />
                  <p className="text-sm text-[var(--text-secondary)]">
                    Generating code...
                  </p>
                </div>
              ) : (
                <Button onClick={generateCode} size="lg">
                  Generate Login Code
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function Step({ number, children }: { number: number; children: React.ReactNode }) {
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

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
    </svg>
  );
}
