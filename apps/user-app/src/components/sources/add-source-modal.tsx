import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
} from "~/components/ui/modal";
import { useI18n } from "~/i18n";

interface AddSourceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (username: string) => void;
  isAdding: boolean;
}

export function AddSourceModal({
  open,
  onOpenChange,
  onAdd,
  isAdding,
}: AddSourceModalProps) {
  const { t } = useI18n();
  const [username, setUsername] = useState("");

  const handleSubmit = () => {
    if (username.trim()) {
      onAdd(username.trim());
      setUsername("");
    }
  };

  const handleClose = () => {
    setUsername("");
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <ModalTitle>{t("sources.addSource")}</ModalTitle>
        </ModalHeader>
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            {t("sources.addSourceDescription")}
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              {t("sources.sourceUsername")}
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("sources.sourceUsernamePlaceholder")}
              onKeyDown={(e) => {
                if (e.key === "Enter" && username.trim()) {
                  handleSubmit();
                }
              }}
            />
            <p className="text-xs text-[var(--text-tertiary)]">
              {t("sources.sourceUsernameHint")}
            </p>
          </div>
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={handleClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!username.trim() || isAdding}>
            {isAdding ? (
              <>
                <Spinner size="sm" />
                {t("common.loading")}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                {t("sources.addSource")}
              </>
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
