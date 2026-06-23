import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Calendar,
  Shield,
  ExternalLink,
  RefreshCw,
  Plus,
  Search,
  Filter,
  Download,
  BarChart3,
  Settings,
  Bell,
  Award,
  Zap,
  Globe
} from 'lucide-react';

const CertificationPanel = () => {
  // Estados principales
  const [certifications, setCertifications] = useState([]);
  const [productCertifications, setProductCertifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');

  // Estados para modales y formularios
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCertification, setSelectedCertification] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Estados de notificaciones
  const [expiringCerts, setExpiringCerts] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);

  useEffect(() => {
    loadInitialData();
    const interval = setInterval(loadStats, 5 * 60 * 1000); // Actualizar cada 5 minutos
    return () => clearInterval(interval);
  }, []);

  
  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadCertifications(),
        loadStats(),
        loadExpiringCertifications(),
        loadSystemStatus()
      ]);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  
  const loadCertifications = async () => {
    try {
      const response = await fetch('/api/certifications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCertifications(data.data.certifications || []);
      }
    } catch (error) {
      console.error('Error cargando certificaciones:', error);
    }
  };

  
  const loadStats = async () => {
    try {
      const response = await fetch('/api/certifications/stats');

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  
  const loadExpiringCertifications = async () => {
    try {
      const response = await fetch('/api/certifications/admin/expiring?days=30', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setExpiringCerts(data.data || []);
      }
    } catch (error) {
      console.error('Error cargando certificaciones por vencer:', error);
    }
  };

  
  const loadSystemStatus = async () => {
    try {
      // Aquí deberías llamar a un endpoint que devuelva el estado del scheduler
      // Por ahora simularemos datos
      setSystemStatus({
        schedulerRunning: true,
        lastVerification: new Date().toISOString(),
        nextVerification: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        apiConnections: 2,
        totalApis: 5,
        systemHealth: 'good'
      });
    } catch (error) {
      console.error('Error cargando estado del sistema:', error);
    }
  };

  
  const verifyAllCertifications = async () => {
    try {
      const response = await fetch('/api/certifications/admin/verify-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Verificación completada: ${data.data.verified} exitosas, ${data.data.failed} fallidas`);
        await loadStats();
      }
    } catch (error) {
      console.error('Error verificando certificaciones:', error);
      alert('Error verificando certificaciones');
    }
  };

  
  const initializeBaseCertifications = async () => {
    try {
      const response = await fetch('/api/certifications/admin/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        alert('Certificaciones base inicializadas correctamente');
        await loadCertifications();
      }
    } catch (error) {
      console.error('Error inicializando certificaciones:', error);
      alert('Error inicializando certificaciones base');
    }
  };

  
  const filteredCertifications = certifications.filter(cert => {
    const matchesSearch = cert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || cert.type === selectedType;
    const matchesRegion = selectedRegion === 'all' || cert.region === selectedRegion;

    return matchesSearch && matchesType && matchesRegion;
  });

  
  const getTypeColor = (type) => {
    const colors = {
      environmental: 'bg-green-100 text-green-800',
      energy: 'bg-yellow-100 text-yellow-800',
      quality: 'bg-blue-100 text-blue-800',
      social: 'bg-purple-100 text-purple-800',
      organic: 'bg-emerald-100 text-emerald-800',
      safety: 'bg-red-100 text-red-800',
      recycling: 'bg-cyan-100 text-cyan-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  
  const getStatusColor = (status) => {
    const colors = {
      active: 'text-green-600',
      expired: 'text-red-600',
      pending: 'text-yellow-600',
      suspended: 'text-orange-600',
      revoked: 'text-red-600'
    };
    return colors[status] || 'text-gray-600';
  };

  
  const getSystemHealthIcon = (health) => {
    if (health === 'excellent') return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (health === 'good') return <CheckCircle className="h-5 w-5 text-blue-500" />;
    if (health === 'partial') return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    if (health === 'simulation') return <Zap className="h-5 w-5 text-purple-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sistema de Certificaciones</h1>
          <p className="text-gray-600">Gestión completa de certificaciones sostenibles</p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={verifyAllCertifications}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Verificar Todo</span>
          </Button>
          <Button
            onClick={initializeBaseCertifications}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Inicializar Base</span>
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Certificación</span>
          </Button>
        </div>
      </div>

      {/* Estadísticas principales */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Award className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCertifications}</p>
                  <p className="text-sm text-gray-600">Certificaciones Totales</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeCertifications}</p>
                  <p className="text-sm text-gray-600">Activas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.certificationRate}%</p>
                  <p className="text-sm text-gray-600">Productos Certificados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Globe className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeApis}/{stats.apiConnections}</p>
                  <p className="text-sm text-gray-600">APIs Conectadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Estado del sistema */}
      {systemStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getSystemHealthIcon(stats?.systemHealth)}
              <span>Estado del Sistema</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <div className={`h-3 w-3 rounded-full ${systemStatus.schedulerRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm">
                  Scheduler {systemStatus.schedulerRunning ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Última verificación: {new Date(systemStatus.lastVerification).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">
                Próxima verificación: {new Date(systemStatus.nextVerification).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertas de vencimiento */}
      {expiringCerts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-yellow-800">
              <Bell className="h-5 w-5" />
              <span>Certificaciones Próximas a Vencer</span>
              <Badge variant="outline" className="text-yellow-800 border-yellow-800">
                {expiringCerts.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiringCerts.slice(0, 5).map(cert => (
                <div key={cert.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium">{cert.Product?.name}</p>
                      <p className="text-sm text-gray-600">{cert.Certification?.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-yellow-800">
                      {Math.ceil((new Date(cert.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))} días
                    </p>
                    <p className="text-sm text-gray-600">
                      Vence: {new Date(cert.expiryDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {expiringCerts.length > 5 && (
                <p className="text-sm text-gray-600 text-center pt-2">
                  Y {expiringCerts.length - 5} más...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs principales */}
      <Tabs defaultValue="certifications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="certifications">Certificaciones</TabsTrigger>
          <TabsTrigger value="products">Productos Certificados</TabsTrigger>
          <TabsTrigger value="management">Gestión Avanzada</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Tab de Certificaciones */}
        <TabsContent value="certifications" className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar certificaciones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">Todos los tipos</option>
              <option value="environmental">Ambiental</option>
              <option value="energy">Energía</option>
              <option value="quality">Calidad</option>
              <option value="social">Social</option>
              <option value="organic">Orgánico</option>
              <option value="safety">Seguridad</option>
              <option value="recycling">Reciclaje</option>
            </select>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">Todas las regiones</option>
              <option value="GLOBAL">Global</option>
              <option value="EU">Europa</option>
              <option value="US">Estados Unidos</option>
              <option value="ASIA">Asia</option>
              <option value="AMERICA">América</option>
            </select>
          </div>

          {/* Lista de certificaciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCertifications.map(cert => (
              <Card key={cert.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{cert.name}</CardTitle>
                      <CardDescription className="font-mono text-sm">
                        {cert.code}
                      </CardDescription>
                    </div>
                    <Badge
                      className={getTypeColor(cert.type)}
                    >
                      {cert.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                    {cert.description}
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Emisor:</span>
                      <span className="font-medium">{cert.issuer}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Región:</span>
                      <Badge variant="outline">{cert.region}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Validez:</span>
                      <span>{cert.validityPeriod} días</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Verificación:</span>
                      <Badge
                        variant={cert.verificationMethod === 'api_verification' ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {cert.verificationMethod === 'api_verification' ? 'Automática' : 'Manual'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    {cert.website && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(cert.website, '_blank')}
                        className="flex items-center space-x-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Sitio Web</span>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => setSelectedCertification(cert)}
                      className="flex items-center space-x-1"
                    >
                      <Shield className="h-3 w-3" />
                      <span>Detalles</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredCertifications.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  No se encontraron certificaciones
                </p>
                <p className="text-gray-600">
                  Intenta ajustar los filtros o crear una nueva certificación
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Otros tabs se implementarían aquí */}
        <TabsContent value="products">
          <Card>
            <CardContent className="p-8 text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Gestión de Productos Certificados
              </p>
              <p className="text-gray-600">
                Funcionalidad en desarrollo...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="management">
          <Card>
            <CardContent className="p-8 text-center">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Gestión Avanzada del Sistema
              </p>
              <p className="text-gray-600">
                Funcionalidad en desarrollo...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardContent className="p-8 text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Analytics de Certificaciones
              </p>
              <p className="text-gray-600">
                Funcionalidad en desarrollo...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CertificationPanel;