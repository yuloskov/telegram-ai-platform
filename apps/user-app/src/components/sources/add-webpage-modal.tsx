import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe, Loader2 } from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from "~/components/ui/modal";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useI18n } from "~/i18n";

interface AddWebpageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
}

export function AddWebpageModal({ open, onOpenChange, channelId }: AddWebpageModalProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [skipChunking, setSkipChunking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMutation = useMutation({
    mutationFn: async (params: { url: string; skipChunking: boolean }) => {
      const res = await fetch(`/api/channels/${channelId}/sources/add-webpage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: params.url, skipChunking: params.skipChunking }),
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
      setError(err instanceof Error ? err.message : t("sources.addWebpageError"));
    },
  });

  const handleClose = () => {
    setUrl("");
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
    addMutation.mutate({ url, skipChunking });
  };

  const isValid = validateUrl(url);

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{t("sources.addWebpage")}</ModalTitle>
          <ModalDescription>{t("sources.addWebpageDescription")}</ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              {t("sources.webpageUrl")}
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
              <Input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
                placeholder={t("sources.webpageUrlPlaceholder")}
                className="pl-10"
                autoFocus
              />
            </div>
            <p className="text-xs text-[var(--text-tertiary)]">
              {t("sources.webpageUrlHint")}
            </p>
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
          <p className="text-xs text-[var(--text-tertiary)] ml-7">
            {t("sources.skipChunkingHint")}
          </p>

          {error && (
            <div className="text-sm text-red-500">{error}</div>
          )}

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
                  {t("sources.addWebpage")}
                </>
              )}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
