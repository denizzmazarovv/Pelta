import { useEffect } from 'react';
import type { Lang } from './i18n';
import type { Product } from './products';
import type { Route } from './paths';
import { abs, seoFor } from './seo';

function meta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

/** Заголовок, описание, canonical, языковые версии и schema.org — при каждом переходе по сайту */
export function useSeoHead(route: Route, lang: Lang, product: Product | undefined) {
  useEffect(() => {
    const s = seoFor(route, lang, product);
    document.title = s.title;
    meta('name', 'description', s.description);
    meta('name', 'robots', s.index ? 'index, follow' : 'noindex, follow');
    meta('property', 'og:title', s.title);
    meta('property', 'og:description', s.description);
    meta('property', 'og:url', abs(s.path));
    meta('property', 'og:image', s.image);
    meta('property', 'og:type', s.type);
    meta('property', 'og:locale', s.locale);
    meta('name', 'twitter:title', s.title);
    meta('name', 'twitter:description', s.description);
    meta('name', 'twitter:image', s.image);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = abs(s.path);

    document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
    for (const a of s.alternates) {
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = a.lang;
      link.href = a.href;
      document.head.appendChild(link);
    }

    document.head.querySelectorAll('script[data-seo]').forEach((el) => el.remove());
    for (const data of s.jsonLd) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.seo = '';
      script.textContent = JSON.stringify(data);
      document.head.appendChild(script);
    }
  }, [route, lang, product]);
}
