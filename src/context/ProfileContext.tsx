import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import type { AuthError, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type Profile = {
  name: string;
  phone: string;
  email: string;
  prefs: string[]; // 'women' | 'men'
  marketing: boolean;
};

export type SignUpData = {
  email: string;
  password: string;
  name: string;
  phone: string;
  prefs: string[];
  marketing: boolean;
  captchaToken?: string;
};

type Result = { error: AuthError | Error | null };

type AuthContextType = {
  enabled: boolean;
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  registerOpen: boolean;
  openRegister: () => void;
  closeRegister: () => void;
  signUp: (d: SignUpData) => Promise<Result>;
  verifyEmail: (email: string, code: string) => Promise<Result>;
  resendSignup: (email: string, captchaToken?: string) => Promise<Result>;
  signIn: (email: string, password: string, captchaToken?: string) => Promise<Result>;
  requestReset: (email: string, captchaToken?: string) => Promise<Result>;
  verifyReset: (email: string, code: string) => Promise<Result>;
  setNewPassword: (password: string) => Promise<Result>;
  changePassword: (current: string, next: string) => Promise<Result>;
  updateProfile: (p: Pick<Profile, 'name' | 'phone' | 'prefs' | 'marketing'>) => Promise<Result>;
  signOut: (everywhere?: boolean) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);
const NOT_CONFIGURED = new Error('auth_not_configured');

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [registerOpen, setRegisterOpen] = useState(false);
  const openRegister = useCallback(() => setRegisterOpen(true), []);
  const closeRegister = useCallback(() => setRegisterOpen(false), []);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!supabase || !s) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('email, full_name, phone, prefs, marketing')
      .eq('id', s.user.id)
      .maybeSingle();
    setProfile({
      email: data?.email ?? s.user.email ?? '',
      name: data?.full_name ?? '',
      phone: data?.phone ?? '',
      prefs: data?.prefs ?? [],
      marketing: !!data?.marketing,
    });
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadProfile(data.session).finally(() => setReady(true));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      // Вызов Supabase внутри колбэка откладываем, чтобы не было взаимной блокировки
      setTimeout(() => loadProfile(s), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const value: AuthContextType = {
    enabled: !!supabase,
    ready,
    session,
    profile,
    registerOpen,
    openRegister,
    closeRegister,

    async signUp(d) {
      if (!supabase) return { error: NOT_CONFIGURED };
      const { error } = await supabase.auth.signUp({
        email: d.email,
        password: d.password,
        options: {
          captchaToken: d.captchaToken,
          data: { full_name: d.name, phone: d.phone, prefs: d.prefs, marketing: d.marketing },
        },
      });
      return { error };
    },

    async verifyEmail(email, code) {
      if (!supabase) return { error: NOT_CONFIGURED };
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
      return { error };
    },

    async resendSignup(email, captchaToken) {
      if (!supabase) return { error: NOT_CONFIGURED };
      const { error } = await supabase.auth.resend({ type: 'signup', email, options: { captchaToken } });
      return { error };
    },

    async signIn(email, password, captchaToken) {
      if (!supabase) return { error: NOT_CONFIGURED };
      const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
      return { error };
    },

    async requestReset(email, captchaToken) {
      if (!supabase) return { error: NOT_CONFIGURED };
      const { error } = await supabase.auth.resetPasswordForEmail(email, { captchaToken });
      return { error };
    },

    async verifyReset(email, code) {
      if (!supabase) return { error: NOT_CONFIGURED };
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
      return { error };
    },

    async setNewPassword(password) {
      if (!supabase) return { error: NOT_CONFIGURED };
      const { error } = await supabase.auth.updateUser({ password });
      return { error };
    },

    async changePassword(current, next) {
      if (!supabase || !session?.user.email) return { error: NOT_CONFIGURED };
      // Сначала проверяем текущий пароль — без него сменить нельзя
      const check = await supabase.auth.signInWithPassword({ email: session.user.email, password: current });
      if (check.error) return { error: check.error };
      const { error } = await supabase.auth.updateUser({ password: next });
      return { error };
    },

    async updateProfile(p) {
      if (!supabase || !session) return { error: NOT_CONFIGURED };
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: p.name || null, phone: p.phone || null, prefs: p.prefs, marketing: p.marketing })
        .eq('id', session.user.id);
      if (!error) await loadProfile(session);
      return { error: error ? new Error(error.message) : null };
    },

    async signOut(everywhere = false) {
      if (!supabase) return;
      await supabase.auth.signOut({ scope: everywhere ? 'global' : 'local' });
      setProfile(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
