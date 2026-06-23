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
  if (entropy < 28) return { label: 'Muy débil',  color: '#ef4444', pct: 15  };
  if (entropy < 36) return { label: 'Débil',      color: '#f97316', pct: 35  };
  if (entropy < 60) return { label: 'Aceptable',  color: '#eab308', pct: 60  };
  if (entropy < 80) return { label: 'Fuerte',     color: '#84cc16', pct: 80  };
  return               { label: 'Muy fuerte', color: '#22c55e', pct: 100 };
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

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}
