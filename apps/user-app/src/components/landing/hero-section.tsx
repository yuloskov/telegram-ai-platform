import Link from "next/link";
import { Sparkles, ArrowRight, Play } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useI18n } from "~/i18n";
import { HeroDashboardPreview } from "./hero-dashboard-preview";

export function HeroSection() {
  const { t } = useI18n();

  return (
    <section className="relative min-h-[600px] sm:min-h-[90vh] flex items-center justify-center overflow-hidden">
      <HeroBackground />

      <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-12 sm:py-20 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 mb-8 animate-fade-in-up">
          <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
          <span className="text-sm font-medium text-[var(--accent-primary)]">
            {t("landing.badge")}
          </span>
        </div>

        {/* Main headline */}
        <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold text-[var(--text-primary)] mb-6 tracking-tight animate-fade-in-up animation-delay-100">
          {t("landing.heroTitle").split(' ').slice(0, 2).join(' ')}
          <br />
          <span className="bg-gradient-to-r from-[var(--accent-primary)] via-[var(--accent-secondary)] to-[var(--accent-primary)] bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
            {t("landing.heroTitle").split(' ').slice(2).join(' ')}
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-[var(--text-secondary)] mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
          {t("landing.heroSubtitle")}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in-up animation-delay-300">
          <Button size="lg" asChild className="group text-base px-8 h-14 rounded-xl shadow-lg shadow-[var(--accent-primary)]/25 hover:shadow-xl hover:shadow-[var(--accent-primary)]/30 transition-all">
            <Link href="/login" className="flex items-center gap-2">
              {t("landing.getStarted")}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
          <Button size="lg" variant="secondary" className="text-base px-8 h-14 rounded-xl" asChild>
            <Link href="#features" className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              {t("landing.seeHowItWorks")}
            </Link>
          </Button>
        </div>

        <HeroDashboardPreview />
      </div>
    </section>
  );
}

function HeroBackground() {
  return (
    <div className="absolute inset-0 bg-[var(--bg-primary)]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--accent-tertiary)_0%,transparent_50%)] opacity-60" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,var(--accent-tertiary)_0%,transparent_40%)] opacity-40" />
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(var(--text-primary) 1px, transparent 1px),
                            linear-gradient(90deg, var(--text-primary) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />
      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-48 sm:w-80 md:w-96 h-48 sm:h-80 md:h-96 bg-[var(--accent-primary)] rounded-full blur-[120px] opacity-20 animate-float-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-40 sm:w-64 md:w-80 h-40 sm:h-64 md:h-80 bg-[var(--accent-secondary)] rounded-full blur-[100px] opacity-15 animate-float-slower" />
    </div>
  );
}
