import { ExternalLink } from "lucide-react";
import { TelegramHtml } from "~/components/telegram/telegram-html";
import { useI18n } from "~/i18n";

interface SourceMedia {
  url: string;
  type: string;
}

interface SourcePostCardProps {
  text: string | null;
  telegramLink: string;
  media: SourceMedia[];
}

export function SourcePostCard({ text, telegramLink, media }: SourcePostCardProps) {
  const { t } = useI18n();

  const images = media.filter((m) => m.type === "photo" || m.type.startsWith("image"));
  const videos = media.filter((m) => m.type === "video" || m.type.startsWith("video"));

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-secondary)] bg-[var(--bg-secondary)] overflow-hidden">
      {/* Media */}
      {images.length > 0 && (
        <div className={`grid gap-1 ${images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {images.slice(0, 4).map((img, idx) => (
            <div key={idx} className="relative aspect-video bg-[var(--bg-tertiary)]">
              <img
                src={img.url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {idx === 3 && images.length > 4 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-medium">
                  +{images.length - 4}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {videos.length > 0 && images.length === 0 && videos[0] && (
        <div className="aspect-video bg-[var(--bg-tertiary)] flex items-center justify-center">
          <video
            src={videos[0].url}
            controls
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Text */}
        {text && (
          <div className="text-sm text-[var(--text-primary)]">
            <TelegramHtml content={text} />
          </div>
        )}

        {/* Link */}
        <a
          href={telegramLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--accent-primary)] hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          {t("generatePage.viewOriginal")}
        </a>
      </div>
    </div>
  );
}
