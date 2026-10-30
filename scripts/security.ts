import type { Plugin } from 'vite';

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

const CSP = [
  "default-src 'self'",
  "script-src 'self' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://${supabaseHost}`,
  "font-src 'self' data:",
  `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://script.google.com https://script.googleusercontent.com`,
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
        return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    ${tags}`);
      },
    },
  };
}
