import { useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';

const BRAND = 'GloryTech Academy';

function setMeta(selector, attribute, value, content) {
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, value);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

// Gives every route its own title and description (the SPA would otherwise keep one for all pages).
export function usePageMeta({ title, description } = {}) {
  const { t, lang } = useI18n();

  useEffect(() => {
    const fullTitle = title ? `${title} — ${BRAND}` : t('meta.title');
    const text = description || t('meta.description');
    document.title = fullTitle;
    setMeta('meta[name="description"]', 'name', 'description', text);
    setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMeta('meta[property="og:description"]', 'property', 'og:description', text);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', text);
    document.head.querySelector('link[rel="canonical"]')?.setAttribute('href', window.location.origin + window.location.pathname);
  }, [title, description, lang, t]);
}
