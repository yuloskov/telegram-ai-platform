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
import { MessagePreview } from "~/components/telegram/message-bubble";

interface PostEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  onContentChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  channelName: string;
  isGenerated: boolean;
}

export function PostEditorModal({
  open,
  onOpenChange,
  content,
  onContentChange,
  onSave,
  onCancel,
  isSaving,
  channelName,
  isGenerated,
}: PostEditorModalProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-2xl">
        <ModalHeader>
          <ModalTitle>
            {isGenerated ? "Review Generated Content" : "Create Post"}
          </ModalTitle>
        </ModalHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Editor */}
          <div>
            <Textarea
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder="Write your post content..."
              className="min-h-[200px]"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-2">
              {content.length} / 4096 characters
            </p>
          </div>

          {/* Preview */}
          <div>
            <p className="text-xs text-[var(--text-secondary)] mb-2">Preview</p>
            {content ? (
              <MessagePreview content={content} channelName={channelName} />
            ) : (
              <div className="bg-[var(--bg-tertiary)] rounded-[var(--radius-lg)] p-4 text-center text-sm text-[var(--text-tertiary)]">
                Start typing to see preview
              </div>
            )}
          </div>
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={!content || isSaving}>
            {isSaving ? (
              <>
                <Spinner size="sm" />
                Saving...
              </>
            ) : (
              "Save as Draft"
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
