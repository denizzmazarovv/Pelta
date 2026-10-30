import { translations, type Lang } from './i18n';
import { CATEGORIES, products, type Category, type Product } from './products';
import { LANG_CODES, DEFAULT_LANG, pathFor, type Route } from './paths';
import { formatPrice } from './format';

/**
 * Всё для поисковиков: заголовки, описания, разметка schema.org.
 * Без React — используется и сайтом (меняет <head> при переходах),
 * и сборкой (готовые страницы для каждого адреса, sitemap.xml).
 */

export const SITE = 'https://peltanera.com';
export const BRAND = 'Pelta Nera';
const DEFAULT_IMAGE = '/images/products/pelta_denim.jpg';
const LOGO = '/blue-logo.png';

const SOCIAL_LINKS = ['https://instagram.com/peltanera', 'https://t.me/+eOUaJZn_SsNhNzdi'];
const PHONE = '+998941717194';
const EMAIL = 'peltanera@gmail.com';

/** Как ещё могут искать бренд */
const ALT_NAMES = ['PeltaNera', 'Pelta Nera Tashkent', 'Пелта Нера', 'Пельта Нера', 'Pelta Nera Toshkent'];

const OG_LOCALE: Record<Lang, string> = { en: 'en_US', ru: 'ru_RU', uz: 'uz_UZ' };

const HOME_TITLE: Record<Lang, string> = {
  en: 'Pelta Nera — Handcrafted Leather Goods, Tashkent',
  ru: 'Pelta Nera — кожаные аксессуары ручной работы, Ташкент',
  uz: 'Pelta Nera — qo‘lda ishlangan charm aksessuarlar, Toshkent',
};

const HOME_DESC: Record<Lang, string> = {
  en: 'Pelta Nera is a Tashkent brand of handcrafted leather goods: cardholders, key chains, bags and belts in vegetable-tanned leather. Order online.',
  ru: 'Pelta Nera — бренд кожаных аксессуаров ручной работы из Ташкента: кардхолдеры, брелоки, сумки и ремни из кожи растительного дубления. Заказ онлайн.',
  uz: 'Pelta Nera — Toshkentdagi qo‘lda ishlangan charm aksessuarlar brendi: o‘simlik bilan oshlangan charmdan kartxolderlar, breloklar, sumkalar va kamarlar. Onlayn buyurtma.',
};

/** Название раздела для заголовка в поиске */
const CAT_TITLE: Record<Lang, Record<Category, string>> = {
  en: {
    cardholder: 'Leather Cardholders',
    keychain: 'Leather Key Chains',
    bag: 'Leather Bags',
    belt: 'Leather Belts',
    exclusive: 'Exclusive',
  },
  ru: {
    cardholder: 'Кожаные кардхолдеры',
    keychain: 'Кожаные брелоки',
    bag: 'Кожаные сумки',
    belt: 'Кожаные ремни',
    exclusive: 'Эксклюзив',
  },
  uz: {
    cardholder: 'Charm kartxolderlar',
    keychain: 'Charm breloklar',
    bag: 'Charm sumkalar',
    belt: 'Charm kamarlar',
    exclusive: 'Eksklyuziv',
  },
};

const CAT_DESC: Record<Lang, (cat: string) => string> = {
  en: (c) => `${c} handcrafted by Pelta Nera in Tashkent from vegetable-tanned leather. Prices and online ordering.`,
  ru: (c) => `${c} ручной работы от Pelta Nera, Ташкент. Кожа растительного дубления. Цены и заказ онлайн.`,
  uz: (c) => `${c} — Pelta Nera, Toshkent. Qo‘lda ishlangan, o‘simlik bilan oshlangan charm. Narxlar va onlayn buyurtma.`,
};

const PRICE_WORD: Record<Lang, string> = { en: 'Price', ru: 'Цена', uz: 'Narxi' };
const HANDMADE: Record<Lang, string> = {
  en: 'Handmade in Tashkent.',
  ru: 'Ручная работа, Ташкент.',
  uz: 'Qo‘l mehnati, Toshkent.',
};
const PRIVACY_DESC: Record<Lang, string> = {
  en: 'How Pelta Nera collects, uses and protects personal data.',
  ru: 'Как Pelta Nera собирает, использует и защищает персональные данные.',
  uz: 'Pelta Nera shaxsiy ma’lumotlarni qanday yig‘adi, ishlatadi va himoya qiladi.',
};

const TERMS_DESC: Record<Lang, string> = {
  en: 'Terms of sale of Pelta Nera: seller, ordering, prices in UZS, payment, delivery, returns, warranty and the loyalty programme.',
  ru: 'Публичная оферта Pelta Nera: продавец, оформление заказа, цены в сумах, оплата, доставка, возврат, гарантия и программа лояльности.',
  uz: 'Pelta Nera ommaviy ofertasi: sotuvchi, buyurtma, so‘mdagi narxlar, to‘lov, yetkazib berish, qaytarish, kafolat va sodiqlik dasturi.',
};

const tr = (lang: Lang, key: string) => translations[lang][key] ?? translations.en[key] ?? key;
export const abs = (path: string) => (/^https?:\/\//.test(path) ? path : SITE + path);
const clip = (s: string, n = 160) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s);

/** Открытые товары (закрытые в поиск не попадают) */
export const publicProducts = () => products.filter((p) => !p.exclusive && p.category !== 'exclusive');

/** Все открытые страницы сайта (для sitemap и готовых страниц) */
export function publicRoutes(): Route[] {
  return [
    { name: 'catalog', category: 'all' },
    ...CATEGORIES.map((c) => ({ name: 'catalog', category: c }) as Route),
    ...publicProducts().map((p) => ({ name: 'product', id: p.id }) as Route),
    { name: 'about' },
    { name: 'contact' },
    { name: 'privacy' },
    { name: 'terms' },
  ];
}

export type Seo = {
  title: string;
  description: string;
  path: string;
  image: string;
  type: 'website' | 'product';
  /** false — страницу не индексировать */
  index: boolean;
  alternates: { lang: Lang | 'x-default'; href: string }[];
  jsonLd: object[];
  locale: string;
};

const ogImage = (img: string | undefined) => abs(img && /\.(jpe?g|png|webp)$/i.test(img) ? img : DEFAULT_IMAGE);

function organization(lang: Lang) {
  return {
    '@type': 'Organization',
    '@id': `${SITE}/#organization`,
    name: BRAND,
    alternateName: ALT_NAMES,
    url: SITE + '/',
    logo: abs(LOGO),
    image: abs(DEFAULT_IMAGE),
    description: HOME_DESC[lang],
    email: EMAIL,
    telephone: PHONE,
    address: { '@type': 'PostalAddress', addressLocality: 'Tashkent', addressCountry: 'UZ' },
    areaServed: 'UZ',
    sameAs: SOCIAL_LINKS,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: PHONE,
      email: EMAIL,
      contactType: 'customer service',
      availableLanguage: ['Russian', 'Uzbek', 'English'],
    },
  };
}

function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.path) })),
  };
}

function productLd(p: Product, lang: Lang, path: string) {
  return {
    '@type': 'Product',
    '@id': abs(path) + '#product',
    name: p[`name_${lang}`],
    description: p[`desc_${lang}`],
    sku: p.id,
    image: [ogImage(p.image)],
    brand: { '@type': 'Brand', name: BRAND },
    category: tr(lang, `cat.${p.category}`),
    material: tr(lang, p.specs.material),
    offers: {
      '@type': 'Offer',
      url: abs(path),
      priceCurrency: 'UZS',
      price: p.price,
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': `${SITE}/#organization` },
    },
  };
}

/** Заголовок, описание и разметка для страницы. product — товар (в т.ч. закрытый из базы). */
export function seoFor(route: Route, lang: Lang, product?: Product): Seo {
  const path = pathFor(route, lang);
  const homePath = pathFor({ name: 'catalog', category: 'all' }, lang);
  const home = { name: tr(lang, 'nav.home'), path: homePath };
  let title = HOME_TITLE[lang];
  let description = HOME_DESC[lang];
  let image = DEFAULT_IMAGE;
  let type: Seo['type'] = 'website';
  let index = true;
  const ld: object[] = [];

  switch (route.name) {
    case 'catalog': {
      const list = publicProducts().filter((p) => route.category === 'all' || p.category === route.category);
      const itemList = {
        '@type': 'ItemList',
        itemListElement: list.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: abs(pathFor({ name: 'product', id: p.id }, lang)),
          name: p[`name_${lang}`],
        })),
      };
      if (route.category === 'all') {
        ld.push(organization(lang), {
          '@type': 'WebSite',
          '@id': `${SITE}/#website`,
          url: SITE + '/',
          name: BRAND,
          alternateName: ALT_NAMES,
          inLanguage: LANG_CODES,
          publisher: { '@id': `${SITE}/#organization` },
        }, itemList);
      } else {
        const name = CAT_TITLE[lang][route.category];
        title = `${name} — ${BRAND}`;
        description = CAT_DESC[lang](name);
        if (route.category === 'exclusive') index = false;
        ld.push(
          { '@type': 'CollectionPage', name, url: abs(path), inLanguage: lang, mainEntity: itemList },
          breadcrumbs([home, { name: tr(lang, `cat.${route.category}`), path }])
        );
      }
      break;
    }
    case 'product': {
      if (!product) {
        title = BRAND;
        index = false;
        break;
      }
      const name = product[`name_${lang}`];
      title = `${name} — ${BRAND}`;
      description = clip(`${product[`desc_${lang}`]} ${PRICE_WORD[lang]}: ${formatPrice(product.price, lang)}. ${HANDMADE[lang]}`);
      image = product.image;
      type = 'product';
      if (product.exclusive || product.category === 'exclusive') index = false;
      else {
        ld.push(
          productLd(product, lang, path),
          breadcrumbs([
            home,
            { name: tr(lang, `cat.${product.category}`), path: pathFor({ name: 'catalog', category: product.category }, lang) },
            { name, path },
          ])
        );
      }
      break;
    }
    case 'about':
      title = `${tr(lang, 'about.title')} — ${BRAND}`;
      description = clip(`${tr(lang, 'about.p1')} ${tr(lang, 'about.p2')}`);
      ld.push(
        { '@type': 'AboutPage', name: tr(lang, 'about.title'), url: abs(path), inLanguage: lang, about: { '@id': `${SITE}/#organization` } },
        breadcrumbs([home, { name: tr(lang, 'about.title'), path }])
      );
      break;
    case 'contact':
      title = `${tr(lang, 'contact.title')} — ${BRAND}`;
      description = clip(`${tr(lang, 'contact.subtitle')} ${PHONE.replace(/^\+998(\d\d)(\d{3})(\d\d)(\d\d)$/, '+998 $1 $2 $3 $4')}, ${EMAIL}`);
      ld.push(
        { '@type': 'ContactPage', name: tr(lang, 'contact.title'), url: abs(path), inLanguage: lang, about: { '@id': `${SITE}/#organization` } },
        breadcrumbs([home, { name: tr(lang, 'contact.title'), path }])
      );
      break;
    case 'privacy':
      title = `${tr(lang, 'footer.privacy')} — ${BRAND}`;
      description = PRIVACY_DESC[lang];
      break;
    case 'terms':
      title = `${tr(lang, 'footer.terms')} — ${BRAND}`;
      description = TERMS_DESC[lang];
      break;
  }

  const alternates: Seo['alternates'] = index
    ? [
        ...LANG_CODES.map((l) => ({ lang: l, href: abs(pathFor(route, l)) })),
        { lang: 'x-default' as const, href: abs(pathFor(route, DEFAULT_LANG)) },
      ]
    : [];

  return {
    title,
    description,
    path,
    image: ogImage(image),
    type,
    index,
    alternates,
    jsonLd: ld.length ? [{ '@context': 'https://schema.org', '@graph': ld }] : [],
    locale: OG_LOCALE[lang],
  };
}

export function findPublicProduct(id: string): Product | undefined {
  return publicProducts().find((p) => p.id === id);
}
