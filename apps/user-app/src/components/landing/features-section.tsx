import {
  Sparkles,
  Zap,
  Bot,
  Calendar,
  FileText,
  ArrowRight,
} from "lucide-react";
import { useI18n } from "~/i18n";

export function FeaturesSection() {
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
      className={`group relative p-6 sm:p-8 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-secondary)] hover:border-[var(--border-primary)] active:scale-[0.98] transition-all duration-300 hover:shadow-xl overflow-hidden`}
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
