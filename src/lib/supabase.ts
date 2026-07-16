import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Product = {
  id: string;
  category: 'cardholder' | 'bag' | 'belt';
  name_ru: string;
  name_uz: string;
  name_en: string;
  desc_ru: string;
  desc_uz: string;
  desc_en: string;
  price: number;
  image_url: string;
  featured: boolean;
  created_at: string;
};

export type Profile = {
  id: string;
  phone: string;
  full_name: string | null;
};
