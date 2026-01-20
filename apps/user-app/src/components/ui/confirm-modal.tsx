import { AlertTriangle } from "lucide-react";
import { Button } from "./button";
import { Spinner } from "./spinner";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "./modal";
import { useI18n } from "~/i18n";

interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isLoading?: boolean;
  variant?: "danger" | "default";
}

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  isLoading = false,
  variant = "default",
}: ConfirmModalProps) {
  const { t } = useI18n();

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-sm">
        <ModalHeader>
          <div className="flex items-start gap-3">
            {variant === "danger" && (
              <div className="shrink-0 p-2 rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            )}
            <div>
              <ModalTitle>{title}</ModalTitle>
              <ModalDescription className="mt-1">{description}</ModalDescription>
            </div>
          </div>
        </ModalHeader>
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelLabel || t("common.cancel")}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "default"}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <Spinner size="sm" />
            ) : (
              confirmLabel || t("common.confirm")
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
