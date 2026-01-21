// Hook for managing SVG generation settings with localStorage persistence

import { useState, useEffect, useCallback } from "react";

export interface SvgGenerationSettings {
  themeColor: string;
  textColor: string;
  backgroundStyle: "solid" | "gradient" | "transparent";
  fontStyle: "modern" | "classic" | "playful" | "technical";
  stylePrompt: string;
}

const STORAGE_KEY = "svg-generation-settings";

const DEFAULT_SETTINGS: SvgGenerationSettings = {
  themeColor: "#3B82F6",
  textColor: "#1F2937",
  backgroundStyle: "gradient",
  fontStyle: "modern",
  stylePrompt: "",
};

function loadSettings(): SvgGenerationSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // Invalid JSON, return defaults
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: SvgGenerationSettings): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage full or unavailable
  }
}

export function useSvgSettings() {
  const [settings, setSettingsState] = useState<SvgGenerationSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setSettingsState(loadSettings());
    setIsLoaded(true);
  }, []);

  const setSettings = useCallback((newSettings: SvgGenerationSettings) => {
    setSettingsState(newSettings);
    saveSettings(newSettings);
  }, []);

  const updateSetting = useCallback(<K extends keyof SvgGenerationSettings>(
    key: K,
    value: SvgGenerationSettings[K]
  ) => {
    setSettingsState((prev) => {
      const updated = { ...prev, [key]: value };
      saveSettings(updated);
      return updated;
    });
  }, []);

  return {
    settings,
    setSettings,
    updateSetting,
    isLoaded,
  };
}
