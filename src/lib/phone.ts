/**
 * Телефон с выбором страны и маской.
 * mask: «#» — цифра. Количество «#» = точное число цифр номера без кода страны.
 */
export type Country = { iso: string; dial: string; mask: string; name: string };

export const COUNTRIES: Country[] = [
  { iso: 'UZ', dial: '998', mask: '## ### ## ##', name: 'Uzbekistan' },
  { iso: 'KZ', dial: '7', mask: '### ### ## ##', name: 'Kazakhstan' },
  { iso: 'RU', dial: '7', mask: '### ### ## ##', name: 'Russia' },
  { iso: 'KG', dial: '996', mask: '### ### ###', name: 'Kyrgyzstan' },
  { iso: 'TJ', dial: '992', mask: '## ### ####', name: 'Tajikistan' },
  { iso: 'TM', dial: '993', mask: '## ######', name: 'Turkmenistan' },
  { iso: 'TR', dial: '90', mask: '### ### ## ##', name: 'Türkiye' },
  { iso: 'AE', dial: '971', mask: '## ### ####', name: 'UAE' },
  { iso: 'KR', dial: '82', mask: '## #### ####', name: 'South Korea' },
  { iso: 'US', dial: '1', mask: '### ### ####', name: 'USA / Canada' },
  { iso: 'GB', dial: '44', mask: '#### ######', name: 'United Kingdom' },
  { iso: 'DE', dial: '49', mask: '### ########', name: 'Germany' },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

export const byIso = (iso: string) => COUNTRIES.find((c) => c.iso === iso) ?? DEFAULT_COUNTRY;
export const digitsIn = (mask: string) => mask.replace(/[^#]/g, '').length;

/** Форматирует цифры по маске: 901234567 → «90 123 45 67». Лишние цифры отбрасываются. */
export function formatNational(raw: string, c: Country): string {
  const d = raw.replace(/\D/g, '').slice(0, digitsIn(c.mask));
  let out = '';
  let i = 0;
  for (const ch of c.mask) {
    if (i >= d.length) break;
    if (ch === '#') out += d[i++];
    else out += ch;
  }
  return out;
}

/**
 * Разбор вставленного/сохранённого номера: «+998 90 123 45 67», «998901234567», «901234567».
 * Возвращает страну и национальную часть номера.
 */
export function parsePhone(raw: string, current: Country = DEFAULT_COUNTRY): { country: Country; national: string } {
  const d = raw.replace(/\D/g, '');
  const hasPlus = raw.trim().startsWith('+');
  // Сначала пробуем текущую страну (важно для +7: KZ/RU)
  const order = [current, ...COUNTRIES.filter((c) => c !== current)].sort((a, b) =>
    a === current ? -1 : b === current ? 1 : b.dial.length - a.dial.length
  );
  for (const c of order) {
    const n = digitsIn(c.mask);
    if ((hasPlus || d.length > n) && d.startsWith(c.dial) && d.length - c.dial.length <= n) {
      return { country: c, national: formatNational(d.slice(c.dial.length), c) };
    }
  }
  return { country: current, national: formatNational(d, current) };
}

export function isComplete(national: string, c: Country): boolean {
  return national.replace(/\D/g, '').length === digitsIn(c.mask);
}

/** E.164 для отправки: +998901234567 */
export function toE164(national: string, c: Country): string {
  return `+${c.dial}${national.replace(/\D/g, '')}`;
}
