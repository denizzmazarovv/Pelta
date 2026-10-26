import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Plugin } from 'vite';
import { translations, type Lang } from '../src/lib/i18n';
import { CATEGORIES, type Product } from '../src/lib/products';
import { LANG_CODES, pathFor, type Route } from '../src/lib/paths';
import { BRAND, SITE, abs, findPublicProduct, publicProducts, publicRoutes, seoFor, type Seo } from '../src/lib/seo';

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

function head(seo: Seo): string {
  const tags = [
    `<title>${esc(seo.title)}</title>`,
    `<meta name="description" content="${esc(seo.description)}" />`,
    `<meta name="robots" content="${seo.index ? 'index, follow' : 'noindex, follow'}" />`,
    `<link rel="canonical" href="${esc(abs(seo.path))}" />`,
    ...seo.alternates.map((a) => `<link rel="alternate" hreflang="${a.lang}" href="${esc(a.href)}" />`),
    `<meta property="og:site_name" content="${BRAND}" />`,
    `<meta property="og:type" content="${seo.type}" />`,
    `<meta property="og:title" content="${esc(seo.title)}" />`,
    `<meta property="og:description" content="${esc(seo.description)}" />`,
    `<meta property="og:url" content="${esc(abs(seo.path))}" />`,
    `<meta property="og:image" content="${esc(seo.image)}" />`,
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
    `<li>${link(pathFor({ name: 'product', id: p.id }, lang), p[`name_${lang}`])} — ${p.price} USD</li>`;

  let main = '';
  switch (route.name) {
    case 'catalog': {
      const list = publicProducts().filter((p) => route.category === 'all' || p.category === route.category);
      const h1 = route.category === 'all' ? seo.title : tr(lang, `cat.${route.category}`);
      main = `<h1>${esc(h1)}</h1><p>${esc(seo.description)}</p><ul>${list.map(productItem).join('')}</ul>`;
      break;
    }
    case 'product': {
      const p = findPublicProduct(route.id)!;
      const s = p.specs;
      main =
        `<p>${link(home, tr(lang, 'nav.home'))} / ${link(pathFor({ name: 'catalog', category: p.category }, lang), tr(lang, `cat.${p.category}`))}</p>` +
        `<h1>${esc(p[`name_${lang}`])}</h1>` +
        (/\.(jpe?g|png|webp)$/i.test(p.image) ? `<img src="${esc(p.image)}" alt="${esc(p[`name_${lang}`])}" width="320" />` : '') +
        `<p>${esc(p[`desc_${lang}`])}</p>` +
        `<p><strong>${p.price} USD</strong></p>` +
        `<ul><li>${esc(tr(lang, s.material))}</li><li>${esc(s.dimensions)}</li><li>${esc(s.weight)}</li></ul>`;
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
  }

  return (
    // Посетитель обычно не видит этот текст: сайт загружается раньше. Без JavaScript он появляется через 2 секунды.
    `<style>@keyframes pn-seo{to{opacity:1}}.pn-seo{opacity:0;animation:pn-seo .3s 2s forwards}.pn-seo a{color:inherit;text-decoration:underline}.pn-seo h1{font-size:28px;font-weight:600;margin:20px 0 12px}.pn-seo p,.pn-seo ul,.pn-seo nav{margin:8px 0}.pn-seo li{list-style:disc;margin-left:20px}</style>` +
    `<div class="pn-seo" style="max-width:760px;margin:0 auto;padding:72px 20px;font-family:system-ui,sans-serif;line-height:1.6;color:#111">` +
    `<header><a href="${esc(home)}"><strong>${BRAND}</strong></a><nav>${nav}</nav><p>${langs}</p></header>` +
    `<main>${main}</main>` +
    `<footer><p>${BRAND} — Tashkent, Uzbekistan · ${link(pathFor({ name: 'privacy' }, lang), tr(lang, 'footer.privacy'))}</p></footer>` +
    `</div>`
  );
}

function render(template: string, route: Route, lang: Lang): string {
  const product = route.name === 'product' ? findPublicProduct(route.id) : undefined;
  const seo = seoFor(route, lang, product);
  return template
    .replace(/<html lang="[^"]*">/, `<html lang="${lang}">`)
    .replace('<!--seo-head-->', head(seo))
    .replace('<div id="root"></div>', `<div id="root">${body(route, lang, seo)}</div>`);
}

function sitemap(): string {
  const today = new Date().toISOString().slice(0, 10);
  const urls = publicRoutes().flatMap((route) =>
    LANG_CODES.map((lang) => {
      const seo = seoFor(route, lang, route.name === 'product' ? findPublicProduct(route.id) : undefined);
      const alts = seo.alternates
        .map((a) => `    <xhtml:link rel="alternate" hreflang="${a.lang}" href="${esc(a.href)}"/>`)
        .join('\n');
      const priority = route.name === 'catalog' ? (route.category === 'all' ? '1.0' : '0.8') : route.name === 'product' ? '0.9' : '0.4';
      return `  <url>\n    <loc>${esc(abs(seo.path))}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${priority}</priority>\n${alts}\n  </url>`;
    })
  );
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    urls.join('\n') +
    `\n</urlset>\n`
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
      console.log(`SEO: ${count} страниц, sitemap.xml, robots.txt, 404.html`);
    },
  };
}
