import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import en, { MobileTranslationKeys } from "./en";
import hi from "./hi";

type Language = "en" | "hi";

interface LanguageContextType {
  lang: Language;
  setLang: (l: Language) => Promise<void>;
  t: (key: MobileTranslationKeys) => string;
  toggle: () => Promise<void>;
}

const translations: Record<Language, Record<MobileTranslationKeys, string>> = { en, hi };

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default Hindi — loads saved preference async
  const [lang, setLangState] = useState<Language>("hi");

  useEffect(() => {
    SecureStore.getItemAsync("app_lang")
      .then((saved) => {
        if (saved === "en" || saved === "hi") {
          setLangState(saved);
        }
      })
      .catch(() => {
        // SecureStore unavailable (web/simulator) — keep default
      });
  }, []);

  const setLang = useCallback(async (l: Language) => {
    try {
      await SecureStore.setItemAsync("app_lang", l);
    } catch {
      // ignore on web
    }
    setLangState(l);
  }, []);

  const toggle = useCallback(async () => {
    await setLang(lang === "hi" ? "en" : "hi");
  }, [lang, setLang]);

  const t = useCallback(
    (key: MobileTranslationKeys): string =>
      translations[lang][key] ?? String(key),
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, toggle }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
