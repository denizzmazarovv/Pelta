// Все контакты и ссылки сайта — меняйте здесь.

// Supabase: аккаунты, заказы, сообщения, рассылка.
// anon-ключ публичный (он и так виден в браузере), данные защищены правилами RLS.
// service_role ключ сюда НИКОГДА не вставлять.
export const SUPABASE_URL: string =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://srvuuwpjyuhmidyxyinl.supabase.co';
export const SUPABASE_ANON_KEY: string =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNydnV1d3BqeXVobWlkeXh5aW5sIiwicm9sIjoiYW5vbiIsImlhdCI6MTc4NDM1NTg3MywiZXhwIjoyMDk5OTMxODczfQ.xzDM7AGSyemHtDxSD_Mfi5L00NddTX1YGIt7MEDYG8E';

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
