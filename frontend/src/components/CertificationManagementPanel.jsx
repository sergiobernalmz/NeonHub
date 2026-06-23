import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Award,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Eye,
  RefreshCw,
  Plus,
  Download,
  FileText,
  Globe
} from 'lucide-react';
import certificationService from '../../services/certificationService';

const CertificationManagementPanel = () => {
  const [certifications, setCertifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCertification, setSelectedCertification] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [certsResponse, statsResponse] = await Promise.all([
        certificationService.getCertifications(),
        certificationService.getStats()
      ]);
      
      setCertifications(certsResponse.data.certifications || []);
      setStats(statsResponse.data || {});
    } catch (error) {
      console.error('Error cargando datos:', error);
      setError('Error al cargar los datos de certificaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyProduct = async (productId, certificationId) => {
    try {
      await certificationService.verifyProductCertification(productId, certificationId, {
        verificationDate: new Date().toISOString(),
        status: 'verified'
      });
      
      await loadData();
      setShowVerifyModal(false);
    } catch (error) {
      console.error('Error verificando producto:', error);
      setError('Error al verificar la certificacion del producto');
    }
  };

  const filteredCertifications = certifications.filter(cert => {
    const matchesSearch = cert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cert.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || cert.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'expired': return 'error';
      default: return 'secondary';
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'platinum': return 'bg-gray-100 text-gray-800';
      case 'gold': return 'bg-yellow-100 text-yellow-800';
      case 'silver': return 'bg-gray-50 text-gray-600';
      case 'bronze': return 'bg-orange-100 text-orange-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading && certifications.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Cargando panel de certificaciones...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* cabecera */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Panel de Certificaciones</h2>
          <p className="text-gray-600 mt-1">
            Gestiona y monitorea las certificaciones de sostenibilidad
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={loadData} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button variant="default" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Certificacion
          </Button>
        </div>
      </div>

      {/* alerta de error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* tarjetas de estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Certificaciones</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalCertifications || 0}</p>
                </div>
                <Award className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Productos Certificados</p>
                  <p className="text-2xl font-bold text-green-600">{stats.certifiedProducts || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Tasa de Certificacion</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.certificationRate || '0'}%</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Por Vencer</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.expiringSoon || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar certificaciones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={selectedType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('all')}
              >
                Todas
              </Button>
              <Button
                variant={selectedType === 'environmental' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('environmental')}
              >
                Ambiental
              </Button>
              <Button
                variant={selectedType === 'energy' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('energy')}
              >
                Energia
              </Button>
              <Button
                variant={selectedType === 'safety' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('safety')}
              >
                Seguridad
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* grid de certificaciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCertifications.map((cert) => (
          <Card key={cert.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: cert.color }}
                  ></div>
                  {cert.name}
                </CardTitle>
                <Badge variant={getStatusColor(cert.apiStatus)} className="text-xs">
                  {cert.isActive ? 'Activa' : 'Inactiva'}
                </Badge>
              </div>
              <CardDescription className="text-sm">
                {cert.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="font-medium text-gray-700">Codigo:</span>
                  <div className="font-mono bg-gray-100 px-2 py-1 rounded">
                    {cert.code}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Nivel:</span>
                  <div className={`px-2 py-1 rounded text-center ${getLevelColor(cert.level)}`}>
                    {cert.level}
                  </div>
                </div>
              </div>

              <div className="text-xs">
                <span className="font-medium text-gray-700">Emisor:</span>
                <p className="text-gray-600 mt-1">{cert.issuer}</p>
              </div>

              <div className="text-xs">
                <span className="font-medium text-gray-700">Validez:</span>
                <p className="text-gray-600 mt-1">
                  {cert.validityPeriod} dias ({Math.round(cert.validityPeriod / 30)} meses)
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setSelectedCertification(cert)}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Ver Detalles
                </Button>
                
                {cert.website && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(cert.website, '_blank')}
                  >
                    <Globe className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {cert.impact && (
                <div className="text-xs border-t pt-2 mt-2">
                  <span className="font-medium text-gray-700">Impacto:</span>
                  <div className="mt-1 space-y-1">
                    {Object.entries(JSON.parse(cert.impact)).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-600 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                        </span>
                        <span className="font-medium">{value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCertifications.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron certificaciones
            </h3>
            <p className="text-gray-600">
              Intenta ajustar los filtros de busqueda o agregar nuevas certificaciones.
            </p>
          </CardContent>
        </Card>
      )}

      {/* modal de detalle de certificación */}
      {selectedCertification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <div 
                    className="w-5 h-5 rounded-full" 
                    style={{ backgroundColor: selectedCertification.color }}
                  ></div>
                  {selectedCertification.name}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCertification(null)}
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Descripcion</h4>
                <p className="text-gray-600">{selectedCertification.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Informacion Basica</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Codigo:</strong> {selectedCertification.code}</div>
                    <div><strong>Tipo:</strong> {selectedCertification.type}</div>
                    <div><strong>Nivel:</strong> {selectedCertification.level}</div>
                    <div><strong>Region:</strong> {selectedCertification.region}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Validez</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Periodo:</strong> {selectedCertification.validityPeriod} dias</div>
                    <div><strong>Renovacion:</strong> {selectedCertification.renewalRequired ? 'Requerida' : 'No requerida'}</div>
                    <div><strong>Verificacion:</strong> {selectedCertification.verificationMethod}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Emisor</h4>
                <p className="text-gray-600">{selectedCertification.issuer}</p>
                {selectedCertification.website && (
                  <a
                    href={selectedCertification.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Visitar sitio web oficial
                  </a>
                )}
              </div>

              {selectedCertification.impact && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Impacto Ambiental</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(JSON.parse(selectedCertification.impact)).map(([key, value]) => (
                      <div key={key} className="flex justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-600 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </span>
                        <span className="font-medium text-green-600">{value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="default"
                  onClick={() => setShowVerifyModal(true)}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Verificar Producto
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CertificationManagementPanel;