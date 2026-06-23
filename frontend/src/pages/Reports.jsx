import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import issueReportService from '../services/issueReportService';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../constants/routes';
import { useLanguage } from '../context/LanguageContext';

const Reports = () => {
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    status: '',
    type: '',
    priority: '',
    assigned_to_me: false,
    created_by_me: false,
    search: ''
  });

  const reportTypes = issueReportService.getReportTypes();
  const priorities = issueReportService.getPriorities();
  const statuses = issueReportService.getStatuses();

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reportsResponse, statsResponse] = await Promise.all([
        issueReportService.getReports(filters),
        issueReportService.getReportStats()
      ]);

      if (reportsResponse.success) {
        setReports(reportsResponse.data.reports);
      }

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      showError('Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = () => {
    setShowCreateModal(true);
  };

  const handleViewReport = (id) => {
    navigate(ROUTES.DASHBOARD_REPORTS_DETAIL.replace(':id', id));
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

  const getTypeIcon = (type) => {
    const typeInfo = reportTypes.find(t => t.value === type);
    return typeInfo?.icon || '📝';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha desconocida';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Fecha inválida' : date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="max-w-7xl mx-auto">
        {/* cabecera */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{t('reportsTitle')}</h1>
            <p className="text-gray-400">{t('reportsDescription')}</p>
          </div>
          <button
            onClick={handleCreateReport}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg"
          >
            + {t('createReport')}
          </button>
        </div>

        {/* tarjetas de estadísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <div className="text-gray-400 text-sm mb-2">{t('totalReports')}</div>
              <div className="text-3xl font-bold text-white">{stats.total}</div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <div className="text-gray-400 text-sm mb-2">{t('assignedToMe')}</div>
              <div className="text-3xl font-bold text-cyan-400">{stats.assignedToMe}</div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <div className="text-gray-400 text-sm mb-2">{t('urgent')}</div>
              <div className="text-3xl font-bold text-red-400">{stats.urgent}</div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <div className="text-gray-400 text-sm mb-2">{t('resolved')}</div>
              <div className="text-3xl font-bold text-green-400">
                {stats.byStatus.find(s => s.status === 'resolved')?.count || 0}
              </div>
            </div>
          </div>
        )}

        {/* filtros */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input
              type="text"
              placeholder={t('search')}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">{t('allTypes')}</option>
              {reportTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">{t('allStatuses')}</option>
              {statuses.map(status => (
                <option key={status.value} value={status.value}>
                  {status.icon} {status.label}
                </option>
              ))}
            </select>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">{t('allPriorities')}</option>
              {priorities.map(priority => (
                <option key={priority.value} value={priority.value}>
                  {priority.icon} {priority.label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters({ ...filters, assigned_to_me: !filters.assigned_to_me })}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${filters.assigned_to_me
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
              >
                {t('assignedToMeBtn')}
              </button>
            </div>
          </div>
        </div>

        {/* lista de reportes */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">{t('noReports')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t('id')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t('type')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t('title')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t('priority')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t('status')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t('assignedToMe')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t('date')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{report.report_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-2xl">{getTypeIcon(report.type)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-white">{report.title}</div>
                        <div className="text-sm text-gray-400 truncate max-w-xs">
                          {report.description.substring(0, 60)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(report.priority)}`}>
                          {priorities.find(p => p.value === report.priority)?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(report.status)}`}>
                          {statuses.find(s => s.value === report.status)?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {report.assignee ? [report.assignee.first_name, report.assignee.last_name].filter(Boolean).join(' ') || t('unassigned') : t('unassigned')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {formatDate(report.createdAt || report.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewReport(report.id)}
                          className="text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          {t('viewDetails')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* modal para crear reporte */}
      {showCreateModal && (
        <CreateReportModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadData();
            showSuccess(t('reportCreated'));
          }}
          reportTypes={reportTypes}
          priorities={priorities}
          t={t}
        />
      )}
    </div>
  );
};

// componente modal para crear reportes
const CreateReportModal = ({ onClose, onSuccess, reportTypes, priorities, t }) => {
  const [formData, setFormData] = useState({
    type: '',
    title: '',
    description: '',
    priority: 'medium'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await issueReportService.createReport(formData);
      onSuccess();
    } catch (error) {
      console.error('Error creating report:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-6">{t('createNewReport')}</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('reportType')} *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              required
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">{t('selectType')}</option>
              {reportTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('title')} *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Describe brevemente el problema..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('description')} *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={6}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Proporciona todos los detalles posibles..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('priority')}</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {priorities.map(priority => (
                <option key={priority.value} value={priority.value}>
                  {priority.icon} {priority.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition-all"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50"
            >
              {loading ? t('creating') : t('createReport')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Reports;
