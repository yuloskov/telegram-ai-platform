import { Sparkles } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Spinner } from "~/components/ui/spinner";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
} from "~/components/ui/modal";
import { useI18n } from "~/i18n";

interface GenerateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: string;
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function GenerateModal({
  open,
  onOpenChange,
  prompt,
  onPromptChange,
  onGenerate,
  isGenerating,
}: GenerateModalProps) {
  const { t } = useI18n();

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-lg">
        <ModalHeader>
          <ModalTitle>{t("generate.title")}</ModalTitle>
        </ModalHeader>
        <Textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder={t("generate.placeholder")}
          className="min-h-[120px]"
        />
        <ModalFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={onGenerate} disabled={!prompt || isGenerating}>
            {isGenerating ? (
              <>
                <Spinner size="sm" />
                {t("generate.generating")}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {t("generate.generate")}
              </>
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
