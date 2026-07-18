/*
# Create profiles table for user account data

1. New Tables
- `profiles`
  - `id` (uuid, primary key) — matches the auth.users id
  - `email` (text, not null) — the user's sign-in email
  - `full_name` (text, nullable) — optional display name
  - `created_at` (timestamptz, default now())
2. Security
- Enable RLS on `profiles`.
- Owner-scoped CRUD: each authenticated user can only read/insert/update their own row (auth.uid() = id).
- No DELETE policy: profiles are managed via the service role / auth cascade, not by the client.
3. Notes
- The frontend inserts a profile row on first sign-in (when a session exists), so the
  INSERT policy is guarded by auth.uid() = id and works with the anon-key client that
  carries the user's session token.
- Email confirmation is expected to be enabled in the Supabase dashboard
  (Authentication -> Email -> Enable email confirmations). The frontend handles both
  confirmed and unconfirmed states gracefully.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
