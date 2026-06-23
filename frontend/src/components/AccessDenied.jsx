import { useNavigate } from 'react-router-dom'
import { ShieldOff, ArrowLeft, LayoutDashboard } from 'lucide-react'

const MESSAGES = {
  feature: {
    title: 'Funcionalidad no disponible',
    body: 'Esta funcionalidad no está disponible en tu tienda.'
  },
  level: {
    title: 'Acceso restringido',
    body: 'No tienes permisos para acceder a esta sección.'
  },
  permission: {
    title: 'Acceso restringido',
    body: 'Tu administrador ha restringido el acceso a esta sección para tu cuenta.'
  }
}

const AccessDenied = ({ reason = 'level' }) => {
  const navigate = useNavigate()
  const { title, body } = MESSAGES[reason] || MESSAGES.level

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-tr from-red-500/20 to-orange-500/20 flex items-center justify-center border border-red-500/30">
          <ShieldOff className="w-9 h-9 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">{title}</h1>
        <p className="text-gray-400 mb-8">{body}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-500/20"
          >
            <LayoutDashboard className="w-4 h-4" />
            Ir al dashboard
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-all border border-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver atrás
          </button>
        </div>
      </div>
    </div>
  )
}

export default AccessDenied
