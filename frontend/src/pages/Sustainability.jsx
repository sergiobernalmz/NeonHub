import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SustainabilityDashboard from '../components/SustainabilityDashboard';
import RealTimeControlPanel from '../components/sustainability/RealTimeControlPanel';
import CertificationPanel from '../components/CertificationPanel';
import { Leaf, BarChart3, FileText, Settings, Zap, Award } from 'lucide-react';

const Sustainability = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'realtime', label: 'Datos Reales', icon: Zap },
    { id: 'certifications', label: 'Certificaciones', icon: Award },
    { id: 'reports', label: 'Reportes ESG', icon: FileText },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  const ReportsContent = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Reportes de Sostenibilidad</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-700/30 rounded-lg">
            <h4 className="text-white font-semibold mb-2">Reporte Mensual</h4>
            <p className="text-gray-400 text-sm mb-3">Métricas ambientales del mes actual</p>
            <button className="px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 hover:bg-green-500/30 transition-colors">
              Generar Reporte
            </button>
          </div>
          <div className="p-4 bg-gray-700/30 rounded-lg">
            <h4 className="text-white font-semibold mb-2">Reporte Anual ESG</h4>
            <p className="text-gray-400 text-sm mb-3">Informe completo de sostenibilidad</p>
            <button className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 hover:bg-blue-500/30 transition-colors">
              Generar Reporte
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const SettingsContent = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Configuración de Sostenibilidad</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Objetivo de Reducción CO₂ (% anual)
            </label>
            <input
              type="number"
              defaultValue="25"
              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-400"
            />
          </div>
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Meta de Proveedores Sostenibles (%)
            </label>
            <input
              type="number"
              defaultValue="80"
              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-400"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="autoReports"
              defaultChecked
              className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500"
            />
            <label htmlFor="autoReports" className="text-gray-300">
              Generar reportes automáticamente
            </label>
          </div>
        </div>
        <button className="mt-6 px-6 py-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 hover:bg-green-500/30 transition-colors">
          Guardar Configuración
        </button>
      </div>
    </motion.div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <SustainabilityDashboard />;
      case 'realtime':
        return <RealTimeControlPanel />;
      case 'certifications':
        return <CertificationPanel />;
      case 'reports':
        return <ReportsContent />;
      case 'settings':
        return <SettingsContent />;
      default:
        return <SustainabilityDashboard />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="max-w-7xl mx-auto">

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Leaf className="w-8 h-8 text-green-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">
                Centro de Sostenibilidad
              </h1>
              <p className="text-gray-400">
                Monitoreo y gestión del impacto ambiental
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-gray-700">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors relative ${activeTab === tab.id
                      ? 'text-green-400 bg-gray-800/50'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/30'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-400"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
};

export default Sustainability;