import { useRef, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { PersonaAssetCard } from "./persona-asset-card";
import { usePersonaAssets, useCreatePersonaAsset, useUpdatePersonaAsset, useDeletePersonaAsset } from "~/hooks/usePersonaAssets";
import { useI18n } from "~/i18n";

interface PersonaAssetsManagerProps {
  channelId: string;
}

export function PersonaAssetsManager({ channelId }: PersonaAssetsManagerProps) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadLabel, setUploadLabel] = useState("");

  const { data: assets, isLoading } = usePersonaAssets(channelId);
  const createMutation = useCreatePersonaAsset(channelId);
  const updateMutation = useUpdatePersonaAsset(channelId);
  const deleteMutation = useDeletePersonaAsset(channelId);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("label", uploadLabel || file.name);

    createMutation.mutate(formData, {
      onSuccess: () => {
        setUploadLabel("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-[var(--text-primary)]">
            {t("persona.assetsTitle")}
          </h4>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            {t("persona.assetsDescription")}
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            {t("persona.addPhoto")}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--text-tertiary)]" />
        </div>
      ) : !assets?.length ? (
        <p className="text-sm text-[var(--text-tertiary)] text-center py-6">
          {t("persona.noAssets")}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {assets.map((asset) => (
            <PersonaAssetCard
              key={asset.id}
              asset={asset}
              onUpdate={(data) => updateMutation.mutate({ assetId: asset.id, data })}
              onDelete={() => deleteMutation.mutate(asset.id)}
              isUpdating={updateMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
