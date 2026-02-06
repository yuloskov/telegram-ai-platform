import Link from "next/link";
import { TrendingUp, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useI18n } from "~/i18n";
import { TelegramIcon } from "./telegram-icon";

export function CTASection() {
  const { t } = useI18n();

  return (
    <section className="relative py-24 bg-[var(--bg-secondary)] overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] h-[300px] bg-gradient-to-t from-[var(--accent-tertiary)] to-transparent opacity-40 blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 md:px-6 lg:px-8 text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] mb-8 shadow-lg shadow-[var(--accent-primary)]/25">
          <TelegramIcon className="w-10 h-10 text-white" />
        </div>

        <h2 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-4">
          {t("landing.ctaTitle")}
        </h2>
        <p className="text-lg text-[var(--text-secondary)] mb-10 max-w-xl mx-auto">
          {t("landing.ctaSubtitle")}
        </p>

        <Button size="lg" asChild className="group text-base px-10 h-14 rounded-xl shadow-lg shadow-[var(--accent-primary)]/25 hover:shadow-xl hover:shadow-[var(--accent-primary)]/30 transition-all">
          <Link href="/login" className="flex items-center gap-2">
            {t("landing.getStarted")}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>

        {/* Trust badges */}
        <div className="mt-8 sm:mt-12 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-[var(--text-tertiary)]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--status-success)]" />
            {t("landing.trustFreeToStart")}
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--status-success)]" />
            {t("landing.trustNoCreditCard")}
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--status-success)]" />
            {t("landing.trustCancelAnytime")}
          </div>
        </div>
      </div>
    </section>
  );
}
