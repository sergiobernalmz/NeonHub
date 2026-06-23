// el auto-login del demo se gestiona en AuthContext.checkAuth() antes de setLoading(false),
// así que ProtectedRoute nunca renderiza sin sesión resuelta en el subdominio demo.
// este componente se mantiene como passthrough por compatibilidad estructural.
const DemoAuthGuard = ({ children }) => children

export default DemoAuthGuard
