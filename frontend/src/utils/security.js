

export const sanitizeHTML = (html) => {
  if (typeof html !== 'string') return ''
  
  const div = document.createElement('div')
  div.textContent = html
  return div.innerHTML
}

export const escapeHTML = (str) => {
  if (typeof str !== 'string') return ''
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }
  
  return str.replace(/[&<>"'/]/g, (char) => map[char])
}

export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return {
      valid: false,
      message: 'La contraseña debe tener al menos 8 caracteres'
    }
  }
  
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: 'La contraseña debe contener al menos una mayúscula'
    }
  }
  
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: 'La contraseña debe contener al menos una minúscula'
    }
  }
  
  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: 'La contraseña debe contener al menos un número'
    }
  }
  
  return { valid: true, message: 'Contraseña válida' }
}

export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return ''
  
  // eliminamos palabras clave SQL y caracteres peligrosos
  const dangerous = [
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
    'EXEC', 'EXECUTE', 'SCRIPT', 'UNION', 'OR', 'AND', '--', ';',
    '<script>', '</script>', 'javascript:', 'onerror=', 'onclick='
  ]
  
  let sanitized = input
  dangerous.forEach(keyword => {
    const regex = new RegExp(keyword, 'gi')
    sanitized = sanitized.replace(regex, '')
  })
  
  return sanitized.trim()
}

export const isValidURL = (url) => {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

export const sanitizeFilename = (filename) => {
  if (typeof filename !== 'string') return ''
  
  // quitamos intentos de path traversal
  let sanitized = filename.replace(/\.\./g, '')
  sanitized = sanitized.replace(/[/\\]/g, '')
  
  // quitamos los caracteres especiales
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_')
  
  return sanitized
}

export const hasRequiredLevel = (user, requiredLevel) => {
  if (!user || !user.roles || !Array.isArray(user.roles)) {
    return false
  }
  
  return user.roles.some(role => role.level >= requiredLevel)
}

export const hasRequiredRole = (user, requiredRoles) => {
  if (!user || !user.roles || !Array.isArray(user.roles)) {
    return false
  }
  
  if (!Array.isArray(requiredRoles)) {
    requiredRoles = [requiredRoles]
  }
  
  return user.roles.some(role => requiredRoles.includes(role.name))
}

export const isValidPhone = (phone) => {
  const phoneRegex = /^[+]?[\d\s()-]{9,}$/
  return phoneRegex.test(phone)
}

export const rateLimit = (func, delay) => {
  let timeout = null
  let lastCall = 0
  
  return function(...args) {
    const now = Date.now()
    
    if (now - lastCall < delay) {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        lastCall = now
        func.apply(this, args)
      }, delay - (now - lastCall))
    } else {
      lastCall = now
      func.apply(this, args)
    }
  }
}

export const debounce = (func, wait) => {
  let timeout
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export const isValidJWT = (token) => {
  if (!token || typeof token !== 'string') return false
  
  const parts = token.split('.')
  if (parts.length !== 3) return false
  
  try {
    // intentamos decodificar el payload
    const payload = JSON.parse(atob(parts[1]))

    // comprobamos si el token tiene expiración y si no ha expirado
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000)
      return payload.exp > now
    }
    
    return true
  } catch {
    return false
  }
}

export const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return obj
  }
  
  const sanitized = Array.isArray(obj) ? [] : {}
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // evitamos prototype pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue
      }
      
      if (typeof obj[key] === 'object') {
        sanitized[key] = sanitizeObject(obj[key])
      } else if (typeof obj[key] === 'string') {
        sanitized[key] = escapeHTML(obj[key])
      } else {
        sanitized[key] = obj[key]
      }
    }
  }
  
  return sanitized
}
