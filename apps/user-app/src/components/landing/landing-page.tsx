import Link from "next/link";
import {
  Sparkles,
  Zap,
  Bot,
  Calendar,
  FileText,
  TrendingUp,
  ArrowRight,
  Play,
  CheckCircle2,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { useI18n } from "~/i18n";
import { PublicHeader, PageLayout } from "~/components/layout";

export function LandingPage() {
  const { t } = useI18n();

  return (
    <PageLayout title={t("landing.pageTitle")} description={t("landing.pageDescription")}>
      <div className="relative overflow-hidden">
        <PublicHeader />
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <StatsSection />
        <CTASection />
        <Footer />
      </div>
    </PageLayout>
  );
}

function HeroSection() {
  const { t } = useI18n();

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Animated background */}
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
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--accent-primary)] rounded-full blur-[120px] opacity-20 animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[var(--accent-secondary)] rounded-full blur-[100px] opacity-15 animate-float-slower" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-20 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 mb-8 animate-fade-in-up">
          <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
          <span className="text-sm font-medium text-[var(--accent-primary)]">
            {t("landing.badge")}
          </span>
        </div>

        {/* Main headline */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-[var(--text-primary)] mb-6 tracking-tight animate-fade-in-up animation-delay-100">
          {t("landing.heroTitle").split(' ').slice(0, 2).join(' ')}
          <br />
          <span className="bg-gradient-to-r from-[var(--accent-primary)] via-[var(--accent-secondary)] to-[var(--accent-primary)] bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
            {t("landing.heroTitle").split(' ').slice(2).join(' ')}
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-[var(--text-secondary)] mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
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

        {/* Hero visual - Mock dashboard */}
        <HeroDashboardPreview />
      </div>
    </section>
  );
}

function HeroDashboardPreview() {
  const { t } = useI18n();

  return (
    <div className="relative max-w-4xl mx-auto animate-fade-in-up animation-delay-400">
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-r from-[var(--accent-primary)]/20 via-[var(--accent-secondary)]/20 to-[var(--accent-primary)]/20 rounded-3xl blur-2xl opacity-60" />

      {/* Dashboard mockup */}
      <div className="relative bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-secondary)] shadow-2xl overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border-secondary)]">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="px-4 py-1 rounded-md bg-[var(--bg-tertiary)] text-xs text-[var(--text-tertiary)]">
              app.telegramaiadmin.com
            </div>
          </div>
        </div>

        {/* Dashboard content */}
        <div className="p-6 space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: t("landing.previewPostsGenerated"), value: "1,247", trend: "+12%" },
              { label: t("landing.previewActiveChannels"), value: "8", trend: "+2" },
              { label: t("landing.previewEngagementRate"), value: "4.8%", trend: "+0.3%" },
            ].map((stat, i) => (
              <div key={i} className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-secondary)]">
                <div className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-[var(--text-tertiary)]">{stat.label}</span>
                  <span className="text-xs text-[var(--status-success)]">{stat.trend}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Content preview */}
          <div className="flex gap-4">
            <div className="flex-1 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-secondary)]">
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
            <div className="w-48 p-4 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white">
              <Sparkles className="w-6 h-6 mb-2" />
              <div className="text-sm font-medium">{t("landing.previewGenerateNew")}</div>
              <div className="text-xs opacity-80">{t("landing.previewCreateAi")}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturesSection() {
  const { t } = useI18n();

  const features = [
    {
      icon: Sparkles,
      title: t("landing.feature1Title"),
      description: t("landing.feature1Description"),
      color: "var(--accent-primary)",
      gradient: "from-blue-500/20 to-cyan-500/20",
    },
    {
      icon: FileText,
      title: t("landing.feature2Title"),
      description: t("landing.feature2Description"),
      color: "#f59e0b",
      gradient: "from-amber-500/20 to-orange-500/20",
    },
    {
      icon: Bot,
      title: t("landing.feature3Title"),
      description: t("landing.feature3Description"),
      color: "#10b981",
      gradient: "from-emerald-500/20 to-green-500/20",
    },
    {
      icon: Calendar,
      title: t("landing.feature4Title"),
      description: t("landing.feature4Description"),
      color: "#8b5cf6",
      gradient: "from-violet-500/20 to-purple-500/20",
    },
  ];

  return (
    <section id="features" className="relative py-24 bg-[var(--bg-secondary)]">
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-sm font-medium mb-4">
            <Zap className="w-4 h-4" />
            {t("landing.featuresBadge")}
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-4">
            {t("landing.featuresTitle")}
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            {t("landing.featuresSubtitle")}
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  description: string;
  color: string;
  gradient: string;
  index: number;
}

function FeatureCard({ icon: Icon, title, description, color, gradient, index }: FeatureCardProps) {
  const { t } = useI18n();

  return (
    <div
      className={`group relative p-8 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-secondary)] hover:border-[var(--border-primary)] transition-all duration-300 hover:shadow-xl overflow-hidden`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Gradient background on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

      <div className="relative">
        {/* Icon */}
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6 transition-transform group-hover:scale-110 duration-300"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-7 h-7" style={{ color }} />
        </div>

        {/* Content */}
        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
          {title}
        </h3>
        <p className="text-[var(--text-secondary)] leading-relaxed">
          {description}
        </p>

        {/* Arrow indicator */}
        <div className="mt-6 flex items-center gap-2 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity" style={{ color }}>
          {t("landing.learnMore")}
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
}

function HowItWorksSection() {
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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[var(--accent-tertiary)] to-transparent opacity-30 blur-3xl" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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

function StatsSection() {
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-white/70">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const { t } = useI18n();

  return (
    <section className="relative py-24 bg-[var(--bg-secondary)] overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-t from-[var(--accent-tertiary)] to-transparent opacity-40 blur-3xl" />
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
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-[var(--text-tertiary)]">
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

function Footer() {
  const { t } = useI18n();

  return (
    <footer className="py-8 bg-[var(--bg-primary)] border-t border-[var(--border-secondary)]">
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-primary)]">
              <TelegramIcon className="h-5 w-5 text-white" />
            </div>
            <span className="text-base font-semibold text-[var(--text-primary)]">
              Telegram AI Admin
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-[var(--text-secondary)]">
            <Link href="#" className="hover:text-[var(--text-primary)] transition-colors">
              {t("landing.footerPrivacy")}
            </Link>
            <Link href="#" className="hover:text-[var(--text-primary)] transition-colors">
              {t("landing.footerTerms")}
            </Link>
            <Link href="#" className="hover:text-[var(--text-primary)] transition-colors">
              {t("landing.footerContact")}
            </Link>
          </div>

          {/* Copyright */}
          <div className="text-sm text-[var(--text-tertiary)]">
            © {new Date().getFullYear()} Telegram AI Admin
          </div>
        </div>
      </div>
    </footer>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
    </svg>
  );
}
