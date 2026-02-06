import { Bot, Sparkles } from "lucide-react";
import { useI18n } from "~/i18n";

export function HeroDashboardPreview() {
  const { t } = useI18n();

  return (
    <div className="relative max-w-4xl mx-auto animate-fade-in-up animation-delay-400">
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-r from-[var(--accent-primary)]/20 via-[var(--accent-secondary)]/20 to-[var(--accent-primary)]/20 rounded-3xl blur-2xl opacity-60" />

      {/* Dashboard mockup */}
      <div className="relative bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-secondary)] shadow-2xl overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-[var(--bg-secondary)] border-b border-[var(--border-secondary)]">
          <div className="flex gap-1 sm:gap-1.5">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-[#febc2e]" />
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="px-3 sm:px-4 py-1 rounded-md bg-[var(--bg-tertiary)] text-[10px] sm:text-xs text-[var(--text-tertiary)]">
              app.telegramaiadmin.com
            </div>
          </div>
        </div>

        {/* Dashboard content */}
        <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
          <StatsRow />
          <ContentPreview />
        </div>
      </div>
    </div>
  );
}

function StatsRow() {
  const { t } = useI18n();

  const stats = [
    { label: t("landing.previewPostsGenerated"), value: "1,247", trend: "+12%" },
    { label: t("landing.previewActiveChannels"), value: "8", trend: "+2" },
    { label: t("landing.previewEngagementRate"), value: "4.8%", trend: "+0.3%" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
      {stats.map((stat, i) => (
        <div key={i} className="p-3 sm:p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-secondary)]">
          <div className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">{stat.value}</div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-[var(--text-tertiary)]">{stat.label}</span>
            <span className="text-xs text-[var(--status-success)]">{stat.trend}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ContentPreview() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
      <div className="flex-1 p-3 sm:p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-secondary)]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)] flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-medium text-[var(--text-primary)]">{t("landing.previewAiDraft")}</div>
            <div className="text-xs text-[var(--text-tertiary)]">{t("landing.previewReadyForReview")}</div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-2 w-full bg-[var(--bg-tertiary)] rounded" />
          <div className="h-2 w-4/5 bg-[var(--bg-tertiary)] rounded" />
          <div className="h-2 w-3/4 bg-[var(--bg-tertiary)] rounded" />
        </div>
      </div>
      <div className="w-full sm:w-48 p-3 sm:p-4 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white">
        <Sparkles className="w-6 h-6 mb-2" />
        <div className="text-sm font-medium">{t("landing.previewGenerateNew")}</div>
        <div className="text-xs opacity-80">{t("landing.previewCreateAi")}</div>
      </div>
    </div>
  );
}
