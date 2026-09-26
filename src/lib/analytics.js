// Google Analytics 4.
//
// The tag only loads when a measurement id is configured, so development and any
// self-hosted copy stay untracked without a code change. The site is a single page
// app, so GA never sees a second page load: every route change is sent by hand.
import { config } from './config';

let started = false;

function gtag() {
  // GA reads the arguments object itself, so this cannot be a rest parameter.
  window.dataLayer.push(arguments);
}

export function startAnalytics() {
  if (started || !config.gaId || typeof window === 'undefined') return;
  started = true;

  window.dataLayer = window.dataLayer || [];
  gtag('js', new Date());
  // Each route change is reported below, with the path the learner actually sees.
  gtag('config', config.gaId, { send_page_view: false });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.gaId)}`;
  document.head.appendChild(script);
}

export function trackPageView(path, title) {
  if (!started) return;
  gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: title || document.title,
  });
}

// Lesson views, enrolments and the like, for questions a page count cannot answer.
export function trackEvent(name, params = {}) {
  if (!started) return;
  gtag('event', name, params);
}
