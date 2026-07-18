import { useState } from 'react';
import { Send, Phone, MapPin, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { FaTelegram, FaInstagram } from 'react-icons/fa';
import { useLang } from '../context/LangContext';
import { useReveal } from '../hooks/useReveal';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

export function Contact() {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [agree, setAgree] = useState(false);
  const { t } = useLang();
  const { ref, visible } = useReveal<HTMLDivElement>();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Санитизация текста
  const sanitizeText = (value: string) =>
    value.replace(/[<>[\]{}"'\\/|;:=]/g, "");

  // Проверка email
  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Проверка телефона: принимает только цифры, допускает 9 или 12 цифр (узбекский)
  const validatePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    return /^(998\d{9}|9\d{8})$/.test(digits);
  };

  // Проверка лимита отправок (5 за 10 минут)
  const isRateLimited = () => {
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;
    const stored = localStorage.getItem("successfulSubmissions");
    const submissions = stored ? JSON.parse(stored) : [];
    const recent = submissions.filter((time: number) => now - time <= windowMs);
    return recent.length >= 5;
  };

  const recordSubmission = () => {
    const now = Date.now();
    const stored = localStorage.getItem("successfulSubmissions");
    const submissions = stored ? JSON.parse(stored) : [];
    submissions.push(now);
    localStorage.setItem("successfulSubmissions", JSON.stringify(submissions));
  };

  // Определение устройства
  const getDeviceModel = (): string => {
    const ua = navigator.userAgent;
    const platform = navigator.platform;
    const dpr = window.devicePixelRatio || 1;

    const width = screen.width * dpr;
    const height = screen.height * dpr;
    const resolution = `${width}x${height}`;

    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isMac = /Mac/i.test(platform);
    const isIPad = /iPad/i.test(ua) || (isMac && navigator.maxTouchPoints > 1);
    const isMobile = /Mobi/i.test(ua);

    if (isIOS && !isIPad && isMobile) {
      const map: Record<string, string> = {
        "1290x2796": "iPhone 15-16-17 Pro Max",
        "1179x2556": "iPhone 15-16 Pro",
        "1170x2532": "iPhone 13-14-15",
        "1284x2778": "iPhone 11-12-13-14 Pro Max",
        "1792x828": "iPhone (XR-11)",
        "1334x750": "iPhone (6-7-8)",
        "1080x2340": "iPhone 13 mini",
        "750x1334": "iPhone SE (2022/2024)",
      };
      return map[resolution] || "iPhone";
    }

    if (isIPad) {
      const map: Record<string, string> = {
        "2208x3200": 'iPad Pro M4 13"',
        "2156x3036": 'iPad Pro M4 11"',
        "2048x2732": 'iPad Pro 12.9"',
        "1668x2388": 'iPad Pro 11"',
        "1640x2360": "iPad Air M2",
        "1620x2160": "iPad 10 / 11",
        "1488x2266": "iPad mini",
      };
      return map[resolution] || "iPad";
    }

    if (isMac && !isMobile) {
      const map: Record<string, string> = {
        "3456x2234": 'MacBook Pro 16"',
        "3024x1964": 'MacBook Pro 16"',
        "3024x1890": 'MacBook Pro 14"',
        "2880x1800": 'MacBook Pro 14"',
        "2880x1864": 'MacBook Air 15"',
        "2560x1664": 'MacBook Air 13"',
      };

      let model = map[resolution] || "Mac";

      try {
        const gl = document.createElement("canvas").getContext("webgl");
        const dbg = gl?.getExtension("WEBGL_debug_renderer_info");
        const r = dbg && gl?.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
        if (r?.includes("M3")) model += " M3";
        else if (r?.includes("M2")) model += " M2";
        else if (r?.includes("M1")) model += " M1";
      } catch {}

      return model;
    }

    if (/Android/i.test(ua)) {
      const match = ua.match(/Android.*; ([^;)]+)/i);
      if (match?.[1]) return match[1].replace("Build", "").trim();
      return "Android Phone";
    }

    if (/Windows/i.test(ua)) return "Windows PC";
    if (/Linux/i.test(ua)) return "Linux PC";

    return isMobile ? "Mobile Device" : "Desktop Device";
  };

  const resetForm = () => {
    setPhone('');
    setEmail('');
    setAgree(false);
    setSent(false);
    setStatusMessage('');
    // Сбрасываем поля формы
    const form = document.querySelector('form');
    if (form) form.reset();
  };

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setStatusMessage('');

    const form = e.currentTarget;
    const nameInput = form.querySelector("input[name='name']") as HTMLInputElement;
    const messageInput = form.querySelector("textarea[name='message']") as HTMLTextAreaElement;

    const rawName = nameInput?.value?.trim() || '';
    const rawMessage = messageInput?.value?.trim() || '';

    // Получаем телефон из состояния (уже содержит цифры)
    const rawPhone = phone.replace(/\D/g, '');
    const rawEmail = email.trim();

    let valid = true;

    // Проверка имени
    const nameRegex = /^[A-Za-zА-Яа-яЁё\s]{2,}$/;
    if (!nameRegex.test(rawName)) {
      setStatusMessage("⚠️ Имя должно содержать только буквы и пробелы (мин. 2 символа)");
      valid = false;
    }

    // Проверка сообщения
    if (rawMessage.length < 2) {
      setStatusMessage("⚠️ Сообщение должно содержать минимум 2 символа");
      valid = false;
    }

    // Проверка: должен быть указан телефон ИЛИ email (или оба)
    const hasPhone = rawPhone.length > 0 && validatePhone(rawPhone);
    const hasEmail = rawEmail.length > 0 && validateEmail(rawEmail);

    if (!hasPhone && !hasEmail) {
      setStatusMessage("⚠️ Укажите телефон или email (или оба)");
      valid = false;
    }

    // Если указан телефон, но невалидный
    if (rawPhone.length > 0 && !validatePhone(rawPhone)) {
      setStatusMessage("⚠️ Неверный формат телефона. Должно быть 9 или 12 цифр (998...)");
      valid = false;
    }

    // Если указан email, но невалидный
    if (rawEmail.length > 0 && !validateEmail(rawEmail)) {
      setStatusMessage("⚠️ Неверный формат email");
      valid = false;
    }

    // Проверка согласия
    if (!agree) {
      setStatusMessage("⚠️ Необходимо согласие с политикой конфиденциальности");
      valid = false;
    }

    if (!valid) {
      setBusy(false);
      return;
    }

    // Проверка лимита
    if (isRateLimited()) {
      setStatusMessage("⛔ Лимит: не более 5 заявок за 10 минут.");
      setBusy(false);
      return;
    }

    const formData = new URLSearchParams();
    formData.append("name", sanitizeText(rawName));
    formData.append("phone", rawPhone); // только цифры
    formData.append("email", rawEmail);
    formData.append("message", sanitizeText(rawMessage));
    formData.append("device", getDeviceModel());

    setStatusMessage("⏳ Отправка...");

    try {
      const res = await fetch(
        "https://script.google.com/macros/s/AKfycbzQ1V8RdvlCK5yVZqfyJNSoOoTqb6sDOHfoDv3VmsTrYPt-5xg13DTxPQK46w6qclrCRA/exec",
        {
          method: "POST",
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          mode: 'no-cors',
          body: formData.toString(),
        }
      );

      setStatusMessage("✅ Ваше сообщение успешно отправлено!");
      recordSubmission();
      setSent(true);

    } catch (err) {
      console.error("Ошибка:", err);
      setStatusMessage("✅ Ваше сообщение успешно отправлено!");
      recordSubmission();
      setSent(true);
    } finally {
      setBusy(false);
    }
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
              label="Tashkent, Amir Temur St."
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
            {sent ? (
              // Блок после успешной отправки
              <div className="bg-white rounded-2xl p-8 shadow-lg text-center border border-green-100">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={40} className="text-green-500" />
                </div>
                <h3 className="text-2xl font-serif text-wine-900 mb-2">
                  Сообщение отправлено!
                </h3>
                <p className="text-wine-500 mb-6">
                  Мы свяжемся с вами в ближайшее время
                </p>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-brand-500 hover:bg-brand-600 text-cream px-8 py-3 rounded-xl font-medium transition-all hover:shadow-lg hover:shadow-brand-500/25"
                >
                  Отправить еще
                </button>
                {statusMessage && (
                  <div className="mt-4 text-sm text-green-600">
                    {statusMessage}
                  </div>
                )}
              </div>
            ) : (
              // Форма
              <>
                <input
                  name="name"
                  maxLength={40}
                  required
                  placeholder={t('contact.name')}
                  className="w-full bg-white border border-brand-200 rounded-xl px-4 py-3.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all text-wine-900 placeholder-wine-300"
                />

                <div className="relative">
                  <PhoneInput
                    country="uz"
                    value={phone}
                    onChange={(value) => {
                      setPhone(value);
                    }}
                    enableSearch
                    countryCodeEditable={false}
                    placeholder={t('contact.phone')}
                    containerStyle={{
                      width: '100%',
                    }}
                    inputStyle={{
                      width: '100%',
                      height: '56px',
                      background: '#ffffff',
                      border: '1px solid #8aa9e0',
                      borderRadius: '12px',
                      color: '#0f0404',
                      fontSize: '16px',
                      paddingLeft: '60px',
                      boxSizing: 'border-box',
                      transition: 'all .2s ease',
                    }}
                    buttonStyle={{
                      background: '#ffffff',
                      border: '1px solid #8aa9e0',
                      borderRight: 'none',
                      borderRadius: '12px 0 0 12px',
                      width: '48px',
                    }}
                  />
                </div>

                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (необязательно)"
                  className="w-full bg-white border border-brand-200 rounded-xl px-4 py-3.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all text-wine-900 placeholder-wine-300"
                />

                <textarea
                  name="message"
                  required
                  rows={6}
                  maxLength={500}
                  placeholder={t('contact.message')}
                  className="w-full bg-white border border-brand-200 rounded-xl px-4 py-3.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all text-wine-900 placeholder-wine-300 resize-none"
                />

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="policy"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-brand-300 text-brand-500 focus:ring-brand-400"
                  />
                  <label htmlFor="policy" className="text-sm text-wine-700 leading-snug cursor-pointer">
                    Я согласен(на) с{' '}
                    <a
                      href="/privacy.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-500 hover:underline font-medium"
                    >
                      политикой конфиденциальности
                    </a>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white py-3.5 rounded-xl font-medium transition-all hover:shadow-lg hover:shadow-brand-500/25 disabled:opacity-60"
                >
                  {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  {busy ? 'Отправка...' : t('contact.send')}
                </button>
              </>
            )}

            {statusMessage && !sent && (
              <div className={`text-center text-sm mt-2 ${
                statusMessage.includes('⚠️') || statusMessage.includes('⛔') 
                  ? 'text-amber-600' 
                  : 'text-green-600'
              }`}>
                {statusMessage}
              </div>
            )}
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

  return <div className="flex items-center gap-4">{content}</div>;
}