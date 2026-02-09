import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { StoryArcCard } from "./story-arc-card";
import { StoryArcForm } from "./story-arc-form";
import { useStoryArcs, useCreateStoryArc, useDeleteStoryArc } from "~/hooks/useStoryArcs";
import { useI18n } from "~/i18n";

interface StoryArcListProps {
  channelId: string;
}

export function StoryArcList({ channelId }: StoryArcListProps) {
  const { t } = useI18n();
  const [showForm, setShowForm] = useState(false);

  const { data: arcs, isLoading } = useStoryArcs(channelId);
  const createMutation = useCreateStoryArc(channelId);
  const deleteMutation = useDeleteStoryArc(channelId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-[var(--text-primary)]">
            {t("persona.storyArcsTitle")}
          </h4>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            {t("persona.storyArcsDescription")}
          </p>
        </div>
        {!showForm && (
          <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5" />
            {t("persona.addStoryArc")}
          </Button>
        )}
      </div>

      {showForm && (
        <StoryArcForm
          onSubmit={(data) => {
            createMutation.mutate(data, {
              onSuccess: () => setShowForm(false),
            });
          }}
          isPending={createMutation.isPending}
          onCancel={() => setShowForm(false)}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--text-tertiary)]" />
        </div>
      ) : !arcs?.length ? (
        <p className="text-sm text-[var(--text-tertiary)] text-center py-6">
          {t("persona.noStoryArcs")}
        </p>
      ) : (
        <div className="space-y-2">
          {arcs.map((arc) => (
            <StoryArcCard
              key={arc.id}
              arc={arc}
              onDelete={() => deleteMutation.mutate(arc.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
