import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { safeLocalStorage } from '@/lib/safeStorage';

export function useLanguage() {
  const { i18n, t } = useTranslation();

  const currentLanguage = i18n.language as 'ar' | 'en';
  const isRTL = currentLanguage === 'ar';

  const setLanguage = useCallback(
    (lang: 'ar' | 'en') => {
      i18n.changeLanguage(lang);
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      safeLocalStorage.setItem('almufaijer-language', lang);
    },
    [i18n]
  );

  const toggleLanguage = useCallback(() => {
    const newLang = currentLanguage === 'ar' ? 'en' : 'ar';
    setLanguage(newLang);
  }, [currentLanguage, setLanguage]);

  // Initialize language from storage or default
  useEffect(() => {
    const savedLang = safeLocalStorage.getItem('almufaijer-language') as 'ar' | 'en' | null;
    const lang = savedLang || 'ar';
    
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
    
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [i18n]);

  return {
    t,
    currentLanguage,
    isRTL,
    setLanguage,
    toggleLanguage,
  };
}
