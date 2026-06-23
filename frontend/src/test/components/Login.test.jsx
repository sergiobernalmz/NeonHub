import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../../context/AuthContext'
import { LanguageProvider } from '../../context/LanguageContext'
import { ToastProvider } from '../../context/ToastContext'
import Login from '../../pages/Login'

// wrapper con todos los providers necesarios para el test
const TestWrapper = ({ children }) => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <LanguageProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </LanguageProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

// mockeamos el servicio de login
const mockLogin = vi.fn()
vi.mock('../../context/AuthContext', async () => {
  const actual = await vi.importActual('../../context/AuthContext')
  return {
    ...actual,
    useAuth: () => ({
      login: mockLogin,
      user: null,
      loading: false,
      getDefaultRouteForUser: vi.fn(() => '/dashboard')
    })
  }
})

describe('Login Component', () => {
  beforeEach(() => {
    mockLogin.mockClear()
    // reseteamos el mock de fetch
    global.fetch.mockClear()
  })

  it('renders login form correctly', () => {
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    )

    // comprobamos que los elementos del formulario están presentes
    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()
    expect(screen.getByText(/ecocommerce/i)).toBeInTheDocument()
  })

  it('shows and hides password when toggle is clicked', async () => {
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    )

    const passwordInput = screen.getByLabelText(/contraseña/i)
    const toggleButton = screen.getByRole('button', { name: '' }) // botón del icono ojo

    // al principio la contraseña está oculta
    expect(passwordInput).toHaveAttribute('type', 'password')

    // al hacer clic se muestra la contraseña
    fireEvent.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'text')

    // al hacer clic de nuevo se vuelve a ocultar
    fireEvent.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('displays validation errors for empty fields', async () => {
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    )

    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
    
    // intentamos enviar el formulario vacío
    fireEvent.click(submitButton)

    // debería saltar la validación HTML5 o la validación personalizada
    const emailInput = screen.getByRole('textbox', { name: /email/i })
    const passwordInput = screen.getByLabelText(/contraseña/i)

    expect(emailInput).toBeInvalid()
    expect(passwordInput).toBeInvalid()
  })

  it('calls login function with correct credentials', async () => {
    mockLogin.mockResolvedValue({ success: true, user: global.testUtils.mockUser })

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    )

    const emailInput = screen.getByRole('textbox', { name: /email/i })
    const passwordInput = screen.getByLabelText(/contraseña/i)
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

    // rellenamos el formulario
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })

    // enviamos el formulario
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })

  it('displays error message on login failure', async () => {
    const errorMessage = 'Credenciales inválidas'
    mockLogin.mockResolvedValue({ success: false, message: errorMessage })

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    )

    const emailInput = screen.getByRole('textbox', { name: /email/i })
    const passwordInput = screen.getByLabelText(/contraseña/i)
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

    // rellenamos el formulario
    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })

    // enviamos el formulario
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('shows loading state during login attempt', async () => {
    // simulamos un login con retraso
    mockLogin.mockImplementation(() =>
      new Promise(resolve =>
        setTimeout(() => resolve({ success: true, user: global.testUtils.mockUser }), 100)
      )
    )

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    )

    const emailInput = screen.getByRole('textbox', { name: /email/i })
    const passwordInput = screen.getByLabelText(/contraseña/i)
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

    // rellenamos el formulario
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })

    // enviamos el formulario
    fireEvent.click(submitButton)

    // el botón debe estar deshabilitado mientras carga
    expect(submitButton).toBeDisabled()
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    })
  })

  it('has register link', () => {
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    )

    const registerLink = screen.getByRole('link', { name: /regístrate aquí/i })
    expect(registerLink).toBeInTheDocument()
    expect(registerLink).toHaveAttribute('href', '/register')
  })

  it('validates email format', async () => {
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    )

    const emailInput = screen.getByRole('textbox', { name: /email/i })
    
    // introducimos un email con formato incorrecto
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.blur(emailInput)

    // la validación HTML5 debería marcarlo como inválido
    expect(emailInput).toBeInvalid()
  })

  it('displays demo credentials', () => {
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    )

    // comprobamos que salen las credenciales de prueba
    expect(screen.getByText(/credenciales de prueba/i)).toBeInTheDocument()
    expect(screen.getByText(/admin@ecocommerce.com/i)).toBeInTheDocument()
  })

  it('handles keyboard navigation', async () => {
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    )

    const emailInput = screen.getByRole('textbox', { name: /email/i })
    const passwordInput = screen.getByLabelText(/contraseña/i)
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

    // la navegación con Tab tiene que funcionar bien
    emailInput.focus()
    fireEvent.keyDown(emailInput, { key: 'Tab' })
    expect(passwordInput).toHaveFocus()

    fireEvent.keyDown(passwordInput, { key: 'Tab' })
    expect(submitButton).toHaveFocus()
  })

  it('clears error when user starts typing', async () => {
    const errorMessage = 'Credenciales inválidas'
    mockLogin.mockResolvedValueOnce({ success: false, message: errorMessage })

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    )

    const emailInput = screen.getByRole('textbox', { name: /email/i })
    const passwordInput = screen.getByLabelText(/contraseña/i)
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

    // rellenamos y enviamos para provocar el error
    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    // al empezar a escribir el error debería desaparecer
    fireEvent.change(emailInput, { target: { value: 'corrected@example.com' } })

    await waitFor(() => {
      expect(screen.queryByText(errorMessage)).not.toBeInTheDocument()
    })
  })
})