// ====================
// ЗАЩИТА ЗАКАЗОВ
// Заказ принимается только от клиента, вошедшего на сайт по номеру телефона.
// Скрипт сам проверяет токен входа в Supabase и берёт номер из подтверждённого аккаунта.
// ====================
const SUPABASE_URL = "https://misuvgnzuustjptkvsvx.supabase.co";
// Публичный ключ (тот же, что в коде сайта). Секретный ключ сюда НЕ вставлять.
const SUPABASE_PUBLIC_KEY = "sb_publishable_eBcdReBCxn6JwNoAQw8BKg_eb4JoXRA";
const ORDERS_PER_HOUR = 5;

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Текст без управляющих символов, с ограничением длины
function clean_(v, max) {
  return String(v == null ? "" : v).replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
}

// Для сообщения Telegram (parse_mode HTML)
function html_(v) {
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Для таблицы: значение не должно стать формулой
function cell_(v) {
  const s = String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function verifiedUser_(token) {
  if (!token || typeof token !== "string" || token.length > 4000) return null;
  const res = UrlFetchApp.fetch(SUPABASE_URL + "/auth/v1/user", {
    headers: { apikey: SUPABASE_PUBLIC_KEY, Authorization: "Bearer " + token },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) return null;
  const u = JSON.parse(res.getContentText());
  if (!u || !u.id || !u.phone || !u.phone_confirmed_at) return null;
  return { id: u.id, phone: "+" + String(u.phone).replace(/\D/g, "") };
}

function rateOk_(userId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const cache = CacheService.getScriptCache();
    const key = "ord_" + userId;
    const n = Number(cache.get(key) || 0);
    if (n >= ORDERS_PER_HOUR) return false;
    cache.put(key, String(n + 1), 3600);
    return true;
  } finally {
    lock.releaseLock();
  }
}

// ====================
// ОСНОВНАЯ ФУНКЦИЯ
// ====================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const user = verifiedUser_(data.access_token);
    if (!user) return reply_({ status: "error", code: "auth" });
    if (!rateOk_(user.id)) return reply_({ status: "error", code: "rate" });

    const items = Array.isArray(data.items) ? data.items.slice(0, 50) : [];
    if (!items.length) return reply_({ status: "error", code: "items" });

    let total = 0;
    const summary = items.map(function (i) {
      const q = Math.max(1, Math.min(99, Math.floor(Number(i.quantity) || 0)));
      const p = Math.max(0, Math.floor(Number(i.price) || 0));
      total += p * q;
      return clean_(i.name, 80) + " (" + clean_(i.color, 40) + ") ×" + q + " = " + (p * q).toLocaleString("ru-RU");
    }).join("; ");

    const order = {
      date: Utilities.formatDate(new Date(), "Asia/Tashkent", "dd.MM.yyyy HH:mm"),
      name: clean_(data.customer_name, 40) || "Не указано",
      phone: user.phone,
      address: clean_(data.address, 200) || "Не указан",
      comment: clean_(data.comment, 400) || "Нет",
      total: total.toLocaleString("ru-RU") + " сум",
      summary: summary
    };

    // Сохраняем в Google Sheets
    const book = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = book.getSheetByName("Orders PeltaNera");
    if (!sheet) {
      sheet = book.insertSheet("Orders PeltaNera");
      sheet.appendRow(["Дата и время", "Имя клиента", "Телефон", "Адрес", "Комментарий", "Итого", "Товары", "Статус"]);
    }
    sheet.appendRow([
      order.date,
      cell_(order.name),
      cell_(order.phone),
      cell_(order.address),
      cell_(order.comment),
      order.total,
      cell_(order.summary),
      "Новый"
    ]);

    // Сообщение в Telegram
    const message =
`🛍️ <b>НОВЫЙ ЗАКАЗ PELTA NERA</b>
━━━━━━━━━━━━━━━━━━

👤 <b>Клиент:</b> ${html_(order.name)}

📞 <b>Телефон:</b> ✅ подтверждён
${html_(order.phone)}

📍 <b>Адрес:</b>
${html_(order.address)}

💬 <b>Комментарий:</b>
${html_(order.comment)}

🛒 <b>Товары:</b>
${html_(order.summary)}

💰 <b>Итого:</b> ${html_(order.total)}

🕒 <b>Дата:</b> ${order.date}
━━━━━━━━━━━━━━━━━━
🔔 <i>Заказ создан автоматически</i>`;

    const response = UrlFetchApp.fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: "HTML" }),
        muteHttpExceptions: true
      }
    );
    const result = JSON.parse(response.getContentText());
    if (!result.ok) throw new Error("Telegram API error: " + result.description);

    return reply_({ status: "ok" });
  } catch (err) {
    Logger.log("Ошибка: " + err.toString());
    return reply_({ status: "error", code: "server" });
  }
}
