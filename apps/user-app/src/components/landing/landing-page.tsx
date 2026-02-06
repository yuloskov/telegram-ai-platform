import { useI18n } from "~/i18n";
import { PublicHeader, PageLayout } from "~/components/layout";
import { HeroSection } from "./hero-section";
import { FeaturesSection } from "./features-section";
import { HowItWorksSection } from "./how-it-works-section";
import { StatsSection } from "./stats-section";
import { CTASection } from "./cta-section";
import { Footer } from "./footer";

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
