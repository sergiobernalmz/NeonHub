

export const handleAuthError = (errorData = {}) => {
  console.log('Handling auth error:', errorData);

  // Verificar si es un error de token expirado o no autorizado
  if (
    errorData.message === 'Token expirado' ||
    errorData.message === 'No autorizado' ||
    errorData.message === 'Unauthorized' ||
    (errorData.message && (
      errorData.message.includes('token') ||
      errorData.message.includes('autenticación') ||
      errorData.message.includes('autorización')
    )) ||
    errorData.status === 401 ||
    errorData.statusCode === 401
  ) {
    console.log('Auth error detected, logging out user');

    // Limpiar el token y usuario del localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Mostrar mensaje al usuario
    const message = 'Sesión expirada. Por favor, inicie sesión nuevamente.';
    console.log(message);

    // Comprobar si ya estamos en la página de login para evitar redirecciones innecesarias
    if (window.location.pathname !== '/login') {
      console.log('Redirecting to login page');
      // Usar un timeout para permitir que el log se complete antes de la redirección
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    }

    return true;
  }

  return false;
}