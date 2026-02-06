import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe, Loader2 } from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from "~/components/ui/modal";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { useI18n } from "~/i18n";

interface AddWebsiteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
}

export function AddWebsiteModal({ open, onOpenChange, channelId }: AddWebsiteModalProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [maxPages, setMaxPages] = useState(50);
  const [stalenessDays, setStalenessDays] = useState(30);
  const [filterPatterns, setFilterPatterns] = useState("");
  const [skipChunking, setSkipChunking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMutation = useMutation({
    mutationFn: async (params: {
      url: string;
      maxPages: number;
      stalenessDays: number;
      filterPatterns: string[];
      skipChunking: boolean;
    }) => {
      const res = await fetch(`/api/channels/${channelId}/sources/add-website`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources", channelId] });
      handleClose();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : t("sources.addWebsiteError"));
    },
  });

  const handleClose = () => {
    setUrl("");
    setMaxPages(50);
    setStalenessDays(30);
    setFilterPatterns("");
    setSkipChunking(false);
    setError(null);
    onOpenChange(false);
  };

  const validateUrl = (value: string): boolean => {
    if (!value.trim()) return false;
    try {
      const parsed = new URL(value);
      return ["http:", "https:"].includes(parsed.protocol);
    } catch {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateUrl(url)) {
      setError(t("sources.invalidUrl"));
      return;
    }
    setError(null);
    const patterns = filterPatterns
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    addMutation.mutate({ url, maxPages, stalenessDays, filterPatterns: patterns, skipChunking });
  };

  const isValid = validateUrl(url);

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{t("sources.addWebsite")}</ModalTitle>
          <ModalDescription>{t("sources.addWebsiteDescription")}</ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              {t("sources.websiteUrl")}
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
              <Input
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError(null); }}
                placeholder={t("sources.websiteUrlPlaceholder")}
                className="pl-10"
                autoFocus
              />
            </div>
            <p className="text-xs text-[var(--text-tertiary)]">{t("sources.websiteUrlHint")}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                {t("sources.maxPages")}
              </label>
              <Input
                type="number"
                min={1}
                max={500}
                value={maxPages}
                onChange={(e) => setMaxPages(parseInt(e.target.value, 10) || 50)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                {t("sources.stalenessDays")}
              </label>
              <Input
                type="number"
                min={1}
                max={365}
                value={stalenessDays}
                onChange={(e) => setStalenessDays(parseInt(e.target.value, 10) || 30)}
              />
              <p className="text-xs text-[var(--text-tertiary)]">{t("sources.stalenessDaysHint")}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              {t("sources.filterPatterns")}
            </label>
            <Textarea
              value={filterPatterns}
              onChange={(e) => setFilterPatterns(e.target.value)}
              placeholder="/blog/draft/\n/internal/"
              rows={3}
              className="text-sm"
            />
            <p className="text-xs text-[var(--text-tertiary)]">{t("sources.filterPatternsHint")}</p>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={skipChunking}
              onChange={(e) => setSkipChunking(e.target.checked)}
              className="h-4 w-4 shrink-0 rounded border-[var(--border-primary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
            />
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {t("sources.skipChunking")}
            </span>
          </label>

          {error && <div className="text-sm text-red-500">{error}</div>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={handleClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!isValid || addMutation.isPending}>
              {addMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("sources.adding")}
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4" />
                  {t("sources.addWebsite")}
                </>
              )}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
