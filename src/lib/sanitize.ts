export const MAX_NAME = 60;
export const MAX_EMAIL = 120;
export const MAX_PHONE = 20;
export const MAX_ADDRESS = 200;
export const MAX_COMMENT = 500;
export const MAX_MESSAGE = 500;
export const MAX_PASSWORD_MIN = 6;

const HTML_ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"'/]/g, (ch) => HTML_ENTITY_MAP[ch] ?? ch);
}

export function stripDangerous(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/[<>\\`]/g, '');
}

export function sanitizeText(value: string, maxLen = MAX_NAME): string {
  const stripped = stripDangerous(value).trim();
  return escapeHtml(stripped).slice(0, maxLen);
}

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function sanitizeEmail(value: string): string {
  const trimmed = value.trim().toLowerCase().slice(0, MAX_EMAIL);
  return EMAIL_RE.test(trimmed) ? trimmed : '';
}

export function sanitizePhone(value: string): string {
  return value.replace(/[^\d+]/g, '').slice(0, MAX_PHONE);
}

export function sanitizeDigits(value: string, maxLen = 6): string {
  return value.replace(/\D/g, '').slice(0, maxLen);
}
