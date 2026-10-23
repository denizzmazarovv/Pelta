// Все контакты и ссылки сайта — меняйте здесь.

// Supabase: аккаунты, заказы, сообщения, рассылка.
// anon-ключ публичный (он и так виден в браузере), данные защищены правилами RLS.
// service_role ключ сюда НИКОГДА не вставлять.
export const SUPABASE_URL: string =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://srvuuwpjyuhmidyxyinl.supabase.co';
export const SUPABASE_ANON_KEY: string =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNydnV1d3BqeXVobWlkeXh5aW5sIiwicm9sIjoiYW5vbiIsImlhdCI6MTc4NDM1NTg3MywiZXhwIjoyMDk5OTMxODczfQ.xzDM7AGSyemHtDxSD_Mfi5L00NddTX1YGIt7MEDYG8E';

// Заявки в Telegram-канал через Google Apps Script (ваши скрипты из .env).
// Ссылки публичные: они всё равно видны в коде страницы.
export const GOOGLE_CART_URL: string =
  (import.meta.env.VITE_GOOGLE_SHEET_CART_URL as string | undefined) ||
  'https://script.google.com/macros/s/AKfycbwcTc8QsfEVx3440DozhVa7sbB5ZZRbgRN2iI2BMxCRuihZS72EZQCXfd1C_eZd7Nm7Jw/exec';
export const GOOGLE_CONTACT_URL: string =
  (import.meta.env.VITE_GOOGLE_SHEET_CONTACT_URL as string | undefined) ||
  'https://script.google.com/macros/s/AKfycbzQ1V8RdvlCK5yVZqfyJNSoOoTqb6sDOHfoDv3VmsTrYPt-5xg13DTxPQK46w6qclrCRA/exec';

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
