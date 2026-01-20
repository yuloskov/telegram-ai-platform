import { AlertTriangle, Link, Stamp, Building2, Sparkles } from "lucide-react";
import { useI18n } from "~/i18n";
import type { ImageAnalysisResult } from "~/types";

interface ImageAnalysisBadgeProps {
  analysisResult?: ImageAnalysisResult;
  isGenerated?: boolean;
  className?: string;
}

export function ImageAnalysisBadge({
  analysisResult,
  isGenerated,
  className = "",
}: ImageAnalysisBadgeProps) {
  const { t } = useI18n();

  if (isGenerated) {
    return (
      <div
        className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 bg-purple-500/90 text-white ${className}`}
      >
        <Sparkles className="h-2.5 w-2.5" />
        {t("generatePage.imageAnalysis.aiGenerated")}
      </div>
    );
  }

  if (!analysisResult) {
    return null;
  }

  const hasIssues =
    analysisResult.hasWatermark ||
    analysisResult.hasLink ||
    analysisResult.hasLogo;

  if (!hasIssues) {
    return null;
  }

  // Determine which issue to display (priority: watermark > link > logo)
  let icon = <AlertTriangle className="h-2.5 w-2.5" />;
  let label = t("generatePage.imageAnalysis.issueDetected");

  if (analysisResult.hasWatermark) {
    icon = <Stamp className="h-2.5 w-2.5" />;
    label = t("generatePage.imageAnalysis.watermark");
  } else if (analysisResult.hasLink) {
    icon = <Link className="h-2.5 w-2.5" />;
    label = t("generatePage.imageAnalysis.linkDetected");
  } else if (analysisResult.hasLogo) {
    icon = <Building2 className="h-2.5 w-2.5" />;
    label = t("generatePage.imageAnalysis.logoDetected");
  }

  return (
    <div
      className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 bg-amber-500/90 text-white ${className}`}
      title={analysisResult.reasoning}
    >
      {icon}
      {label}
    </div>
  );
}
