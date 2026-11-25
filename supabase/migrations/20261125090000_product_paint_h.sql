/*
  Pelta Nera — новый товар: кардхолдер Paint H (ch-03), 666 000 сум (25.11.2026).
  Запустите целиком: SQL Editor → New query → вставить → Run. Можно запускать повторно.
  Без этой строки товар виден на сайте, но заказ на него база не примет.
*/
insert into public.pn_products (id, price) values ('ch-03', 666000)
on conflict (id) do nothing;
