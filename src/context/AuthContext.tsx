import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { useLang } from './LangContext';
import type { Session } from '@supabase/supabase-js';

type AuthContextType = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (phone: string, password: string, name?: string) => Promise<{ error: string | null }>;
  signIn: (phone: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (name: string) => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function phoneToEmail(phone: string) {
  const digits = phone.replace(/[^0-9]/g, '');
  return `${digits}@peltanera.local`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { t } = useLang();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(uid: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    setProfile(data as Profile | null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        fetchProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess) {
        (async () => {
          await fetchProfile(sess.user.id);
        })();
      } else {
        setProfile(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function signUp(phone: string, password: string, name?: string) {
    const trimmed = phone.trim();
    if (trimmed.replace(/[^0-9]/g, '').length < 9) return { error: t('auth.error.phone') };
    if (password.length < 6) return { error: t('auth.error.weak') };

    const email = phoneToEmail(trimmed);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { phone: trimmed, full_name: name ?? '' } },
    });
    if (error) {
      if (error.message.toLowerCase().includes('already')) return { error: t('auth.error.exists') };
      return { error: t('auth.error.generic') };
    }
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        phone: trimmed,
        full_name: name ?? null,
      });
      await fetchProfile(data.user.id);
    }
    return { error: null };
  }

  async function signIn(phone: string, password: string) {
    const trimmed = phone.trim();
    const email = phoneToEmail(trimmed);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: t('auth.error.invalid') };
    if (data.user) await fetchProfile(data.user.id);
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  async function updateProfile(name: string) {
    if (!session) return { error: t('auth.error.generic') };
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name })
      .eq('id', session.user.id);
    if (error) return { error: t('auth.error.generic') };
    setProfile((p) => (p ? { ...p, full_name: name } : p));
    return { error: null };
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signUp, signIn, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
