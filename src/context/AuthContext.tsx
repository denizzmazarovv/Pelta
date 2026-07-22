import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { useLang } from './LangContext';
import { sanitizeEmail, sanitizeText, MAX_NAME, MAX_PASSWORD_MIN } from '../lib/sanitize';
import type { Session } from '@supabase/supabase-js';

type AuthContextType = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  emailConfirmed: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null; needsConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation?: boolean }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  resendOtp: (email: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (name: string) => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { t } = useLang();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailConfirmed, setEmailConfirmed] = useState(true);

  async function fetchProfile(uid: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    setProfile(data as Profile | null);
  }

  async function ensureProfile(uid: string, email: string, name?: string) {
    const { data: existing } = await supabase.from('profiles').select('id').eq('id', uid).maybeSingle();
    if (!existing) {
      await supabase.from('profiles').insert({ id: uid, email, full_name: name ?? null });
    }
    await fetchProfile(uid);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setEmailConfirmed(data.session?.user?.email_confirmed_at != null);
      if (data.session) {
        ensureProfile(data.session.user.id, data.session.user.email ?? '', undefined).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setEmailConfirmed(sess?.user?.email_confirmed_at != null);
      if (sess) {
        (async () => {
          await ensureProfile(sess.user.id, sess.user.email ?? '', undefined);
        })();
      } else {
        setProfile(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function signUp(email: string, password: string, name: string) {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return { error: t('auth.error.email') };
    if (password.length < 6) return { error: t('auth.error.weak') };
    if (!name.trim()) return { error: t('auth.name.required') };

    const { data, error } = await supabase.auth.signUp({
      email: trimmed,
      password,
      options: { data: { full_name: name.trim() } },
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('already') || msg.includes('registered')) return { error: t('auth.error.exists') };
      if (msg.includes('password')) return { error: error.message };
      return { error: error.message };
    }
    if (data.user && !data.session) {
      return { error: null, needsConfirmation: true };
    }
    if (data.user && data.session) {
      await ensureProfile(data.user.id, cleanEmail, cleanName);
    }
    return { error: null, needsConfirmation: false };
  }

  async function verifyOtp(email: string, token: string) {
    const cleanEmail = sanitizeEmail(email);
    if (!cleanEmail) return { error: t('auth.error.email') };
    const cleanToken = sanitizeDigits(token, 6);
    if (cleanToken.length !== 6) return { error: t('auth.code.error') };
    const { data, error } = await supabase.auth.verifyOtp({ email: cleanEmail, token: cleanToken, type: 'signup' });
    if (error) return { error: t('auth.code.error') };
    if (data.user) await ensureProfile(data.user.id, cleanEmail, undefined);
    return { error: null };
  }

  async function resendOtp(email: string) {
    const cleanEmail = sanitizeEmail(email);
    if (!cleanEmail) return { error: t('auth.error.email') };
    const { error } = await supabase.auth.resend({ type: 'signup', email: cleanEmail });
    if (error) return { error: t('auth.error.generic') };
    return { error: null };
  }

  async function signIn(email: string, password: string) {
    const cleanEmail = sanitizeEmail(email);
    if (!cleanEmail) return { error: t('auth.error.email') };
    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('email not confirmed')) return { error: t('auth.error.unconfirmed'), needsConfirmation: true };
      return { error: t('auth.error.invalid') };
    }
    if (data.user) await ensureProfile(data.user.id, cleanEmail, undefined);
    return { error: null };
  }

  async function resetPassword(email: string) {
    const cleanEmail = sanitizeEmail(email);
    if (!cleanEmail) return { error: t('auth.error.email') };
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: window.location.origin,
    });
    if (error) return { error: t('auth.error.generic') };
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  async function updateProfile(name: string) {
    if (!session) return { error: t('auth.error.generic') };
    const cleanName = sanitizeText(name, MAX_NAME);
    if (!cleanName) return { error: t('auth.name.required') };
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: cleanName })
      .eq('id', session.user.id);
    if (error) return { error: t('auth.error.generic') };
    setProfile((p) => (p ? { ...p, full_name: cleanName } : p));
    return { error: null };
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, emailConfirmed, signUp, signIn, verifyOtp, resendOtp, resetPassword, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
