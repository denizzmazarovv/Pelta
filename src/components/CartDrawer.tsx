import { useEffect, useState, FormEvent } from 'react';
import { useCart } from '../context/CartContext';
import { useLang } from '../context/LangContext';
import { useProfile } from '../context/ProfileContext';
import { formatPrice } from '../lib/format';
import { href } from '../lib/router';
import {
  LIMITS,
  filterName,
  filterPhone,
  filterTelegram,
  filterText,
  finalText,
  normalizePhone,
  normalizeTelegram,
  validName,
} from '../lib/validate';
import { isRateLimited, RateLimitError, saveOrder } from '../lib/forms';
import { Field } from '../pages/ContactPage';
import { Mark } from './Logo';

export function CartDrawer() {
  const { t, lang } = useLang();
  const { items, isOpen, close, remove, setQty, total, count, clear } = useCart();
  const { profile, session } = useProfile();
  const [checkout, setCheckout] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', telegram: '', address: '', comment: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
      window.addEventListener('keydown', onKey);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', onKey);
      };
    }
    setCheckout(false);
    setStatus('idle');
    setErrors({});
  }, [isOpen, close]);

  // Подставляем данные зарегистрированного клиента
  useEffect(() => {
    if (checkout && profile) {
      setForm((f) => ({ ...f, name: f.name || filterName(profile.name), phone: f.phone || filterPhone(profile.phone) }));
    }
  }, [checkout, profile]);

  if (!isOpen) return null;

  const name = (p: (typeof items)[0]['product']) => p[`name_${lang}`];
  const colorLabel = (i: (typeof items)[0]) => t(i.product.colors[i.colorIndex].colorKey);

  function validate() {
    const e: Record<string, string> = {};
    if (!validName(form.name)) e.name = t('cart.error_name');
    if (!normalizePhone(form.phone)) e.phone = t('cart.error_phone');
    const tg = normalizeTelegram(form.telegram);
    if (!tg) e.telegram = t('cart.error_telegram');
    const addr = finalText(form.address, LIMITS.address);
    if (addr && addr.length < 3) e.address = t('cart.error_address');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submitOrder(ev: FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    if (isRateLimited('order')) return setErrors({ form: t('common.rate_limit') });
    setStatus('submitting');
    setErrors({});
    try {
      const tg = normalizeTelegram(form.telegram) ?? '';
      const comment = finalText(form.comment, LIMITS.comment);
      await saveOrder({
        name: form.name.trim(),
        phone: normalizePhone(form.phone) ?? '',
        telegram: tg,
        email: session?.user.email ?? '',
        address: finalText(form.address, LIMITS.address),
        comment,
        total,
        userId: session?.user.id,
        items: items.map((i) => ({
          id: i.product.id,
          name: name(i.product),
          color: colorLabel(i),
          quantity: i.quantity,
          price: i.product.price,
        })),
        lang,
      });
      setStatus('success');
      clear();
    } catch (err) {
      setStatus('idle');
      setErrors({ form: err instanceof RateLimitError ? t('common.rate_limit') : t('cart.error') });
    }
  }


  return (
    <div className="fixed inset-0 z-[110] flex justify-end" role="dialog" aria-modal="true" aria-label={t('cart.title')}>
      <div className="absolute inset-0 bg-white/30 backdrop-blur-[10px] animate-fade-in" onClick={close} />

      <aside className="relative w-full sm:w-[440px] h-full bg-white flex flex-col animate-slide-right border-l border-ink/10 pt-safe">
        <div className="h-header shrink-0 flex items-center justify-between px-5 border-b border-ink/10">
          <div className="flex items-center gap-3 nav-caps">
            {checkout && status !== 'success' && (
              <button onClick={() => setCheckout(false)} className="link-u">
                ← {t('cart.back')}
              </button>
            )}
            {!checkout && (
              <span>
                {t('cart.title')} ({count})
              </span>
            )}
          </div>
          <button
            onClick={close}
            className="w-9 h-9 flex items-center justify-center hover:rotate-45 transition-transform duration-300"
            aria-label={t('common.close')}
          >
            <Mark size={20} />
          </button>
        </div>

        {status === 'success' ? (
          <div className="flex-1 flex flex-col justify-center px-8">
            <Mark size={30} />
            <h2 className="font-mono text-[20px] mt-8">{t('cart.success_title')}</h2>
            <p className="font-mono text-[13px] text-ink/70 mt-4 leading-[1.7]">{t('cart.success')}</p>
            <button onClick={close} className="btn-ink mt-10">
              OK
            </button>
          </div>
        ) : checkout ? (
          <form onSubmit={submitOrder} noValidate className="flex-1 overflow-y-auto px-5 py-8 space-y-7">
            <h2 className="nav-caps text-[19px]">{t('cart.checkout')}</h2>
            <Field label={t('cart.name')} error={errors.name}>
              <input
                className="field"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: filterName(e.target.value) })}
                maxLength={LIMITS.name}
                autoComplete="name"
              />
            </Field>
            <Field label={t('cart.phone')} error={errors.phone}>
              <input
                className="field"
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: filterPhone(e.target.value) })}
                placeholder="+998 90 999 77 88"
                maxLength={20}
                autoComplete="tel"
              />
            </Field>
            <Field label={t('cart.telegram')} error={errors.telegram}>
              <input
                className="field"
                value={form.telegram}
                onChange={(e) => setForm({ ...form, telegram: filterTelegram(e.target.value) })}
                placeholder="@username"
                maxLength={LIMITS.telegram}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </Field>
            <Field label={t('cart.address')} error={errors.address}>
              <input
                className="field"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: filterText(e.target.value, LIMITS.address) })}
                maxLength={LIMITS.address}
                autoComplete="street-address"
              />
            </Field>
            <Field label={t('cart.comment')}>
              <textarea
                className="field h-auto py-2 resize-none"
                rows={3}
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: filterText(e.target.value, LIMITS.comment) })}
                maxLength={LIMITS.comment}
              />
            </Field>

            <div className="bg-fog p-4 font-mono text-[12px] space-y-1.5">
              {items.map((i) => (
                <div key={i.id} className="flex justify-between gap-4">
                  <span>
                    {name(i.product)} ×{i.quantity}
                  </span>
                  <span className="whitespace-nowrap">{formatPrice(i.product.price * i.quantity, lang)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 mt-2 border-t border-ink/20 text-[13px] font-medium">
                <span>{t('cart.total')}</span>
                <span>{formatPrice(total, lang)}</span>
              </div>
            </div>

            {errors.form && <p className="font-mono text-[12px] text-red-700">{errors.form}</p>}
            <button type="submit" disabled={status === 'submitting'} className="btn-ink">
              {status === 'submitting' ? t('cart.submitting') : t('cart.submit')}
            </button>
          </form>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center px-8">
            <p className="font-mono text-[14px]">{t('cart.empty')}</p>
            <a href={href.home} onClick={close} className="btn-line mt-8">
              {t('cart.continue')}
            </a>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto divide-y divide-ink/10">
              {items.map((i) => (
                <li key={i.id} className="flex gap-4 p-5">
                  <a href={href.product(i.product.id)} onClick={close} className="shrink-0">
                    <img src={i.product.image} alt={name(i.product)} className="w-[84px] aspect-[4/5] object-cover bg-smoke" />
                  </a>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <p className="font-display uppercase text-[14px] leading-tight">{name(i.product)}</p>
                    <p className="font-mono text-[11px] text-ink/60 mt-1">{colorLabel(i)}</p>
                    <p className="font-mono text-[12px] mt-1">{formatPrice(i.product.price * i.quantity, lang)}</p>
                    <div className="mt-auto pt-3 flex items-center justify-between">
                      <div className="flex items-center border border-ink/30 font-mono text-[12px]">
                        <button onClick={() => setQty(i.id, i.quantity - 1)} className="w-7 h-7 hover:bg-fog" aria-label="−">
                          −
                        </button>
                        <span className="w-7 text-center">{i.quantity}</span>
                        <button onClick={() => setQty(i.id, i.quantity + 1)} className="w-7 h-7 hover:bg-fog" aria-label="+">
                          +
                        </button>
                      </div>
                      <button onClick={() => remove(i.id)} className="font-mono text-[11px] text-ink/60 link-u">
                        {t('cart.remove')}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-ink/10 px-5 pt-4 pb-safe space-y-4 shrink-0">
              <div className="flex items-baseline justify-between">
                <span className="nav-caps">{t('cart.total')}</span>
                <span className="font-mono text-[15px]">{formatPrice(total, lang)}</span>
              </div>
              <button onClick={() => setCheckout(true)} className="btn-ink">
                {t('cart.checkout')}
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
