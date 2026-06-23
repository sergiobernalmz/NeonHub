import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { useLanguage } from '../context/LanguageContext';
import userService from '../services/userService';

const FEATURE_LABELS = {
  products: 'Gestión de Productos',
  gallery: 'Galería de Imágenes',
  orders: 'Gestión de Pedidos',
  customers: 'Gestión de Clientes',
  analytics: 'Analíticas',
  sustainability: 'Métricas Sostenibilidad',
  reports: 'Reportes',
  invoices: 'Facturación',
  tickets: 'Tickets de Soporte',
  certifications: 'Certificaciones'
};

const FEATURE_MIN_LEVELS = { customers: 60, sustainability: 60 };

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const config = useConfig();
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [permissionsUser, setPermissionsUser] = useState(null);
  const [permissionsData, setPermissionsData] = useState({});
  const [permissionsSaving, setPermissionsSaving] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    roleId: ''
  });

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, [filters, pagination.page]);

  const loadUsers = async () => {
    try {
      setLoading(true);

      const data = await userService.getUsers(pagination.page, pagination.limit, filters);

      if (data.success) {
        setUsers(data.data.users);
        setPagination(prev => ({
          ...prev,
          total: data.data.pagination.total,
          totalPages: data.data.pagination.totalPages
        }));
      } else {
        showError(data.message || 'Error al cargar usuarios');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      showError('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const data = await userService.getRoles();

      if (data.success) {
        setRoles(data.data.roles);
      } else {
        console.error('Error en respuesta de roles:', data.message);
        showError(data.message || 'Error al cargar roles');
      }
    } catch (error) {
      console.error('Error al cargar roles:', error);
      showError('Error al cargar roles del servidor');
    }
  };

  const isCurrentUser = (userId) => {
    return currentUser?.id === userId;
  };

  const canEditUser = (targetUser) => {
    if (isCurrentUser(targetUser.id)) return false;
    const currentUserMaxLevel = Math.max(...(currentUser?.roles?.map(role => role.level) || [0]));
    const targetUserMaxLevel = Math.max(...(targetUser.roles?.map(role => role.level) || [0]));
    return currentUserMaxLevel > targetUserMaxLevel;
  };

  const canDeleteUser = (targetUser) => {
    return canEditUser(targetUser) && !isCurrentUser(targetUser.id);
  };

  const getAvailableRoles = () => {
    const currentUserMaxLevel = Math.max(...(currentUser?.roles?.map(role => role.level) || [0]));
    const availableRoles = roles.filter(role => role.level < currentUserMaxLevel);

    return availableRoles;
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      showError('Nombre de usuario inválido: solo letras, números y guiones bajos. Sin espacios.');
      return;
    }

    try {
      const userData = {
        username: formData.username,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        roleId: formData.roleId
      };

      await userService.createUser(userData);

      loadUsers();
      showSuccess('Usuario creado. Se enviará un email de activación.');
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Error creating user:', error);
      showError(error.message || 'Error al crear usuario');
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone
      };

      const data = await userService.updateUser(selectedUser.id, userData);

      if (data.success) {
        showSuccess('Usuario actualizado exitosamente');
        setShowEditModal(false);
        resetForm();
        loadUsers();
      } else {
        showError(data.message || 'Error al actualizar usuario');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      showError('Error al actualizar usuario');
    }
  };

  const handleRoleChange = async (userId, roleId) => {
    if (isCurrentUser(userId)) {
      showError('No puedes cambiar tu propio rol');
      return;
    }

    const selectedRole = roles.find(r => r.id === roleId);
    const currentUserMaxLevel = Math.max(...(currentUser?.roles?.map(role => role.level) || [0]));

    if (selectedRole && selectedRole.level >= currentUserMaxLevel) {
      showError(`No puedes asignar un rol de nivel ${selectedRole.level} cuando tu nivel máximo es ${currentUserMaxLevel}`);
      return;
    }

    try {
      const data = await userService.updateUserRole(userId, roleId);

      if (data.success) {
        showSuccess('Rol actualizado exitosamente');
        loadUsers();
      } else {
        showError(data.message || 'Error al actualizar rol');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      showError('Error al actualizar rol');
    }
  };

  const handleStatusChange = async (userId, isActive) => {
    if (isCurrentUser(userId) && !isActive) {
      showError('No puedes desactivar tu propia cuenta');
      return;
    }

    try {
      const data = await userService.updateUserStatus(userId, isActive);

      if (data.success) {
        showSuccess(`Usuario ${isActive ? 'activado' : 'desactivado'} exitosamente`);
        loadUsers();
      } else {
        showError(data.message || 'Error al cambiar estado');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showError('Error al cambiar estado');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (isCurrentUser(userId)) {
      showError('No puedes eliminar tu propia cuenta');
      return;
    }

    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) return;

    try {
      const data = await userService.deleteUser(userId);

      if (data.success) {
        showSuccess('Usuario eliminado exitosamente');
        loadUsers();
      } else {
        showError(data.message || 'Error al eliminar usuario');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showError('Error al eliminar usuario');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      roleId: ''
    });
    setSelectedUser(null);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || '',
      roleId: user.roles[0]?.id || ''
    });
    setShowEditModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Sin fecha';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Fecha inválida';

      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Error en fecha';
    }
  };

  const currentUserLevel = Math.max(...(currentUser?.roles?.map(r => r.level) || [0]));

  const canManagePermissions = (targetUser) => {
    if (isCurrentUser(targetUser.id)) return false;
    const targetLevel = Math.max(...(targetUser.roles?.map(r => r.level) || [0]));
    return currentUserLevel >= 80 && currentUserLevel > targetLevel;
  };

  const openPermissionsModal = async (targetUser) => {
    setPermissionsUser(targetUser);
    setPermissionsData({});
    setShowPermissionsModal(true);
    try {
      const res = await fetch(`/api/users/${targetUser.id}/permissions`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) setPermissionsData(data.data.permissions || {});
    } catch { /* keep empty */ }
  };

  const savePermissions = async () => {
    if (!permissionsUser) return;
    setPermissionsSaving(true);
    try {
      const res = await fetch(`/api/users/${permissionsUser.id}/permissions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ permissions: permissionsData })
      });
      const data = await res.json();
      if (data.success) {
        showSuccess('Permisos actualizados correctamente');
        setShowPermissionsModal(false);
        loadUsers();
      } else {
        showError(data.message || 'Error al guardar permisos');
      }
    } catch {
      showError('Error de conexión');
    } finally {
      setPermissionsSaving(false);
    }
  };

  const getRoleColor = (level) => {
    if (level >= 80) return 'text-red-400 bg-red-500/20 border border-red-500/30';
    if (level >= 60) return 'text-orange-400 bg-orange-500/20 border border-orange-500/30';
    if (level >= 40) return 'text-blue-400 bg-blue-500/20 border border-blue-500/30';
    if (level >= 20) return 'text-green-400 bg-green-500/20 border border-green-500/30';
    return 'text-gray-300 bg-gray-500/20 border border-gray-500/30';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('userManagementTitle')}</h1>
          <p className="text-gray-400">{t('userManagementDescription')}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {t('createUser')}
        </motion.button>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('search')}</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Nombre, email, usuario..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('role')}</label>
            <select
              value={filters.role}
              onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t('allRoles')}</option>
              {roles.map(role => (
                <option key={role.id} value={role.name}>{role.displayName || role.display_name || 'Sin nombre'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('status')}</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t('all')}</option>
              <option value="active">{t('active')}</option>
              <option value="inactive">{t('inactive')}</option>
              <option value="unverified">{t('unverified')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">{t('loading')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('username')}</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('email')}</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('role')}</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('status')}</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('created')}</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-600">
                {users.map((user) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-white">{[user.firstName, user.lastName].filter(Boolean).join(' ')}</div>
                        <div className="text-sm text-gray-400">@{user.username}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{user.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <select
                          value={user.roles[0]?.id || ''}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={isCurrentUser(user.id)}
                          className={`text-xs px-3 py-1 rounded-full font-medium ${isCurrentUser(user.id)
                              ? 'bg-gray-600 text-gray-400 cursor-not-allowed border border-gray-500'
                              : getRoleColor(user.roles[0]?.level || 0)
                            }`}
                        >
                            {isCurrentUser(user.id) ? (
                            <option value={user.roles[0]?.id}>{user.roles[0]?.displayName || user.roles[0]?.display_name || 'Sin rol'}</option>
                          ) : (
                            getAvailableRoles().map(role => (
                              <option key={role.id} value={role.id}>{role.displayName || role.display_name || 'Sin nombre'}</option>
                            ))
                          )}
                        </select>
                        {isCurrentUser(user.id) && (
                          <span className="text-xs text-yellow-400 font-medium">(Tú)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {!user.emailVerified && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 w-max">
                            <span className="w-2 h-2 rounded-full mr-2 bg-yellow-400"></span>
                            Sin Verificar
                          </span>
                        )}
                        <button
                          onClick={() => handleStatusChange(user.id, !user.isActive)}
                          disabled={isCurrentUser(user.id) && !user.isActive}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium w-max ${isCurrentUser(user.id) && !user.isActive
                              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                              : user.isActive
                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            }`}
                        >
                          <span className={`w-2 h-2 rounded-full mr-2 ${user.isActive ? 'bg-green-400' : 'bg-red-400'
                            }`}></span>
                          {user.isActive ? t('active') : t('inactive')}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <div className="flex space-x-2">
                        {canManagePermissions(user) && (
                          <button
                            onClick={() => openPermissionsModal(user)}
                            className="p-1 rounded transition-colors text-violet-400 hover:text-violet-300"
                            title="Gestionar permisos"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(user)}
                          disabled={isCurrentUser(user.id)}
                          className={`p-1 rounded transition-colors ${isCurrentUser(user.id)
                              ? 'text-gray-500 cursor-not-allowed'
                              : 'text-blue-400 hover:text-blue-300'
                            }`}
                          title={isCurrentUser(user.id) ? 'No puedes editarte a ti mismo' : 'Editar usuario'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={!canDeleteUser(user)}
                          className={`p-1 rounded transition-colors ${!canDeleteUser(user)
                              ? 'text-gray-500 cursor-not-allowed'
                              : 'text-red-400 hover:text-red-300'
                            }`}
                          title={
                            isCurrentUser(user.id)
                              ? 'No puedes eliminarte a ti mismo'
                              : !canDeleteUser(user)
                                ? 'No tienes permisos para eliminar este usuario'
                                : 'Eliminar usuario'
                          }
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-600 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} usuarios
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 rounded bg-gray-700 text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
              >
                {t('previous')}
              </button>
              <span className="px-3 py-1 text-gray-300">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 rounded bg-gray-700 text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
              >
                {t('next')}
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl border border-gray-700"
            >
              <h3 className="text-xl font-bold text-white mb-4">{t('createNewUser')}</h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {t('username')}
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="ej: sergio_test"
                    className={`w-full bg-gray-700 border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formData.username && !/^[a-zA-Z0-9_]+$/.test(formData.username)
                        ? 'border-red-500'
                        : 'border-gray-600'
                    }`}
                    required
                  />
                  {formData.username && !/^[a-zA-Z0-9_]+$/.test(formData.username) && (
                    <p className="text-red-400 text-xs mt-1">Solo letras, números y guiones bajos (_). Sin espacios.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">{t('email')}</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">{t('firstName')}</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">{t('lastName')}</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">{t('phone')}</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">{t('role')}</label>
                  <select
                    value={formData.roleId}
                    onChange={(e) => setFormData(prev => ({ ...prev, roleId: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">{t('selectRole')}</option>
                    {getAvailableRoles().map(role => (
                      <option key={role.id} value={role.id}>
                        {role.displayName || role.display_name || 'Sin nombre'} (Nivel {role.level})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-600 mt-1">
                    📝 {t('assignRolesHint')} ({Math.max(...(currentUser?.roles?.map(role => role.level) || [0]))})
                  </p>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {t('createUser')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl border border-gray-700"
            >
              <h3 className="text-xl font-bold text-white mb-4">{t('editUser')}</h3>
              <form onSubmit={handleEditUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">{t('username')}</label>
                  <input
                    type="text"
                    value={formData.username}
                    disabled
                    className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">{t('email')}</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">{t('firstName')}</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">{t('lastName')}</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">{t('phone')}</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {t('update')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPermissionsModal && permissionsUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl border border-gray-700"
            >
              <h3 className="text-xl font-bold text-white mb-1">
                {t('permissionsOf')} {[permissionsUser.firstName, permissionsUser.lastName].filter(Boolean).join(' ')}
              </h3>
              <p className="text-sm text-gray-400 mb-5">@{permissionsUser.username}</p>

              <div className="space-y-2 mb-5 max-h-64 overflow-y-auto pr-1">
                {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                  const storeEnabled = config?.features ? config.features[key] !== false : true;
                  const targetLevel = Math.max(...(permissionsUser.roles?.map(r => r.level) || [0]));
                  const minLevel = FEATURE_MIN_LEVELS[key] || 0;
                  const levelBlocked = minLevel > 0 && targetLevel < minLevel;

                  if (!storeEnabled) return null;

                  const isChecked = permissionsData[key] !== false;

                  return (
                    <div key={key} className={`flex items-center justify-between p-3 rounded-lg border ${levelBlocked ? 'border-gray-700/40 bg-gray-900/30 opacity-50' : 'border-gray-700 bg-gray-900/50'}`}>
                      <div>
                        <span className="text-sm text-gray-200">{label}</span>
                        {levelBlocked && (
                          <p className="text-xs text-gray-500 mt-0.5">{t('requiresHigherLevel')}</p>
                        )}
                      </div>
                      <button
                        disabled={levelBlocked}
                        onClick={() => !levelBlocked && setPermissionsData(prev => ({ ...prev, [key]: !isChecked }))}
                        className={`relative w-10 h-5 rounded-full transition-colors ${levelBlocked ? 'cursor-not-allowed' : 'cursor-pointer'} ${isChecked ? 'bg-violet-600' : 'bg-gray-600'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isChecked ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-gray-500 mb-5">
                {t('permissionsModulesHint')}
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowPermissionsModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={savePermissions}
                  disabled={permissionsSaving}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {permissionsSaving ? t('saving') : t('savePermissions')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default UserManagement;