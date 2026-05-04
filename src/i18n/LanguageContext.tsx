import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from "react";
import { Language, translations } from "./translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  ready: boolean;
}

const STORAGE_KEY = "tuba_language";
const DEFAULT_LANG: Language = "en";

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const isValidLang = (v: unknown): v is Language => v === "en" || v === "bn";

const readSavedLang = (): Language => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isValidLang(saved)) return saved;
  } catch {
    /* SSR or storage blocked */
  }
  return DEFAULT_LANG;
};

// Track keys we've already warned about so the dev console isn't spammed.
const warnedKeys = new Set<string>();

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  // Read synchronously on first render so there is no flash of wrong language.
  const [language, setLanguageState] = useState<Language>(() => readSavedLang());
  const [ready, setReady] = useState(false);

  // Reflect language on <html lang> for accessibility + SEO and mark as ready.
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language === "bn" ? "bn" : "en";
    }
    setReady(true);
  }, [language]);

  // Cross-tab sync: if language changes in another tab, update here too.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && isValidLang(e.newValue) && e.newValue !== language) {
        setLanguageState(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    if (!isValidLang(lang)) return;
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* storage blocked */
    }
  }, []);

  const t = useCallback(
    (key: string): string => {
      const dict = translations[language];
      const fallbackDict = translations[DEFAULT_LANG];
      const value = dict?.[key] ?? fallbackDict?.[key];
      if (value === undefined) {
        if (import.meta.env.DEV && !warnedKeys.has(key)) {
          warnedKeys.add(key);
          // eslint-disable-next-line no-console
          console.warn(`[i18n] Missing translation key: "${key}" (lang=${language})`);
        }
        return key;
      }
      return value;
    },
    [language]
  );

  const value = useMemo<LanguageContextType>(
    () => ({ language, setLanguage, t, ready }),
    [language, setLanguage, t, ready]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Safe fallback for HMR or components rendered outside provider during boot.
    return {
      language: DEFAULT_LANG,
      setLanguage: () => {},
      t: (key: string) => translations[DEFAULT_LANG][key] || translations.en[key] || key,
      ready: false,
    } as LanguageContextType;
  }
  return context;
};
