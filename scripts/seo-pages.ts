import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Plugin } from 'vite';
import { translations, type Lang } from '../src/lib/i18n';
import { CATEGORIES, type Product } from '../src/lib/products';
import { LANG_CODES, pathFor, type Route } from '../src/lib/paths';
import {
  BRAND,
  CATALOG_TEXT,
  SITE,
  abs,
  findPublicProduct,
  productPhotos,
  publicProducts,
  publicRoutes,
  seoFor,
  type Seo,
} from '../src/lib/seo';
import { altFor, CARD_SIZES, isPhoto, PAGE_SIZES, srcSetFor } from '../src/lib/images';
import { formatPrice } from '../src/lib/format';

/**
 * После сборки: готовая HTML-страница для каждого адреса и языка
 * (свой заголовок, описание, canonical, hreflang, schema.org и текст страницы),
 * а также sitemap.xml, robots.txt и 404.html.
 *
 * Поисковики сразу видят содержимое, без ожидания JavaScript. Посетитель видит тот же сайт:
 * React после загрузки заменяет этот текст обычной страницей.
 */

const esc = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tr = (lang: Lang, key: string) => translations[lang][key] ?? translations.en[key] ?? key;

/** Файл для адреса: / → index.html, /ru/ → ru/index.html, /p/ch-01 → p/ch-01.html */
function fileFor(path: string): string {
  if (path.endsWith('/')) return join(path.slice(1), 'index.html');
  return decodeURIComponent(path.slice(1)) + '.html';
}

/** Главное фото страницы (LCP): браузер начинает качать его сразу, не дожидаясь скрипта сайта */
function lcpImage(route: Route): { src: string; sizes: string } | undefined {
  let p: Product | undefined;
  let sizes = PAGE_SIZES;
  if (route.name === 'product') p = findPublicProduct(route.id);
  else if (route.name === 'catalog') {
    // Тот же порядок, что в каталоге: сначала избранные
    const list = publicProducts().filter((x) => route.category === 'all' || x.category === route.category);
    p = [...list].sort((a, b) => Number(b.featured) - Number(a.featured))[0];
    sizes = CARD_SIZES;
  }
  const src = p?.gallery[0];
  return src && isPhoto(src) ? { src, sizes } : undefined;
}

function head(seo: Seo, route: Route): string {
  const lcp = lcpImage(route);
  const srcset = lcp && srcSetFor(lcp.src);
  const tags = [
    ...(lcp
      ? [
          `<link rel="preload" as="image" href="${esc(lcp.src)}"` +
            (srcset ? ` imagesrcset="${esc(srcset)}" imagesizes="${esc(lcp.sizes)}"` : '') +
            ` fetchpriority="high" />`,
        ]
      : []),
    `<title>${esc(seo.title)}</title>`,
    `<meta name="description" content="${esc(seo.description)}" />`,
    `<meta name="robots" content="${seo.index ? 'index, follow, max-image-preview:large' : 'noindex, follow'}" />`,
    `<link rel="canonical" href="${esc(abs(seo.path))}" />`,
    ...seo.alternates.map((a) => `<link rel="alternate" hreflang="${a.lang}" href="${esc(a.href)}" />`),
    `<meta property="og:site_name" content="${BRAND}" />`,
    `<meta property="og:type" content="${seo.type}" />`,
    `<meta property="og:title" content="${esc(seo.title)}" />`,
    `<meta property="og:description" content="${esc(seo.description)}" />`,
    `<meta property="og:url" content="${esc(abs(seo.path))}" />`,
    `<meta property="og:image" content="${esc(seo.image)}" />`,
    `<meta property="og:image:alt" content="${esc(seo.title)}" />`,
    `<meta property="og:locale" content="${seo.locale}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(seo.title)}" />`,
    `<meta name="twitter:description" content="${esc(seo.description)}" />`,
    `<meta name="twitter:image" content="${esc(seo.image)}" />`,
    ...seo.jsonLd.map(
      (d) => `<script type="application/ld+json" data-seo>${JSON.stringify(d).replace(/</g, '\\u003c')}</script>`
    ),
  ];
  return tags.join('\n    ');
}

const link = (href: string, text: string) => `<a href="${esc(href)}">${esc(text)}</a>`;

/** Текст страницы для поисковиков (до загрузки JavaScript) */
function body(route: Route, lang: Lang, seo: Seo): string {
  const home = pathFor({ name: 'catalog', category: 'all' }, lang);
  const nav = [
    link(home, tr(lang, 'cat.all')),
    ...CATEGORIES.map((c) => link(pathFor({ name: 'catalog', category: c }, lang), tr(lang, `cat.${c}`))),
    link(pathFor({ name: 'about' }, lang), tr(lang, 'nav.about')),
    link(pathFor({ name: 'contact' }, lang), tr(lang, 'nav.contact')),
  ].join(' · ');
  const langs = LANG_CODES.map((l) => link(pathFor(route, l), l.toUpperCase())).join(' ');
  const productItem = (p: Product) =>
    `<li>${link(pathFor({ name: 'product', id: p.id }, lang), p[`name_${lang}`])} — ${formatPrice(p.price, lang)}</li>`;

  let main = '';
  switch (route.name) {
    case 'catalog': {
      const list = publicProducts().filter((p) => route.category === 'all' || p.category === route.category);
      const text = CATALOG_TEXT[lang][route.category];
      main = `<h1>${esc(text.h1)}</h1><p>${esc(text.intro)}</p><ul>${list.map(productItem).join('')}</ul>`;
      break;
    }
    case 'product': {
      const p = findPublicProduct(route.id)!;
      const s = p.specs;
      main =
        `<p>${link(home, tr(lang, 'nav.home'))} / ${link(pathFor({ name: 'catalog', category: p.category }, lang), tr(lang, `cat.${p.category}`))}</p>` +
        `<h1>${esc(p[`name_${lang}`])}</h1>` +
        p.gallery
          .map((src, i) => ({ src, alt: altFor(p, lang, i) }))
          .filter((im) => productPhotos(p).includes(im.src))
          .map((im) => `<img src="${esc(im.src)}" alt="${esc(im.alt)}" width="320" loading="lazy" />`)
          .join('') +
        `<p>${esc(p[`desc_${lang}`])}</p>` +
        `<p><strong>${formatPrice(p.price, lang)}</strong></p>` +
        `<ul><li>${esc(tr(lang, 'product.material'))}: ${esc(tr(lang, s.material))}</li>` +
        `<li>${esc(tr(lang, 'product.dimensions'))}: ${esc(s.dimensions)}</li>` +
        `<li>${esc(tr(lang, 'product.weight'))}: ${esc(s.weight)}</li></ul>`;
      break;
    }
    case 'about':
      main = `<h1>${esc(tr(lang, 'about.title'))}</h1><p>${esc(tr(lang, 'about.p1'))}</p><p>${esc(tr(lang, 'about.p2'))}</p>`;
      break;
    case 'contact':
      main =
        `<h1>${esc(tr(lang, 'contact.title'))}</h1><p>${esc(tr(lang, 'contact.subtitle'))}</p>` +
        `<p><a href="mailto:peltanera@gmail.com">peltanera@gmail.com</a> · <a href="tel:+998941717194">+998 94 171 71 94</a> · ` +
        `<a href="https://t.me/npcceo">Telegram</a> · <a href="https://instagram.com/peltanera">Instagram</a></p>`;
      break;
    case 'privacy':
      main = `<h1>${esc(tr(lang, 'footer.privacy'))}</h1><p>${esc(seo.description)}</p>`;
      break;
    case 'terms':
      main = `<h1>${esc(tr(lang, 'footer.terms'))}</h1><p>${esc(seo.description)}</p>`;
      break;
  }

  return (
    // Посетитель обычно не видит этот текст: сайт загружается раньше. Без JavaScript он появляется через 2 секунды.
    `<style>@keyframes pn-seo{to{opacity:1}}.pn-seo{opacity:0;animation:pn-seo .3s 2s forwards}.pn-seo a{color:inherit;text-decoration:underline}.pn-seo h1{font-size:28px;font-weight:600;margin:20px 0 12px}.pn-seo p,.pn-seo ul,.pn-seo nav{margin:8px 0}.pn-seo li{list-style:disc;margin-left:20px}</style>` +
    `<div class="pn-seo" style="max-width:760px;margin:0 auto;padding:72px 20px;font-family:system-ui,sans-serif;line-height:1.6;color:#1A2540">` +
    `<header><a href="${esc(home)}"><strong>${BRAND}</strong></a><nav>${nav}</nav><p>${langs}</p></header>` +
    `<main>${main}</main>` +
    `<footer><p>${BRAND} — Tashkent, Uzbekistan · ${link(pathFor({ name: 'terms' }, lang), tr(lang, 'footer.terms'))} · ${link(pathFor({ name: 'privacy' }, lang), tr(lang, 'footer.privacy'))}</p></footer>` +
    `</div>`
  );
}

function render(template: string, route: Route, lang: Lang): string {
  const product = route.name === 'product' ? findPublicProduct(route.id) : undefined;
  const seo = seoFor(route, lang, product);
  return template
    .replace(/<html lang="[^"]*">/, `<html lang="${lang}">`)
    .replace('<!--seo-head-->', head(seo, route))
    .replace('<div id="root"></div>', `<div id="root">${body(route, lang, seo)}</div>`);
}

// Дату изменения (lastmod) не пишем: при каждой сборке она была бы «сегодня» у всех страниц,
// и Google перестал бы ей доверять. Фото товаров перечислены для Google Картинок.
function sitemap(): string {
  const urls = publicRoutes().flatMap((route) =>
    LANG_CODES.map((lang) => {
      const product = route.name === 'product' ? findPublicProduct(route.id) : undefined;
      const seo = seoFor(route, lang, product);
      const alts = seo.alternates
        .map((a) => `    <xhtml:link rel="alternate" hreflang="${a.lang}" href="${esc(a.href)}"/>`)
        .join('\n');
      const images = product
        ? productPhotos(product)
            .map((src) => `\n    <image:image><image:loc>${esc(abs(src))}</image:loc></image:image>`)
            .join('')
        : '';
      return `  <url>\n    <loc>${esc(abs(seo.path))}</loc>\n${alts}${images}\n  </url>`;
    })
  );
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"` +
    ` xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
    urls.join('\n') +
    `\n</urlset>\n`
  );
}

/**
 * Фид товаров для Google Merchant Center (бесплатные товарные объявления в Google Покупках).
 * Один файл на язык: merchant-feed-ru.xml, merchant-feed-uz.xml, merchant-feed-en.xml.
 * Попадают только товары с настоящими фото (рисунки-заглушки Merchant Center не принимает).
 * Цена — из products.ts (совпадает с базой). Стоимость доставки настраивается в самом Merchant Center.
 */
function merchantFeed(lang: Lang): string {
  const items = publicProducts()
    .filter((p) => productPhotos(p).length > 0)
    .map((p) => {
      // Сначала фото на чистом фоне (так Google предпочитает для главного фото товара)
      const plain = (src: string) => p.onLight || !!p.lightImages?.includes(src);
      const photos = [...productPhotos(p)].sort((x, y) => Number(plain(y)) - Number(plain(x)));
      const [main, ...more] = photos.map(abs);
      const link = abs(pathFor({ name: 'product', id: p.id }, lang));
      return [
        '    <item>',
        `      <g:id>${esc(p.id)}</g:id>`,
        `      <title>${esc(p[`name_${lang}`])}</title>`,
        `      <description>${esc(p[`desc_${lang}`])}</description>`,
        `      <link>${esc(link)}</link>`,
        `      <g:image_link>${esc(main)}</g:image_link>`,
        ...more.slice(0, 10).map((m) => `      <g:additional_image_link>${esc(m)}</g:additional_image_link>`),
        '      <g:availability>in_stock</g:availability>',
        `      <g:price>${p.price.toFixed(2)} UZS</g:price>`,
        `      <g:brand>${BRAND}</g:brand>`,
        '      <g:condition>new</g:condition>',
        '      <g:identifier_exists>no</g:identifier_exists>',
        `      <g:product_type>${esc(tr(lang, `cat.${p.category}`))}</g:product_type>`,
        `      <g:material>${esc(tr(lang, p.specs.material))}</g:material>`,
        '    </item>',
      ].join('\n');
    });
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n  <channel>\n` +
    `    <title>${BRAND}</title>\n    <link>${abs(pathFor({ name: 'catalog', category: 'all' }, lang))}</link>\n` +
    `    <description>${esc(CATALOG_TEXT[lang].all.description)}</description>\n` +
    items.join('\n') +
    `\n  </channel>\n</rss>\n`
  );
}

const ROBOTS = `User-agent: *
Allow: /
Disallow: /login

Sitemap: ${SITE}/sitemap.xml
`;

export function seoPages(): Plugin {
  let outDir = 'dist';
  return {
    name: 'pelta-seo-pages',
    apply: 'build',
    configResolved(c) {
      outDir = c.build.outDir;
    },
    closeBundle() {
      const indexFile = join(outDir, 'index.html');
      const template = readFileSync(indexFile, 'utf8');
      if (!template.includes('<!--seo-head-->')) throw new Error('index.html: нет метки <!--seo-head-->');
      const write = (file: string, html: string) => {
        const full = join(outDir, file);
        mkdirSync(dirname(full), { recursive: true });
        writeFileSync(full, html);
      };
      let count = 0;
      for (const route of publicRoutes()) {
        for (const lang of LANG_CODES) {
          write(fileFor(pathFor(route, lang)), render(template, route, lang));
          count++;
        }
      }
      // Неизвестные адреса и закрытые товары: GitHub Pages отдаёт 404.html, сайт показывает страницу сам
      write(
        '404.html',
        template.replace('<!--seo-head-->', `<title>${BRAND}</title>\n    <meta name="robots" content="noindex" />`)
      );
      write('sitemap.xml', sitemap());
      write('robots.txt', ROBOTS);
      for (const lang of LANG_CODES) write(`merchant-feed-${lang}.xml`, merchantFeed(lang));
      console.log(`SEO: ${count} страниц, sitemap.xml, robots.txt, 404.html`);
    },
  };
}
