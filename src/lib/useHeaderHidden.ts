import { useSyncExternalStore } from 'react';

/**
 * Общее состояние «шапка спрятана».
 * Прокрутка вниз — верхняя шапка уезжает, вторая секция остаётся.
 * Любая прокрутка вверх — показываем обе.
 */
let hidden = false;
let lastY = 0;
const listeners = new Set<() => void>();
const HIDE_AFTER = 60; // не прячем у самого верха страницы

function set(v: boolean) {
  if (v !== hidden) {
    hidden = v;
    listeners.forEach((l) => l());
  }
}

function onScroll() {
  const y = Math.max(0, window.scrollY);
  const dy = y - lastY;
  if (y <= HIDE_AFTER) set(false);
  else if (dy > 2) set(true);
  else if (dy < -2) set(false);
  lastY = y;
}

function subscribe(cb: () => void) {
  if (listeners.size === 0) {
    lastY = window.scrollY;
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) window.removeEventListener('scroll', onScroll);
  };
}

export function showHeader() {
  set(false);
}

export function useHeaderHidden(): boolean {
  return useSyncExternalStore(subscribe, () => hidden, () => false);
}
