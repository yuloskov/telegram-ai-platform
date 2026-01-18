import * as React from "react";
import { cn } from "~/lib/utils";

interface MessageBubbleProps {
  content: string;
  timestamp?: string;
  status?: "sent" | "delivered" | "read";
  className?: string;
}

export function MessageBubble({
  content,
  timestamp,
  status = "sent",
  className,
}: MessageBubbleProps) {
  return (
    <div className={cn("flex justify-end", className)}>
      <div className="relative max-w-[480px]">
        {/* Message bubble */}
        <div className="rounded-[var(--radius-lg)] rounded-br-[var(--radius-sm)] bg-[var(--bg-message)] px-3 py-2">
          {/* Content */}
          <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap break-words">
            {content}
          </p>

          {/* Meta (timestamp + status) */}
          <div className="flex items-center justify-end gap-1 mt-1">
            {timestamp && (
              <span className="text-[11px] text-[var(--text-secondary)] opacity-60">
                {timestamp}
              </span>
            )}
            {status && (
              <MessageStatus status={status} />
            )}
          </div>
        </div>

        {/* Bubble tail */}
        <svg
          className="absolute -right-2 bottom-0 h-5 w-5 text-[var(--bg-message)]"
          viewBox="0 0 20 20"
        >
          <path
            fill="currentColor"
            d="M0 20 Q0 10 10 10 Q15 10 20 0 L20 20 Z"
          />
        </svg>
      </div>
    </div>
  );
}

function MessageStatus({ status }: { status: "sent" | "delivered" | "read" }) {
  const className = cn(
    "h-[14px] w-[14px]",
    status === "read" ? "text-[var(--accent-primary)]" : "text-[var(--text-secondary)] opacity-60"
  );

  if (status === "sent") {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none">
        <path
          d="M5 8.5l2 2 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Double check for delivered/read
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path
        d="M2 8.5l2 2 4-4M6 8.5l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface MessagePreviewProps {
  content: string;
  channelName?: string;
  timestamp?: string;
  className?: string;
}

export function MessagePreview({
  content,
  channelName,
  timestamp,
  className,
}: MessagePreviewProps) {
  const now = new Date();
  const displayTime = timestamp || `${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}`;

  return (
    <div className={cn("bg-[var(--bg-tertiary)] rounded-[var(--radius-lg)] p-4", className)}>
      {/* Channel header */}
      {channelName && (
        <div className="mb-3 flex items-center gap-2 pb-3 border-b border-[var(--border-secondary)]">
          <div className="h-8 w-8 rounded-full bg-[var(--accent-primary)] flex items-center justify-center">
            <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
            </svg>
          </div>
          <span className="font-medium text-sm text-[var(--text-primary)]">{channelName}</span>
        </div>
      )}

      {/* Message */}
      <MessageBubble content={content} timestamp={displayTime} status="read" />
    </div>
  );
}
