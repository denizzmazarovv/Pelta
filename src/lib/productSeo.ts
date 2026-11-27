import type { Lang } from './i18n';

/**
 * Поисковые заголовки, описания и подписи к фото (ALT) для каждого товара.
 *
 * title — заголовок в Google (до ~60 символов, без повторов между товарами).
 * description — описание в Google (до ~155 символов). Цена добавляется сама, если помещается.
 * alts — подпись к каждому фото по порядку gallery в products.ts: что именно на фото.
 *
 * Новый товар без записи здесь получит заголовок и описание из своих name_/desc_ автоматически.
 * Пишите только правду о товаре: материал, назначение, размеры — как в products.ts.
 */
export type ProductSeoText = { title: string; description: string; alts?: string[] };

export const PRODUCT_SEO: Record<string, Partial<Record<Lang, ProductSeoText>>> = {
  'ch-01': {
    ru: {
      title: 'Кардхолдер Nera Denim ручной работы — Pelta Nera',
      description:
        'Кардхолдер Nera Denim на шесть карт от Pelta Nera: компактный кожаный аксессуар ручной работы и удобный подарок. Ташкент, доставка по Узбекистану.',
      alts: [
        'Два кардхолдера Nera Denim в подарочной коробке Pelta Nera',
        'Кардхолдер Nera Denim, вид спереди',
        'Кардхолдер Nera Denim сбоку: отделения для карт',
      ],
    },
    uz: {
      title: 'Nera Denim kartxolderi, qo‘lda ishlangan — Pelta Nera',
      description:
        'Oltita karta uchun Nera Denim kartxolderi: qo‘lda ishlangan ixcham charm aksessuar va sovg‘a. Toshkent, O‘zbekiston bo‘ylab yetkazib berish.',
      alts: [
        'Pelta Nera sovg‘a qutisidagi ikkita Nera Denim kartxolderi',
        'Nera Denim kartxolderi, old tomondan',
        'Nera Denim kartxolderi yon tomondan: karta bo‘limlari',
      ],
    },
    en: {
      title: 'Nera Denim Cardholder, Handmade — Pelta Nera',
      description:
        'The Nera Denim six-card holder by Pelta Nera: a compact handmade leather accessory and a thoughtful gift. Tashkent, delivery across Uzbekistan.',
      alts: [
        'Two Nera Denim cardholders in a Pelta Nera gift box',
        'Nera Denim cardholder, front view',
        'Nera Denim cardholder, side view of the card slots',
      ],
    },
  },
  'ch-02': {
    ru: {
      title: 'Кардхолдер Pelta из натуральной кожи — Pelta Nera',
      description:
        'Минималистичный кардхолдер Pelta из кожи растительного дубления с отделением для купюр. Ручная работа, Ташкент, доставка по Узбекистану.',
    },
    uz: {
      title: 'Pelta kartxolderi, tabiiy charm — Pelta Nera',
      description:
        'Banknot bo‘limli minimalistik Pelta kartxolderi, o‘simlik bilan oshlangan charmdan. Qo‘l mehnati, Toshkent, O‘zbekiston bo‘ylab yetkazib berish.',
    },
    en: {
      title: 'Pelta Leather Cardholder with Note Pocket — Pelta Nera',
      description:
        'A minimal vegetable-tanned leather cardholder with a note compartment, handmade by Pelta Nera in Tashkent. Delivery across Uzbekistan.',
    },
  },
  'ch-03': {
    ru: {
      title: 'Кардхолдер Paint H с ручной росписью — Pelta Nera',
      description:
        'Кардхолдер Paint H в форме буквы H из натуральной кожи, вручную расписанный брызгами краски. Каждый экземпляр уникален. Ташкент, доставка по Узбекистану.',
      alts: ['Кардхолдер Paint H в форме буквы H, расписанный брызгами красной, синей, белой и коричневой краски'],
    },
    uz: {
      title: 'Paint H kartxolderi, qo‘lda bo‘yalgan — Pelta Nera',
      description:
        'H harfi shaklidagi tabiiy charm Paint H kartxolderi, qo‘lda bo‘yalgan. Har bir nusxa betakror. Toshkent, O‘zbekiston bo‘ylab yetkazib berish.',
      alts: ['Qizil, ko‘k, oq va jigarrang bo‘yoq sachratqilari bilan bo‘yalgan H shaklidagi Paint H kartxolderi'],
    },
    en: {
      title: 'Paint H Hand-Painted Leather Cardholder — Pelta Nera',
      description:
        'An H-shaped genuine leather cardholder, hand-painted with splashes of colour. Every piece is one of a kind. Tashkent, delivery across Uzbekistan.',
      alts: ['H-shaped Paint H cardholder hand-painted with red, blue, white and brown splashes'],
    },
  },
  'kc-01': {
    ru: {
      title: 'Кожаный брелок для ключей Nera — Pelta Nera',
      description:
        'Брелок для ключей Nera из кожи растительного дубления, ручная работа. Небольшой кожаный аксессуар и подарок. Ташкент, доставка по Узбекистану.',
    },
    uz: {
      title: 'Nera charm kalit breloki — Pelta Nera',
      description:
        'O‘simlik bilan oshlangan charmdan qo‘lda ishlangan Nera kalit breloki: kichik charm aksessuar va sovg‘a. Toshkent, O‘zbekiston bo‘ylab yetkazib berish.',
    },
    en: {
      title: 'Nera Leather Key Chain, Handmade — Pelta Nera',
      description:
        'The Nera key chain in vegetable-tanned leather, made by hand: a small leather accessory and a gift. Tashkent, delivery across Uzbekistan.',
    },
  },
  'bag-01': {
    ru: {
      title: 'Кожаная сумка через плечо Tashkent — Pelta Nera',
      description:
        'Городская сумка через плечо Tashkent из кожи растительного дубления, ручная работа. Со временем кожа приобретает патину. Доставка по Узбекистану.',
    },
    uz: {
      title: 'Tashkent charm yelka sumkasi — Pelta Nera',
      description:
        'O‘simlik bilan oshlangan charmdan qo‘lda ishlangan Tashkent shahar yelka sumkasi; vaqt o‘tib patina kasb etadi. O‘zbekiston bo‘ylab yetkazib berish.',
    },
    en: {
      title: 'Tashkent Leather Shoulder Bag, Handmade — Pelta Nera',
      description:
        'A handmade city shoulder bag in vegetable-tanned leather that develops a rich patina over time. By Pelta Nera, delivery across Uzbekistan.',
    },
  },
  'bag-02': {
    ru: {
      title: 'Кожаный портфель Amir для документов — Pelta Nera',
      description:
        'Вместительный портфель Amir для документов из натуральной кожи. Структурный силуэт, ручная работа. Ташкент, доставка по Узбекистану.',
    },
    uz: {
      title: 'Amir charm portfeli hujjatlar uchun — Pelta Nera',
      description:
        'Hujjatlar uchun tabiiy charmdan keng Amir portfeli: qat’iy siluet, qo‘l mehnati. Toshkent, O‘zbekiston bo‘ylab yetkazib berish.',
    },
    en: {
      title: 'Amir Leather Portfolio for Documents — Pelta Nera',
      description:
        'The Amir portfolio in genuine leather: a generous, structured case for documents, made by hand. Tashkent, delivery across Uzbekistan.',
    },
  },
  'belt-01': {
    ru: {
      title: 'Кожаный ремень Classic — Pelta Nera, Ташкент',
      description:
        'Классический ремень Classic из плотной натуральной кожи с лаконичной пряжкой. Купить кожаный ремень в Ташкенте, доставка по Узбекистану.',
    },
    uz: {
      title: 'Classic charm kamari — Pelta Nera, Toshkent',
      description:
        'Zich tabiiy charmdan ixcham to‘qali klassik Classic kamari. Toshkentda charm kamar, O‘zbekiston bo‘ylab yetkazib berish.',
    },
    en: {
      title: 'Classic Leather Belt — Pelta Nera, Tashkent',
      description:
        'A classic belt in firm genuine leather with an understated buckle. Order in Tashkent with delivery across Uzbekistan.',
    },
  },
  'belt-02': {
    ru: {
      title: 'Кожаный ремень Heritage с ручной прострочкой — Pelta Nera',
      description:
        'Ремень Heritage из натуральной кожи с фигурной пряжкой и ручной прострочкой. Ташкент, доставка по Узбекистану.',
    },
    uz: {
      title: 'Heritage charm kamari, qo‘lda tikilgan — Pelta Nera',
      description:
        'Shakldor to‘qali, qo‘lda tikilgan tabiiy charm Heritage kamari. Toshkent, O‘zbekiston bo‘ylab yetkazib berish.',
    },
    en: {
      title: 'Heritage Hand-Stitched Leather Belt — Pelta Nera',
      description:
        'The Heritage belt in genuine leather with a sculpted buckle and hand stitching. Tashkent, delivery across Uzbekistan.',
    },
  },
};
