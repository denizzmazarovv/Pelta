import type { Lang } from './i18n';
import { CONTACTS, SELLER } from './config';
import { sellerLine } from './terms';

/**
 * Текст политики конфиденциальности.
 * Меняйте здесь, если меняется то, какие данные собирает сайт.
 * Абзац — строка; список — массив строк.
 */
export type Block = string | string[];
export type Section = { id: string; title: string; body: Block[] };
export type Policy = { title: string; updated: string; intro: string; toc: string; sections: Section[] };

export const POLICY_DATE = '2026-10-29';

const E = CONTACTS.email;

const en: Policy = {
  title: 'Privacy Policy',
  updated: 'Last updated: 29 October 2026',
  toc: 'Contents',
  intro:
    'This policy explains what personal data Pelta Nera collects through peltanera.com, why, where it is stored and what rights you have. We collect only what we need to fulfil your orders, answer your messages and run your account. We do not sell personal data and do not use advertising trackers.',
  sections: [
    {
      id: 'operator',
      title: '1. Who we are',
      body: [
        `The operator of your personal data is Pelta Nera: ${sellerLine('en')}, ${CONTACTS.city}. The person responsible for personal data processing is ${SELLER.name} (${E}).`,
        [`Email: ${E}`, `Phone: ${CONTACTS.phone}`, `Telegram: ${CONTACTS.telegramHandle}`],
        'We process personal data in accordance with the Law of the Republic of Uzbekistan “On Personal Data” and, for visitors from the European Union, with the principles of the GDPR.',
      ],
    },
    {
      id: 'data',
      title: '2. What we collect and why',
      body: [
        'Placing an order (shopping bag → checkout):',
        [
          'name, phone number, delivery address, optional comment;',
          'items ordered, colour, quantity and total;',
          'email and account ID — only if you are signed in.',
        ],
        'Purpose: to accept, confirm and deliver your order. Legal basis: performance of a contract.',
        'Client Service form:',
        ['name, phone and/or email, your message.'],
        'Purpose: to answer your enquiry. Legal basis: your consent.',
        'Account (sign up / sign in):',
        [
          'phone number — used to sign in and to confirm that the number belongs to you;',
          'one-time sign-in codes — delivered to your Telegram by our bot; we do not use passwords;',
          'name, interests (women / men), newsletter preference — only if you fill them in;',
          'IP address and time of sign-in attempts, and a hashed (irreversibly encoded) phone number with the time of each code request — to protect against abuse and code spam.',
        ],
        'Purpose: to provide your account and faster checkout. Legal basis: contract and consent.',
        'Newsletter:',
        ['email, interests (women / men), language.'],
        'Purpose: to send news about collections. Legal basis: consent, which you can withdraw at any time.',
        'Technical data:',
        [
          'when you open the site, our hosting provider automatically receives your IP address and browser details in server logs;',
          'when you send a message or subscribe, our database keeps a one-way hash of your IP address (made with a secret key; the address itself is not stored) for 24 hours, to limit spam;',
          'we do not use analytics, advertising or social-media tracking tools.',
        ],
      ],
    },
    {
      id: 'cookies',
      title: '3. Cookies and local storage',
      body: [
        'The site stores small pieces of data in your browser (local storage). Strictly necessary items work without consent because the site cannot function without them:',
        [
          'pelta_cart — contents of your shopping bag;',
          'pelta_lang_v2 — chosen language;',
          'pelta_auth — sign-in session (only if you sign in);',
          'pelta_consent — your cookie choice;',
          'pelta_sent_* — timestamps of sent forms, to limit spam.',
        ],
        'Optional cookies (analytics, marketing) are used only if you choose “Allow all”. At the moment the site uses none; if we add them, they will start working only after your consent and this policy will be updated.',
        'You can change your choice at any time via “Cookie settings” at the bottom of the site.',
        'If bot protection (Cloudflare Turnstile) is enabled on the sign-in forms, Cloudflare may process technical data to tell people from bots. This is necessary for security.',
      ],
    },
    {
      id: 'processors',
      title: '4. Who processes the data for us',
      body: [
        'We use trusted service providers. They process data only on our instructions:',
        [
          'Supabase Inc. — accounts, order and message records (database, servers in Singapore);',
          'Telegram (our sign-in bot) — confirming your number and delivering one-time sign-in codes; the bot stores your number as a hash and in encrypted form together with your Telegram chat ID (send /delete to the bot to remove it);',
          'Google LLC (Google Apps Script / Sheets) — receiving orders and messages and keeping the customer and newsletter subscriber lists (ID, name, phone number or email, interests, registration and sign-in dates);',
          'Telegram — delivering new orders (name, phone, address, items) and messages to our private team channel;',
          'GitHub Inc. (GitHub Pages) — website hosting;',
          'Google LLC (Gmail) — our replies to your emails;',
          'Cloudflare Inc. — bot protection, if enabled.',
        ],
        'We may also disclose data to courier services to deliver your order, and to state authorities when required by law.',
      ],
    },
    {
      id: 'transfer',
      title: '5. Storage location and cross-border transfer',
      body: [
        'Our database (Supabase) is hosted in Singapore; Google, GitHub and Cloudflare servers are mainly in the United States. Singapore and the United States are on the list of countries that Uzbekistan recognises as providing equivalent protection of personal data (approved by the Cabinet of Ministers in 2026), so this transfer is allowed.',
        'Telegram processes data in its own data centres abroad; this transfer is based on your consent, which you give when you sign up, place an order or send a form.',
        'We do not process biometric or genetic data, which must be stored in Uzbekistan.',
      ],
    },
    {
      id: 'retention',
      title: '6. How long we keep data',
      body: [
        [
          'orders — for the period required by tax and accounting legislation;',
          'Client Service messages — up to 1 year after the conversation ends;',
          'account — until you delete it; after deletion, account data is erased immediately, and orders stay without a link to the account for the period required for accounting records;',
          'spam-protection log (IP hash) — 24 hours;',
          'newsletter — until you unsubscribe;',
          'server and security logs — according to the providers’ standard periods, usually up to 90 days.',
        ],
        'After that, data is deleted or anonymised.',
      ],
    },
    {
      id: 'security',
      title: '7. How we protect data',
      body: [
        [
          'all connections to the site are encrypted (HTTPS);',
          'database access rules: visitors can only add their own records and read only their own account data;',
          'no passwords are stored; sign-in uses one-time codes that expire after 10 minutes;',
          'limits on code requests per number and per day, and on the number of attempts, to prevent brute force and spam;',
          'sign-in through the bot is confirmed with a check number shown on the website, so nobody can get into your account by sending you their sign-in link;',
          'limits on messages and subscriptions per IP address and for the whole site;',
          'the site does not load third-party scripts and cannot be embedded in other sites (Content Security Policy);',
          'only authorised staff have access to orders and messages.',
        ],
        'If a data breach occurs, we notify the authorised state body within 24 hours and tell you if there is a risk to your rights.',
      ],
    },
    {
      id: 'rights',
      title: '8. Your rights',
      body: [
        'You have the right to:',
        [
          'know whether we process your data and receive a copy of it;',
          'correct inaccurate data (you can also do it yourself in “My Account”);',
          'request deletion of your data and your account;',
          'withdraw your consent at any time, including unsubscribing from the newsletter;',
          'object to processing;',
          'file a complaint with the authorised state body for personal data protection of the Republic of Uzbekistan (or your local data protection authority in the EU).',
        ],
        'You can delete your account yourself: My Account → “Delete account”. To make the sign-in bot forget your number, send it /delete.',
        `For other requests write to ${E}. After you withdraw consent we delete the data no later than the next working day; we correct data within 3 days; we answer other requests within the time limits set by law (no more than 30 days). We may ask you to confirm that the request comes from the account holder.`,
      ],
    },
    {
      id: 'children',
      title: '9. Children',
      body: ['The site is not intended for children under 16. We do not knowingly collect their data. If you believe a child has provided data to us, contact us and we will delete it.'],
    },
    {
      id: 'changes',
      title: '10. Changes to this policy',
      body: ['We may update this policy when the site changes. The date of the latest version is shown at the top. If changes are significant, we will notify you on the site or by email.'],
    },
    {
      id: 'contact',
      title: '11. Contact',
      body: [`Questions about personal data: ${E} · ${CONTACTS.phone} · Telegram ${CONTACTS.telegramHandle}`],
    },
  ],
};

const ru: Policy = {
  title: 'Политика конфиденциальности',
  updated: 'Последнее обновление: 29 октября 2026',
  toc: 'Содержание',
  intro:
    'Эта политика объясняет, какие персональные данные Pelta Nera получает через сайт peltanera.com, зачем, где они хранятся и какие у вас права. Мы собираем только то, что нужно для выполнения заказа, ответа на сообщение и работы аккаунта. Мы не продаём персональные данные и не используем рекламные трекеры.',
  sections: [
    {
      id: 'operator',
      title: '1. Кто мы',
      body: [
        `Оператор персональных данных — Pelta Nera: ${sellerLine('ru')}, г. Ташкент, Узбекистан. Ответственный за обработку персональных данных — ${SELLER.name} (${E}).`,
        [`Email: ${E}`, `Телефон: ${CONTACTS.phone}`, `Telegram: ${CONTACTS.telegramHandle}`],
        'Мы обрабатываем персональные данные в соответствии с Законом Республики Узбекистан «О персональных данных», а для посетителей из Европейского союза — с учётом принципов GDPR.',
      ],
    },
    {
      id: 'data',
      title: '2. Какие данные мы получаем и зачем',
      body: [
        'Оформление заказа (корзина → оформление):',
        [
          'имя, телефон, адрес доставки, комментарий (по желанию);',
          'выбранные изделия, цвет, количество и сумма;',
          'email и идентификатор аккаунта — только если вы вошли в аккаунт.',
        ],
        'Цель: принять, подтвердить и доставить заказ. Основание: исполнение договора.',
        'Форма «Клиентский сервис»:',
        ['имя, телефон и/или email, текст сообщения.'],
        'Цель: ответить на ваше обращение. Основание: ваше согласие.',
        'Аккаунт (регистрация и вход):',
        [
          'номер телефона — для входа и подтверждения, что номер принадлежит вам;',
          'одноразовые коды входа — приходят в ваш Telegram от нашего бота; пароли мы не используем;',
          'имя, интересы (женское / мужское), согласие на рассылку — только если вы их укажете;',
          'IP-адрес и время попыток входа, а также хеш (необратимо закодированный) номера телефона со временем запроса кода — для защиты от взлома и спама кодами.',
        ],
        'Цель: работа аккаунта и быстрое оформление заказов. Основание: договор и согласие.',
        'Рассылка:',
        ['email, интересы (женское / мужское), язык.'],
        'Цель: сообщать о новых коллекциях. Основание: согласие, которое можно отозвать в любой момент.',
        'Технические данные:',
        [
          'при открытии сайта хостинг автоматически получает IP-адрес и сведения о браузере в серверных журналах;',
          'когда вы отправляете сообщение или подписываетесь на рассылку, база хранит необратимый хеш IP-адреса (с секретным ключом; сам адрес не сохраняется) 24 часа — для защиты от спама;',
          'мы не используем аналитику, рекламные и социальные трекеры.',
        ],
      ],
    },
    {
      id: 'cookies',
      title: '3. Cookies и локальное хранилище',
      body: [
        'Сайт сохраняет в вашем браузере небольшие данные (local storage). Строго необходимые работают без согласия, потому что без них сайт не функционирует:',
        [
          'pelta_cart — содержимое корзины;',
          'pelta_lang_v2 — выбранный язык;',
          'pelta_auth — сессия входа (только если вы вошли);',
          'pelta_consent — ваш выбор по cookies;',
          'pelta_sent_* — время отправки форм, для защиты от спама.',
        ],
        'Необязательные cookies (аналитика, маркетинг) используются, только если вы выбрали «Разрешить все». Сейчас сайт таких не использует; если они появятся, то начнут работать только после вашего согласия, а эта политика будет обновлена.',
        'Изменить выбор можно в любой момент по ссылке «Настройки cookies» внизу сайта.',
        'Если на формах входа включена защита от ботов (Cloudflare Turnstile), Cloudflare может обрабатывать технические данные, чтобы отличить человека от бота. Это необходимо для безопасности.',
      ],
    },
    {
      id: 'processors',
      title: '4. Кто обрабатывает данные по нашему поручению',
      body: [
        'Мы пользуемся надёжными сервисами. Они обрабатывают данные только по нашему поручению:',
        [
          'Supabase Inc. — аккаунты, записи заказов и сообщений (база данных, серверы в Сингапуре);',
          'Telegram (наш бот входа) — подтверждение номера и доставка одноразовых кодов входа; бот хранит номер в виде хеша и в зашифрованном виде вместе с ID чата в Telegram (удалить — командой /delete в боте);',
          'Google LLC (Google Apps Script / Таблицы) — приём заказов и сообщений, учёт клиентов и подписчиков рассылки (ID, имя, номер телефона или email, интересы, даты регистрации и входа);',
          'Telegram — доставка новых заказов (имя, телефон, адрес, товары) и сообщений в закрытый канал нашей команды;',
          'GitHub Inc. (GitHub Pages) — хостинг сайта;',
          'Google LLC (Gmail) — наши ответы на ваши письма;',
          'Cloudflare Inc. — защита от ботов, если она включена.',
        ],
        'Также данные могут передаваться курьерской службе для доставки заказа и государственным органам в случаях, предусмотренных законом.',
      ],
    },
    {
      id: 'transfer',
      title: '5. Место хранения и трансграничная передача',
      body: [
        'Наша база данных (Supabase) размещена в Сингапуре, серверы Google, GitHub и Cloudflare — в основном в США. Сингапур и США входят в утверждённый Кабинетом Министров в 2026 году перечень стран, обеспечивающих равнозначную защиту персональных данных, поэтому такая передача допускается.',
        'Telegram обрабатывает данные в собственных дата-центрах за рубежом; эта передача происходит на основании вашего согласия, которое вы даёте при регистрации, оформлении заказа или отправке формы.',
        'Биометрические и генетические данные, которые должны храниться в Узбекистане, мы не обрабатываем.',
      ],
    },
    {
      id: 'retention',
      title: '6. Сроки хранения',
      body: [
        [
          'заказы — в течение срока, установленного налоговым и бухгалтерским законодательством;',
          'обращения в клиентский сервис — до 1 года после завершения переписки;',
          'аккаунт — до его удаления; после удаления данные аккаунта стираются сразу, а заказы остаются без привязки к аккаунту на срок хранения учётных документов;',
          'журнал защиты от спама (хеш IP) — 24 часа;',
          'рассылка — до отписки;',
          'серверные журналы и журналы безопасности — в пределах стандартных сроков сервисов, обычно до 90 дней.',
        ],
        'После этого данные удаляются или обезличиваются.',
      ],
    },
    {
      id: 'security',
      title: '7. Как мы защищаем данные',
      body: [
        [
          'все соединения с сайтом зашифрованы (HTTPS);',
          'правила доступа к базе: посетитель может только добавлять свои записи и видеть только данные своего аккаунта;',
          'паролей нет: вход по одноразовому коду, который действует 10 минут;',
          'ограничение числа кодов на номер и в сутки, а также числа попыток ввода — для защиты от подбора и спама;',
          'вход через бота подтверждается проверочным числом с сайта — войти в ваш аккаунт, прислав вам свою ссылку для входа, нельзя;',
          'ограничение числа сообщений и подписок с одного IP-адреса и для всего сайта;',
          'сайт не загружает сторонние скрипты и не может быть встроен в чужие сайты (Content Security Policy);',
          'доступ к заказам и сообщениям есть только у уполномоченных сотрудников.',
        ],
        'При утечке данных мы уведомляем уполномоченный государственный орган в течение 24 часов, а вас — если есть риск для ваших прав.',
      ],
    },
    {
      id: 'rights',
      title: '8. Ваши права',
      body: [
        'Вы вправе:',
        [
          'знать, обрабатываем ли мы ваши данные, и получить их копию;',
          'исправить неточные данные (это можно сделать и самостоятельно в «Личном кабинете»);',
          'потребовать удаления данных и аккаунта;',
          'в любой момент отозвать согласие, в том числе отписаться от рассылки;',
          'возразить против обработки;',
          'обратиться с жалобой в уполномоченный государственный орган по защите персональных данных Республики Узбекистан (или в надзорный орган вашей страны в ЕС).',
        ],
        'Удалить аккаунт можно самостоятельно: «Личный кабинет» → «Удалить аккаунт». Чтобы бот входа забыл ваш номер, отправьте ему /delete.',
        `По остальным вопросам пишите на ${E}. После отзыва согласия мы удаляем данные не позднее следующего рабочего дня, исправляем — в течение 3 дней, на другие запросы отвечаем в сроки, установленные законом (не более 30 дней). Мы можем попросить подтвердить, что запрос исходит от владельца аккаунта.`,
      ],
    },
    {
      id: 'children',
      title: '9. Дети',
      body: ['Сайт не предназначен для детей младше 16 лет. Мы намеренно не собираем их данные. Если вы считаете, что ребёнок передал нам данные, свяжитесь с нами — мы их удалим.'],
    },
    {
      id: 'changes',
      title: '10. Изменения политики',
      body: ['Мы можем обновлять политику при изменениях на сайте. Дата актуальной версии указана вверху. О существенных изменениях мы сообщим на сайте или по email.'],
    },
    {
      id: 'contact',
      title: '11. Контакты',
      body: [`Вопросы о персональных данных: ${E} · ${CONTACTS.phone} · Telegram ${CONTACTS.telegramHandle}`],
    },
  ],
};

const uz: Policy = {
  title: 'Maxfiylik siyosati',
  updated: 'Oxirgi yangilanish: 2026-yil 29-oktabr',
  toc: 'Mundarija',
  intro:
    'Ushbu siyosat Pelta Nera peltanera.com sayti orqali qanday shaxsiy ma’lumotlarni, nima maqsadda olishini, ular qayerda saqlanishini va sizning huquqlaringizni tushuntiradi. Biz faqat buyurtmani bajarish, xabaringizga javob berish va hisobingiz ishlashi uchun zarur bo‘lgan ma’lumotlarni yig‘amiz. Biz shaxsiy ma’lumotlarni sotmaymiz va reklama trekerlaridan foydalanmaymiz.',
  sections: [
    {
      id: 'operator',
      title: '1. Biz kimmiz',
      body: [
        `Shaxsiy ma’lumotlar operatori — Pelta Nera: ${sellerLine('uz')}, Toshkent sh., O‘zbekiston. Shaxsiy ma’lumotlarni qayta ishlash uchun mas’ul shaxs — ${SELLER.name} (${E}).`,
        [`Email: ${E}`, `Telefon: ${CONTACTS.phone}`, `Telegram: ${CONTACTS.telegramHandle}`],
        'Biz shaxsiy ma’lumotlarni O‘zbekiston Respublikasining «Shaxsga doir ma’lumotlar to‘g‘risida»gi Qonuniga muvofiq, Yevropa Ittifoqidan tashrif buyuruvchilar uchun esa GDPR tamoyillarini hisobga olgan holda qayta ishlaymiz.',
      ],
    },
    {
      id: 'data',
      title: '2. Qanday ma’lumotlarni va nima uchun olamiz',
      body: [
        'Buyurtma berish (savat → rasmiylashtirish):',
        [
          'ism, telefon, yetkazib berish manzili, izoh (ixtiyoriy);',
          'tanlangan buyumlar, rang, soni va summa;',
          'email va hisob identifikatori — faqat hisobingizga kirgan bo‘lsangiz.',
        ],
        'Maqsad: buyurtmani qabul qilish, tasdiqlash va yetkazib berish. Asos: shartnomani bajarish.',
        '«Mijozlar xizmati» shakli:',
        ['ism, telefon va/yoki email, xabar matni.'],
        'Maqsad: murojaatingizga javob berish. Asos: sizning roziligingiz.',
        'Hisob (ro‘yxatdan o‘tish va kirish):',
        [
          'telefon raqami — kirish va raqam sizga tegishli ekanini tasdiqlash uchun;',
          'bir martalik kirish kodlari — botimiz orqali Telegram’ingizga keladi; biz parollardan foydalanmaymiz;',
          'ism, qiziqishlar (ayollar / erkaklar uchun), yangiliklarga rozilik — faqat siz kiritsangiz;',
          'IP-manzil va kirishga urinishlar vaqti, shuningdek kod so‘ralgan vaqt bilan telefon raqamining xeshi (qaytarib bo‘lmaydigan kod) — buzib kirish va kod spamidan himoya uchun.',
        ],
        'Maqsad: hisob ishlashi va buyurtmalarni tez rasmiylashtirish. Asos: shartnoma va rozilik.',
        'Yangiliklar:',
        ['email, qiziqishlar (ayollar / erkaklar uchun), til.'],
        'Maqsad: yangi kolleksiyalar haqida xabar berish. Asos: istalgan vaqtda qaytarib olish mumkin bo‘lgan rozilik.',
        'Texnik ma’lumotlar:',
        [
          'saytni ochganingizda xosting server jurnallarida IP-manzil va brauzer haqidagi ma’lumotlarni avtomatik oladi;',
          'xabar yuborganingizda yoki obuna bo‘lganingizda baza IP-manzilning qaytarib bo‘lmaydigan xeshini (maxfiy kalit bilan; manzilning o‘zi saqlanmaydi) 24 soat saqlaydi — spamdan himoya uchun;',
          'biz analitika, reklama va ijtimoiy tarmoq trekerlaridan foydalanmaymiz.',
        ],
      ],
    },
    {
      id: 'cookies',
      title: '3. Cookies va mahalliy xotira',
      body: [
        'Sayt brauzeringizda kichik ma’lumotlarni saqlaydi (local storage). Mutlaqo zarur bo‘lganlari roziliksiz ishlaydi, chunki ularsiz sayt ishlamaydi:',
        [
          'pelta_cart — savat tarkibi;',
          'pelta_lang_v2 — tanlangan til;',
          'pelta_auth — kirish sessiyasi (faqat hisobga kirgan bo‘lsangiz);',
          'pelta_consent — cookies bo‘yicha tanlovingiz;',
          'pelta_sent_* — spamdan himoya uchun shakllar yuborilgan vaqt.',
        ],
        'Ixtiyoriy cookies (analitika, marketing) faqat «Barchasiga ruxsat berish»ni tanlasangiz ishlatiladi. Hozircha sayt bunday cookies’dan foydalanmaydi; agar ular paydo bo‘lsa, faqat roziligingizdan keyin ishlay boshlaydi va ushbu siyosat yangilanadi.',
        'Tanlovingizni istalgan vaqtda sayt pastidagi «Cookies sozlamalari» havolasi orqali o‘zgartirishingiz mumkin.',
        'Agar kirish shakllarida botlardan himoya (Cloudflare Turnstile) yoqilgan bo‘lsa, Cloudflare odamni botdan ajratish uchun texnik ma’lumotlarni qayta ishlashi mumkin. Bu xavfsizlik uchun zarur.',
      ],
    },
    {
      id: 'processors',
      title: '4. Ma’lumotlarni bizning topshirig‘imiz bilan kim qayta ishlaydi',
      body: [
        'Biz ishonchli xizmatlardan foydalanamiz. Ular ma’lumotlarni faqat bizning topshirig‘imiz bilan qayta ishlaydi:',
        [
          'Supabase Inc. — hisoblar, buyurtma va xabarlar yozuvlari (ma’lumotlar bazasi, serverlar Singapurda);',
          'Telegram (kirish botimiz) — raqamni tasdiqlash va bir martalik kirish kodlarini yetkazish; bot raqamni xesh va shifrlangan ko‘rinishda Telegram chat ID bilan birga saqlaydi (o‘chirish — botga /delete buyrug‘i);',
          'Google LLC (Google Apps Script / Jadvallar) — buyurtma va xabarlarni qabul qilish, mijozlar va obunachilar ro‘yxatini yuritish (ID, ism, telefon raqami yoki email, qiziqishlar, ro‘yxatdan o‘tish va kirish sanalari);',
          'Telegram — yangi buyurtmalar (ism, telefon, manzil, buyumlar) va xabarlarni jamoamizning yopiq kanaliga yetkazish;',
          'GitHub Inc. (GitHub Pages) — sayt xostingi;',
          'Google LLC (Gmail) — xatlaringizga javoblarimiz;',
          'Cloudflare Inc. — botlardan himoya, agar yoqilgan bo‘lsa.',
        ],
        'Shuningdek, ma’lumotlar buyurtmani yetkazish uchun kuryer xizmatiga va qonunda nazarda tutilgan hollarda davlat organlariga berilishi mumkin.',
      ],
    },
    {
      id: 'transfer',
      title: '5. Saqlash joyi va transchegaraviy uzatish',
      body: [
        'Ma’lumotlar bazamiz (Supabase) Singapurda, Google, GitHub va Cloudflare serverlari asosan AQShda joylashgan. Singapur va AQSh 2026-yilda Vazirlar Mahkamasi tasdiqlagan shaxsiy ma’lumotlarning teng darajada himoyasini ta’minlovchi mamlakatlar ro‘yxatiga kiradi, shuning uchun bunday uzatishga ruxsat beriladi.',
        'Telegram ma’lumotlarni xorijdagi o‘z data-markazlarida qayta ishlaydi; bu uzatish ro‘yxatdan o‘tish, buyurtma berish yoki shakl yuborishda bergan roziligingiz asosida amalga oshiriladi.',
        'O‘zbekistonda saqlanishi shart bo‘lgan biometrik va genetik ma’lumotlarni biz qayta ishlamaymiz.',
      ],
    },
    {
      id: 'retention',
      title: '6. Saqlash muddatlari',
      body: [
        [
          'buyurtmalar — soliq va buxgalteriya qonunchiligida belgilangan muddat davomida;',
          'mijozlar xizmatiga murojaatlar — yozishma tugaganidan keyin 1 yilgacha;',
          'hisob — o‘chirilgunga qadar; o‘chirilgandan so‘ng hisob ma’lumotlari darhol o‘chiriladi, buyurtmalar esa hisob bilan bog‘lanmagan holda hisob hujjatlarini saqlash muddati davomida qoladi;',
          'spamdan himoya jurnali (IP xeshi) — 24 soat;',
          'yangiliklar — obunadan chiqqunga qadar;',
          'server va xavfsizlik jurnallari — xizmatlarning standart muddatlarida, odatda 90 kungacha.',
        ],
        'Shundan so‘ng ma’lumotlar o‘chiriladi yoki shaxssizlashtiriladi.',
      ],
    },
    {
      id: 'security',
      title: '7. Ma’lumotlarni qanday himoya qilamiz',
      body: [
        [
          'sayt bilan barcha ulanishlar shifrlangan (HTTPS);',
          'ma’lumotlar bazasiga kirish qoidalari: tashrif buyuruvchi faqat o‘z yozuvlarini qo‘shishi va faqat o‘z hisobi ma’lumotlarini ko‘rishi mumkin;',
          'parollar yo‘q: kirish 10 daqiqa amal qiladigan bir martalik kod orqali;',
          'bir raqam va bir kunga kodlar soni hamda kiritish urinishlari cheklangan — tanlash va spamdan himoya uchun;',
          'bot orqali kirish saytdagi tekshiruv soni bilan tasdiqlanadi — sizga o‘z havolasini yuborib, akkauntingizga kirib bo‘lmaydi;',
          'bitta IP-manzildan va butun sayt bo‘yicha xabarlar va obunalar soni cheklangan;',
          'sayt begona skriptlarni yuklamaydi va boshqa saytlarga joylashtirilmaydi (Content Security Policy);',
          'buyurtma va xabarlarga faqat vakolatli xodimlar kira oladi.',
        ],
        'Ma’lumotlar sizib chiqqan taqdirda, vakolatli davlat organini 24 soat ichida, huquqlaringizga xavf bo‘lsa — sizni ham xabardor qilamiz.',
      ],
    },
    {
      id: 'rights',
      title: '8. Sizning huquqlaringiz',
      body: [
        'Siz quyidagi huquqlarga egasiz:',
        [
          'ma’lumotlaringiz qayta ishlanayotganini bilish va ularning nusxasini olish;',
          'noto‘g‘ri ma’lumotlarni tuzatish («Shaxsiy kabinet»da o‘zingiz ham qilishingiz mumkin);',
          'ma’lumotlar va hisobni o‘chirishni talab qilish;',
          'istalgan vaqtda roziligingizni, jumladan yangiliklarga obunani qaytarib olish;',
          'qayta ishlashga e’tiroz bildirish;',
          'O‘zbekiston Respublikasining shaxsga doir ma’lumotlarni himoya qilish bo‘yicha vakolatli davlat organiga (yoki Yevropa Ittifoqidagi mamlakatingiz nazorat organiga) shikoyat qilish.',
        ],
        'Akkauntni o‘zingiz o‘chirishingiz mumkin: «Shaxsiy kabinet» → «Akkauntni o‘chirish». Kirish boti raqamingizni unutishi uchun unga /delete yuboring.',
        `Boshqa so‘rovlar uchun ${E} manziliga yozing. Rozilik qaytarib olinganidan so‘ng ma’lumotlarni keyingi ish kunidan kechiktirmay o‘chiramiz, tuzatishni 3 kun ichida bajaramiz, boshqa so‘rovlarga qonunda belgilangan muddatlarda (30 kundan oshmagan) javob beramiz. So‘rov hisob egasidan kelganini tasdiqlashni so‘rashimiz mumkin.`,
      ],
    },
    {
      id: 'children',
      title: '9. Bolalar',
      body: ['Sayt 16 yoshgacha bo‘lgan bolalar uchun mo‘ljallanmagan. Biz ularning ma’lumotlarini ataylab yig‘maymiz. Agar bola bizga ma’lumot bergan deb hisoblasangiz, biz bilan bog‘laning — biz ularni o‘chiramiz.'],
    },
    {
      id: 'changes',
      title: '10. Siyosatdagi o‘zgarishlar',
      body: ['Saytdagi o‘zgarishlarga qarab siyosatni yangilashimiz mumkin. Amaldagi versiya sanasi yuqorida ko‘rsatilgan. Muhim o‘zgarishlar haqida saytda yoki email orqali xabar beramiz.'],
    },
    {
      id: 'contact',
      title: '11. Aloqa',
      body: [`Shaxsiy ma’lumotlar bo‘yicha savollar: ${E} · ${CONTACTS.phone} · Telegram ${CONTACTS.telegramHandle}`],
    },
  ],
};

export const POLICIES: Record<Lang, Policy> = { en, ru, uz };
