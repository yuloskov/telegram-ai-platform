import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useMutation } from "@tanstack/react-query";
import { useRequireAuth } from "~/hooks/useAuth";
import { env } from "~/env";

interface VerifyResponse {
  valid: boolean;
  canPost: boolean;
  channelInfo?: {
    id: number;
    title: string;
    username?: string;
  };
  error?: string;
}

export default function NewChannelPage() {
  const router = useRouter();
  const { isLoading: authLoading } = useRequireAuth();

  const [step, setStep] = useState(1);
  const [channelId, setChannelId] = useState("");
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);
  const [settings, setSettings] = useState({
    niche: "",
    tone: "professional",
    language: "en",
    hashtags: "",
  });

  const botUsername = env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  const verifyMutation = useMutation({
    mutationFn: async (channelId: string) => {
      const res = await fetch("/api/channels/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
      const data = await res.json();
      return data.data as VerifyResponse;
    },
    onSuccess: (data) => {
      setVerifyResult(data);
      if (data.valid && data.canPost) {
        setStep(2);
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramId: verifyResult?.channelInfo?.id,
          title: verifyResult?.channelInfo?.title,
          niche: settings.niche || null,
          tone: settings.tone,
          language: settings.language,
          hashtags: settings.hashtags
            .split(",")
            .map((h) => h.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error);
      }
      return data.data;
    },
    onSuccess: (data) => {
      router.push(`/channels/${data.id}`);
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Add Channel - AI Telegram Channels</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
            <Link href="/channels" className="text-gray-600 hover:text-gray-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">Add Channel</h1>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8">
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? "bg-blue-500 text-white" : "bg-gray-200"}`}>
                1
              </div>
              <div className={`w-16 h-1 ${step >= 2 ? "bg-blue-500" : "bg-gray-200"}`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? "bg-blue-500 text-white" : "bg-gray-200"}`}>
                2
              </div>
            </div>
          </div>

          {step === 1 && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Step 1: Connect your channel
              </h2>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-blue-900 mb-2">Before you start:</h3>
                <ol className="text-sm text-blue-800 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="font-medium">1.</span>
                    <span>
                      Add{" "}
                      <a
                        href={`https://t.me/${botUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium underline"
                      >
                        @{botUsername}
                      </a>{" "}
                      as an administrator to your channel
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium">2.</span>
                    <span>Make sure the bot has permission to post messages</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium">3.</span>
                    <span>Enter your channel username or ID below</span>
                  </li>
                </ol>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Channel Username or ID
                  </label>
                  <input
                    type="text"
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    placeholder="@channelname or -1001234567890"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    You can find your channel ID by forwarding a message to @userinfobot
                  </p>
                </div>

                {verifyResult && !verifyResult.valid && (
                  <div className="bg-red-50 text-red-700 p-4 rounded-lg">
                    {verifyResult.error || "Could not verify channel"}
                  </div>
                )}

                {verifyResult && verifyResult.valid && !verifyResult.canPost && (
                  <div className="bg-yellow-50 text-yellow-700 p-4 rounded-lg">
                    Bot found in channel but doesn't have posting permissions. Please update the bot's admin rights.
                  </div>
                )}

                <button
                  onClick={() => verifyMutation.mutate(channelId)}
                  disabled={!channelId || verifyMutation.isPending}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  {verifyMutation.isPending ? "Verifying..." : "Verify Channel"}
                </button>
              </div>
            </div>
          )}

          {step === 2 && verifyResult?.channelInfo && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Step 2: Configure your channel
              </h2>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="font-medium text-green-900">
                      {verifyResult.channelInfo.title}
                    </p>
                    {verifyResult.channelInfo.username && (
                      <p className="text-sm text-green-700">
                        @{verifyResult.channelInfo.username}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Niche/Topic (optional)
                  </label>
                  <input
                    type="text"
                    value={settings.niche}
                    onChange={(e) => setSettings({ ...settings, niche: e.target.value })}
                    placeholder="e.g., tech news, crypto, lifestyle"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tone
                  </label>
                  <select
                    value={settings.tone}
                    onChange={(e) => setSettings({ ...settings, tone: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="humorous">Humorous</option>
                    <option value="informative">Informative</option>
                    <option value="inspirational">Inspirational</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Language
                  </label>
                  <select
                    value={settings.language}
                    onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="en">English</option>
                    <option value="ru">Russian</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Hashtags (comma-separated, optional)
                  </label>
                  <input
                    type="text"
                    value={settings.hashtags}
                    onChange={(e) => setSettings({ ...settings, hashtags: e.target.value })}
                    placeholder="#tech, #news, #daily"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {createMutation.isError && (
                  <div className="bg-red-50 text-red-700 p-4 rounded-lg">
                    {createMutation.error instanceof Error
                      ? createMutation.error.message
                      : "Failed to create channel"}
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    {createMutation.isPending ? "Creating..." : "Add Channel"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
