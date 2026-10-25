// ====================
// PELTA NERA — заказы, клиенты, рассылка, роли
// Заказ принимается только от клиента, вошедшего на сайт по номеру телефона.
// Цены, скидка уровня и номер заказа считает база Supabase (pn_create_order).
// Роль клиента (колонка «Роль») и статус заказа (колонка «Статус») отсюда передаются
// в базу с секретным ключом скрипта — с сайта их изменить нельзя.
// ====================
const SUPABASE_URL = "https://misuvgnzuustjptkvsvx.supabase.co";
// Публичный ключ (тот же, что в коде сайта). Секретный ключ сюда НЕ вставлять.
const SUPABASE_PUBLIC_KEY = "sb_publishable_eBcdReBCxn6JwNoAQw8BKg_eb4JoXRA";
const ORDERS_PER_HOUR = 5;

const ORDERS_SHEET = "Orders PeltaNera";
const ORDERS_HEADER = ["Дата и время", "Имя клиента", "Телефон", "Адрес", "Комментарий", "Итого", "Товары", "Статус", "ID"];
const ORDER_STATUSES = ["Новый", "Подтверждён", "Отправлен", "Выполнен", "Отменён"];

const USERS_SHEET = "Users PeltaNera";
const USERS_HEADER = ["ID", "Дата регистрации", "Имя", "Номер", "Статус", "Подтверждён", "Роль", "Уровень", "Покупок", "Код запрошен", "Интересы", "Рассылка"];
const ROLES = ["VIP", "CEO"];

// Ссылки на закрытые Telegram-каналы ролей: вставляете в колонку «Ссылка на закрытый канал»
const ROLES_SHEET = "Roles PeltaNera";
const ROLES_HEADER = ["Роль", "Ссылка на закрытый канал", "Скидка %"];

const NEWS_SHEET = "Newsletter PeltaNera";
const NEWS_HEADER = ["ID", "Дата подписки", "Email", "Интересы", "Язык"];

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

function fmt_(iso) {
  return iso ? Utilities.formatDate(new Date(iso), "Asia/Tashkent", "dd.MM.yyyy HH:mm:ss") : "";
}

function prefsLabel_(p) {
  const a = Array.isArray(p) ? p : [];
  if (a.indexOf("women") >= 0 && a.indexOf("men") >= 0) return "Все";
  if (a.indexOf("women") >= 0) return "Женское";
  if (a.indexOf("men") >= 0) return "Мужское";
  return "";
}

// Вызов функции Supabase. token — вход клиента (для заказа), иначе публичный доступ.
function rpc_(name, payload, token) {
  const headers = { apikey: SUPABASE_PUBLIC_KEY };
  if (token) headers.Authorization = "Bearer " + token;
  const res = UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/rpc/" + name, {
    method: "post",
    contentType: "application/json",
    headers: headers,
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  let body = null;
  try { body = JSON.parse(res.getContentText()); } catch (err) { body = null; }
  return { code: res.getResponseCode(), body: body };
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

// Лист с нужными колонками. Если колонки поменялись — данные переставляются по названиям.
function sheetWithHeader_(name, header) {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName(name);
  if (!sheet) {
    sheet = book.insertSheet(name);
    sheet.setFrozenRows(1);
  }
  const width = Math.max(sheet.getLastColumn(), 1);
  const cur = sheet.getRange(1, 1, 1, width).getValues()[0].map(String);
  if (cur.slice(0, header.length).join("|") === header.join("|") && cur.length <= header.length) return sheet;

  const last = sheet.getLastRow();
  if (last > 1 && cur.some(Boolean)) {
    const data = sheet.getRange(2, 1, last - 1, width).getValues();
    const idx = header.map(function (h) { return cur.indexOf(h); });
    const moved = data.map(function (r) { return idx.map(function (i) { return i >= 0 ? r[i] : ""; }); });
    sheet.getRange(2, 1, last - 1, width).clearContent();
    sheet.getRange(2, 1, moved.length, header.length).setValues(moved);
  }
  if (width > header.length) sheet.getRange(1, header.length + 1, 1, width - header.length).clearContent();
  sheet.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight("bold");
  return sheet;
}

// ====================
// КЛИЕНТЫ И РАССЫЛКА: Supabase присылает одноразовый ID события, данные скрипт забирает сам
// ====================
function takeUserEvent_(eventId) {
  // До 3 попыток: при одновременных событиях Supabase иногда отвечает ошибкой
  for (let i = 0; i < 3; i++) {
    const r = rpc_("pn_take_sheet_event", { p_id: eventId });
    if (r.code === 200) return r.body && r.body.id ? r.body : null;
    Logger.log("pn_take_sheet_event " + r.code);
    Utilities.sleep(1000 * (i + 1));
  }
  return null;
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
    const col = function (h) { return USERS_HEADER.indexOf(h); };
    const found = sheet.getRange("A:A").createTextFinder(u.id).matchEntireCell(true).findNext();
    const row = found ? found.getRow() : sheet.getLastRow() + 1;
    const old = found ? sheet.getRange(row, 1, 1, USERS_HEADER.length).getValues()[0] : [];
    const wasConfirmed = String(old[col("Статус")] || "").indexOf("✅") === 0;

    const values = [
      u.id,
      fmt_(u.created_at),
      cell_(clean_(u.name || old[col("Имя")] || "", 40)),
      cell_(u.phone || old[col("Номер")] || ""),
      u.confirmed ? "✅ Подтверждён" : "⏳ Не подтверждён",
      fmt_(u.confirmed_at) || old[col("Подтверждён")] || "",
      u.role ? String(u.role).toUpperCase() : "",
      u.level || "",
      typeof u.done_orders === "number" ? u.done_orders : old[col("Покупок")] || 0,
      fmt_(u.last_code_at) || old[col("Код запрошен")] || "",
      Array.isArray(u.prefs) ? prefsLabel_(u.prefs) : old[col("Интересы")] || "",
      typeof u.marketing === "boolean" ? (u.marketing ? "Да" : "Нет") : old[col("Рассылка")] || ""
    ];
    sheet.getRange(row, 1, 1, values.length).setValues([values]);
    sheet.getRange(row, col("Роль") + 1).setNote("").setBackground(null);
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
// РОЛИ И СТАТУСЫ ЗАКАЗОВ ИЗ ТАБЛИЦЫ (срабатывает при ручном изменении ячейки)
// ====================
function adminKey_() {
  return PropertiesService.getScriptProperties().getProperty("SHEET_ADMIN_KEY");
}

function onSheetEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  const name = sheet.getName();
  const key = adminKey_();
  if (!key || (name !== USERS_SHEET && name !== ORDERS_SHEET && name !== ROLES_SHEET)) return;

  if (name === ROLES_SHEET) {
    if (e.range.getColumn() > 2 || e.range.getLastColumn() < 2) return;
    for (let row = Math.max(2, e.range.getRow()); row <= e.range.getLastRow(); row++) {
      const role = String(sheet.getRange(row, 1).getValue() || "").trim();
      const target = sheet.getRange(row, 2);
      if (!role) continue;
      const r = rpc_("pn_sheet_set_link", { p_key: key, p_role: role, p_url: String(target.getValue() || "").trim() });
      if (r.code === 200 && r.body === "ok") target.setNote("").setBackground(null);
      else target.setNote("Не сохранено: " + (r.code === 200 ? r.body : "ошибка " + r.code) + " (нужна ссылка вида https://t.me/+...)").setBackground("#f4cccc");
    }
    return;
  }

  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const isUsers = name === USERS_SHEET;
  const col = header.indexOf(isUsers ? "Роль" : "Статус") + 1;
  const idCol = isUsers ? 1 : header.indexOf("ID") + 1;
  if (col < 1 || idCol < 1 || col < e.range.getColumn() || col > e.range.getLastColumn()) return;

  for (let row = Math.max(2, e.range.getRow()); row <= e.range.getLastRow(); row++) {
    const id = String(sheet.getRange(row, idCol).getValue() || "").trim();
    const target = sheet.getRange(row, col);
    if (!id) continue;
    const value = String(target.getValue() || "").trim();
    const r = isUsers
      ? rpc_("pn_sheet_set_role", { p_key: key, p_user: id, p_role: value })
      : rpc_("pn_sheet_set_order_status", { p_key: key, p_order: Number(id), p_status: value });
    if (r.code === 200 && r.body === "ok") {
      target.setNote("").setBackground(null);
    } else {
      target.setNote("Не сохранено: " + (r.code === 200 ? r.body : "ошибка " + r.code)).setBackground("#f4cccc");
    }
  }
}

// Один раз: Выполнить → setupPeltaAdmin. Создаёт секретный ключ скрипта (его не видит никто),
// регистрирует его хеш в Supabase, включает реакцию на правки и выпадающие списки.
function setupPeltaAdmin() {
  const props = PropertiesService.getScriptProperties();
  let key = props.getProperty("SHEET_ADMIN_KEY");
  if (!key) {
    key = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
    props.setProperty("SHEET_ADMIN_KEY", key);
  }
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, key, Utilities.Charset.UTF_8)
    .map(function (b) { return ((b + 256) % 256).toString(16).padStart(2, "0"); }).join("");
  const reg = rpc_("pn_sheet_register_key", { p_hash: hash });
  const check = rpc_("pn_sheet_set_role", { p_key: key, p_user: "00000000-0000-0000-0000-000000000000", p_role: "" });
  Logger.log("Регистрация ключа: " + JSON.stringify(reg.body) + " (true — новый, false — уже был)");
  Logger.log("Проверка ключа: " + JSON.stringify(check.body) + " (no_user — ключ принят, bad_key — НЕ принят)");

  const book = SpreadsheetApp.getActiveSpreadsheet();
  const exists = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === "onSheetEdit"; });
  if (!exists) ScriptApp.newTrigger("onSheetEdit").forSpreadsheet(book).onEdit().create();

  const users = sheetWithHeader_(USERS_SHEET, USERS_HEADER);
  users.getRange(2, USERS_HEADER.indexOf("Роль") + 1, Math.max(users.getMaxRows() - 1, 1), 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(ROLES, true).setAllowInvalid(false).build());
  // Лист ролей: заполняем из базы текущими ссылками
  const roles = sheetWithHeader_(ROLES_SHEET, ROLES_HEADER);
  const current = rpc_("pn_sheet_get_roles", { p_key: key }).body;
  if (Array.isArray(current) && current.length) {
    roles.getRange(2, 1, current.length, ROLES_HEADER.length).setValues(current.map(function (r) {
      return [String(r.code).toUpperCase(), r.url || "", Number(r.discount) || 0];
    }));
    roles.getRange(2, 1, current.length, 1).setFontWeight("bold");
    roles.getRange(2, 3, current.length, 1).setNote("Скидка меняется в Supabase: таблица pn_tiers, колонка discount_pct");
  }

  const orders = sheetWithHeader_(ORDERS_SHEET, ORDERS_HEADER);
  orders.getRange(2, ORDERS_HEADER.indexOf("Статус") + 1, Math.max(orders.getMaxRows() - 1, 1), 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(ORDER_STATUSES, true).setAllowInvalid(false).build());
  Logger.log("Готово");
}

// ====================
// ОСНОВНАЯ ФУНКЦИЯ: заказы с сайта и события от Supabase
// ====================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Событие о клиенте или подписчике от Supabase
    if (data.event_id) return handleUserEvent_(data.event_id);

    const user = verifiedUser_(data.access_token);
    if (!user) return reply_({ status: "error", code: "auth" });
    if (!rateOk_(user.id)) return reply_({ status: "error", code: "rate" });

    const items = Array.isArray(data.items) ? data.items.slice(0, 50) : [];
    if (!items.length) return reply_({ status: "error", code: "items" });

    // Заказ создаёт база: проверяет вход и доступ к товарам, считает цены и скидку
    const r = rpc_("pn_create_order", { p: {
      items: items.map(function (i) {
        return { id: clean_(i.id, 40), quantity: Number(i.quantity) || 1, color: clean_(i.color, 40), name: clean_(i.name, 80) };
      }),
      address: clean_(data.address, 200),
      comment: clean_(data.comment, 480),
      telegram: clean_(data.telegram, 31),
      lang: clean_(data.lang, 2)
    } }, data.access_token);
    if (r.code !== 200) {
      const msg = String((r.body && r.body.message) || "");
      const code = /rate_limited/.test(msg) ? "rate"
        : /auth_required|phone_not_confirmed/.test(msg) ? "auth"
        : /name_required/.test(msg) ? "name"
        : /item_unavailable|items_invalid/.test(msg) ? "items" : "server";
      return reply_({ status: "error", code: code });
    }
    const ord = r.body;
    const disc = Number(ord.discount_pct) || 0;
    const summary = (ord.lines || []).map(function (l) {
      return clean_(l.name, 80) + (l.color ? " (" + clean_(l.color, 40) + ")" : "") + " ×" + l.quantity + " = " +
        Number(l.line_total).toLocaleString("ru-RU") + " USD";
    }).join("; ");
    const order = {
      id: ord.id,
      date: Utilities.formatDate(new Date(), "Asia/Tashkent", "dd.MM.yyyy HH:mm"),
      name: clean_(ord.name, 40),
      phone: ord.phone,
      address: clean_(data.address, 200) || "Не указан",
      comment: clean_(data.comment, 400) || "Нет",
      total: Number(ord.total).toLocaleString("ru-RU") + " USD" + (disc ? " (скидка " + disc + "%, " + String(ord.tier).toUpperCase() + ")" : ""),
      summary: summary
    };

    // Сохраняем в Google Sheets
    const sheet = sheetWithHeader_(ORDERS_SHEET, ORDERS_HEADER);
    sheet.appendRow([
      order.date,
      cell_(order.name),
      cell_(order.phone),
      cell_(order.address),
      cell_(order.comment),
      order.total,
      cell_(order.summary),
      "Новый",
      order.id
    ]);

    // Сообщение в Telegram
    const message =
`🛍️ <b>НОВЫЙ ЗАКАЗ PELTA NERA №${order.id}</b>
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
🔔 <i>Статус меняйте в таблице (колонка «Статус»): «Выполнен» засчитывает покупку клиенту</i>`;

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
    if (!result.ok) Logger.log("Telegram API error: " + result.description);

    return reply_({ status: "ok", id: order.id, total: ord.total });
  } catch (err) {
    Logger.log("Ошибка: " + err.toString());
    return reply_({ status: "error", code: "server" });
  }
}
