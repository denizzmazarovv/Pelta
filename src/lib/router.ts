import { useEffect, useState } from 'react';
import type { Category } from './products';
import { showHeader } from './useHeaderHidden';

export type Route =
  | { name: 'catalog'; category: Category | 'all' }
  | { name: 'product'; id: string }
  | { name: 'about' }
  | { name: 'contact' };

const CATS = ['cardholder', 'keychain', 'bag', 'belt'];

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'p' && parts[1]) return { name: 'product', id: parts[1] };
  if (parts[0] === 'c' && parts[1] && CATS.includes(parts[1]))
    return { name: 'catalog', category: parts[1] as Category };
  if (parts[0] === 'about') return { name: 'about' };
  if (parts[0] === 'contact') return { name: 'contact' };
  return { name: 'catalog', category: 'all' };
}

export const href = {
  home: '#/',
  category: (c: Category | 'all') => (c === 'all' ? '#/' : `#/c/${c}`),
  product: (id: string) => `#/p/${id}`,
  about: '#/about',
  contact: '#/contact',
};

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
      showHeader();
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
