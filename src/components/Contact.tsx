import { useState } from 'react';
import { Send, Phone, MapPin, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import {FaTelegram, FaInstagram} from 'react-icons/fa';
import { useLang } from '../context/LangContext';
import { useReveal } from '../hooks/useReveal';

import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';


export function Contact() {
const [phone, setPhone] = useState('');

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
  <ContactItem
    href="tel:+998909391216"
    icon={<Phone size={30} />}
    label="+998 90 939 12 16"
  />

  <ContactItem
    href="mailto:peltanera@gmail.com"
    icon={<Mail size={30} />}
    label="peltanera@gmail.com"
  />

  <ContactItem
    icon={<MapPin size={30} />}
    label="  Tashkent, Amir Temur St."
  />

  <ContactItem
    href="https://t.me/peltanera"
    icon={<FaTelegram size={30} />}
    label="@peltanera"
  />

  <ContactItem
    href="https://instagram.com/peltanera"
    icon={<FaInstagram size={30} />}
    label="@peltanera"
  />
</div>

          <form onSubmit={submit} className="space-y-4">
            <input
              maxLength={20}
              required
              placeholder={t('contact.name')}
              className="w-full bg-cream-50 border border-brand-200 rounded-xl px-4 py-3.5 outline-none focus:border-brand-500 transition-colors text-wine-900 placeholder-wine-300"
            />
            <PhoneInput
            country="uz"
            value={phone}
            onChange={(value, country: any) => {
              const maxLength = country?.format
                ? country.format.replace(/\D/g, '').length
                : 15;

              if (value.length <= maxLength) {
                setPhone(value);
              }
            }}
            enableSearch
            countryCodeEditable={false}
            containerStyle={{
              width: '100%',
            }}
            inputStyle={{
              width: '100%',
              height: '56px',
              borderRadius: '12px',
              border: '1px solid #02307a',
              
              fontSize: '16px',
              paddingLeft: '52px',
            }}
            buttonStyle={{
              border: '1px solid #02307a',
              borderRadius: '12px 0 0 12px',
              background: '#faf8f3',
            }}
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

function ContactItem({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
}) {
  const content = (
    <>
      <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center text-brand-500 shrink-0 transition-colors group-hover:bg-brand-500 group-hover:text-white">
        {icon}
      </div>

      <span className="text-wine-700 text-lg transition-colors group-hover:text-brand-500">
        {label}
      </span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-4 transition-all"
      >
        {content}
      </a>
    );
  }

  return <div className="flex items-center">{content}</div>;
}
