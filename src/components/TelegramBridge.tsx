import { useEffect, useRef } from 'react';
import { useLang } from '../context/LangContext';
import { useProfile } from '../context/ProfileContext';
import { useCart } from '../context/CartContext';
import { href, navigate, type Route } from '../lib/router';
import { formatPrice } from '../lib/format';
import { haptic, inTelegram, setBackButton, setMainButton, startTelegramApp, telegramAppLogin } from '../lib/tgApp';

/**
 * Связка сайта с Telegram, когда сайт открыт как мини-приложение (кнопка «Магазин» в боте).
 * В обычном браузере ничего не делает.
 *  - вход без кода: если номер клиента уже подтверждён в боте и аккаунт есть — входим сразу;
 *  - кнопка «Назад» Telegram: закрывает открытую панель или возвращает на прошлую страницу;
 *  - кнопка Telegram внизу: «Корзина · 2 · 1 200 000 сум», когда в корзине есть товары;
 *  - лёгкая вибрация при добавлении товара.
 */
export function TelegramBridge({ route, menuOpen, closeMenu }: { route: Route; menuOpen: boolean; closeMenu: () => void }) {
  if (!inTelegram) return null;
  return <Bridge route={route} menuOpen={menuOpen} closeMenu={closeMenu} />;
}

function Bridge({ route, menuOpen, closeMenu }: { route: Route; menuOpen: boolean; closeMenu: () => void }) {
  const { t, lang } = useLang();
  const auth = useProfile();
  const cart = useCart();
  const tried = useRef(false);

  useEffect(() => startTelegramApp(), []);

  // Тихий вход при открытии (только для уже зарегистрированных клиентов)
  useEffect(() => {
    if (!auth.enabled || !auth.ready || auth.session || tried.current) return;
    tried.current = true;
    telegramAppLogin(false).then((r) => {
      if (r.status === 'ok') auth.applySession(r);
    });
  }, [auth]);

  // Кнопка «Назад»
  const isHome = route.name === 'catalog' && route.category === 'all';
  const drawer = menuOpen || cart.isOpen || auth.registerOpen;
  useEffect(() => {
    if (!drawer && isHome) return setBackButton(null);
    return setBackButton(() => {
      if (auth.registerOpen) auth.closeRegister();
      else if (cart.isOpen) cart.close();
      else if (menuOpen) closeMenu();
      else if (window.history.length > 1) window.history.back();
      else navigate(href.home);
    });
  }, [drawer, isHome, menuOpen, cart, auth, closeMenu]);

  // Кнопка корзины внизу
  useEffect(() => {
    if (drawer || cart.count === 0) return setMainButton(null);
    return setMainButton(`${t('nav.bag')} · ${cart.count} · ${formatPrice(cart.total, lang)}`, () => {
      haptic('light');
      cart.open();
    });
  }, [drawer, cart, t, lang]);
  useEffect(() => () => void setMainButton(null), []);

  // Вибрация, когда товар добавлен
  const prev = useRef(cart.count);
  useEffect(() => {
    if (cart.count > prev.current) haptic('success');
    prev.current = cart.count;
  }, [cart.count]);

  return null;
}
