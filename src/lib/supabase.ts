import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

/**
 * Клиент Supabase. Используется только публичный anon-ключ:
 * все данные защищены правилами RLS на стороне базы.
 * Никогда не вставляйте сюда service_role ключ.
 */
export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // Подтверждение и сброс пароля идут через код из письма, а не через ссылку
          detectSessionInUrl: false,
          storageKey: 'pelta_auth',
        },
      })
    : null;
