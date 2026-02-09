import { useState } from "react";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { Input } from "~/components/ui/input";
import { useI18n } from "~/i18n";
import type { PersonaAsset } from "~/types";

interface PersonaAssetCardProps {
  asset: PersonaAsset;
  onUpdate: (data: { label?: string; description?: string }) => void;
  onDelete: () => void;
  isUpdating?: boolean;
}

export function PersonaAssetCard({ asset, onUpdate, onDelete, isUpdating }: PersonaAssetCardProps) {
  const { t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(asset.label);
  const [description, setDescription] = useState(asset.description || "");

  const handleSave = () => {
    onUpdate({ label, description: description || undefined });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLabel(asset.label);
    setDescription(asset.description || "");
    setIsEditing(false);
  };

  return (
    <div className="group relative rounded-lg border border-[var(--border-primary)] overflow-hidden bg-[var(--bg-primary)]">
      <div className="aspect-square relative">
        <img
          src={asset.imageUrl}
          alt={asset.label}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="p-1.5 rounded-md bg-black/60 text-white hover:bg-black/80"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-md bg-red-600/80 text-white hover:bg-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="p-2.5">
        {isEditing ? (
          <div className="space-y-2">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("persona.assetLabelPlaceholder")}
              className="text-xs h-7"
            />
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("persona.assetDescriptionPlaceholder")}
              className="text-xs h-7"
            />
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={isUpdating}
                className="p-1 rounded bg-[var(--accent-primary)] text-white"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="p-1 rounded border border-[var(--border-primary)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs font-medium text-[var(--text-primary)] truncate">
              {asset.label}
            </p>
            {asset.description && (
              <p className="text-xs text-[var(--text-tertiary)] truncate mt-0.5">
                {asset.description}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
