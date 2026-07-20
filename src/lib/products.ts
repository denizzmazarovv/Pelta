export type Category = 'cardholder' | 'bag' | 'belt';

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
  featured: boolean;
};

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
    price: ,
    image: '/images/products/cardholder-nera.svg',
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
    price: ,
    image: '/images/products/cardholder-pelta.svg',
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
    price: ,
    image: '/images/products/bag-tashkent.svg',
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
    price: ,
    image: '/images/products/bag-amir.svg',
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
    price: ,
    image: '/images/products/belt-classic.svg',
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
    price: ,
    image: '/images/products/belt-heritage.svg',
    featured: false,
  },
];
