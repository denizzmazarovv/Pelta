import type { Lang } from './i18n';
import { CONTACTS, SELLER } from './config';
import type { Policy } from './privacy';

/**
 * Публичная оферта (условия продажи) — страница /terms.
 * Обязательна по Закону «Об электронной коммерции»: продавец, порядок заказа, цены,
 * оплата, доставка, возврат. Основной текст — узбекский, русский и английский — переводы.
 *
 * Продавец, ИНН/ПИНФЛ и гарантия берутся из SELLER в config.ts.
 * Перед публикацией изменений покажите текст юристу.
 */

export const TERMS_DATE = '2026-10-29';

const STATUS: Record<Lang, Record<'self' | 'ip', string>> = {
  ru: { self: 'самозанятый', ip: 'индивидуальный предприниматель' },
  uz: { self: 'o‘zini o‘zi band qilgan shaxs', ip: 'yakka tartibdagi tadbirkor' },
  en: { self: 'self-employed', ip: 'individual entrepreneur' },
};
const TAX: Record<Lang, string> = { ru: 'ИНН/ПИНФЛ', uz: 'STIR/JShShIR', en: 'TIN/PINFL' };

export function sellerLine(lang: Lang): string {
  return [SELLER.name, SELLER.status && STATUS[lang][SELLER.status], SELLER.taxId && `${TAX[lang]} ${SELLER.taxId}`]
    .filter(Boolean)
    .join(', ');
}

const W = SELLER.warrantyMonths;
const contacts = (l: { email: string; phone: string; city: string }) => [
  `${l.city}`,
  `${l.email}: ${CONTACTS.email}`,
  `${l.phone}: ${CONTACTS.phone}`,
  `Telegram: ${CONTACTS.telegramHandle}`,
];

const uz: Policy = {
  title: 'Ommaviy oferta',
  updated: '2026-yil 29-oktabr tahriri',
  toc: 'Mundarija',
  intro:
    'Bu peltanera.com sayti orqali Pelta Nera buyumlarini oldi-sotdi shartnomasini tuzish taklifi (ommaviy oferta). Buyurtma berib, shartlarga roziligingizni belgilasangiz, siz ushbu ofertani qabul qilasiz. Asosiy matn — o‘zbek tilida; rus va ingliz tilidagi matnlar — tarjima.',
  sections: [
    {
      id: 'seller',
      title: '1. Sotuvchi',
      body: [
        `Sotuvchi: ${sellerLine('uz')}.`,
        contacts({ city: 'Toshkent shahri, O‘zbekiston Respublikasi', email: 'Email', phone: 'Telefon' }),
        'Buyumlar qo‘lda tayyorlanadi.',
      ],
    },
    {
      id: 'contract',
      title: '2. Shartnoma predmeti va tuzilishi',
      body: [
        'Sotuvchi saytda ko‘rsatilgan buyumlarni sotadi, xaridor esa ushbu oferta shartlarida ularni to‘laydi va qabul qiladi.',
        'Buyurtmani telefon raqami tasdiqlangan akkauntga kirgan mijoz rasmiylashtiradi. Sotuvchi buyurtmani Telegram yoki telefon orqali tasdiqlaganda (mavjudligi, rangi, yetkazib berish narxi va muddati) shartnoma tuzilgan hisoblanadi.',
        'To‘lovdan oldin bizga yozib, buyurtmani bekor qilishingiz mumkin. Qo‘lda ishlangan buyum saytdagi tavsif, surat va rangdan biroz farq qilishi mumkin — agar bu sifat va vazifasiga ta’sir qilmasa, kamchilik hisoblanmaydi.',
      ],
    },
    {
      id: 'prices',
      title: '3. Narxlar',
      body: [
        'Narxlar milliy valyutada — so‘mda ko‘rsatilgan va buyurtma berilgan paytda amal qiladi. Yetkazib berish narxi buyum narxiga kirmaydi va buyurtma tasdiqlanganda aytiladi.',
        'Sodiqlik dasturi chegirmalari avtomatik hisoblanadi va savatda ko‘rsatiladi.',
      ],
    },
    {
      id: 'payment',
      title: '4. To‘lov',
      body: [
        'To‘lov buyurtma tasdiqlangandan so‘ng kartaga bank o‘tkazmasi orqali amalga oshiriladi (Uzcard, Humo, Click, Payme va boshqalar). To‘lov rekvizitlarini faqat biz, yuqorida ko‘rsatilgan rasmiy kontaktlarimizdan yuboramiz.',
        'Biz hech qachon kartaning to‘liq raqami, amal qilish muddati, CVV yoki SMS-kodlarni so‘ramaymiz. Agar kimdir Pelta Nera nomidan ularni so‘rasa — bu firibgarlar, bizga xabar bering.',
      ],
    },
    {
      id: 'delivery',
      title: '5. Yetkazib berish',
      body: [
        'Yetkazib berish usuli, narxi va muddati (Toshkent bo‘ylab yoki viloyatlarga) buyurtma tasdiqlanganda kelishiladi. Muddat kelishilmagan bo‘lsa, buyurtmani to‘lovdan keyin 30 kundan kechiktirmay topshiramiz.',
        'Mulk huquqi va tasodifiy shikastlanish xavfi xaridorga buyurtmani olgan paytda o‘tadi. Olganda buyumni tekshiring; ko‘rinadigan shikastlar haqida darhol xabar bering.',
      ],
    },
    {
      id: 'returns',
      title: '6. Qaytarish va almashtirish',
      body: [
        'Sifatli buyum:',
        [
          'agar ishlatilmagan, ko‘rinishi, xususiyatlari, qadog‘i saqlangan va xarid tasdig‘i (masalan, buyurtma raqami) bo‘lsa, olingan kundan boshlab 10 kun ichida almashtirish yoki qaytarish mumkin;',
          'almashtirish uchun mos buyum bo‘lmasa — pulni qaytaramiz;',
          'sifatli buyumni qaytarib yuborish xarajatlarini xaridor to‘laydi.',
        ],
        'Kamchiligi bor buyum:',
        [
          `kafolat muddati (${W} oy) ichida almashtirish, kamchilikni tuzatish, narxni kamaytirish yoki pulni qaytarishni talab qilishingiz mumkin;`,
          'almashtirish — 7 kun ichida, sifatni tekshirish kerak bo‘lsa — 20 kun ichida;',
          'kamchiligi bor buyumni yetkazish xarajatlarini sotuvchi to‘laydi.',
        ],
        'Pul to‘lov qilingan kartaga, buyum bizga qaytib kelganidan keyin 10 kundan kechiktirmay qaytariladi.',
        'Qaytarish yoki almashtirish uchun buyurtma raqami va suratlar bilan bizga yozing.',
        'Xaridorning «Iste’molchilarning huquqlarini himoya qilish to‘g‘risida»gi Qonun bo‘yicha huquqlari har qanday holatda saqlanadi; ushbu bo‘lim shartlari ularni cheklamaydi.',
      ],
    },
    {
      id: 'warranty',
      title: '7. Kafolat',
      body: [
        `Kafolat muddati — buyum olingan kundan boshlab ${W} oy: choklar, qirralar va furnituraga.`,
        'Kamchilik hisoblanmaydi: tabiiy charmning tabiiy o‘zgarishlari (patina, qorayish, burmalar, rang va tekstura farqlari), oddiy foydalanish izlari, suv, olov, kimyoviy moddalar, noto‘g‘ri parvarish yoki mexanik ta’sirdan shikastlanish.',
      ],
    },
    {
      id: 'loyalty',
      title: '8. Sodiqlik dasturi',
      body: [
        'Member, Silver, Gold va Brilliant darajalari bajarilgan buyurtmalar soniga qarab avtomatik beriladi. Har bir daraja uchun nechta buyurtma kerakligi va chegirma miqdori profilda ko‘rsatilgan.',
        'VIP va CEO rollarini sotuvchi o‘z qarori bilan beradi; ular o‘z chegirmasi va yopiq kolleksiyalar hamda kanallarga kirish imkonini beradi.',
        'Chegirmalar qo‘shilmaydi: eng kattasi qo‘llaniladi. Chegirma faqat saytda amal qiladi, pulga almashtirilmaydi va boshqa shaxsga berilmaydi.',
        'Sotuvchi dastur shartlarini saytda e’lon qilib o‘zgartirishi mumkin; o‘zgarishlar tasdiqlangan buyurtmalarga ta’sir qilmaydi. Suiiste’mol holatida (masalan, soxta buyurtmalar) daraja yoki rol olib qo‘yilishi mumkin.',
      ],
    },
    {
      id: 'data',
      title: '9. Shaxsiy ma’lumotlar',
      body: [
        'Ma’lumotlaringizni qanday qayta ishlashimiz Maxfiylik siyosatida yozilgan. Buyurtma berib, uni bajarish uchun zarur ma’lumotlarni qayta ishlashga rozilik bildirasiz.',
      ],
    },
    {
      id: 'disputes',
      title: '10. Javobgarlik va nizolar',
      body: [
        'Tomonlar shartnoma bajarilishi uchun O‘zbekiston Respublikasi qonunchiligiga muvofiq javob beradi.',
        'E’tirozlarni yuqoridagi kontaktlarga yuboring — biz qonunda belgilangan muddatlarda javob beramiz. Kelishib bo‘lmasa, nizo O‘zbekiston Respublikasi qonunchiligiga muvofiq sudda ko‘riladi.',
      ],
    },
    {
      id: 'changes',
      title: '11. Ofertaning o‘zgarishi',
      body: [
        'Biz ofertani o‘zgartirishimiz mumkin. Yangi tahrir saytda e’lon qilingan paytdan kuchga kiradi va undan keyin berilgan buyurtmalarga qo‘llaniladi. Tahrir sanasi yuqorida ko‘rsatilgan.',
      ],
    },
  ],
};

const ru: Policy = {
  title: 'Публичная оферта',
  updated: 'Редакция от 29 октября 2026',
  toc: 'Содержание',
  intro:
    'Это предложение (публичная оферта) заключить договор купли-продажи изделий Pelta Nera через сайт peltanera.com. Оформляя заказ и отмечая согласие с условиями, вы принимаете эту оферту. Основной текст — на узбекском языке; русская и английская версии — переводы.',
  sections: [
    {
      id: 'seller',
      title: '1. Продавец',
      body: [
        `Продавец: ${sellerLine('ru')}.`,
        contacts({ city: 'г. Ташкент, Республика Узбекистан', email: 'Email', phone: 'Телефон' }),
        'Изделия изготавливаются вручную.',
      ],
    },
    {
      id: 'contract',
      title: '2. Предмет и заключение договора',
      body: [
        'Продавец продаёт изделия, показанные на сайте, а покупатель оплачивает и принимает их на условиях этой оферты.',
        'Заказ оформляет клиент, вошедший в аккаунт с подтверждённым номером телефона. Договор считается заключённым, когда продавец подтвердит заказ в Telegram или по телефону (наличие, цвет, стоимость и срок доставки).',
        'До оплаты вы можете отменить заказ, написав нам. Изделие ручной работы может немного отличаться от описания, фотографий и цвета на сайте — это не считается недостатком, если не влияет на качество и назначение.',
      ],
    },
    {
      id: 'prices',
      title: '3. Цены',
      body: [
        'Цены указаны в национальной валюте — сумах — и действуют на момент оформления заказа. Стоимость доставки не входит в цену и сообщается при подтверждении заказа.',
        'Скидки программы лояльности рассчитываются автоматически и показаны в корзине.',
      ],
    },
    {
      id: 'payment',
      title: '4. Оплата',
      body: [
        'Оплата — банковским переводом на карту (Uzcard, Humo, через Click, Payme и т. п.) после подтверждения заказа. Реквизиты присылаем только мы, из наших официальных контактов, указанных выше.',
        'Мы никогда не просим полный номер карты, срок её действия, CVV или коды из SMS. Если кто-то просит их от имени Pelta Nera — это мошенники, сообщите нам.',
      ],
    },
    {
      id: 'delivery',
      title: '5. Доставка',
      body: [
        'Способ, стоимость и срок доставки (по Ташкенту или в регионы) согласуются при подтверждении заказа. Если срок не согласован, мы передаём заказ не позднее 30 дней после оплаты.',
        'Право собственности и риск случайной порчи переходят к покупателю при получении заказа. При получении проверьте изделие; о видимых повреждениях сообщите сразу.',
      ],
    },
    {
      id: 'returns',
      title: '6. Возврат и обмен',
      body: [
        'Изделие надлежащего качества:',
        [
          'можно обменять или вернуть в течение 10 дней со дня получения, если оно не было в употреблении, сохранены его вид, свойства, упаковка и есть подтверждение покупки (например, номер заказа);',
          'если подходящего изделия для обмена нет — возвращаем деньги;',
          'расходы на обратную доставку изделия надлежащего качества несёт покупатель.',
        ],
        'Изделие с недостатком:',
        [
          `в течение гарантийного срока (${W} мес.) вы можете потребовать замены, устранения недостатка, уменьшения цены или возврата денег;`,
          'замена — в течение 7 дней, а если нужна проверка качества — в течение 20 дней;',
          'расходы на доставку изделия с недостатком несёт продавец.',
        ],
        'Деньги возвращаем на карту, с которой была оплата, не позднее 10 дней после получения изделия обратно.',
        'Чтобы оформить возврат или обмен, напишите нам номер заказа и приложите фото.',
        'Права покупателя по Закону «О защите прав потребителей» сохраняются в любом случае; условия этого раздела их не ограничивают.',
      ],
    },
    {
      id: 'warranty',
      title: '7. Гарантия',
      body: [
        `Гарантийный срок — ${W} месяцев со дня получения: на швы, края и фурнитуру.`,
        'Не являются недостатком: естественные изменения натуральной кожи (патина, потемнение, заломы, небольшие отличия цвета и фактуры), следы обычного использования, повреждения от воды, огня, химии, неправильного ухода или механического воздействия.',
      ],
    },
    {
      id: 'loyalty',
      title: '8. Программа лояльности',
      body: [
        'Уровни Member, Silver, Gold и Brilliant присваиваются автоматически по числу выполненных заказов. Сколько заказов нужно и какая скидка у каждого уровня — видно в профиле.',
        'Роли VIP и CEO назначает продавец по своему решению; они дают свою скидку и доступ к закрытым коллекциям и каналам.',
        'Скидки не суммируются: применяется наибольшая. Скидка действует только на сайте, не обменивается на деньги и не передаётся другим людям.',
        'Продавец может менять условия программы, публикуя их на сайте; изменения не затрагивают уже подтверждённые заказы. При злоупотреблениях (например, фиктивных заказах) уровень или роль может быть снят.',
      ],
    },
    {
      id: 'data',
      title: '9. Персональные данные',
      body: [
        'Как мы обрабатываем ваши данные, описано в Политике конфиденциальности. Оформляя заказ, вы соглашаетесь на обработку данных, нужных для его выполнения.',
      ],
    },
    {
      id: 'disputes',
      title: '10. Ответственность и споры',
      body: [
        'Стороны отвечают за исполнение договора по законодательству Республики Узбекистан.',
        'Претензии направляйте по контактам выше — мы отвечаем в сроки, установленные законом. Если договориться не удалось, спор рассматривается в суде по законодательству Республики Узбекистан.',
      ],
    },
    {
      id: 'changes',
      title: '11. Изменение оферты',
      body: [
        'Мы можем менять оферту. Новая редакция действует с момента публикации на сайте и применяется к заказам, оформленным после этого. Дата редакции указана вверху.',
      ],
    },
  ],
};

const en: Policy = {
  title: 'Terms of Sale',
  updated: 'Version of 29 October 2026',
  toc: 'Contents',
  intro:
    'This is an offer (public offer) to conclude a contract for the sale of Pelta Nera goods through peltanera.com. By placing an order and ticking your agreement with these terms, you accept this offer. The Uzbek text is the main version; the Russian and English versions are translations.',
  sections: [
    {
      id: 'seller',
      title: '1. Seller',
      body: [
        `Seller: ${sellerLine('en')}.`,
        contacts({ city: 'Tashkent, Republic of Uzbekistan', email: 'Email', phone: 'Phone' }),
        'Our goods are made by hand.',
      ],
    },
    {
      id: 'contract',
      title: '2. Subject and conclusion of the contract',
      body: [
        'The seller sells the goods shown on the website, and the buyer pays for and accepts them on the terms of this offer.',
        'Orders are placed by customers signed in to an account with a confirmed phone number. The contract is concluded when the seller confirms the order in Telegram or by phone (availability, colour, delivery cost and time).',
        'Before payment you may cancel the order by writing to us. A handmade item may differ slightly from the description, photos and colour on the website; this is not a defect if it does not affect quality or purpose.',
      ],
    },
    {
      id: 'prices',
      title: '3. Prices',
      body: [
        'Prices are shown in the national currency, Uzbek soums (UZS), and apply at the time the order is placed. Delivery is not included in the price and is quoted when the order is confirmed.',
        'Loyalty programme discounts are calculated automatically and shown in the bag.',
      ],
    },
    {
      id: 'payment',
      title: '4. Payment',
      body: [
        'Payment is made by bank transfer to a card (Uzcard, Humo, via Click, Payme, etc.) after the order is confirmed. Payment details are sent only by us, from our official contacts listed above.',
        'We never ask for your full card number, expiry date, CVV or SMS codes. If someone asks for them on behalf of Pelta Nera, they are fraudsters — please tell us.',
      ],
    },
    {
      id: 'delivery',
      title: '5. Delivery',
      body: [
        'The delivery method, cost and time (within Tashkent or to the regions) are agreed when the order is confirmed. If no time is agreed, we hand over the order no later than 30 days after payment.',
        'Ownership and the risk of accidental damage pass to the buyer upon receipt. Please check the item on receipt and tell us about any visible damage straight away.',
      ],
    },
    {
      id: 'returns',
      title: '6. Returns and exchanges',
      body: [
        'Items of proper quality:',
        [
          'can be exchanged or returned within 10 days of receipt if unused, with their appearance, properties and packaging preserved and with proof of purchase (for example, the order number);',
          'if no suitable item is available for exchange, we refund the money;',
          'the buyer pays for returning an item of proper quality.',
        ],
        'Defective items:',
        [
          `within the warranty period (${W} months) you may request a replacement, repair, a price reduction or a refund;`,
          'replacement within 7 days, or within 20 days if a quality check is needed;',
          'the seller pays for shipping a defective item.',
        ],
        'Refunds are made to the card used for payment no later than 10 days after we receive the item back.',
        'To arrange a return or exchange, write to us with the order number and photos.',
        'Your rights under the Law “On Consumer Rights Protection” apply in any case; this section does not limit them.',
      ],
    },
    {
      id: 'warranty',
      title: '7. Warranty',
      body: [
        `The warranty period is ${W} months from receipt and covers stitching, edges and hardware.`,
        'The following are not defects: natural changes of genuine leather (patina, darkening, creases, slight differences in colour and texture), signs of normal use, and damage from water, fire, chemicals, improper care or mechanical impact.',
      ],
    },
    {
      id: 'loyalty',
      title: '8. Loyalty programme',
      body: [
        'Member, Silver, Gold and Brilliant levels are assigned automatically by the number of completed orders. The number of orders needed and the discount for each level are shown in your profile.',
        'VIP and CEO roles are assigned by the seller at its discretion; they give their own discount and access to private collections and channels.',
        'Discounts do not add up: the largest one applies. A discount is valid only on the website, cannot be exchanged for money and cannot be transferred to another person.',
        'The seller may change the programme terms by publishing them on the website; changes do not affect orders already confirmed. In case of abuse (for example, fake orders) a level or role may be withdrawn.',
      ],
    },
    {
      id: 'data',
      title: '9. Personal data',
      body: [
        'How we process your data is described in the Privacy Policy. By placing an order you agree to the processing of the data needed to fulfil it.',
      ],
    },
    {
      id: 'disputes',
      title: '10. Liability and disputes',
      body: [
        'The parties are liable for performing the contract under the laws of the Republic of Uzbekistan.',
        'Send claims to the contacts above; we reply within the time limits set by law. If no agreement is reached, the dispute is settled in court under the laws of the Republic of Uzbekistan.',
      ],
    },
    {
      id: 'changes',
      title: '11. Changes to these terms',
      body: [
        'We may change these terms. A new version takes effect when published on the website and applies to orders placed after that. The version date is shown at the top.',
      ],
    },
  ],
};

export const TERMS: Record<Lang, Policy> = { uz, ru, en };
