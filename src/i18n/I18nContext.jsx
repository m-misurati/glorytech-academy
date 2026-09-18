import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { messages } from './messages';

const I18nContext = createContext(null);
const STORAGE_KEY = 'glory-lang';

function readStoredLang() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'ar';
  } catch {
    return 'ar';
  }
}

function lookup(dictionary, key) {
  return key.split('.').reduce((node, part) => node?.[part], dictionary);
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(readStoredLang);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Storage can be unavailable (private mode); the choice still applies for this visit.
    }
  }, [lang]);

  const value = useMemo(() => {
    const locale = lang === 'ar' ? 'ar-LY' : 'en-US';
    const numberFormat = new Intl.NumberFormat(locale);
    const moneyFormat = new Intl.NumberFormat(locale, { style: 'currency', currency: 'LYD', minimumFractionDigits: 0, maximumFractionDigits: 2 });

    const t = (key, vars) => {
      let text = lookup(messages[lang], key) ?? lookup(messages.ar, key) ?? key;
      if (typeof text === 'string' && vars) {
        text = text.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
      }
      return text;
    };

    // Picks the English variant of a data field (`titleEn`) when browsing in English.
    const pick = (item, field) => {
      if (!item) return '';
      if (lang === 'en') {
        const english = item[`${field}En`];
        if (Array.isArray(english) ? english.length : english) return english;
      }
      return item[field] ?? '';
    };

    const formatNumber = (value) => numberFormat.format(Number(value) || 0);
    const formatMoney = (value) => moneyFormat.format(Number(value) || 0);
    const formatDate = (value, options = { dateStyle: 'medium' }) => (value ? new Intl.DateTimeFormat(locale, options).format(new Date(value)) : '—');
    const formatMonth = (yearMonth) => new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit' }).format(new Date(`${yearMonth}-01T12:00:00`));

    // Lesson length as a clock (1:52:03); null when unknown.
    const formatClock = (seconds) => {
      if (!seconds) return null;
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = String(seconds % 60).padStart(2, '0');
      return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${secs}` : `${minutes}:${secs}`;
    };

    // Course length from minutes (19 س 10 د / 19h 10m).
    const formatMinutes = (totalMinutes) => {
      const minutes = Math.round(Number(totalMinutes) || 0);
      if (!minutes) return null;
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      if (!h) return t('units.minutes', { m });
      if (!m) return t('units.hours', { h });
      return t('units.hoursMinutes', { h, m });
    };

    return {
      lang,
      dir: lang === 'ar' ? 'rtl' : 'ltr',
      isRtl: lang === 'ar',
      setLang,
      toggleLang: () => setLang((current) => (current === 'ar' ? 'en' : 'ar')),
      t,
      pick,
      formatNumber,
      formatMoney,
      formatDate,
      formatMonth,
      formatClock,
      formatMinutes,
    };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
