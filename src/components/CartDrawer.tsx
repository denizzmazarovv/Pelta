import { useState, useEffect } from 'react';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowLeft, Loader as Loader2, CircleCheck as CheckCircle2, Phone } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLang } from '../context/LangContext';
import { sanitizeText, sanitizePhone, MAX_NAME, MAX_ADDRESS, MAX_COMMENT } from '../lib/sanitize';

// Google Apps Script Web App URL — replace with your deployment URL
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbwcTc8QsfEVx3440DozhVa7sbB5ZZRbgRN2iI2BMxCRuihZS72EZQCXfd1C_eZd7Nm7Jw/exec';

export function CartDrawer() {
  const { t, lang } = useLang();
  const { items, isOpen, close, remove, setQty, total, count, clear } = useCart();
  const [checkout, setCheckout] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '', comment: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setCheckout(false);
      setStatus('idle');
      setErrors({});
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  function name(p: typeof items[0]['product']) {
    return p[`name_${lang}`];
  }
  function colorLabel(p: typeof items[0]['product'], ci: number) {
    return t(p.colors[ci].colorKey);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!sanitizeText(form.name, MAX_NAME)) e.name = t('cart.error_name');
    if (!sanitizePhone(form.phone)) e.phone = t('cart.error_phone');
    if (!sanitizeText(form.address, MAX_ADDRESS)) e.address = t('cart.error_address');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submitOrder() {
    if (!validate()) return;
    setStatus('submitting');
    const cleanName = sanitizeText(form.name, MAX_NAME);
    const cleanPhone = sanitizePhone(form.phone);
    const cleanAddress = sanitizeText(form.address, MAX_ADDRESS);
    const cleanComment = sanitizeText(form.comment, MAX_COMMENT);
    const order = {
      timestamp: new Date().toISOString(),
      customer_name: cleanName,
      phone: cleanPhone,
      address: cleanAddress,
      comment: cleanComment,
      total,
      items: items.map((i) => ({
        id: i.product.id,
        name: name(i.product),
        color: colorLabel(i.product, i.colorIndex),
        quantity: i.quantity,
        price: i.product.price,
        subtotal: i.product.price * i.quantity,
      })),
      items_summary: items.map((i) => `${name(i.product)} (${colorLabel(i.product, i.colorIndex)}) ×${i.quantity} = ${i.product.price * i.quantity}`).join('; '),
    };

    try {
      await fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(order),
      });
      setStatus('success');
      clear();
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex justify-end h-[100dvh]">
      <div className="absolute inset-0 bg-wine-900/60 backdrop-blur-sm animate-fade-in" onClick={close} />

      <div className="relative w-full max-w-md bg-cream shadow-2xl flex flex-col animate-slide-in-right h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-brand-100" style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center gap-3">
            {checkout && (
              <button onClick={() => setCheckout(false)} className="text-wine-500 hover:text-wine-700 transition-colors">
                <ArrowLeft size={20} />
              </button>
            )}
            <h2 className="font-serif text-wine-900 text-2xl font-light flex items-center gap-2">
              <ShoppingBag size={22} className="text-brand-500" />
              {checkout ? t('cart.checkout') : t('cart.title')}
              {!checkout && count > 0 && (
                <span className="text-sm text-wine-400">({count} {t('cart.items')})</span>
              )}
            </h2>
          </div>
          <button onClick={close} className="text-wine-500 hover:text-wine-700 transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Success state */}
        {status === 'success' ? (
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
            <div className="w-20 h-20 rounded-full bg-wine-100 flex items-center justify-center mb-6">
              <CheckCircle2 size={40} className="text-wine-500" />
            </div>
            <p className="text-wine-700 text-lg font-medium mb-2">{t('cart.success')}</p>
            <button
              onClick={close}
              className="mt-6 px-8 py-3 bg-brand-500 text-cream rounded-lg font-medium hover:bg-brand-600 transition-colors"
            >
              OK
            </button>
          </div>
        ) : checkout ? (
          /* Checkout form */
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-5">
              <Field label={t('cart.name')} value={form.name} onChange={(v) => setForm({ ...form, name: sanitizeText(v, MAX_NAME) })} error={errors.name} />
              <div>
                <label className="block text-xs uppercase tracking-wider text-wine-400 mb-2">{t('cart.phone')}</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-wine-400" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: sanitizePhone(e.target.value) })}
                    className={`w-full pl-10 pr-4 py-3 bg-cream-50 border rounded-lg text-wine-800 placeholder-wine-300 focus:outline-none focus:ring-2 transition-all ${errors.phone ? 'border-wine-400 focus:ring-wine-400/20' : 'border-brand-200 focus:ring-brand-500/20'}`}
                    placeholder="+998 90 123 45 67"
                  />
                </div>
                {errors.phone && <p className="text-wine-500 text-xs mt-1">{errors.phone}</p>}
              </div>
              <Field label={t('cart.address')} value={form.address} onChange={(v) => setForm({ ...form, address: sanitizeText(v, MAX_ADDRESS) })} error={errors.address} />
              <div>
                <label className="block text-xs uppercase tracking-wider text-wine-400 mb-2">{t('cart.comment')}</label>
                <textarea
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: sanitizeText(e.target.value, MAX_COMMENT) })}
                  rows={3}
                  maxLength={MAX_COMMENT}
                  className="w-full px-4 py-3 bg-cream-50 border border-brand-200 rounded-lg text-wine-800 placeholder-wine-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all resize-none"
                />
              </div>

              {/* Order summary */}
              <div className="bg-brand-50 rounded-lg p-4 space-y-2">
                {items.map((i) => (
                  <div key={i.id} className="flex justify-between text-sm text-wine-600">
                    <span>{name(i.product)} ×{i.quantity}</span>
                    <span>{t('common.currency')}{i.product.price * i.quantity}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold text-wine-800 pt-2 border-t border-brand-200">
                  <span>{t('cart.total')}</span>
                  <span>{t('common.currency')}{total}</span>
                </div>
              </div>

              {status === 'error' && (
                <p className="text-wine-500 text-sm text-center">{t('cart.error')}</p>
              )}

              <button
                onClick={submitOrder}
                disabled={status === 'submitting'}
                className="w-full py-4 bg-brand-500 text-cream rounded-lg font-medium hover:bg-brand-600 transition-all hover:shadow-lg hover:shadow-brand-500/30 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {status === 'submitting' ? (
                  <><Loader2 size={18} className="animate-spin" /> {t('cart.submitting')}</>
                ) : (
                  t('cart.submit')
                )}
              </button>
            </div>
          </div>
        ) : items.length === 0 ? (
          /* Empty cart */
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
            <div className="w-20 h-20 rounded-full bg-brand-50 flex items-center justify-center mb-6">
              <ShoppingBag size={36} className="text-brand-300" />
            </div>
            <p className="text-wine-700 text-lg font-medium mb-1">{t('cart.empty')}</p>
            <p className="text-wine-400 text-sm">{t('cart.empty_hint')}</p>
            <button
              onClick={close}
              className="mt-6 px-8 py-3 bg-brand-500 text-cream rounded-lg font-medium hover:bg-brand-600 transition-colors"
            >
              {t('nav.catalog')}
            </button>
          </div>
        ) : (
          /* Cart items */
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {items.map((i) => (
                <div key={i.id} className="flex gap-4 bg-cream-50 rounded-lg p-3 border border-brand-100">
                  <img src={i.product.image} alt={name(i.product)} className="w-20 h-20 object-cover rounded-lg bg-brand-50 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif text-wine-900 text-base font-medium truncate">{name(i.product)}</h3>
                    <p className="text-wine-400 text-xs mb-2">{colorLabel(i.product, i.colorIndex)}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 bg-cream rounded-lg border border-brand-200">
                        <button onClick={() => setQty(i.id, i.quantity - 1)} className="w-7 h-7 flex items-center justify-center text-wine-500 hover:text-wine-700 transition-colors">
                          <Minus size={14} />
                        </button>
                        <span className="w-7 text-center text-sm font-medium text-wine-700">{i.quantity}</span>
                        <button onClick={() => setQty(i.id, i.quantity + 1)} className="w-7 h-7 flex items-center justify-center text-wine-500 hover:text-wine-700 transition-colors">
                          <Plus size={14} />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-brand-500 font-serif font-semibold">{t('common.currency')}{i.product.price * i.quantity}</span>
                        <button onClick={() => remove(i.id)} className="text-wine-300 hover:text-wine-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer with total + checkout */}
            <div className="border-t border-brand-100 px-6 py-5 space-y-4" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
              <div className="flex items-center justify-between">
                <span className="text-wine-400 text-sm uppercase tracking-wider">{t('cart.total')}</span>
                <span className="text-brand-500 text-3xl font-serif font-semibold">{t('common.currency')}{total}</span>
              </div>
              <button
                onClick={() => setCheckout(true)}
                className="w-full py-4 bg-brand-500 text-cream rounded-lg font-medium hover:bg-brand-600 transition-all hover:shadow-lg hover:shadow-brand-500/30"
              >
                {t('cart.checkout')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-wine-400 mb-2">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-4 py-3 bg-cream-50 border rounded-lg text-wine-800 placeholder-wine-300 focus:outline-none focus:ring-2 transition-all ${error ? 'border-wine-400 focus:ring-wine-400/20' : 'border-brand-200 focus:ring-brand-500/20'}`}
      />
      {error && <p className="text-wine-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
