import { useState } from 'react';
import { Send, Phone, MapPin, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useReveal } from '../hooks/useReveal';

export function Contact() {
  const { t } = useLang();
  const { ref, visible } = useReveal<HTMLDivElement>();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await new Promise((r) => setTimeout(r, 800));
    setBusy(false);
    setSent(true);
    (e.target as HTMLFormElement).reset();
    setTimeout(() => setSent(false), 5000);
  }

  return (
    <section id="contact" className="py-24 sm:py-32 bg-cream">
      <div ref={ref} className={`max-w-5xl mx-auto px-5 sm:px-8 reveal ${visible ? 'is-visible' : ''}`}>
        <div className="text-center mb-14">
          <p className="text-brand-500 text-sm uppercase tracking-[0.3em] mb-3">Pelta Nera</p>
          <h2 className="font-serif text-wine-900 text-4xl sm:text-5xl font-light mb-3">
            {t('contact.title')}
          </h2>
          <p className="text-wine-400 text-lg">{t('contact.subtitle')}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <ContactItem icon={<Phone size={20} />} label="+998 71 200 30 40" />
            <ContactItem icon={<Mail size={20} />} label="hello@peltanera.uz" />
            <ContactItem icon={<MapPin size={20} />} label="Tashkent, Amir Temur St. 12" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <input
              required
              placeholder={t('contact.name')}
              className="w-full bg-cream-50 border border-brand-200 rounded-xl px-4 py-3.5 outline-none focus:border-brand-500 transition-colors text-wine-900 placeholder-wine-300"
            />
            <input
              required
              type="tel"
              placeholder={t('contact.phone')}
              className="w-full bg-cream-50 border border-brand-200 rounded-xl px-4 py-3.5 outline-none focus:border-brand-500 transition-colors text-wine-900 placeholder-wine-300"
            />
            <textarea
              required
              rows={4}
              placeholder={t('contact.message')}
              className="w-full bg-cream-50 border border-brand-200 rounded-xl px-4 py-3.5 outline-none focus:border-brand-500 transition-colors text-wine-900 placeholder-wine-300 resize-none"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-cream py-3.5 rounded-xl font-medium transition-all hover:shadow-lg hover:shadow-brand-500/25 disabled:opacity-60"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : sent ? <CheckCircle2 size={18} /> : <Send size={18} />}
              {sent ? t('contact.sent') : t('contact.send')}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function ContactItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center text-brand-500 shrink-0">
        {icon}
      </div>
      <span className="text-wine-700 text-lg">{label}</span>
    </div>
  );
}
