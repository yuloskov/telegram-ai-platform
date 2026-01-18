import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useRouter } from "next/router";
import { useMutation } from "@tanstack/react-query";
import { messages, type Language, type Messages } from "./messages";
import { useAuthStore } from "~/hooks/useAuth";

type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

type TranslationKey = NestedKeyOf<Messages>;

interface I18nContextValue {
  language: Language;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  setLanguage: (lang: Language) => void;
  isChangingLanguage: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getNestedValue(obj: unknown, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path;
    }
  }

  return typeof current === "string" ? current : path;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, setAuth } = useAuthStore();

  const language = (router.locale || "en") as Language;

  const updateLanguageMutation = useMutation({
    mutationFn: async (newLang: Language) => {
      const res = await fetch("/api/user/language", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: newLang }),
      });
      if (!res.ok) throw new Error("Failed to update language");
      return res.json();
    },
    onSuccess: (_, newLang) => {
      if (user) {
        setAuth({ ...user, language: newLang });
      }
    },
  });

  const setLanguage = useCallback(
    (newLang: Language) => {
      router.push(router.pathname, router.asPath, { locale: newLang });
      if (user) {
        updateLanguageMutation.mutate(newLang);
      }
    },
    [router, user, updateLanguageMutation]
  );

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      const langMessages = messages[language] || messages.en;
      let value = getNestedValue(langMessages, key);

      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replace(`{${k}}`, String(v));
        }
      }

      return value;
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      t,
      setLanguage,
      isChangingLanguage: updateLanguageMutation.isPending,
    }),
    [language, t, setLanguage, updateLanguageMutation.isPending]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
