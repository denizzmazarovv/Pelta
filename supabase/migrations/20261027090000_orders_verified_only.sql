/*
  Pelta Nera — заказы только от клиентов, подтвердивших номер через Telegram-бота.
  Запустите в SQL Editor → Run. Можно запускать повторно.

  - Анонимно добавить заказ больше нельзя.
  - Вошедший клиент может добавить заказ только со своим подтверждённым номером
    (номер берётся из профиля, а туда — из подтверждённого аккаунта).
*/
revoke insert on public.pn_orders from anon;
grant insert (name, phone, email, address, comment, items, total, lang, telegram) on public.pn_orders to authenticated;

drop policy if exists "insert_orders" on public.pn_orders;
create policy "insert_orders" on public.pn_orders for insert to authenticated
  with check (
    phone = (select p.phone from public.profiles p where p.id = (select auth.uid()))
  );
