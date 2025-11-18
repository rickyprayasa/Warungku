import { createContext, useContext, useMemo } from 'react';
import { useWarungStore } from './store';
import id from '@/locales/id.json';
import en from '@/locales/en.json';
import { useShallow } from 'zustand/react/shallow';
const translations = { id, en };
type Language = 'id' | 'en';
interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}
const I18nContext = createContext<I18nContextType>({
  language: 'id',
  setLanguage: () => {},
  t: (key: string) => key,
});
export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const { language, setLanguage } = useWarungStore(
    useShallow((state) => ({
      language: state.language,
      setLanguage: state.setLanguage,
    }))
  );
  const t = useMemo((): I18nContextType['t'] => {
    return (key: string, params?: Record<string, string | number>): string => {
      const keys = key.split('.');
    let current: any = translations[language];
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return key; // Return key if not found
      }
    }
    let translatedString = typeof current === 'string' ? current : key;
    if (params) {
      Object.keys(params).forEach(paramKey => {
        translatedString = translatedString.replace(`{${paramKey}}`, String(params[paramKey]));
      });
    }
    return translatedString;
    };
  }, [language]);
  const value = { language, setLanguage, t };
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
};