// Все контакты и ссылки сайта — меняйте здесь.

// Ссылка на веб-приложение Google Apps Script (см. GOOGLE_SHEETS.md).
// Можно также задать через переменную окружения VITE_GOOGLE_SHEET_URL.
export const SHEET_URL: string =
  (import.meta.env.VITE_GOOGLE_SHEET_URL as string | undefined) || '';

// Supabase (регистрация и вход). Берётся из секретов GitHub
// VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY (Settings → Secrets → Actions).
// anon-ключ публичный, его можно хранить в коде. service_role — НИКОГДА.
export const SUPABASE_URL: string = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || '';
export const SUPABASE_ANON_KEY: string = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || '';

// Cloudflare Turnstile — защита от ботов на формах входа (необязательно).
// Включайте одновременно здесь и в Supabase: Authentication → Attack Protection.
export const TURNSTILE_SITE_KEY: string =
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || '';

export const CONTACTS = {
  company: 'Pelta Nera',
  ceo: 'Deniz Oztyurk',
  email: 'peltanera@gmail.com',
  collabEmail: 'deniz4work@gmail.com',
  phone: '+998 94 171 71 94',
  phoneHref: 'tel:+998941717194',
  telegramHandle: '@npcceo',
  telegramHref: 'https://t.me/npcceo',
  city: 'Tashkent, Uzbekistan',
};

export const SOCIALS: { label: string; href: string }[] = [
  { label: 'Telegram', href: 'https://t.me/+eOUaJZn_SsNhNzdi' },
  { label: 'Instagram', href: 'https://instagram.com/peltanera' },
  // { label: 'TikTok', href: 'https://www.tiktok.com/@...' },
];
