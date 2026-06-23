import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import issueReportService from '../services/issueReportService';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../constants/routes';

const ReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [users, setUsers] = useState([]);
  const [assigningUser, setAssigningUser] = useState(false);

  const priorities = issueReportService.getPriorities();
  const statuses = issueReportService.getStatuses();
  const reportTypes = issueReportService.getReportTypes();

  useEffect(() => {
    loadReport();
    loadUsers();
  }, [id]);

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users?limit=100', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setUsers(data.data.users || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await issueReportService.getReportById(id);
      if (response.success) {
        setReport(response.data);
      }
    } catch (error) {
      console.error('Error loading report:', error);
      showError('Error al cargar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    try {
      setSubmittingComment(true);
      await issueReportService.addComment(id, { comment });
      setComment('');
      await loadReport();
      showSuccess('Comentario agregado');
    } catch (error) {
      console.error('Error adding comment:', error);
      showError('Error al agregar comentario');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await issueReportService.updateReport(id, { status: newStatus });
      await loadReport();
      showSuccess('Estado actualizado');
    } catch (error) {
      console.error('Error updating status:', error);
      showError('Error al actualizar el estado');
    }
  };

  const handleAssign = async (userId) => {
    if (!userId) return;
    try {
      setAssigningUser(true);
      await issueReportService.assignReport(id, userId);
      await loadReport();
      showSuccess('Reporte asignado');
    } catch (error) {
      console.error('Error assigning report:', error);
      showError('Error al asignar el reporte');
    } finally {
      setAssigningUser(false);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[priority] || colors.medium;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-800',
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.pending;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-4">Reporte no encontrado</p>
          <button
            onClick={() => navigate(ROUTES.DASHBOARD_REPORTS)}
            className="text-cyan-400 hover:text-cyan-300"
          >
            Volver a reportes
          </button>
        </div>
      </div>
    );
  }

  const typeInfo = reportTypes.find(t => t.value === report.type);
  const priorityInfo = priorities.find(p => p.value === report.priority);
  const statusInfo = statuses.find(s => s.value === report.status);

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha desconocida';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Fecha inválida' : date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(ROUTES.DASHBOARD_REPORTS)}
            className="text-cyan-400 hover:text-cyan-300 mb-4 flex items-center gap-2"
          >
            ← Volver a reportes
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{report.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>{report.report_number}</span>
                <span>•</span>
                <span>Creado por {[report.reporter?.first_name, report.reporter?.last_name].filter(Boolean).join(' ')}</span>
                <span>•</span>
                <span>{formatDate(report.created_at || report.createdAt)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getPriorityColor(report.priority)}`}>
                {priorityInfo?.icon} {priorityInfo?.label}
              </span>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                {statusInfo?.icon} {statusInfo?.label}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Descripción</h2>
              <p className="text-gray-300 whitespace-pre-wrap">{report.description}</p>
            </div>

            {/* Comments */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Comentarios ({report.comments?.length || 0})
              </h2>

              <div className="space-y-4 mb-6">
                {report.comments && report.comments.length > 0 ? (
                  report.comments.map((comment) => (
                    <div key={comment.id} className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold">
                          {comment.user.first_name[0]}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-white">
                              {[comment.user.first_name, comment.user.last_name].filter(Boolean).join(' ')}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(comment.createdAt || comment.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-gray-300">{comment.comment}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-center py-4">No hay comentarios aún</p>
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment}>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Agregar un comentario..."
                  rows={3}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 mb-3"
                />
                <button
                  type="submit"
                  disabled={submittingComment || !comment.trim()}
                  className="px-6 py-2 bg-cyan-500 text-white rounded-lg font-semibold hover:bg-cyan-600 transition-all disabled:opacity-50"
                >
                  {submittingComment ? 'Enviando...' : 'Comentar'}
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Details Card */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Detalles</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400">Tipo</label>
                  <div className="text-white flex items-center gap-2 mt-1">
                    <span className="text-2xl">{typeInfo?.icon}</span>
                    <span>{typeInfo?.label}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400">Estado</label>
                  <select
                    value={report.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    {statuses.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.icon} {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-gray-400">Asignado a</label>
                  <select
                    value={report.assigned_to || ''}
                    onChange={(e) => handleAssign(e.target.value)}
                    disabled={assigningUser}
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">Sin asignar</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {[u.firstName, u.lastName].filter(Boolean).join(' ')} ({u.roles?.[0]?.displayName || 'Usuario'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-gray-400">Fecha límite</label>
                  <div className="text-white mt-1">
                    {report.due_date
                      ? new Date(report.due_date).toLocaleDateString()
                      : 'Sin fecha límite'}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400">Vistas</label>
                  <div className="text-white mt-1">{report.views_count}</div>
                </div>
              </div>
            </div>

            {/* Actions Card */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Acciones</h3>

              <div className="space-y-3">
                {report.status !== 'in_progress' && (
                  <button
                    onClick={() => handleStatusChange('in_progress')}
                    className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-all"
                  >
                    Marcar en progreso
                  </button>
                )}

                {report.status !== 'resolved' && (
                  <button
                    onClick={() => handleStatusChange('resolved')}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-all"
                  >
                    Marcar como resuelto
                  </button>
                )}

                {report.status !== 'closed' && (
                  <button
                    onClick={() => handleStatusChange('closed')}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-all"
                  >
                    Cerrar reporte
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDetail;
