/*
  Pelta Nera — форма заказа: добавлен ник Telegram, адрес стал необязательным.
  Запустите в SQL Editor → Run. Можно запускать повторно.
*/
alter table public.pn_orders add column if not exists telegram text;
alter table public.pn_orders drop constraint if exists pn_orders_telegram_check;
alter table public.pn_orders add constraint pn_orders_telegram_check
  check (telegram is null or telegram ~ '^@[A-Za-z][A-Za-z0-9_]{3,30}[A-Za-z0-9]$');

alter table public.pn_orders alter column address drop not null;
alter table public.pn_orders drop constraint if exists pn_orders_address_check;
alter table public.pn_orders add constraint pn_orders_address_check
  check (address is null or char_length(address) between 3 and 200);

grant insert (telegram) on public.pn_orders to anon, authenticated;
