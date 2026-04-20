import * as React from "react";
import { translations, type Locale, LOCALES } from "./translations";

type I18nContextType = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  locales: typeof LOCALES;
};

const I18nContext = React.createContext<I18nContextType | null>(null);

const STORAGE_KEY = "axispay.locale";

function detectInitial(): Locale {
  if (typeof window === "undefined") return "pt";
  const saved = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (saved && translations[saved]) return saved;
  const nav = (window.navigator.language || "pt").toLowerCase();
  if (nav.startsWith("en")) return "en";
  if (nav.startsWith("es")) return "es";
  return "pt";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>("pt");

  React.useEffect(() => {
    setLocaleState(detectInitial());
  }, []);

  const setLocale = React.useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, l);
    }
  }, []);

  const t = React.useCallback(
    (key: string) => translations[locale][key] ?? translations.pt[key] ?? key,
    [locale],
  );

  const value = React.useMemo(
    () => ({ locale, setLocale, t, locales: LOCALES }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
