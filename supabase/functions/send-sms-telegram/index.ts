/**
 * Pelta Nera — вход на сайт через своего Telegram-бота (бесплатно).
 *
 * Одна функция обрабатывает три вида запросов:
 *
 *  1) Telegram → бот (webhook, заголовок X-Telegram-Bot-Api-Secret-Token).
 *     - /start L_<ключ>  — вход с сайта в одно касание. Новому клиенту бот предлагает
 *       «Поделиться номером», знакомому — кнопку «✅ Войти на сайт». После подтверждения
 *       вход на сайте выполняется автоматически.
 *     - контакт — принимается только собственный номер (contact.user_id === from.id).
 *
 *  2) Supabase Auth → «Send SMS Hook» (заголовки webhook-id / webhook-signature).
 *     Обычный вход по номеру: код отправляется в чат с ботом. Если номер ещё не
 *     подтверждён в боте — NEED_BOT. При автоматическом входе (п. 3) код не
 *     отправляется, а сохраняется для сервера.
 *
 *  3) Сайт → { action: "claim", nonce } — сайт спрашивает, подтвердил ли клиент вход
 *     в боте. Если да — функция сама получает и проверяет код и возвращает сессию.
 *     Сайт → { action: "forget" } с токеном входа — клиент удаляет аккаунт: функция стирает
 *     связь номера с ботом. Та же очистка — командой /delete в боте.
 *
 * Защита:
 *  - подпись Supabase (Standard Webhooks) и секретный заголовок Telegram;
 *  - проверочное число: сайт показывает число (из ключа входа), в боте нужно нажать то же
 *    число. Так нельзя войти в чужой аккаунт, прислав человеку свою ссылку для входа;
 *  - ключ входа: 32 случайных байта, в базе только его хеш, действует 10 минут, один раз;
 *  - номер в базе: хеш для поиска и шифр AES-GCM (нужен для автоматического входа);
 *  - лимиты: на номер 5 кодов в час и 10 в сутки, на весь сайт OTP_DAILY_LIMIT в сутки.
 *
 * Секреты (Edge Functions → Secrets):
 *  SEND_SMS_HOOK_SECRET     — из Authentication → Hooks (вид v1,whsec_...)
 *  TELEGRAM_BOT_TOKEN       — от @BotFather
 *  TELEGRAM_WEBHOOK_SECRET  — любая длинная строка (латиница/цифры), та же, что в setWebhook
 *  OTP_DAILY_LIMIT          — необязательно, по умолчанию 300
 *  SITE_URL                 — необязательно, по умолчанию https://peltanera.com
 * SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY Supabase подставляет сам.
 */
import { Webhook } from 'npm:standardwebhooks@1.0.0';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const PER_HOUR = 5;
const PER_DAY = 10;
const LOGIN_TTL_MS = 10 * 60 * 1000;
const siteUrl = () => (Deno.env.get('SITE_URL') || 'https://peltanera.com').replace(/\/+$/, '');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
};
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
// Supabase Auth принимает ошибку хука только с HTTP 200: код для клиента передаётся в http_code.
// Любой другой статус Supabase превращает в «Invalid payload sent to hook».
const fail = (http_code: number, message: string) => json({ error: { http_code, message } }, 200);

const env = (k: string) => Deno.env.get(k) ?? '';

function db() {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
}

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function hmacHex(key: string, data: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(data)));
}
const sha256 = async (s: string) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));

/** Ключ шифрования номера: выводится из токена бота (известен только серверу). */
async function aesKey() {
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(`pelta-phone:${env('TELEGRAM_BOT_TOKEN')}`));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
async function encrypt(text: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(), enc.encode(text)));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return b64(out);
}
async function decrypt(data: string): Promise<string | null> {
  try {
    const all = unb64(data);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.slice(0, 12) }, await aesKey(), all.slice(12));
    return new TextDecoder().decode(pt);
  } catch {
    return null;
  }
}

/** Хеш номера: один и тот же для бота и для хука. */
const phoneHash = (e164: string) => hmacHex(env('TELEGRAM_BOT_TOKEN'), e164);
const toE164 = (raw: string) => {
  const d = String(raw ?? '').replace(/\D/g, '');
  return d.length >= 9 && d.length <= 15 ? `+${d}` : null;
};
const maskPhone = (p: string) => p.slice(0, 6) + ' *** ** ' + p.slice(-2);
const isNonce = (s: unknown): s is string => typeof s === 'string' && /^[A-Za-z0-9_-]{40,60}$/.test(s);

/** Проверочное число 10–99 из ключа входа. Сайт считает его так же (src/lib/telegramLogin.ts). */
const checkNumber = async (nonce: string) => (parseInt((await sha256(nonce)).slice(0, 4), 16) % 90) + 10;

/** Три кнопки с числами: верное и два случайных, в случайном порядке. */
function numberKeyboard(right: number) {
  const set = new Set<number>([right]);
  while (set.size < 3) set.add(10 + (crypto.getRandomValues(new Uint8Array(1))[0] % 90));
  const nums = [...set].map(String);
  for (let i = nums.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint8Array(1))[0] % (i + 1);
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }
  return { keyboard: [nums.map((text) => ({ text }))], resize_keyboard: true, one_time_keyboard: true };
}

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
    hello:
      'Здравствуйте! Это бот входа на сайт Pelta Nera (peltanera.com).\n\nНажмите «Поделиться номером», чтобы подтвердить свой номер телефона. Номер нужен только для входа на сайт.',
    login:
      '🔐 Вход на сайт peltanera.com\n\nНажмите «Поделиться номером» — мы подтвердим ваш номер, и вы автоматически войдёте на сайт.\n\nЕсли вы сейчас не входите на сайт Pelta Nera — ничего не нажимайте.',
    loginKnown:
      '🔐 Вход на сайт peltanera.com\n\nВойти как {phone}? Нажмите «✅ Войти на сайт».\n\nЕсли вы сейчас не входите на сайт Pelta Nera — ничего не нажимайте.',
    share: '📱 Поделиться номером',
    enter: '✅ Войти на сайт',
    done: '✅ Номер подтверждён.\n\nВернитесь на сайт и войдите по номеру — код придёт в этот чат.',
    loggedIn: '✅ Готово! Вы вошли на сайт Pelta Nera.\n\nВернитесь в браузер — страница обновится сама.',
    expired: 'Ссылка для входа устарела. Нажмите «Войти через Telegram» на сайте ещё раз.',
    back: '↩️ Вернуться на сайт',
    notOwn: 'Пожалуйста, отправьте свой номер кнопкой «Поделиться номером», а не чужой контакт.',
    hint: 'Нажмите кнопку «Поделиться номером» ниже.',
    code:
      '🔐 Код подтверждения: {code}\n\nЭтот код нужен только для подтверждения номера телефона на сайте peltanera.com. Действует 10 минут.\n\nНикому не сообщайте код — сотрудники Pelta Nera никогда его не спрашивают.',
    check:
      '🔐 Вход на сайт peltanera.com\n\nНажмите число, которое показано на сайте рядом с кнопкой входа.\n\n⚠️ Если вы сейчас не входите на сайт сами или эту ссылку вам кто-то прислал — ничего не нажимайте: так пытаются получить доступ к чужому аккаунту.',
    checkOk: '✅ Число верное. Теперь нажмите «📱 Поделиться номером».',
    checkFail:
      '❌ Число не совпало — вход отменён.\n\nЕсли ссылку для входа вам прислал другой человек, это была попытка получить доступ к вашему аккаунту. Входите только сами, на сайте peltanera.com.',
    forgot:
      '🗑 Готово: бот удалил ваш номер. Чтобы снова войти на сайт, нажмите «Войти через Telegram» на peltanera.com.',
  },
  uz: {
    hello:
      'Assalomu alaykum! Bu Pelta Nera (peltanera.com) saytiga kirish boti.\n\nTelefon raqamingizni tasdiqlash uchun «Raqamni ulashish» tugmasini bosing. Raqam faqat saytga kirish uchun kerak.',
    login:
      '🔐 peltanera.com saytiga kirish\n\n«Raqamni ulashish» tugmasini bosing — raqamingiz tasdiqlanadi va saytga avtomatik kirasiz.\n\nAgar hozir Pelta Nera saytiga kirmayotgan bo‘lsangiz — hech narsani bosmang.',
    loginKnown:
      '🔐 peltanera.com saytiga kirish\n\n{phone} sifatida kirasizmi? «✅ Saytga kirish» tugmasini bosing.\n\nAgar hozir Pelta Nera saytiga kirmayotgan bo‘lsangiz — hech narsani bosmang.',
    share: '📱 Raqamni ulashish',
    enter: '✅ Saytga kirish',
    done: '✅ Raqam tasdiqlandi.\n\nSaytga qayting va raqam orqali kiring — kod shu chatga keladi.',
    loggedIn: '✅ Tayyor! Siz Pelta Nera saytiga kirdingiz.\n\nBrauzerga qayting — sahifa o‘zi yangilanadi.',
    expired: 'Kirish havolasi eskirgan. Saytda «Telegram orqali kirish» tugmasini qayta bosing.',
    back: '↩️ Saytga qaytish',
    notOwn: 'Iltimos, boshqa kontaktni emas, o‘z raqamingizni «Raqamni ulashish» tugmasi orqali yuboring.',
    hint: 'Quyidagi «Raqamni ulashish» tugmasini bosing.',
    code:
      '🔐 Tasdiqlash kodi: {code}\n\nBu kod faqat peltanera.com saytida telefon raqamingizni tasdiqlash uchun kerak. 10 daqiqa amal qiladi.\n\nKodni hech kimga aytmang — Pelta Nera xodimlari uni hech qachon so‘ramaydi.',
    check:
      '🔐 peltanera.com saytiga kirish\n\nSaytda kirish tugmasi yonida ko‘rsatilgan sonni bosing.\n\n⚠️ Agar hozir saytga o‘zingiz kirmayotgan bo‘lsangiz yoki bu havolani sizga kimdir yuborgan bo‘lsa — hech narsani bosmang: shu yo‘l bilan boshqa birovning akkauntiga kirishga urinishadi.',
    checkOk: '✅ Son to‘g‘ri. Endi «📱 Raqamni ulashish» tugmasini bosing.',
    checkFail:
      '❌ Son mos kelmadi — kirish bekor qilindi.\n\nAgar kirish havolasini sizga boshqa odam yuborgan bo‘lsa, bu akkauntingizga kirishga urinish edi. Saytga faqat o‘zingiz, peltanera.com orqali kiring.',
    forgot:
      '🗑 Tayyor: bot raqamingizni o‘chirdi. Saytga qayta kirish uchun peltanera.com saytida «Telegram orqali kirish» tugmasini bosing.',
  },
  en: {
    hello:
      'Hello! This is the sign-in bot for Pelta Nera (peltanera.com).\n\nTap “Share my number” to confirm your phone number. It is used only to sign in to the website.',
    login:
      '🔐 Sign in to peltanera.com\n\nTap “Share my number” — we will confirm your number and sign you in to the website automatically.\n\nIf you are not signing in to Pelta Nera right now, do not tap anything.',
    loginKnown:
      '🔐 Sign in to peltanera.com\n\nSign in as {phone}? Tap “✅ Sign in to the website”.\n\nIf you are not signing in to Pelta Nera right now, do not tap anything.',
    share: '📱 Share my number',
    enter: '✅ Sign in to the website',
    done: '✅ Number confirmed.\n\nGo back to the website and sign in with your number — the code will arrive in this chat.',
    loggedIn: '✅ Done! You are signed in to Pelta Nera.\n\nGo back to your browser — the page will update by itself.',
    expired: 'This sign-in link has expired. Tap “Sign in with Telegram” on the website again.',
    back: '↩️ Back to the website',
    notOwn: 'Please share your own number using the “Share my number” button, not someone else’s contact.',
    hint: 'Tap the “Share my number” button below.',
    code:
      '🔐 Confirmation code: {code}\n\nThis code is only for confirming your phone number on peltanera.com. Valid for 10 minutes.\n\nNever share it — Pelta Nera staff will never ask for it.',
    check:
      '🔐 Sign in to peltanera.com\n\nTap the number shown on the website next to the sign-in button.\n\n⚠️ If you are not signing in yourself right now, or someone sent you this link, do not tap anything: this is how people try to get into other people’s accounts.',
    checkOk: '✅ Correct number. Now tap “📱 Share my number”.',
    checkFail:
      '❌ The number did not match — sign-in cancelled.\n\nIf another person sent you this sign-in link, it was an attempt to access your account. Only sign in yourself, on peltanera.com.',
    forgot:
      '🗑 Done: the bot has deleted your number. To sign in again, tap “Sign in with Telegram” on peltanera.com.',
  },
};
const langOf = (code?: string): L => (code?.startsWith('uz') ? 'uz' : code?.startsWith('ru') ? 'ru' : 'en');
const ENTER_TEXTS = new Set(Object.values(T).map((t) => t.enter));

type Client = ReturnType<typeof db>;

/** Последний ожидающий вход этого чата (не старше 10 минут). */
async function pendingLogin(client: Client, chatId: number) {
  const { data } = await client
    .from('pn_login_requests')
    .select('nonce_hash, nonce_enc, checked')
    .eq('chat_id', chatId)
    .eq('status', 'pending')
    .gt('created_at', new Date(Date.now() - LOGIN_TTL_MS).toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as { nonce_hash: string; nonce_enc: string; checked: boolean } | null;
}

/** Просьба нажать проверочное число (то же, что показано на сайте). */
async function askNumber(chatId: number, req: { nonce_enc: string }, t: Record<string, string>) {
  const nonce = await decrypt(req.nonce_enc);
  if (!nonce) {
    await tg('sendMessage', { chat_id: chatId, text: t.expired, reply_markup: { remove_keyboard: true } });
    return;
  }
  await tg('sendMessage', { chat_id: chatId, text: t.check, reply_markup: numberKeyboard(await checkNumber(nonce)) });
}

/** Подтверждает вход и отвечает в чат кнопкой возврата на сайт. */
async function confirmLogin(client: Client, chatId: number, req: { nonce_hash: string; nonce_enc: string }, phone: string, t: Record<string, string>) {
  const { data } = await client
    .from('pn_login_requests')
    .update({ status: 'confirmed', phone_enc: await encrypt(phone), confirmed_at: new Date().toISOString() })
    .eq('nonce_hash', req.nonce_hash)
    .eq('status', 'pending')
    .select('nonce_hash');
  if (!data?.length) return false;
  const nonce = await decrypt(req.nonce_enc);
  await tg('sendMessage', {
    chat_id: chatId,
    text: t.loggedIn,
    reply_markup: {
      inline_keyboard: [[{ text: t.back, url: nonce ? `${siteUrl()}/#/login?tg=${nonce}` : `${siteUrl()}/#/login` }]],
    },
  });
  return true;
}

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
  const client = db();
  const shareKeyboard = {
    keyboard: [[{ text: t.share, request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  };

  // Контакт: подтверждение номера
  if (msg.contact) {
    if (!msg.from?.id || msg.contact.user_id !== msg.from.id) {
      await tg('sendMessage', { chat_id: chatId, text: t.notOwn, reply_markup: shareKeyboard });
      return json({ ok: true });
    }
    const phone = toE164(msg.contact.phone_number);
    if (!phone) return json({ ok: true });
    const { error } = await client.from('pn_telegram_links').upsert({
      phone_hash: await phoneHash(phone),
      chat_id: chatId,
      phone_enc: await encrypt(phone),
      linked_at: new Date().toISOString(),
    });
    if (error) return json({ ok: true });

    const login = await pendingLogin(client, chatId);
    if (login && !login.checked) {
      // Номер сохранён, но вход ещё не подтверждён проверочным числом
      await askNumber(chatId, login, t);
      return json({ ok: true });
    }
    if (login && (await confirmLogin(client, chatId, login, phone, t))) return json({ ok: true });

    await tg('sendMessage', {
      chat_id: chatId,
      text: t.done,
      reply_markup: { inline_keyboard: [[{ text: t.back, url: `${siteUrl()}/#/login` }]] },
    });
    return json({ ok: true });
  }

  const text = typeof msg.text === 'string' ? msg.text.trim() : '';

  // /delete — удалить номер и связь с ботом (то же делает удаление аккаунта на сайте)
  if (/^\/(delete|forget)(@\w+)?$/i.test(text)) {
    await client.from('pn_telegram_links').delete().eq('chat_id', chatId);
    await client.from('pn_login_requests').delete().eq('chat_id', chatId);
    await tg('sendMessage', { chat_id: chatId, text: t.forgot, reply_markup: { remove_keyboard: true } });
    return json({ ok: true });
  }

  const known = await client
    .from('pn_telegram_links')
    .select('phone_enc')
    .eq('chat_id', chatId)
    .not('phone_enc', 'is', null)
    .order('linked_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const knownPhone = known.data?.phone_enc ? await decrypt(known.data.phone_enc) : null;

  // Вход с сайта: /start L_<ключ>
  const m = text.match(/^\/start\s+L_([A-Za-z0-9_-]{40,60})$/);
  if (m) {
    await client.from('pn_login_requests').delete().lt('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString());
    const nonceHash = await sha256(m[1]);
    const { error } = await client
      .from('pn_login_requests')
      .insert({ nonce_hash: nonceHash, nonce_enc: await encrypt(m[1]), chat_id: chatId, status: 'pending' });
    if (error) {
      // Повторное нажатие той же ссылки — просто показываем кнопки ещё раз
      const { data } = await client.from('pn_login_requests').select('chat_id, status').eq('nonce_hash', nonceHash).maybeSingle();
      if (!data || data.chat_id !== chatId || data.status !== 'pending') {
        await tg('sendMessage', { chat_id: chatId, text: t.expired });
        return json({ ok: true });
      }
    }
    // Сначала — проверочное число с сайта
    await tg('sendMessage', {
      chat_id: chatId,
      text: knownPhone ? `${t.check}\n\n📱 ${maskPhone(knownPhone)}` : t.check,
      reply_markup: numberKeyboard(await checkNumber(m[1])),
    });
    return json({ ok: true });
  }

  // Нажато проверочное число
  if (/^\d{2}$/.test(text)) {
    const login = await pendingLogin(client, chatId);
    if (!login) {
      await tg('sendMessage', { chat_id: chatId, text: t.expired, reply_markup: { remove_keyboard: true } });
      return json({ ok: true });
    }
    const nonce = await decrypt(login.nonce_enc);
    if (!nonce || Number(text) !== (await checkNumber(nonce))) {
      await client.from('pn_login_requests').update({ status: 'rejected' }).eq('nonce_hash', login.nonce_hash).eq('status', 'pending');
      await tg('sendMessage', { chat_id: chatId, text: t.checkFail, reply_markup: { remove_keyboard: true } });
      return json({ ok: true });
    }
    await client.from('pn_login_requests').update({ checked: true }).eq('nonce_hash', login.nonce_hash).eq('status', 'pending');
    if (knownPhone) {
      // Знакомый номер: число верное — сразу входим
      await confirmLogin(client, chatId, login, knownPhone, t);
      return json({ ok: true });
    }
    await tg('sendMessage', { chat_id: chatId, text: t.checkOk, reply_markup: shareKeyboard });
    return json({ ok: true });
  }

  // «✅ Войти на сайт» (кнопка из старых сообщений) — только после проверочного числа
  if (ENTER_TEXTS.has(text)) {
    const login = await pendingLogin(client, chatId);
    if (!login || !knownPhone) {
      await tg('sendMessage', { chat_id: chatId, text: t.expired, reply_markup: { remove_keyboard: true } });
      return json({ ok: true });
    }
    if (!login.checked) {
      await askNumber(chatId, login, t);
      return json({ ok: true });
    }
    await confirmLogin(client, chatId, login, knownPhone, t);
    return json({ ok: true });
  }

  await tg('sendMessage', {
    chat_id: chatId,
    text: text.startsWith('/start') ? t.hello : t.hint,
    reply_markup: shareKeyboard,
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

  // Автоматический вход через бота: код не отправляем, а отдаём серверу (см. handleClaim)
  const { data: claiming } = await client
    .from('pn_login_requests')
    .update({ otp_enc: await encrypt(otp) })
    .eq('phone_hash', hash)
    .eq('status', 'claiming')
    .gt('confirmed_at', new Date(Date.now() - LOGIN_TTL_MS).toISOString())
    .select('nonce_hash');
  if (claiming?.length) return json({});

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

// ---------- 3. Сайт: забрать вход, подтверждённый в боте ----------
/** Клиент удаляет аккаунт на сайте: стираем связь его номера с ботом и запросы входа. */
async function handleForget(req: Request) {
  const reply = (body: Record<string, unknown>) => json(body, 200, CORS);
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt || jwt.length > 4000) return reply({ status: 'auth' });
  const { data, error } = await db().auth.getUser(jwt);
  const phone = toE164(data?.user?.phone ?? '');
  if (error || !phone) return reply({ status: 'auth' });
  const client = db();
  const hash = await phoneHash(phone);
  const { data: links } = await client.from('pn_telegram_links').select('chat_id').eq('phone_hash', hash);
  const chats = (links ?? []).map((l: { chat_id: number }) => l.chat_id);
  await client.from('pn_telegram_links').delete().eq('phone_hash', hash);
  await client.from('pn_login_requests').delete().eq('phone_hash', hash);
  if (chats.length) await client.from('pn_login_requests').delete().in('chat_id', chats);
  return reply({ status: 'ok' });
}

async function handleClaim(body: { action?: string; nonce?: unknown } | null) {
  const reply = (body: Record<string, unknown>) => json(body, 200, CORS);
  if (body?.action !== 'claim' || !isNonce(body.nonce)) return reply({ status: 'bad_request' });

  const client = db();
  const nonceHash = await sha256(body.nonce);
  const { data: row } = await client
    .from('pn_login_requests')
    .select('status, created_at, confirmed_at, phone_enc')
    .eq('nonce_hash', nonceHash)
    .maybeSingle();
  if (!row) return reply({ status: 'waiting' }); // бот ещё не открыт
  if (Date.now() - new Date(row.created_at).getTime() > 2 * LOGIN_TTL_MS) return reply({ status: 'expired' });
  if (row.status === 'pending') return reply({ status: 'waiting' });
  if (row.status === 'rejected') return reply({ status: 'rejected' });
  if (row.status !== 'confirmed') return reply({ status: 'used' });

  const phone = row.phone_enc ? await decrypt(row.phone_enc) : null;
  if (!phone) return reply({ status: 'expired' });

  // Забрать может только один запрос
  const { data: locked } = await client
    .from('pn_login_requests')
    .update({ status: 'claiming', phone_hash: await phoneHash(phone), otp_enc: null })
    .eq('nonce_hash', nonceHash)
    .eq('status', 'confirmed')
    .select('nonce_hash');
  if (!locked?.length) return reply({ status: 'used' });

  const release = () => client.from('pn_login_requests').update({ status: 'confirmed' }).eq('nonce_hash', nonceHash);

  // Supabase создаёт код и вызывает наш хук, который сохраняет код в запись входа
  const auth = db().auth;
  const { error: otpError } = await auth.signInWithOtp({ phone, options: { shouldCreateUser: true } });
  if (otpError) {
    await release();
    return reply({ status: 'retry' }); // например, код этому номеру запрашивали меньше минуты назад
  }
  const { data: withOtp } = await client.from('pn_login_requests').select('otp_enc').eq('nonce_hash', nonceHash).maybeSingle();
  const otp = withOtp?.otp_enc ? await decrypt(withOtp.otp_enc) : null;
  if (!otp) {
    await release();
    return reply({ status: 'retry' });
  }

  const { data: verified, error: verifyError } = await db().auth.verifyOtp({ phone, token: otp, type: 'sms' });
  await client
    .from('pn_login_requests')
    .update({ status: verifyError ? 'confirmed' : 'done', otp_enc: null, phone_enc: verifyError ? row.phone_enc : null })
    .eq('nonce_hash', nonceHash);
  if (verifyError || !verified.session) return reply({ status: 'retry' });

  return reply({
    status: 'ok',
    access_token: verified.session.access_token,
    refresh_token: verified.session.refresh_token,
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return new Response('ok', { status: 200 });
  if (req.headers.has('x-telegram-bot-api-secret-token')) return handleTelegram(req);
  if (req.headers.has('webhook-signature')) return handleHook(req);
  if (new URL(req.url).searchParams.get('action') === 'forget') return handleForget(req);
  const body = await req.json().catch(() => null);
  return handleClaim(body);
});
