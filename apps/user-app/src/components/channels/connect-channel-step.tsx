import { ExternalLink, AlertCircle, AlertTriangle } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";

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

interface ConnectChannelStepProps {
  channelId: string;
  onChannelIdChange: (value: string) => void;
  verifyResult: VerifyResponse | null;
  onVerify: () => void;
  isVerifying: boolean;
  botUsername: string;
}

export function ConnectChannelStep({
  channelId,
  onChannelIdChange,
  verifyResult,
  onVerify,
  isVerifying,
  botUsername,
}: ConnectChannelStepProps) {
  return (
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
            onChange={(e) => onChannelIdChange(e.target.value)}
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
          onClick={onVerify}
          disabled={!channelId || isVerifying}
          className="w-full"
        >
          {isVerifying ? (
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
  );
}
