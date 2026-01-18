import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useAuthStore } from "~/hooks/useAuth";
import { env } from "~/env";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Spinner } from "~/components/ui/spinner";
import { TelegramIcon } from "~/components/auth/telegram-icon";
import { LoginCodeDisplay } from "~/components/auth/login-code-display";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated } = useAuthStore();
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const botUsername = env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

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

  useEffect(() => {
    if (!code || !isPolling) return;

    const pollInterval = setInterval(async () => {
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

  useEffect(() => {
    generateCode();
  }, [generateCode]);

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
            <LoginCodeDisplay
              code={code}
              expiresAt={expiresAt}
              isPolling={isPolling}
              isGenerating={isGenerating}
              botUsername={botUsername}
              onGenerateNew={generateCode}
            />
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
