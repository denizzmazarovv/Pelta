import { COUNTRIES, byIso, formatNational, parsePhone, type Country } from '../lib/phone';

/** Поле телефона: страна (по умолчанию Узбекистан +998) и номер с автоматическими пробелами. */
export function PhoneInput({
  country,
  national,
  onChange,
  invalid,
}: {
  country: Country;
  national: string;
  onChange: (country: Country, national: string) => void;
  invalid?: boolean;
}) {
  const placeholder = country.mask.replace(/#/g, '0');

  return (
    <div className={`flex items-stretch border-b ${invalid ? 'border-red-700' : 'border-ink/40 focus-within:border-ink'} transition-colors`}>
      <label className="relative flex items-center shrink-0 pr-3 mr-3 border-r border-ink/15 cursor-pointer">
        <span className="font-mono text-[13px] whitespace-nowrap">
          {country.iso} +{country.dial}
        </span>
        <svg width="8" height="8" viewBox="0 0 8 8" className="ml-1.5 text-mute" aria-hidden="true">
          <path d="M1 2.5 L4 5.5 L7 2.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
        </svg>
        <select
          className="absolute inset-0 opacity-0 cursor-pointer"
          value={country.iso}
          onChange={(e) => {
            const c = byIso(e.target.value);
            onChange(c, formatNational(national, c));
          }}
          aria-label="Country code"
        >
          {COUNTRIES.map((c) => (
            <option key={c.iso} value={c.iso}>
              {c.name} +{c.dial}
            </option>
          ))}
        </select>
      </label>
      <input
        className="flex-1 min-w-0 h-11 bg-transparent font-mono text-[13px] tracking-[0.02em] placeholder:text-mute focus:outline-none"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={national}
        placeholder={placeholder}
        maxLength={country.mask.length}
        onChange={(e) => {
          const v = e.target.value;
          // Вставили номер целиком с кодом страны — определим страну сами
          if (/^\s*\+/.test(v) || v.replace(/\D/g, '').length > country.mask.replace(/[^#]/g, '').length) {
            const p = parsePhone(v, country);
            onChange(p.country, p.national);
          } else {
            onChange(country, formatNational(v, country));
          }
        }}
        onPaste={(e) => {
          const text = e.clipboardData.getData('text');
          if (!text) return;
          e.preventDefault();
          const p = parsePhone(text, country);
          onChange(p.country, p.national);
        }}
      />
    </div>
  );
}
