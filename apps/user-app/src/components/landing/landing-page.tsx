import Link from "next/link";
import { Sparkles, Zap, Bot, Clock } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { useI18n } from "~/i18n";
import { PublicHeader, PageLayout } from "~/components/layout";

export function LandingPage() {
  const { t } = useI18n();

  return (
    <PageLayout title={t("landing.pageTitle")} description={t("landing.pageDescription")}>
      <PublicHeader />

      <main>
        {/* Hero Section */}
        <section className="px-4 md:px-6 lg:px-8 py-16 md:py-24 max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-6">
            {t("landing.heroTitle")}
          </h1>
          <p className="text-lg md:text-xl text-[var(--text-secondary)] mb-8 max-w-2xl mx-auto">
            {t("landing.heroSubtitle")}
          </p>
          <Button size="lg" asChild>
            <Link href="/login">{t("landing.getStarted")}</Link>
          </Button>
        </section>

        {/* Features Section */}
        <section className="px-4 md:px-6 lg:px-8 py-12 bg-[var(--bg-secondary)]">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold text-[var(--text-primary)] text-center mb-10">
              {t("landing.featuresTitle")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FeatureCard
                icon={<Sparkles className="h-6 w-6 text-[var(--accent-primary)]" />}
                title={t("landing.feature1Title")}
                description={t("landing.feature1Description")}
              />
              <FeatureCard
                icon={<Zap className="h-6 w-6 text-[#f59e0b]" />}
                title={t("landing.feature2Title")}
                description={t("landing.feature2Description")}
              />
              <FeatureCard
                icon={<Bot className="h-6 w-6 text-[#10b981]" />}
                title={t("landing.feature3Title")}
                description={t("landing.feature3Description")}
              />
              <FeatureCard
                icon={<Clock className="h-6 w-6 text-[#8b5cf6]" />}
                title={t("landing.feature4Title")}
                description={t("landing.feature4Description")}
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 md:px-6 lg:px-8 py-16 max-w-5xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-semibold text-[var(--text-primary)] mb-4">
            {t("landing.ctaTitle")}
          </h2>
          <p className="text-[var(--text-secondary)] mb-8">
            {t("landing.ctaSubtitle")}
          </p>
          <Button size="lg" asChild>
            <Link href="/login">{t("landing.getStarted")}</Link>
          </Button>
        </section>
      </main>
    </PageLayout>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bg-tertiary)] mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
        {title}
      </h3>
      <p className="text-[var(--text-secondary)]">
        {description}
      </p>
    </Card>
  );
}
