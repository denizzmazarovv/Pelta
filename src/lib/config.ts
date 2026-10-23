// Все контакты и ссылки сайта — меняйте здесь.

// Supabase: аккаунты, заказы, сообщения, рассылка.
// anon-ключ публичный (он и так виден в браузере), данные защищены правилами RLS.
// service_role ключ сюда НИКОГДА не вставлять.
// Проект misuvgnzuustjptkvsvx. Значения заданы прямо здесь (а не через секреты GitHub),
// чтобы сайт точно смотрел в нужный проект.
export const SUPABASE_URL = 'https://misuvgnzuustjptkvsvx.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_eBcdReBCxn6JwNoAQw8BKg_eb4JoXRA';

// Заявки в Telegram-канал через Google Apps Script (ваши скрипты из .env).
// Ссылки публичные: они всё равно видны в коде страницы.
export const GOOGLE_CART_URL: string =
  (import.meta.env.VITE_GOOGLE_SHEET_CART_URL as string | undefined) ||
  'https://script.google.com/macros/s/AKfycbwcTc8QsfEVx3440DozhVa7sbB5ZZRbgRN2iI2BMxCRuihZS72EZQCXfd1C_eZd7Nm7Jw/exec';
export const GOOGLE_CONTACT_URL: string =
  (import.meta.env.VITE_GOOGLE_SHEET_CONTACT_URL as string | undefined) ||
  'https://script.google.com/macros/s/AKfycbzQ1V8RdvlCK5yVZqfyJNSoOoTqb6sDOHfoDv3VmsTrYPt-5xg13DTxPQK46w6qclrCRA/exec';

// Telegram-бот, который присылает коды входа (имя без @). Токен бота сюда НЕ вставлять —
// он хранится только в Supabase → Edge Functions → Secrets.
export const TELEGRAM_BOT_USERNAME = '';

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
