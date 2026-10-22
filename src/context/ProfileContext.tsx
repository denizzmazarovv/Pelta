import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

export type Profile = {
  name: string;
  phone: string;
  email: string;
  prefs: string[]; // 'women' | 'men'
};

type ProfileContextType = {
  profile: Profile | null;
  save: (p: Profile) => void;
  signOut: () => void;
  registerOpen: boolean;
  openRegister: () => void;
  closeRegister: () => void;
};

const ProfileContext = createContext<ProfileContextType | null>(null);
const KEY = 'pelta_profile';

function load(): Profile | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(load);
  const [registerOpen, setRegisterOpen] = useState(false);
  const openRegister = useCallback(() => setRegisterOpen(true), []);
  const closeRegister = useCallback(() => setRegisterOpen(false), []);

  function save(p: Profile) {
    setProfile(p);
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  }

  function signOut() {
    setProfile(null);
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }

  return (
    <ProfileContext.Provider
      value={{
        profile,
        save,
        signOut,
        registerOpen,
        openRegister,
        closeRegister,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
