import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  Leaf, 
  TrendingDown, 
  Award, 
  Factory,
  Zap,
  Droplets,
  Recycle,
  TreePine,
  Shield,
  Users
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import sustainabilityService from '../services/sustainabilityService';

const SustainabilityDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [carbonData, setCarbonData] = useState([]);
  const [supplierData, setSupplierData] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showError } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [dashboard, carbon, suppliers, monthly] = await Promise.all([
        sustainabilityService.getDashboardStats(),
        sustainabilityService.getCarbonFootprintByProduct(),
        sustainabilityService.getSupplierMetrics(),
        sustainabilityService.getMonthlyComparison()
      ]);

      setDashboardData(dashboard.data);
      setCarbonData(carbon.data);
      setSupplierData(suppliers.data);
      setMonthlyData(monthly.data);
      
    } catch (error) {
      console.error('Error loading sustainability data:', error);
      showError('Error al cargar datos de sostenibilidad: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, trend, color = "green" }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Icon className={`w-5 h-5 text-${color}-400`} />
            <h3 className="text-gray-300 text-sm font-medium">{title}</h3>
          </div>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && (
            <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
          )}
        </div>
        {trend && (
          <div className={`text-${trend > 0 ? 'green' : 'red'}-400 text-sm flex items-center gap-1`}>
            <TrendingDown className={`w-4 h-4 ${trend > 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
    </motion.div>
  );

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Leaf className="w-8 h-8 text-green-400" />
            Dashboard de Sostenibilidad
          </h1>
          <p className="text-gray-400 mt-1">
            Monitoreo del impacto ambiental y métricas de sostenibilidad
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={loadDashboardData}
          className="px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 hover:bg-green-500/30 transition-colors"
        >
          Actualizar
        </motion.button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={TreePine}
          title="CO₂ Total del Año"
          value={`${dashboardData?.totalCO2 || 0} kg`}
          subtitle="Huella de carbono acumulada"
          color="green"
        />
        <StatCard
          icon={TrendingDown}
          title="CO₂ Ahorrado Este Mes"
          value={`${dashboardData?.co2SavedThisMonth || 0} kg`}
          subtitle="vs productos convencionales"
          trend={15}
          color="green"
        />
        <StatCard
          icon={Award}
          title="Productos Sostenibles"
          value={`${dashboardData?.sustainableProductsPercentage || 0}%`}
          subtitle="del catálogo total"
          color="blue"
        />
        <StatCard
          icon={Users}
          title="Pedidos Verdes"
          value={`${dashboardData?.greenOrdersPercentage || 0}%`}
          subtitle="este mes"
          trend={8}
          color="purple"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Carbon Footprint by Product */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Factory className="w-5 h-5 text-blue-400" />
            Huella de Carbono por Producto
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={carbonData.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="name" 
                stroke="#9CA3AF"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#F3F4F6' }}
              />
              <Bar 
                dataKey="carbonFootprint" 
                fill="#10B981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Monthly CO2 Trend */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-green-400" />
            Tendencia Mensual de Emisiones
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="co2Emissions" 
                stroke="#10B981" 
                fill="url(#colorCO2)"
              />
              <defs>
                <linearGradient id="colorCO2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

      </div>

      {/* Supplier Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Supplier Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            Proveedores Sostenibles
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300">Total Proveedores</span>
                <span className="text-white font-semibold">{supplierData?.stats?.total || 0}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300">Sostenibles</span>
                <span className="text-green-400 font-semibold">{supplierData?.stats?.sustainable || 0}</span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-300">Puntuación Media</span>
                <span className="text-blue-400 font-semibold">{supplierData?.stats?.averageScore || 0}/100</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div 
                  className="bg-green-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${supplierData?.stats?.sustainablePercentage || 0}%` }}
                ></div>
              </div>
              <p className="text-center text-gray-400 text-sm mt-2">
                {supplierData?.stats?.sustainablePercentage || 0}% Certificados
              </p>
            </div>
          </div>
        </motion.div>

        {/* Supplier List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Factory className="w-5 h-5 text-purple-400" />
            Evaluación de Proveedores
          </h3>
          <div className="space-y-3">
            {supplierData?.suppliers?.map((supplier) => (
              <div key={supplier.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                <div>
                  <h4 className="text-white font-medium">{supplier.name}</h4>
                  <p className="text-gray-400 text-sm">
                    {supplier.products} productos • {supplier.certification}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-white font-semibold">{supplier.score}/100</div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      supplier.score >= 90 ? 'bg-green-500/20 text-green-400' :
                      supplier.score >= 70 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {supplier.score >= 90 ? 'Excelente' : supplier.score >= 70 ? 'Bueno' : 'Mejorable'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

      </div>

      {/* Environmental Impact Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <Leaf className="w-6 h-6 text-green-400" />
          <h3 className="text-xl font-bold text-white">Impacto Ambiental Acumulado</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <TreePine className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">
              {Math.round((dashboardData?.totalCO2 || 0) / 20)}
            </div>
            <div className="text-gray-400 text-sm">Árboles equivalentes</div>
          </div>
          <div className="text-center">
            <Zap className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">
              {Math.round((dashboardData?.totalCO2 || 0) * 2.5)}kWh
            </div>
            <div className="text-gray-400 text-sm">Energía ahorrada</div>
          </div>
          <div className="text-center">
            <Droplets className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">
              {Math.round((dashboardData?.totalCO2 || 0) * 15)}L
            </div>
            <div className="text-gray-400 text-sm">Agua conservada</div>
          </div>
          <div className="text-center">
            <Recycle className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">85%</div>
            <div className="text-gray-400 text-sm">Material reciclado</div>
          </div>
        </div>
      </motion.div>

    </div>
  );
};

export default SustainabilityDashboard;