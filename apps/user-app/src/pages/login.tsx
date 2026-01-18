import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useAuthStore } from "~/hooks/useAuth";
import { env } from "~/env";

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Login with Telegram
            </h1>
            <p className="text-gray-600 mt-2">
              Authenticate securely via our Telegram bot
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          {code ? (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6 text-center">
                <p className="text-sm text-gray-600 mb-2">Your login code:</p>
                <div className="text-4xl font-mono font-bold tracking-widest text-blue-600">
                  {code}
                </div>
                <p className="text-xs text-gray-500 mt-2">
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

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-sm font-bold">1</span>
                  </div>
                  <p className="text-gray-700">
                    Open our bot{" "}
                    <a
                      href={telegramLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      @{botUsername}
                    </a>{" "}
                    in Telegram
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-sm font-bold">2</span>
                  </div>
                  <p className="text-gray-700">
                    Send the code <span className="font-mono font-bold">{code}</span> to
                    the bot
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-sm font-bold">3</span>
                  </div>
                  <p className="text-gray-700">
                    You'll be automatically redirected once verified
                  </p>
                </div>
              </div>

              <a
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg text-center transition-colors"
              >
                Open Telegram Bot
              </a>

              {isPolling && (
                <p className="text-center text-sm text-gray-500">
                  <span className="inline-block animate-pulse mr-2">●</span>
                  Waiting for verification...
                </p>
              )}

              <button
                onClick={generateCode}
                disabled={isGenerating}
                className="w-full text-gray-600 hover:text-gray-900 text-sm py-2 transition-colors disabled:opacity-50"
              >
                Generate new code
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <button
                onClick={generateCode}
                disabled={isGenerating}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
              >
                {isGenerating ? "Generating..." : "Generate Login Code"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
