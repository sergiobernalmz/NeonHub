import React, { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { User, LayoutDashboard, Package, LogOut, Ticket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const UserMenu = ({ showUserMenu, setShowUserMenu, userMenuRef, config, contrastClass, subContrastClass, features }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.email || features?.tickets === false) return;
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    fetch('/api/tickets/customer', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setUnreadCount((data.data || []).filter(t => !t.read_by_customer).length);
        }
      })
      .catch(() => {});
  }, [user, features]);

  if (!user) {
    return (
      <div className="flex gap-2">
        <button onClick={() => navigate('/login')} className={`text-sm font-medium px-4 py-2 transition-colors hover:text-[color:var(--tw-ring-color)] ${contrastClass}`}>
          Entrar
        </button>
        <button onClick={() => navigate('/register')} className="text-sm font-bold bg-[color:var(--tw-ring-color)] text-white px-5 py-2 rounded-full hover:brightness-110 shadow-md transition-all">
          Registro
        </button>
      </div>
    );
  }

  const hasAdminAccess = user.roles?.some(role =>
    ['ceo', 'superadmin', 'admin', 'manager'].includes(role.name) || role.level >= 60
  );

  return (
    <div className="relative" ref={userMenuRef}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowUserMenu(!showUserMenu)}
        className={`flex items-center gap-2 p-1 pr-3 rounded-full border transition-all shadow-sm
          ${config.colors.background === '#ffffff' ? 'bg-white border-gray-200 hover:bg-gray-50' : 'bg-gray-800/80 border-gray-700 hover:bg-gray-800'}`}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white shadow-inner">
          <User className="w-4 h-4" />
        </div>
        <span className={`text-sm font-medium hidden sm:block ${contrastClass}`}>
          {user.name?.split(' ')[0] || user.username}
        </span>
      </motion.button>
      
      <AnimatePresence>
        {showUserMenu && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`absolute right-0 mt-3 w-64 rounded-xl shadow-2xl z-50 overflow-hidden border backdrop-blur-xl
              ${config.colors.background === '#ffffff' ? 'bg-white/95 border-gray-200' : 'bg-gray-900/95 border-gray-700'}`}
          >
             <div className="p-4 border-b border-gray-500/20">
               <p className={`text-sm font-bold ${contrastClass}`}>{user.name || user.username}</p>
               <p className={`text-xs ${subContrastClass} truncate`}>{user.email}</p>
             </div>
             <div className="p-2 flex flex-col gap-1">
               {hasAdminAccess && (
                 <>
                   <button onClick={() => { setShowUserMenu(false); navigate('/dashboard'); }} className={`flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-black/5 transition-colors ${contrastClass}`}>
                     <LayoutDashboard className="w-4 h-4"/> Panel Admin
                   </button>
                 </>
               )}
               <button onClick={() => { setShowUserMenu(false); navigate('/shop/orders'); }} className={`flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-black/5 transition-colors ${contrastClass}`}>
                 <Package className="w-4 h-4"/> Mis Pedidos
               </button>
               <button onClick={() => { setShowUserMenu(false); navigate('/shop/profile'); }} className={`flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-black/5 transition-colors ${contrastClass}`}>
                 <User className="w-4 h-4"/> Mi Perfil
               </button>
               {features?.tickets !== false && (
                 <>
                   <button onClick={() => { setShowUserMenu(false); navigate('/shop/tickets'); }} className={`flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-black/5 transition-colors ${contrastClass}`}>
                     <div className="relative">
                       <Ticket className="w-4 h-4"/>
                       {unreadCount > 0 && (
                         <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold leading-none">
                           {unreadCount > 9 ? '9+' : unreadCount}
                         </span>
                       )}
                     </div>
                     Mis tickets
                     {unreadCount > 0 && <span className="ml-auto text-xs font-bold text-red-500">{unreadCount} nueva{unreadCount !== 1 ? 's' : ''}</span>}
                   </button>
                 </>
               )}
               <hr className="my-1 border-gray-500/20" />
               <button onClick={() => { setShowUserMenu(false); logout(); }} className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors mt-1">
                 <LogOut className="w-4 h-4"/> Cerrar Sesión
               </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserMenu;
