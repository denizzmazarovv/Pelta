export type Category = 'cardholder' | 'bag' | 'belt';

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
  price: number;
  image: string;
  gallery: string[];
  colors: ColorOption[];
  specs: Spec;
  featured: boolean;
};

const tan: ColorOption = { id: 'tan', colorKey: 'product.color_tan' };
const black: ColorOption = { id: 'black', colorKey: 'product.color_black' };
const cognac: ColorOption = { id: 'cognac', colorKey: 'product.color_cognac' };

export const products: Product[] = [
  {
    id: 'ch-01',
    category: 'cardholder',
    name_ru: 'Кардхолдер «Nera»',
    name_uz: 'Kartholder «Nera»',
    name_en: 'Cardholder «Nera»',
    desc_ru: 'Компактный кардхолдер на 6 карт из кожи растительного дубления.',
    desc_uz: 'O‘simlik bilan oshlangan teridan 6 ta karta uchun ixcham kartholder.',
    desc_en: 'Compact 6-card holder in vegetable-tanned leather.',
    price: 45,
    image: '/images/products/cardholder-nera.svg',
    gallery: [
      '/images/products/cardholder-nera.svg',
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
    name_ru: 'Кардхолдер «Pelta»',
    name_uz: 'Kartholder «Pelta»',
    name_en: 'Cardholder «Pelta»',
    desc_ru: 'Минималистичный кардхолдер с отделением для купюр.',
    desc_uz: 'Banknot uchun bo‘limli minimalist kartholder.',
    desc_en: 'Minimalist cardholder with a bill compartment.',
    price: 55,
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
    id: 'bag-01',
    category: 'bag',
    name_ru: 'Сумка «Tashkent»',
    name_uz: 'Sumka «Tashkent»',
    name_en: 'Bag «Tashkent»',
    desc_ru: 'Городская сумка через плечо ручной работы.',
    desc_uz: 'Qo‘lda ishlangan shahar yelka sumkasi.',
    desc_en: 'Handcrafted city shoulder bag.',
    price: 180,
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
    name_ru: 'Сумка «Amir»',
    name_uz: 'Sumka «Amir»',
    name_en: 'Bag «Amir»',
    desc_ru: 'Вместительная сумка-портфель для документов.',
    desc_uz: 'Hujjatlar uchun sig‘imli portfel sumka.',
    desc_en: 'Roomy document portfolio bag.',
    price: 220,
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
    name_ru: 'Ремень «Classic»',
    name_uz: 'Remen «Classic»',
    name_en: 'Belt «Classic»',
    desc_ru: 'Классический ремень из плотной кожи с пряжкой.',
    desc_uz: 'Qat’ti teridan klassik remen to‘qmoq bilan.',
    desc_en: 'Classic belt in firm leather with a buckle.',
    price: 70,
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
    name_ru: 'Ремень «Heritage»',
    name_uz: 'Remen «Heritage»',
    name_en: 'Belt «Heritage»',
    desc_ru: 'Ремень с фигурной пряжкой и ручной прострочкой.',
    desc_uz: 'Figurali to‘qmoq va qo‘l tikishli remen.',
    desc_en: 'Belt with a shaped buckle and hand stitching.',
    price: 85,
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
