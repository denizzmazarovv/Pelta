# Подключение Google Таблицы

Сайт отправляет в одну Google Таблицу четыре вида записей, каждый на свой лист:

| Что | Лист |
|---|---|
| Заказы из корзины | `Заказы` |
| Сообщения со страницы «Написать нам» | `Сообщения` |
| Регистрации клиентов | `Клиенты` |
| Подписки на рассылку | `Рассылка` |

Листы и заголовки столбцов создаются автоматически при первой записи.

## 1. Создайте таблицу и скрипт

1. Создайте новую Google Таблицу (например, «Pelta Nera — база»).
2. В меню: **Расширения → Apps Script**.
3. Удалите всё в редакторе и вставьте код ниже. Нажмите 💾 «Сохранить».

```javascript
const SHEETS = {
  order: 'Заказы',
  contact: 'Сообщения',
  register: 'Клиенты',
  newsletter: 'Рассылка',
};

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(e.postData.contents);
    const name = SHEETS[data.type];
    if (!name) return out({ ok: false, error: 'unknown type' });
    delete data.type;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(name) || ss.insertSheet(name);

    // Заголовки: берём существующие и добавляем новые поля в конец
    let headers = sheet.getLastColumn() > 0
      ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      : [];
    Object.keys(data).forEach((k) => { if (!headers.includes(k)) headers.push(k); });
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);

    const row = headers.map((h) => (data[h] === undefined ? '' : String(data[h]).slice(0, 2000)));
    sheet.appendRow(row);
    return out({ ok: true });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
```

## 2. Опубликуйте как веб-приложение

1. Справа вверху: **Начать развертывание → Новое развертывание**.
2. Тип (⚙️): **Веб-приложение**.
3. «Запуск от имени»: **Я**. «У кого есть доступ»: **Все**.
4. Нажмите **Начать развертывание**, разрешите доступ к своему аккаунту.
5. Скопируйте **URL веб-приложения** (заканчивается на `/exec`).

## 3. Вставьте ссылку на сайт

Откройте `src/lib/config.ts` и вставьте ссылку:

```ts
export const SHEET_URL: string =
  (import.meta.env.VITE_GOOGLE_SHEET_URL as string | undefined) || 'https://script.google.com/macros/s/…/exec';
```

Потом отправьте изменения на GitHub (`push.bat`).

> Если позже поменяете код скрипта, делайте **Управление развертываниями → ✏️ → Версия: новая**, тогда ссылка останется прежней.

## Важно про регистрацию

Регистрация работает без пароля: клиент оставляет имя, телефон, email и интересы, данные попадают на лист «Клиенты», а в браузере клиента сохраняются для быстрого оформления заказа. Пароли в Google Таблице хранить небезопасно, поэтому их здесь нет.
