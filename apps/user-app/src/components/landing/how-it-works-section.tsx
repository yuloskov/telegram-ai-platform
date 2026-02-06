import { Bot, FileText, Sparkles, TrendingUp, CheckCircle2 } from "lucide-react";
import { useI18n } from "~/i18n";

export function HowItWorksSection() {
  const { t } = useI18n();

  const steps = [
    {
      step: "01",
      title: t("landing.step1Title"),
      description: t("landing.step1Description"),
      icon: Bot,
    },
    {
      step: "02",
      title: t("landing.step2Title"),
      description: t("landing.step2Description"),
      icon: FileText,
    },
    {
      step: "03",
      title: t("landing.step3Title"),
      description: t("landing.step3Description"),
      icon: Sparkles,
    },
    {
      step: "04",
      title: t("landing.step4Title"),
      description: t("landing.step4Description"),
      icon: TrendingUp,
    },
  ];

  return (
    <section className="relative py-24 bg-[var(--bg-primary)]">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[400px] bg-gradient-to-b from-[var(--accent-tertiary)] to-transparent opacity-30 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--status-success)]/10 text-[var(--status-success)] text-sm font-medium mb-4">
            <CheckCircle2 className="w-4 h-4" />
            {t("landing.howItWorksBadge")}
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-4">
            {t("landing.howItWorksTitle")}
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            {t("landing.howItWorksSubtitle")}
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {steps.map((item, index) => (
            <div key={index} className="relative group text-center lg:text-left">
              {/* Icon with step number */}
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accent-primary)] mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-[var(--accent-primary)]/25">
                <item.icon className="w-8 h-8 text-white" />
              </div>

              {/* Step indicator */}
              <div className="text-xs font-semibold text-[var(--accent-primary)] uppercase tracking-wider mb-2">
                {item.step}
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
