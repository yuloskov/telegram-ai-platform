import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from "~/components/ui/modal";
import { Button } from "~/components/ui/button";
import { useI18n } from "~/i18n";

interface AddDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function AddDocumentModal({ open, onOpenChange, channelId }: AddDocumentModalProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/channels/${channelId}/sources/upload`, {
        method: "POST",
        body: formData,
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
      setError(err instanceof Error ? err.message : t("sources.uploadError"));
    },
  });

  const handleClose = () => {
    setSelectedFile(null);
    setError(null);
    onOpenChange(false);
  };

  const validateFile = (file: File): string | null => {
    if (file.type !== "application/pdf") {
      return t("sources.onlyPdfAllowed");
    }
    if (file.size > MAX_FILE_SIZE) {
      return t("sources.fileTooLarge");
    }
    return null;
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSelectedFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{t("sources.uploadDocument")}</ModalTitle>
          <ModalDescription>{t("sources.uploadDocumentDescription")}</ModalDescription>
        </ModalHeader>

        <div className="space-y-4 pt-4">
          {/* Drop zone */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
              ${isDragging ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border)]"}
              ${selectedFile ? "border-green-500 bg-green-500/5" : ""}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleInputChange}
              className="hidden"
            />

            {selectedFile ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-10 w-10 text-green-500" />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {selectedFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    className="p-0.5 hover:bg-[var(--bg-tertiary)] rounded"
                  >
                    <X className="h-4 w-4 text-[var(--text-tertiary)]" />
                  </button>
                </div>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {formatFileSize(selectedFile.size)}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-[var(--text-tertiary)]" />
                <div className="text-sm text-[var(--text-secondary)]">
                  {t("sources.dropOrClick")}
                </div>
                <div className="text-xs text-[var(--text-tertiary)]">
                  {t("sources.pdfOnly")} ({t("sources.maxFileSize")})
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-500 text-center">{error}</div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={handleClose}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("sources.uploading")}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {t("sources.upload")}
                </>
              )}
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
