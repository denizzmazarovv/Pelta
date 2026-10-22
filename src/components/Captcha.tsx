import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { TURNSTILE_SITE_KEY } from '../lib/config';

type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let loader: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('captcha load failed'));
      document.head.appendChild(s);
    });
  }
  return loader;
}

export type CaptchaHandle = { reset: () => void };

/** Проверка «я не робот» (Cloudflare Turnstile). Ничего не рисует, если ключ не задан. */
export const Captcha = forwardRef<CaptchaHandle, { onToken: (t: string) => void; lang: string }>(
  function Captcha({ onToken, lang }, ref) {
    const el = useRef<HTMLDivElement>(null);
    const id = useRef<string | null>(null);
    const cb = useRef(onToken);
    cb.current = onToken;

    useImperativeHandle(ref, () => ({
      reset() {
        cb.current('');
        if (id.current && window.turnstile) window.turnstile.reset(id.current);
      },
    }));

    useEffect(() => {
      if (!TURNSTILE_SITE_KEY) return;
      let cancelled = false;
      loadScript()
        .then(() => {
          if (cancelled || !el.current || !window.turnstile) return;
          id.current = window.turnstile.render(el.current, {
            sitekey: TURNSTILE_SITE_KEY,
            language: lang,
            theme: 'light',
            appearance: 'interaction-only',
            callback: (t: string) => cb.current(t),
            'expired-callback': () => cb.current(''),
            'error-callback': () => cb.current(''),
          });
        })
        .catch(() => cb.current(''));
      return () => {
        cancelled = true;
        if (id.current && window.turnstile) window.turnstile.remove(id.current);
        id.current = null;
      };
    }, [lang]);

    if (!TURNSTILE_SITE_KEY) return null;
    return <div ref={el} className="min-h-[1px]" />;
  }
);

export const captchaEnabled = !!TURNSTILE_SITE_KEY;
