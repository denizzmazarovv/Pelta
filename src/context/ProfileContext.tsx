import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import type { AuthError, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { isNonce, saveNonce } from '../lib/telegramLogin';

/**
 * Аккаунт клиента. Вход и регистрация — только по номеру телефона:
 * код приходит в Telegram (наш Telegram-бот через Supabase Send SMS Hook).
 * Паролей нет.
 */
export type Profile = {
  name: string;
  phone: string; // подтверждённый номер, +998XXXXXXXXX
  prefs: string[]; // 'women' | 'men'
  marketing: boolean;
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
  /** Отправить код в Telegram. Новый номер = регистрация, существующий = вход. */
  sendCode: (phoneE164: string, captchaToken?: string) => Promise<Result>;
  verifyCode: (phoneE164: string, code: string) => Promise<Result>;
  /** Сессия, полученная после подтверждения входа в Telegram-боте. */
  applySession: (tokens: { access_token: string; refresh_token: string }) => Promise<Result>;
  updateProfile: (p: Pick<Profile, 'name' | 'prefs' | 'marketing'>) => Promise<Result>;
  signOut: (everywhere?: boolean) => Promise<void>;
  /** Короткое уведомление внизу экрана (например, «Сохранено»). */
  flash: (message: string) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);
const NOT_CONFIGURED = new Error('auth_not_configured');

const plusPhone = (p?: string | null) => (p ? '+' + p.replace(/\D/g, '') : '');

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const flash = useCallback((text: string) => setToast({ id: Date.now(), text }), []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);
  const openRegister = useCallback(() => setRegisterOpen(true), []);

  // Ссылка #/login (кнопка «Вернуться на сайт» в боте) сразу открывает вход.
  // #/login?tg=<ключ> — вход уже подтверждён в боте, панель сама завершит его.
  useEffect(() => {
    const check = () => {
      const h = window.location.hash.replace(/^#\/?/, '');
      if (h.split(/[/?]/)[0] !== 'login') return;
      const tg = new URLSearchParams(h.split('?')[1] ?? '').get('tg');
      if (isNonce(tg)) saveNonce(tg);
      history.replaceState(null, '', '#/');
      setRegisterOpen(true);
    };
    check();
    window.addEventListener('hashchange', check);
    return () => window.removeEventListener('hashchange', check);
  }, []);
  const closeRegister = useCallback(() => setRegisterOpen(false), []);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!supabase || !s) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('full_name, prefs, marketing')
      .eq('id', s.user.id)
      .maybeSingle();
    setProfile({
      name: data?.full_name ?? '',
      phone: plusPhone(s.user.phone),
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
    flash,

    async sendCode(phone, captchaToken) {
      if (!supabase) return { error: NOT_CONFIGURED };
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: { channel: 'sms', shouldCreateUser: true, captchaToken },
      });
      return { error };
    },

    async verifyCode(phone, code) {
      if (!supabase) return { error: NOT_CONFIGURED };
      const { error } = await supabase.auth.verifyOtp({ phone, token: code, type: 'sms' });
      return { error };
    },

    async applySession(tokens) {
      if (!supabase) return { error: NOT_CONFIGURED };
      const { error } = await supabase.auth.setSession(tokens);
      return { error };
    },

    async updateProfile(p) {
      if (!supabase || !session) return { error: NOT_CONFIGURED };
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: p.name || null, prefs: p.prefs, marketing: p.marketing })
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

  return (
    <AuthContext.Provider value={value}>
      {children}
      {toast && (
        <div
          key={toast.id}
          role="status"
          className="fixed z-[130] left-1/2 -translate-x-1/2 bottom-[max(24px,env(safe-area-inset-bottom))] px-5 h-11 flex items-center gap-2 rounded-full bg-ink text-white font-mono text-[13px] shadow-lg animate-fade-in"
        >
          <span aria-hidden="true">✓</span>
          {toast.text}
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
