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
// КЛИЕНТЫ: лист «Users PeltaNera» и уведомление о новом клиенте
// Supabase присылает только одноразовый ID события, данные скрипт забирает сам.
// ====================
const USERS_SHEET = "Users PeltaNera";
const USERS_HEADER = ["ID", "Дата регистрации", "Имя", "Номер", "Статус", "Код запрошен", "Подтверждён", "Интересы", "Рассылка"];
const NEWS_SHEET = "Newsletter PeltaNera";
const NEWS_HEADER = ["ID", "Дата подписки", "Email", "Интересы", "Язык"];

function prefsLabel_(p) {
  const a = Array.isArray(p) ? p : [];
  if (a.indexOf("women") >= 0 && a.indexOf("men") >= 0) return "Все";
  if (a.indexOf("women") >= 0) return "Женское";
  if (a.indexOf("men") >= 0) return "Мужское";
  return "";
}

// Лист с заголовком (заголовок обновляется, если добавились колонки)
function sheetWithHeader_(name, header) {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName(name);
  if (!sheet) {
    sheet = book.insertSheet(name);
    sheet.setFrozenRows(1);
  }
  const cur = sheet.getRange(1, 1, 1, header.length).getValues()[0];
  if (cur.join("|") !== header.join("|")) {
    sheet.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight("bold");
  }
  return sheet;
}

function handleNewsletter_(n) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = sheetWithHeader_(NEWS_SHEET, NEWS_HEADER);
    const id = String(n.id);
    const found = sheet.getRange("A:A").createTextFinder(id).matchEntireCell(true).findNext();
    const row = found ? found.getRow() : sheet.getLastRow() + 1;
    sheet.getRange(row, 1, 1, NEWS_HEADER.length).setValues([[
      id,
      fmt_(n.created_at),
      cell_(clean_(n.email, 120)),
      prefsLabel_(n.prefs),
      clean_(n.lang || "", 5).toUpperCase()
    ]]);
  } finally {
    lock.releaseLock();
  }
  return reply_({ status: "ok" });
}

function fmt_(iso) {
  return iso ? Utilities.formatDate(new Date(iso), "Asia/Tashkent", "dd.MM.yyyy HH:mm:ss") : "";
}

function takeUserEvent_(eventId) {
  // До 3 попыток: при одновременных событиях Supabase иногда отвечает ошибкой
  for (let i = 0; i < 3; i++) {
    const res = UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/rpc/pn_take_sheet_event", {
      method: "post",
      contentType: "application/json",
      headers: { apikey: SUPABASE_PUBLIC_KEY },
      payload: JSON.stringify({ p_id: eventId }),
      muteHttpExceptions: true
    });
    if (res.getResponseCode() === 200) {
      const u = JSON.parse(res.getContentText());
      return u && u.id ? u : null;
    }
    Logger.log("pn_take_sheet_event " + res.getResponseCode() + ": " + res.getContentText().slice(0, 200));
    Utilities.sleep(1000 * (i + 1));
  }
  return null;
}

function handleUserEvent_(eventId) {
  if (!/^[0-9a-f-]{36}$/i.test(String(eventId))) return reply_({ status: "error", code: "bad" });
  const u = takeUserEvent_(eventId);
  if (!u) return reply_({ status: "ignored" });
  if (u.kind === "newsletter") return handleNewsletter_(u);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let isNew = false;
  try {
    const sheet = sheetWithHeader_(USERS_SHEET, USERS_HEADER);
    const found = sheet.getRange("A:A").createTextFinder(u.id).matchEntireCell(true).findNext();
    const row = found ? found.getRow() : sheet.getLastRow() + 1;
    const old = found ? sheet.getRange(row, 1, 1, USERS_HEADER.length).getValues()[0] : [];
    const wasConfirmed = String(old[4] || "").indexOf("✅") === 0;

    const values = [
      u.id,
      fmt_(u.created_at),
      cell_(clean_(u.name || old[2] || "", 40)),
      cell_(u.phone || old[3] || ""),
      u.confirmed ? "✅ Подтверждён" : "⏳ Не подтверждён",
      fmt_(u.last_code_at) || old[5] || "",
      fmt_(u.confirmed_at) || old[6] || "",
      Array.isArray(u.prefs) ? prefsLabel_(u.prefs) : old[7] || "",
      typeof u.marketing === "boolean" ? (u.marketing ? "Да" : "Нет") : old[8] || ""
    ];
    sheet.getRange(row, 1, 1, values.length).setValues([values]);
    isNew = u.kind === "confirmed" && u.confirmed && !wasConfirmed;
  } finally {
    lock.releaseLock();
  }

  // Новый подтверждённый клиент — сообщение в канал
  if (isNew) {
    const text =
`🆕 <b>НОВЫЙ КЛИЕНТ PELTA NERA</b>
━━━━━━━━━━━━━━━━━━

📞 <b>Номер:</b> ${html_(u.phone || "")} ✅
🕒 <b>Регистрация:</b> ${fmt_(u.confirmed_at || u.created_at)}
🆔 <code>${html_(u.id)}</code>`;
    UrlFetchApp.fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ chat_id: CHAT_ID, text: text, parse_mode: "HTML" }),
      muteHttpExceptions: true
    });
  }
  return reply_({ status: "ok" });
}

// ====================
// ОСНОВНАЯ ФУНКЦИЯ
// ====================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Событие о клиенте от Supabase
    if (data.event_id) return handleUserEvent_(data.event_id);

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
      return clean_(i.name, 80) + " (" + clean_(i.color, 40) + ") ×" + q + " = " + (p * q).toLocaleString("ru-RU") + " USD";
    }).join("; ");

    const order = {
      date: Utilities.formatDate(new Date(), "Asia/Tashkent", "dd.MM.yyyy HH:mm"),
      name: clean_(data.customer_name, 40) || "Не указано",
      phone: user.phone,
      address: clean_(data.address, 200) || "Не указан",
      comment: clean_(data.comment, 400) || "Нет",
      total: total.toLocaleString("ru-RU") + " USD",
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
