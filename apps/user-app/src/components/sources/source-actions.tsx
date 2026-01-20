// Action buttons for source detail page header

import { RefreshCw, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useI18n } from "~/i18n";

interface SourceActionsProps {
  isScraping: boolean;
  onScrape: () => void;
  onDelete: () => void;
}

export function SourceActions({ isScraping, onScrape, onDelete }: SourceActionsProps) {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        onClick={onScrape}
        disabled={isScraping}
      >
        {isScraping ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            {t("sources.scraping")}
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            {t("sources.scrapeNow")}
          </>
        )}
      </Button>
      <Button variant="ghost" onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
        {t("sources.deleteSource")}
      </Button>
    </div>
  );
}
