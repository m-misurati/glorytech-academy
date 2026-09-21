// Runtime configuration.
//
// In a container the server injects window.__APP_CONFIG__ into index.html from its
// environment, so one image serves every environment and changing a value is a
// restart rather than a rebuild. On builds without a server (Cloudflare assets,
// cPanel) nothing is injected and the values compiled in by Vite are used.
const runtime = typeof window === 'undefined' ? {} : window.__APP_CONFIG__ || {};

function read(key, fallback) {
  const value = runtime[key];
  return (typeof value === 'string' && value.trim()) || fallback || '';
}

export const config = {
  supabaseUrl: read('SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL),
  supabasePublishableKey: read('SUPABASE_PUBLISHABLE_KEY', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
  // Where the video Worker lives. Empty means "same origin as this page".
  apiBase: read('API_BASE', import.meta.env.VITE_API_BASE).replace(/\/+$/, ''),
  contactEmail: read('CONTACT_EMAIL', import.meta.env.VITE_CONTACT_EMAIL),
  telegramChannel: read('TELEGRAM_CHANNEL', import.meta.env.VITE_TELEGRAM_CHANNEL),
};
