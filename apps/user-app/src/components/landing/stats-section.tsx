import { useI18n } from "~/i18n";

export function StatsSection() {
  const { t } = useI18n();

  const stats = [
    { value: "10K+", label: t("landing.statPostsGenerated") },
    { value: "500+", label: t("landing.statActiveChannels") },
    { value: "99.9%", label: t("landing.statUptime") },
    { value: "24/7", label: t("landing.statAiAvailable") },
  ];

  return (
    <section className="py-20 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]">
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm text-white/70">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
