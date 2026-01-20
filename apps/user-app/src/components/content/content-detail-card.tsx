import type { ReactNode } from "react";
import { Card } from "~/components/ui/card";
import { Chip, type ChipProps } from "~/components/content/content-list-item";
import { useI18n } from "~/i18n";

interface ContentDetailCardProps {
  text: string | null;
  mediaUrls?: string[];
  chips?: ChipProps[];
  metrics?: ReactNode;
  date?: string;
  errorMessage?: string | null;
}

export function ContentDetailCard({
  text,
  mediaUrls = [],
  chips = [],
  metrics,
  date,
  errorMessage,
}: ContentDetailCardProps) {
  const { t } = useI18n();

  const validMediaUrls = mediaUrls.filter(
    (url) => !url.startsWith("skipped:") && !url.startsWith("failed:")
  );

  return (
    <Card className="p-6">
      {/* Media */}
      {validMediaUrls.length > 0 && (
        <div
          className="mb-4 grid gap-2"
          style={{
            gridTemplateColumns:
              validMediaUrls.length === 1 ? "1fr" : "repeat(2, 1fr)",
          }}
        >
          {validMediaUrls.map((url, idx) => (
            <div
              key={idx}
              className="rounded-[var(--radius-md)] overflow-hidden bg-[var(--bg-secondary)]"
            >
              <img
                src={`/api/media/${url}`}
                alt=""
                className="w-full h-auto max-h-96 object-contain"
                onError={(e) => {
                  e.currentTarget.parentElement!.style.display = "none";
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Text content with chips */}
      <div className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {text ? (
              <p className="text-[var(--text-primary)] whitespace-pre-wrap">
                {text}
              </p>
            ) : (
              <p className="text-[var(--text-tertiary)] italic">
                {t("sources.mediaOnly")}
              </p>
            )}
          </div>
          {chips.length > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              {chips.map((chip, idx) => (
                <Chip key={idx} {...chip} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-[var(--status-error-subtle)] rounded-[var(--radius-md)]">
          <p className="text-sm text-[var(--status-error)]">{errorMessage}</p>
        </div>
      )}

      {/* Footer (metrics and date) */}
      {(metrics || date) && (
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border-secondary)]">
          {metrics || <div />}
          {date && (
            <span className="text-sm text-[var(--text-tertiary)]">
              {new Date(date).toLocaleString()}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
