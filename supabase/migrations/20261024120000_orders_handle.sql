/*
  Pelta Nera — поле «Telegram / Instagram»: необязательное, ник Telegram или Instagram.
  Запустите в SQL Editor → Run. Можно запускать повторно.
*/
alter table public.pn_orders add column if not exists telegram text;
alter table public.pn_orders drop constraint if exists pn_orders_telegram_check;
alter table public.pn_orders add constraint pn_orders_telegram_check
  check (telegram is null or telegram ~ '^@[A-Za-z0-9_](?:[A-Za-z0-9_]|\.(?!\.))*[A-Za-z0-9_]$' and char_length(telegram) <= 31);
