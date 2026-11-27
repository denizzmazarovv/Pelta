/**
 * Google Analytics 4 — подготовлено, по умолчанию выключено.
 *
 * Как включить: analytics.google.com → Администратор → Потоки данных → Веб → peltanera.com →
 * скопируйте «Идентификатор потока» вида G-XXXXXXXXXX и вставьте ниже, затем push.bat.
 * Счётчик загружается только у посетителей, которые нажали «Разрешить все» в окне cookies.
 * Адреса Google автоматически добавляются в правила безопасности (scripts/security.ts).
 */
export const GA4_ID = '';

type Gtag = (...args: unknown[]) => void;

export function loadGa4(id = GA4_ID) {
  if (!/^G-[A-Z0-9]+$/.test(id)) return;
  const w = window as unknown as { dataLayer?: unknown[]; gtag?: Gtag };
  if (w.gtag) return;
  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
  w.gtag('js', new Date());
  w.gtag('config', id);
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
}
