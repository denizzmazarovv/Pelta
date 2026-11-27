import { translations, type Lang } from './i18n';
import { CATEGORIES, products, type Category, type Product } from './products';
import { LANG_CODES, DEFAULT_LANG, pathFor, type Route } from './paths';
import { formatPrice } from './format';
import { PRODUCT_SEO } from './productSeo';
import { isPhoto } from './images';

/**
 * Всё для поисковиков: заголовки, описания, разметка schema.org.
 * Без React — используется и сайтом (меняет <head> при переходах),
 * и сборкой (готовые страницы для каждого адреса, sitemap.xml, фид Google Merchant Center).
 *
 * Тексты распределены по страницам: главная — «кожаные аксессуары / изделия из натуральной кожи /
 * Ташкент / Узбекистан», разделы — свой тип изделия, товары — название, тип, материал, назначение.
 * Заголовки и описания товаров — в productSeo.ts.
 */

export const SITE = 'https://peltanera.com';
export const BRAND = 'Pelta Nera';
/** Картинка для превью ссылок (jpg — его понимают все соцсети и мессенджеры) */
const DEFAULT_IMAGE = '/images/products/pelta_denim.jpg';
const LOGO = '/blue-logo.png';

const SOCIAL_LINKS = ['https://instagram.com/peltanera', 'https://t.me/+eOUaJZn_SsNhNzdi'];
const PHONE = '+998941717194';
const EMAIL = 'peltanera@gmail.com';

/**
 * Наличие в разметке товаров. Товары в продаже и доступны для заказа (pn_products.active).
 * Если изделия делаются только под заказ — поменяйте на 'https://schema.org/MadeToOrder'.
 */
const AVAILABILITY = 'https://schema.org/InStock';

/** Условия возврата из оферты (раздел 6): 10 дней, обратную доставку оплачивает покупатель */
const RETURN_POLICY = {
  '@type': 'MerchantReturnPolicy',
  applicableCountry: 'UZ',
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: 10,
  returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
};

/** Как ещё могут искать бренд */
const ALT_NAMES = ['PeltaNera', 'Pelta Nera Tashkent', 'Пелта Нера', 'Пельта Нера', 'Pelta Nera Toshkent'];

const OG_LOCALE: Record<Lang, string> = { en: 'en_US', ru: 'ru_RU', uz: 'uz_UZ' };

const HOME_TITLE: Record<Lang, string> = {
  en: 'Handcrafted Leather Goods from Tashkent — Pelta Nera',
  ru: 'Кожаные аксессуары ручной работы в Ташкенте — Pelta Nera',
  uz: 'Qo‘lda ishlangan charm buyumlar, Toshkent — Pelta Nera',
};

const HOME_DESC: Record<Lang, string> = {
  en: 'Premium genuine leather accessories by Pelta Nera: cardholders, key chains, bags and belts, made in Tashkent. Order online with delivery across Uzbekistan.',
  ru: 'Премиальные изделия из натуральной кожи от Pelta Nera: кардхолдеры, брелоки, сумки и ремни. Купить кожаные аксессуары в Ташкенте, доставка по Узбекистану.',
  uz: 'Pelta Nera — tabiiy charmdan premium aksessuarlar: kartxolderlar, breloklar, sumkalar va kamarlar. Toshkentda charm buyumlar, O‘zbekiston bo‘ylab yetkazib berish.',
};

/**
 * Каталог: h1 и короткая строка внизу страницы (видны посетителю), заголовок и описание для Google.
 * all — главная страница.
 */
type CatalogText = { h1: string; intro: string; title: string; description: string };
export const CATALOG_TEXT: Record<Lang, Record<Category | 'all', CatalogText>> = {
  ru: {
    all: {
      h1: 'Кожаные аксессуары Pelta Nera',
      intro: 'Изделия из натуральной кожи. Ташкент, доставка по Узбекистану.',
      title: HOME_TITLE.ru,
      description: HOME_DESC.ru,
    },
    cardholder: {
      h1: 'Кожаные кардхолдеры',
      intro: 'Кардхолдеры из натуральной кожи ручной работы.',
      title: 'Кожаные кардхолдеры ручной работы, Ташкент — Pelta Nera',
      description:
        'Кожаные кардхолдеры Pelta Nera ручной работы: компактный держатель для карт и подарок из натуральной кожи. Купить в Ташкенте, доставка по Узбекистану.',
    },
    keychain: {
      h1: 'Кожаные брелоки',
      intro: 'Брелоки для ключей из натуральной кожи.',
      title: 'Кожаные брелоки для ключей ручной работы — Pelta Nera',
      description:
        'Брелоки для ключей из натуральной кожи от Pelta Nera: небольшой кожаный аксессуар на каждый день и подарок. Ташкент, доставка по Узбекистану.',
    },
    bag: {
      h1: 'Кожаные сумки',
      intro: 'Сумки и портфели из натуральной кожи.',
      title: 'Сумки из натуральной кожи ручной работы — Pelta Nera',
      description:
        'Сумки и портфели из натуральной кожи растительного дубления от Pelta Nera: ручная работа, со временем кожа приобретает патину. Доставка по Узбекистану.',
    },
    belt: {
      h1: 'Кожаные ремни',
      intro: 'Ремни из натуральной кожи.',
      title: 'Ремни из натуральной кожи — Pelta Nera, Ташкент',
      description:
        'Ремни из натуральной кожи от Pelta Nera: классический ремень и ремень с ручной прострочкой. Купить кожаный ремень в Ташкенте, доставка по Узбекистану.',
    },
    exclusive: { h1: 'Эксклюзив', intro: '', title: 'Эксклюзив — Pelta Nera', description: HOME_DESC.ru },
  },
  uz: {
    all: {
      h1: 'Pelta Nera charm aksessuarlari',
      intro: 'Tabiiy charmdan buyumlar. Toshkent, O‘zbekiston bo‘ylab yetkazib berish.',
      title: HOME_TITLE.uz,
      description: HOME_DESC.uz,
    },
    cardholder: {
      h1: 'Charm kartxolderlar',
      intro: 'Tabiiy charmdan qo‘lda ishlangan kartxolderlar.',
      title: 'Charm kartxolderlar, qo‘lda ishlangan — Pelta Nera',
      description:
        'Tabiiy charmdan qo‘lda ishlangan Pelta Nera kartxolderlari: kartalar uchun ixcham hamyon va sovg‘a. Toshkentda sotib oling, O‘zbekiston bo‘ylab yetkazib berish.',
    },
    keychain: {
      h1: 'Charm breloklar',
      intro: 'Tabiiy charmdan kalit breloklari.',
      title: 'Charm kalit breloklari, qo‘lda ishlangan — Pelta Nera',
      description:
        'Tabiiy charmdan Pelta Nera kalit breloklari: har kunlik kichik charm aksessuar va sovg‘a. Toshkent, O‘zbekiston bo‘ylab yetkazib berish.',
    },
    bag: {
      h1: 'Charm sumkalar',
      intro: 'Tabiiy charmdan sumka va portfellar.',
      title: 'Tabiiy charm sumkalar, qo‘lda ishlangan — Pelta Nera',
      description:
        'O‘simlik bilan oshlangan tabiiy charmdan Pelta Nera sumka va portfellari: qo‘l mehnati, vaqt o‘tib charm patina kasb etadi. O‘zbekiston bo‘ylab yetkazib berish.',
    },
    belt: {
      h1: 'Charm kamarlar',
      intro: 'Tabiiy charmdan kamarlar.',
      title: 'Tabiiy charm kamarlar — Pelta Nera, Toshkent',
      description:
        'Tabiiy charmdan Pelta Nera kamarlari: klassik kamar va qo‘lda tikilgan kamar. Toshkentda charm kamar sotib oling, O‘zbekiston bo‘ylab yetkazib berish.',
    },
    exclusive: { h1: 'Eksklyuziv', intro: '', title: 'Eksklyuziv — Pelta Nera', description: HOME_DESC.uz },
  },
  en: {
    all: {
      h1: 'Pelta Nera Leather Accessories',
      intro: 'Genuine leather goods. Tashkent, delivery across Uzbekistan.',
      title: HOME_TITLE.en,
      description: HOME_DESC.en,
    },
    cardholder: {
      h1: 'Leather Cardholders',
      intro: 'Genuine leather cardholders, made by hand.',
      title: 'Leather Cardholders, Handmade in Tashkent — Pelta Nera',
      description:
        'Handmade genuine leather cardholders by Pelta Nera: a slim card holder and a lasting gift. Order in Tashkent with delivery across Uzbekistan.',
    },
    keychain: {
      h1: 'Leather Key Chains',
      intro: 'Genuine leather key chains.',
      title: 'Leather Key Chains, Handmade — Pelta Nera Tashkent',
      description:
        'Genuine leather key chains by Pelta Nera: a small everyday leather accessory and a gift. Tashkent, delivery across Uzbekistan.',
    },
    bag: {
      h1: 'Leather Bags',
      intro: 'Bags and portfolios in genuine leather.',
      title: 'Genuine Leather Bags, Handmade — Pelta Nera Tashkent',
      description:
        'Bags and portfolios by Pelta Nera in vegetable-tanned genuine leather, made by hand to develop a rich patina. Tashkent, delivery across Uzbekistan.',
    },
    belt: {
      h1: 'Leather Belts',
      intro: 'Genuine leather belts.',
      title: 'Genuine Leather Belts — Pelta Nera, Tashkent',
      description:
        'Genuine leather belts by Pelta Nera: a classic belt and a hand-stitched belt. Order in Tashkent with delivery across Uzbekistan.',
    },
    exclusive: { h1: 'Exclusive', intro: '', title: 'Exclusive — Pelta Nera', description: HOME_DESC.en },
  },
};

const PRICE_WORD: Record<Lang, string> = { en: 'Price', ru: 'Цена', uz: 'Narxi' };
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

const ABOUT_TITLE: Record<Lang, string> = {
  en: 'Our Story — Pelta Nera, Leather Goods from Tashkent',
  ru: 'История бренда Pelta Nera — кожаные изделия из Ташкента',
  uz: 'Pelta Nera brend tarixi — Toshkentdan charm buyumlar',
};
const CONTACT_TITLE: Record<Lang, string> = {
  en: 'Contact Pelta Nera — Orders and Bespoke Leather Goods',
  ru: 'Контакты Pelta Nera — заказ и индивидуальные кожаные изделия',
  uz: 'Pelta Nera bilan aloqa — buyurtma va maxsus charm buyumlar',
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

const ogImage = (img: string | undefined) => abs(img && isPhoto(img) ? img : DEFAULT_IMAGE);

/** Настоящие фото товара (рисунки-заглушки поисковикам картинок не отдаём) */
export const productPhotos = (p: Product) => p.gallery.filter(isPhoto);

/** Заголовок товара для Google */
export function productTitle(p: Product, lang: Lang): string {
  return PRODUCT_SEO[p.id]?.[lang]?.title ?? `${p[`name_${lang}`]} — ${BRAND}`;
}

/** Описание товара для Google: своё из productSeo.ts (+ цена, если помещается) */
export function productDescription(p: Product, lang: Lang, price = p.price): string {
  const base = PRODUCT_SEO[p.id]?.[lang]?.description ?? p[`desc_${lang}`];
  const withPrice = `${base} ${PRICE_WORD[lang]}: ${formatPrice(price, lang)}.`;
  return withPrice.length <= 170 ? withPrice : clip(base, 170);
}

function organization(lang: Lang) {
  return {
    // Интернет-магазин без зала для посетителей: OnlineStore (вид Organization)
    '@type': 'OnlineStore',
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
    areaServed: { '@type': 'Country', name: 'Uzbekistan' },
    currenciesAccepted: 'UZS',
    sameAs: SOCIAL_LINKS,
    hasMerchantReturnPolicy: RETURN_POLICY,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: PHONE,
      email: EMAIL,
      contactType: 'customer service',
      areaServed: 'UZ',
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
  const photos = productPhotos(p).map(abs);
  return {
    '@type': 'Product',
    '@id': abs(path) + '#product',
    name: p[`name_${lang}`],
    description: p[`desc_${lang}`],
    url: abs(path),
    sku: p.id,
    productID: p.id,
    ...(photos.length ? { image: photos } : {}),
    brand: { '@type': 'Brand', name: BRAND },
    category: tr(lang, `cat.${p.category}`),
    material: tr(lang, p.specs.material),
    offers: {
      '@type': 'Offer',
      url: abs(path),
      priceCurrency: 'UZS',
      price: p.price,
      availability: AVAILABILITY,
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': `${SITE}/#organization` },
      hasMerchantReturnPolicy: RETURN_POLICY,
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
      const text = CATALOG_TEXT[lang][route.category];
      title = text.title;
      description = text.description;
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
        ld.push(
          organization(lang),
          {
            '@type': 'WebSite',
            '@id': `${SITE}/#website`,
            url: SITE + '/',
            name: BRAND,
            alternateName: ALT_NAMES,
            inLanguage: LANG_CODES,
            publisher: { '@id': `${SITE}/#organization` },
          },
          {
            '@type': 'CollectionPage',
            name: text.h1,
            url: abs(path),
            inLanguage: lang,
            isPartOf: { '@id': `${SITE}/#website` },
            mainEntity: itemList,
          }
        );
      } else {
        if (route.category === 'exclusive') index = false;
        ld.push(
          { '@type': 'CollectionPage', name: text.h1, url: abs(path), inLanguage: lang, mainEntity: itemList },
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
      title = productTitle(product, lang);
      description = productDescription(product, lang);
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
      title = ABOUT_TITLE[lang];
      description = clip(`${tr(lang, 'about.p1')} ${tr(lang, 'about.p2')}`);
      ld.push(
        { '@type': 'AboutPage', name: tr(lang, 'about.title'), url: abs(path), inLanguage: lang, about: { '@id': `${SITE}/#organization` } },
        breadcrumbs([home, { name: tr(lang, 'about.title'), path }])
      );
      break;
    case 'contact':
      title = CONTACT_TITLE[lang];
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
