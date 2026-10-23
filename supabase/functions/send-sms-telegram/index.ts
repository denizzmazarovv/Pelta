/**
 * Pelta Nera — вход по номеру телефона с кодом в Telegram через СВОЕГО бота (бесплатно).
 *
 * Одна функция обрабатывает два вида запросов:
 *  1) Telegram → бот (webhook). Клиент жмёт Start и «Поделиться номером».
 *     Бот проверяет, что это номер самого клиента (contact.user_id === from.id),
 *     и запоминает связку «номер → чат». Номер хранится только как хеш.
 *  2) Supabase Auth → «Send SMS Hook». Supabase создал код; функция находит чат
 *     по номеру и отправляет код в этот чат. Если номер ещё не привязан —
 *     возвращает NEED_BOT, и сайт покажет кнопку «Открыть бота».
 *
 * Защита:
 *  - запросы от Supabase проверяются по подписи (Standard Webhooks);
 *  - запросы от Telegram — по секретному заголовку X-Telegram-Bot-Api-Secret-Token;
 *  - номер принимается только свой (нельзя переслать чужой контакт);
 *  - лимиты: на номер 5 кодов в час и 10 в сутки, на весь сайт OTP_DAILY_LIMIT в сутки.
 *
 * Секреты (Edge Functions → Secrets):
 *  SEND_SMS_HOOK_SECRET     — из Authentication → Hooks (вид v1,whsec_...)
 *  TELEGRAM_BOT_TOKEN       — от @BotFather
 *  TELEGRAM_WEBHOOK_SECRET  — любая длинная строка (латиница/цифры), та же, что в setWebhook
 *  OTP_DAILY_LIMIT          — необязательно, по умолчанию 300
 *  SITE_LOGIN_URL           — необязательно, по умолчанию https://peltanera.com/#/login
 * SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY Supabase подставляет сам.
 */
import { Webhook } from 'npm:standardwebhooks@1.0.0';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const PER_HOUR = 5;
const PER_DAY = 10;
const siteUrl = () => Deno.env.get('SITE_LOGIN_URL') || 'https://peltanera.com/#/login';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
// Supabase Auth принимает ошибку хука только с HTTP 200: код для клиента передаётся в http_code.
// Любой другой статус Supabase превращает в «Invalid payload sent to hook».
const fail = (http_code: number, message: string) => json({ error: { http_code, message } }, 200);

const env = (k: string) => Deno.env.get(k) ?? '';

function db() {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
}

async function hmacHex(key: string, data: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Хеш номера: один и тот же для бота и для хука. Ключ — токен бота (известен только серверу). */
const phoneHash = (e164: string) => hmacHex(env('TELEGRAM_BOT_TOKEN'), e164);
const toE164 = (raw: string) => {
  const d = String(raw ?? '').replace(/\D/g, '');
  return d.length >= 9 && d.length <= 15 ? `+${d}` : null;
};

function safeEqual(a: string, b: string) {
  if (!a || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function tg(method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${env('TELEGRAM_BOT_TOKEN')}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await res.json().catch(() => ({ ok: false }))) as { ok: boolean; description?: string };
}

// ---------- Тексты бота ----------
type L = 'ru' | 'uz' | 'en';
const T: Record<L, Record<string, string>> = {
  ru: {
    hello: 'Здравствуйте! Это бот входа на сайт Pelta Nera.\n\nНажмите кнопку ниже, чтобы подтвердить свой номер телефона. После этого коды для входа будут приходить сюда.',
    share: '📱 Поделиться номером',
    done: '✅ Номер подтверждён.\n\nНажмите кнопку ниже, чтобы вернуться на сайт — код для входа придёт в этот чат.',
    back: '↩️ Вернуться на сайт',
    notOwn: 'Пожалуйста, отправьте свой номер кнопкой «Поделиться номером», а не чужой контакт.',
    hint: 'Нажмите кнопку «Поделиться номером» ниже.',
    code: 'Код для входа на сайт Pelta Nera: {code}\n\nДействует 10 минут. Никому не сообщайте этот код — сотрудники Pelta Nera никогда его не спрашивают.',
  },
  uz: {
    hello: 'Assalomu alaykum! Bu Pelta Nera saytiga kirish boti.\n\nTelefon raqamingizni tasdiqlash uchun quyidagi tugmani bosing. Shundan so‘ng kirish kodlari shu yerga keladi.',
    share: '📱 Raqamni ulashish',
    done: '✅ Raqam tasdiqlandi.\n\nSaytga qaytish uchun quyidagi tugmani bosing — kirish kodi shu chatga keladi.',
    back: '↩️ Saytga qaytish',
    notOwn: 'Iltimos, boshqa kontaktni emas, o‘z raqamingizni «Raqamni ulashish» tugmasi orqali yuboring.',
    hint: 'Quyidagi «Raqamni ulashish» tugmasini bosing.',
    code: 'Pelta Nera saytiga kirish kodi: {code}\n\n10 daqiqa amal qiladi. Kodni hech kimga aytmang — Pelta Nera xodimlari uni hech qachon so‘ramaydi.',
  },
  en: {
    hello: 'Hello! This is the Pelta Nera sign-in bot.\n\nTap the button below to confirm your phone number. Sign-in codes will then arrive here.',
    share: '📱 Share my number',
    done: '✅ Number confirmed.\n\nTap the button below to go back to the website — your sign-in code will arrive in this chat.',
    back: '↩️ Back to the website',
    notOwn: 'Please share your own number using the “Share my number” button, not someone else’s contact.',
    hint: 'Tap the “Share my number” button below.',
    code: 'Your Pelta Nera sign-in code: {code}\n\nValid for 10 minutes. Never share this code — Pelta Nera staff will never ask for it.',
  },
};
const langOf = (code?: string): L => (code?.startsWith('uz') ? 'uz' : code?.startsWith('ru') ? 'ru' : 'en');

// ---------- 1. Обновления от Telegram ----------
async function handleTelegram(req: Request) {
  if (!safeEqual(req.headers.get('x-telegram-bot-api-secret-token') ?? '', env('TELEGRAM_WEBHOOK_SECRET'))) {
    return new Response('forbidden', { status: 403 });
  }
  const update = await req.json().catch(() => null);
  const msg = update?.message;
  if (!msg?.chat?.id || msg.chat.type !== 'private') return json({ ok: true });

  const chatId = msg.chat.id as number;
  const t = T[langOf(msg.from?.language_code)];
  const keyboard = {
    keyboard: [[{ text: t.share, request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  };

  if (msg.contact) {
    // Принимаем только собственный номер отправителя
    if (!msg.from?.id || msg.contact.user_id !== msg.from.id) {
      await tg('sendMessage', { chat_id: chatId, text: t.notOwn, reply_markup: keyboard });
      return json({ ok: true });
    }
    const phone = toE164(msg.contact.phone_number);
    if (!phone) return json({ ok: true });
    const { error } = await db()
      .from('pn_telegram_links')
      .upsert({ phone_hash: await phoneHash(phone), chat_id: chatId, linked_at: new Date().toISOString() });
    if (error) return json({ ok: true });
    await tg('sendMessage', {
      chat_id: chatId,
      text: t.done,
      reply_markup: { inline_keyboard: [[{ text: t.back, url: siteUrl() }]] },
    });
    return json({ ok: true });
  }

  const text = typeof msg.text === 'string' ? msg.text : '';
  await tg('sendMessage', {
    chat_id: chatId,
    text: text.startsWith('/start') ? t.hello : t.hint,
    reply_markup: keyboard,
  });
  return json({ ok: true });
}

// ---------- 2. Хук Supabase: отправить код ----------
async function handleHook(req: Request) {
  const hookSecret = env('SEND_SMS_HOOK_SECRET');
  if (!hookSecret || !env('TELEGRAM_BOT_TOKEN')) return fail(500, 'SERVER_NOT_CONFIGURED');

  let user: { phone?: string };
  let sms: { otp?: string };
  try {
    const wh = new Webhook(hookSecret.replace('v1,whsec_', ''));
    ({ user, sms } = wh.verify(await req.text(), Object.fromEntries(req.headers)) as {
      user: { phone?: string };
      sms: { otp?: string };
    });
  } catch {
    return fail(401, 'INVALID_SIGNATURE');
  }

  const phone = toE164(user?.phone ?? '');
  const otp = String(sms?.otp ?? '');
  if (!phone) return fail(400, 'PHONE_INVALID');
  if (!/^\d{4,8}$/.test(otp)) return fail(400, 'OTP_INVALID');

  const client = db();
  const hash = await phoneHash(phone);

  // Номер должен быть подтверждён в боте
  const { data: link } = await client.from('pn_telegram_links').select('chat_id').eq('phone_hash', hash).maybeSingle();
  if (!link?.chat_id) return fail(400, 'NEED_BOT');

  // Лимиты (атомарно в базе)
  const dailyLimit = Number(env('OTP_DAILY_LIMIT') || '300') || 300;
  const { data: verdict, error } = await client.rpc('pn_otp_allow', {
    p_hash: hash,
    p_per_hour: PER_HOUR,
    p_per_day: PER_DAY,
    p_global_day: dailyLimit,
  });
  if (error) return fail(500, 'RATE_LIMIT_UNAVAILABLE');
  if (verdict === 'phone_hour' || verdict === 'phone_day') return fail(429, 'TOO_MANY_CODES');
  if (verdict === 'global_day') return fail(429, 'DAILY_LIMIT');

  // Язык клиента здесь неизвестен — отправляем на русском и английском
  const text = `${T.ru.code.replace('{code}', otp)}\n\n— — —\n\n${T.en.code.replace('{code}', otp)}`;
  const sent = await tg('sendMessage', { chat_id: link.chat_id, text, protect_content: true });
  if (!sent.ok) {
    // Клиент заблокировал бота — нужно открыть его заново
    if (/blocked|chat not found|deactivated/i.test(sent.description ?? '')) {
      await client.from('pn_telegram_links').delete().eq('phone_hash', hash);
      return fail(400, 'NEED_BOT');
    }
    return fail(502, 'SEND_FAILED');
  }
  return json({});
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok', { status: 200 });
  if (req.headers.has('x-telegram-bot-api-secret-token')) return handleTelegram(req);
  return handleHook(req);
});
