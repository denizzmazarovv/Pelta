/*
# Lock down products table write access

1. Security changes
- Drop the `auth_insert_products`, `auth_update_products`, and `auth_delete_products` policies from `products`.
- These policies used `WITH CHECK (true)` / `USING (true)` which allowed ANY authenticated user to insert, update, or delete any product row — effectively bypassing RLS.
- The `products` table is a public catalog: customers (authenticated or anon) only need SELECT. Product management (insert/update/delete) is done via the service role key, which bypasses RLS entirely, so no write policies are needed.
- The public SELECT policy (`public_read_products`) remains unchanged.
*/

DROP POLICY IF EXISTS "auth_insert_products" ON products;
DROP POLICY IF EXISTS "auth_update_products" ON products;
DROP POLICY IF EXISTS "auth_delete_products" ON products;
