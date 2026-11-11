import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import '@fontsource/fira-sans-condensed/300.css';
import '@fontsource/fira-sans-condensed/400.css';
import '@fontsource/fira-sans-condensed/500.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/inter/400.css';
import '@fontsource/arya/400.css';
import './index.css';

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

// Защита от «кликджекинга»: если сайт открыли внутри чужой страницы (iframe),
// вместо магазина показываем только ссылку на настоящий сайт.
// Исключение — Telegram Web (web.telegram.org): там мини-приложение открывается во фрейме.
const TELEGRAM_WEB = /^https:\/\/web\.telegram\.org$/;
const framed = (() => {
  try {
    if (window.self === window.top) return false;
    const ancestors = (window.location as Location & { ancestorOrigins?: DOMStringList }).ancestorOrigins;
    if (ancestors && ancestors.length) return !Array.from(ancestors).every((o) => TELEGRAM_WEB.test(o));
    return !/^https:\/\/web\.telegram\.org\//.test(document.referrer);
  } catch {
    return true;
  }
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {framed ? (
      <p style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <a href="https://peltanera.com" target="_top" rel="noopener">
          peltanera.com
        </a>
      </p>
    ) : (
      <App />
    )}
  </StrictMode>
);
