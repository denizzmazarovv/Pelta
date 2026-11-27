import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';
import { GA4_ID } from '../src/lib/analytics';

/**
 * Заголовки безопасности для сборки (GitHub Pages не даёт задать HTTP-заголовки,
 * поэтому правила вставляются в <head> каждой страницы как meta-теги).
 *
 * Content-Security-Policy: страница может загружать скрипты, стили и шрифты только
 * с peltanera.com, а обращаться — только к нашим сервисам (Supabase, Google Apps Script,
 * Cloudflare Turnstile). Даже если злоумышленник найдёт способ вставить на страницу
 * чужой код, браузер не выполнит его и не отправит данные на чужой сервер.
 *
 * В режиме разработки (npm run dev) правила не добавляются: там Vite использует inline-скрипты.
 * Добавляете новый внешний сервис — допишите его адрес сюда.
 */
// Тот же проект, что SUPABASE_URL в src/lib/config.ts
const supabaseHost = 'misuvgnzuustjptkvsvx.supabase.co';
// Google Analytics 4 — только если в src/lib/analytics.ts указан GA4_ID
const ga = GA4_ID ? ' https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com' : '';

// Скрипт мини-приложения Telegram встраивается прямо в страницу (без отдельного запроса,
// который задерживал показ сайта). Разрешён по отпечатку sha256 — любой другой встроенный код браузер не выполнит.
const TG_SCRIPT = readFileSync(new URL('../public/tg.js', import.meta.url), 'utf8');
const TG_HASH = createHash('sha256').update(TG_SCRIPT).digest('base64');

const CSP = [
  "default-src 'self'",
  // telegram.org — скрипт мини-приложения (подключается только внутри Telegram, см. public/tg.js)
  `script-src 'self' 'sha256-${TG_HASH}' https://challenges.cloudflare.com https://telegram.org${GA4_ID ? ' https://www.googletagmanager.com' : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://${supabaseHost}${ga}`,
  "font-src 'self' data:",
  `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://script.google.com https://script.googleusercontent.com${ga}`,
  'frame-src https://challenges.cloudflare.com',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

export function securityHeaders(): Plugin {
  return {
    name: 'pelta-security-headers',
    apply: 'build',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const tags =
          `<meta http-equiv="Content-Security-Policy" content="${CSP}" />\n    ` +
          `<meta name="referrer" content="strict-origin-when-cross-origin" />\n    `;
        if (!html.includes('<script src="/tg.js"></script>')) throw new Error('index.html: нет <script src="/tg.js">');
        return html
          .replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    ${tags}`)
          .replace('<script src="/tg.js"></script>', () => `<script>${TG_SCRIPT}</script>`);
      },
    },
  };
}
