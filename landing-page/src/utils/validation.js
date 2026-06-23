export function calcPasswordEntropy(password) {
  if (!password) return 0;
  let charsetSize = 0;
  if (/[a-z]/.test(password)) charsetSize += 26;
  if (/[A-Z]/.test(password)) charsetSize += 26;
  if (/[0-9]/.test(password)) charsetSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32;
  return Math.round(password.length * Math.log2(charsetSize || 1));
}

export function getPasswordStrength(entropy) {
  if (entropy < 28) return { level: 'muy-debil', label: 'Muy débil', color: '#ef4444' };
  if (entropy < 36) return { level: 'debil',    label: 'Débil',     color: '#f97316' };
  if (entropy < 60) return { level: 'media',    label: 'Aceptable', color: '#eab308' };
  if (entropy < 80) return { level: 'fuerte',   label: 'Fuerte',    color: '#22c55e' };
  return               { level: 'muy-fuerte', label: 'Muy fuerte', color: '#16a34a' };
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

export function validateUsername(username) {
  const u = String(username || '').trim();
  return u.length >= 3 && u.length <= 30 && /^[a-zA-Z0-9_]+$/.test(u);
}

export function getPasswordError(password) {
  const p = String(password || '');
  if (p.length < 8)              return 'Mínimo 8 caracteres';
  if (!/[A-Z]/.test(p))          return 'Debe contener al menos una mayúscula';
  if (!/[0-9]/.test(p))          return 'Debe contener al menos un número';
  if (!/[^A-Za-z0-9]/.test(p))   return 'Debe contener al menos un carácter especial';
  return null;
}

export function validatePassword(password) {
  return getPasswordError(password) === null;
}

export function validatePasswordStrength(password) {
  const p = String(password || '');
  return {
    length:    p.length >= 8,
    uppercase: /[A-Z]/.test(p),
    number:    /[0-9]/.test(p),
    special:   /[^a-zA-Z0-9]/.test(p),
    get isValid() { return this.length && this.uppercase && this.number && this.special; },
  };
}

export function validateMatch(a, b) {
  return a === b && a.length > 0;
}

export function validateRequired(value) {
  return String(value || '').trim().length > 0;
}

export function validateSubdomain(sub) {
  return /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(sub);
}
