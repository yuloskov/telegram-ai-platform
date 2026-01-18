import { useState } from "react";
import { useRouter } from "next/router";
import { useMutation } from "@tanstack/react-query";
import { useRequireAuth } from "~/hooks/useAuth";
import { env } from "~/env";
import { Header } from "~/components/layout/header";
import { PageLayout, PageSection } from "~/components/layout/page-layout";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Check, AlertCircle, AlertTriangle, ExternalLink } from "lucide-react";

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
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <PageLayout title="Add Channel">
      <Header title="Add Channel" backHref="/channels" />

      <div className="max-w-xl mx-auto">
        {/* Progress Steps */}
        <PageSection className="mt-6">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-4">
              <StepIndicator number={1} active={step >= 1} completed={step > 1} />
              <div
                className={`w-16 h-0.5 ${
                  step >= 2 ? "bg-[var(--accent-primary)]" : "bg-[var(--border-primary)]"
                }`}
              />
              <StepIndicator number={2} active={step >= 2} />
            </div>
          </div>
        </PageSection>

        {step === 1 && (
          <PageSection className="mt-6">
            <Card className="p-6">
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">
                Step 1: Connect your channel
              </h2>

              {/* Instructions */}
              <div className="bg-[var(--accent-tertiary)] rounded-[var(--radius-md)] p-4 mb-6">
                <h3 className="font-medium text-[var(--accent-primary)] mb-2 text-sm">
                  Before you start:
                </h3>
                <ol className="text-sm text-[var(--text-secondary)] space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="font-medium text-[var(--accent-primary)]">1.</span>
                    <span>
                      Add{" "}
                      <a
                        href={`https://t.me/${botUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-[var(--text-link)] hover:underline inline-flex items-center gap-1"
                      >
                        @{botUsername}
                        <ExternalLink className="h-3 w-3" />
                      </a>{" "}
                      as an administrator to your channel
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium text-[var(--accent-primary)]">2.</span>
                    <span>Make sure the bot has permission to post messages</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium text-[var(--accent-primary)]">3.</span>
                    <span>Enter your channel username or ID below</span>
                  </li>
                </ol>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Channel Username or ID
                  </label>
                  <Input
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    placeholder="@channelname or -1001234567890"
                  />
                  <p className="text-xs text-[var(--text-tertiary)] mt-1.5">
                    You can find your channel ID by forwarding a message to @userinfobot
                  </p>
                </div>

                {verifyResult && !verifyResult.valid && (
                  <div className="flex items-start gap-3 bg-[#f8d7da] text-[#721c24] p-4 rounded-[var(--radius-md)]">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <p className="text-sm">
                      {verifyResult.error || "Could not verify channel"}
                    </p>
                  </div>
                )}

                {verifyResult && verifyResult.valid && !verifyResult.canPost && (
                  <div className="flex items-start gap-3 bg-[#fff3cd] text-[#856404] p-4 rounded-[var(--radius-md)]">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                    <p className="text-sm">
                      Bot found in channel but doesn't have posting permissions. Please
                      update the bot's admin rights.
                    </p>
                  </div>
                )}

                <Button
                  onClick={() => verifyMutation.mutate(channelId)}
                  disabled={!channelId || verifyMutation.isPending}
                  className="w-full"
                >
                  {verifyMutation.isPending ? (
                    <>
                      <Spinner size="sm" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Channel"
                  )}
                </Button>
              </div>
            </Card>
          </PageSection>
        )}

        {step === 2 && verifyResult?.channelInfo && (
          <PageSection className="mt-6">
            <Card className="p-6">
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">
                Step 2: Configure your channel
              </h2>

              {/* Success banner */}
              <div className="flex items-center gap-3 bg-[#d4edda] rounded-[var(--radius-md)] p-4 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#155724]">
                  <Check className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-[#155724]">
                    {verifyResult.channelInfo.title}
                  </p>
                  {verifyResult.channelInfo.username && (
                    <p className="text-sm text-[#155724]/80">
                      @{verifyResult.channelInfo.username}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Niche/Topic (optional)
                  </label>
                  <Input
                    value={settings.niche}
                    onChange={(e) => setSettings({ ...settings, niche: e.target.value })}
                    placeholder="e.g., tech news, crypto, lifestyle"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Tone
                  </label>
                  <Select
                    value={settings.tone}
                    onValueChange={(value) => setSettings({ ...settings, tone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="humorous">Humorous</SelectItem>
                      <SelectItem value="informative">Informative</SelectItem>
                      <SelectItem value="inspirational">Inspirational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Language
                  </label>
                  <Select
                    value={settings.language}
                    onValueChange={(value) => setSettings({ ...settings, language: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ru">Russian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Default Hashtags (comma-separated, optional)
                  </label>
                  <Input
                    value={settings.hashtags}
                    onChange={(e) => setSettings({ ...settings, hashtags: e.target.value })}
                    placeholder="#tech, #news, #daily"
                  />
                </div>

                {createMutation.isError && (
                  <div className="flex items-start gap-3 bg-[#f8d7da] text-[#721c24] p-4 rounded-[var(--radius-md)]">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <p className="text-sm">
                      {createMutation.error instanceof Error
                        ? createMutation.error.message
                        : "Failed to create channel"}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending}
                    className="flex-1"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Spinner size="sm" />
                        Creating...
                      </>
                    ) : (
                      "Add Channel"
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </PageSection>
        )}
      </div>
    </PageLayout>
  );
}

function StepIndicator({
  number,
  active,
  completed,
}: {
  number: number;
  active: boolean;
  completed?: boolean;
}) {
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
