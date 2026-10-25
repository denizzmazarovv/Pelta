export type Category = 'cardholder' | 'keychain' | 'bag' | 'belt' | 'exclusive';

export type Spec = {
  material: string;
  dimensions: string;
  weight: string;
  handmade: boolean;
};

export type ColorOption = { id: string; colorKey: string };

export type Product = {
  id: string;
  category: Category;
  name_ru: string;
  name_uz: string;
  name_en: string;
  desc_ru: string;
  desc_uz: string;
  desc_en: string;
  /** Цена в долларах США. На сайте показывается просто числом, без знака $. */
  price: number;
  image: string;
  gallery: string[];
  colors: ColorOption[];
  specs: Spec;
  featured: boolean;
  /** Закрытый товар: виден только клиентам с нужным уровнем или ролью. */
  exclusive?: boolean;
};

const tan: ColorOption = { id: 'tan', colorKey: 'product.color_tan' };
const black: ColorOption = { id: 'black', colorKey: 'product.color_black' };
const cognac: ColorOption = { id: 'cognac', colorKey: 'product.color_cognac' };

export const CATEGORIES: Category[] = ['cardholder', 'keychain', 'bag', 'belt'];
export const DEFAULT_COLOR: ColorOption = { id: 'default', colorKey: 'product.color_default' };

export function findProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export const products: Product[] = [
  {
    id: 'ch-01',
    category: 'cardholder',
    name_ru: 'Кардхолдер Nera Denim',
    name_uz: 'Nera Denim kartxolderi',
    name_en: 'Nera Denim Cardholder',
    desc_ru: 'Компактный кардхолдер на шесть карт из кожи растительного дубления. Лаконичный силуэт, выполненный вручную.',
    desc_uz: 'O‘simlik bilan oshlangan charmdan oltita karta uchun ixcham kartxolder. Qo‘lda ishlangan lakonik siluet.',
    desc_en: 'A compact six-card holder in vegetable-tanned leather. A pared-back silhouette, made by hand.',
    price: 60,
    image: '/images/products/pelta_denim.jpg',
    gallery: [
      '/images/products/pelta_denim.jpg',
      '/images/products/cardholder-pelta.svg',
      '/images/products/belt-classic.svg',
    ],
    colors: [tan, cognac],
    specs: { material: 'product.material_value', dimensions: '105 × 75 × 8 mm', weight: '48 g', handmade: true },
    featured: true,
  },
  {
    id: 'ch-02',
    category: 'cardholder',
    name_ru: 'Кардхолдер Pelta',
    name_uz: 'Pelta kartxolderi',
    name_en: 'Pelta Cardholder',
    desc_ru: 'Минималистичный кардхолдер с отделением для купюр. Кожа растительного дубления, ручная работа.',
    desc_uz: 'Banknotlar uchun bo‘limli minimalistik kartxolder. O‘simlik bilan oshlangan charm, qo‘l mehnati.',
    desc_en: 'A minimal cardholder with a note compartment. Vegetable-tanned leather, made by hand.',
    price: 56,
    image: '/images/products/cardholder-pelta.svg',
    gallery: [
      '/images/products/cardholder-pelta.svg',
      '/images/products/cardholder-nera.svg',
      '/images/products/belt-heritage.svg',
    ],
    colors: [black, tan],
    specs: { material: 'product.material_value', dimensions: '110 × 80 × 10 mm', weight: '62 g', handmade: true },
    featured: false,
  },
  {
    id: 'kc-01',
    category: 'keychain',
    name_ru: 'Кожаный брелок Nera',
    name_uz: 'Nera charm breloki',
    name_en: 'Nera Leather Key Chain',
    desc_ru: 'Брелок для ключей из кожи растительного дубления, выполненный вручную. Небольшая вещь, которая с годами становится только красивее.',
    desc_uz: 'O‘simlik bilan oshlangan charmdan qo‘lda ishlangan kalit breloki. Yillar o‘tib yanada chiroyli bo‘ladigan kichik buyum.',
    desc_en: 'A key chain in vegetable-tanned leather, made by hand. A small object that only grows more beautiful with time.',
    price: 30,
    image: '/images/products/keychain-nera.svg',
    gallery: ['/images/products/keychain-nera.svg'],
    colors: [tan, black, cognac],
    specs: { material: 'product.material_value', dimensions: '95 × 30 × 4 mm', weight: '18 g', handmade: true },
    featured: true,
  },
  {
    id: 'bag-01',
    category: 'bag',
    name_ru: 'Сумка Tashkent',
    name_uz: 'Tashkent sumkasi',
    name_en: 'Tashkent Shoulder Bag',
    desc_ru: 'Городская сумка через плечо ручной работы из кожи растительного дубления, которая со временем приобретает благородную патину.',
    desc_uz: 'Vaqt o‘tishi bilan nafis patina kasb etadigan, o‘simlik bilan oshlangan charmdan qo‘lda ishlangan shahar yelka sumkasi.',
    desc_en: 'A handcrafted city shoulder bag in vegetable-tanned leather that develops a rich patina over time.',
    price: 184,
    image: '/images/products/bag-tashkent.svg',
    gallery: [
      '/images/products/bag-tashkent.svg',
      '/images/products/bag-amir.svg',
      '/images/products/belt-classic.svg',
    ],
    colors: [tan, cognac, black],
    specs: { material: 'product.material_value', dimensions: '240 × 180 × 60 mm', weight: '420 g', handmade: true },
    featured: true,
  },
  {
    id: 'bag-02',
    category: 'bag',
    name_ru: 'Портфель Amir',
    name_uz: 'Amir portfeli',
    name_en: 'Amir Portfolio',
    desc_ru: 'Вместительный портфель для документов. Структурный силуэт и ручная работа.',
    desc_uz: 'Hujjatlar uchun keng portfel. Qat’iy siluet va qo‘l mehnati.',
    desc_en: 'A generous portfolio for documents. A structured silhouette, made by hand.',
    price: 227,
    image: '/images/products/bag-amir.svg',
    gallery: [
      '/images/products/bag-amir.svg',
      '/images/products/bag-tashkent.svg',
      '/images/products/belt-heritage.svg',
    ],
    colors: [black, tan],
    specs: { material: 'product.material_value', dimensions: '320 × 260 × 80 mm', weight: '680 g', handmade: true },
    featured: false,
  },
  {
    id: 'belt-01',
    category: 'belt',
    name_ru: 'Ремень Classic',
    name_uz: 'Classic kamari',
    name_en: 'Classic Belt',
    desc_ru: 'Классический ремень из плотной кожи с лаконичной пряжкой.',
    desc_uz: 'Ixcham to‘qali zich charmdan klassik kamar.',
    desc_en: 'A classic belt in firm leather with an understated buckle.',
    price: 73,
    image: '/images/products/belt-classic.svg',
    gallery: [
      '/images/products/belt-classic.svg',
      '/images/products/belt-heritage.svg',
      '/images/products/cardholder-nera.svg',
    ],
    colors: [tan, black],
    specs: { material: 'product.material_value', dimensions: '1100 × 35 × 4 mm', weight: '180 g', handmade: false },
    featured: true,
  },
  {
    id: 'belt-02',
    category: 'belt',
    name_ru: 'Ремень Heritage',
    name_uz: 'Heritage kamari',
    name_en: 'Heritage Belt',
    desc_ru: 'Ремень с фигурной пряжкой и ручной прострочкой.',
    desc_uz: 'Shakldor to‘qa va qo‘lda tikilgan kamar.',
    desc_en: 'A belt with a sculpted buckle and hand stitching.',
    price: 86,
    image: '/images/products/belt-heritage.svg',
    gallery: [
      '/images/products/belt-heritage.svg',
      '/images/products/belt-classic.svg',
      '/images/products/cardholder-pelta.svg',
    ],
    colors: [cognac, black],
    specs: { material: 'product.material_value', dimensions: '1100 × 38 × 4 mm', weight: '210 g', handmade: true },
    featured: false,
  },
];
