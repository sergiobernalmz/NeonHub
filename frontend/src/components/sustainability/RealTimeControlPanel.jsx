import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  RefreshCw,
  Activity,
  Database,
  Clock,
  Zap,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Globe,
  Settings
} from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import sustainabilityService from '../../services/sustainabilityService';

const RealTimeControlPanel = () => {
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [apiConfig, setApiConfig] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSystemStatus();
    loadApiConfiguration();
    
    const interval = setInterval(loadSystemStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadSystemStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await sustainabilityService.getSystemStatus();
      setSystemStatus(response);
    } catch (error) {
      console.error('Error cargando estado del sistema:', error);
      setError('Error al cargar el estado del sistema');
    } finally {
      setLoading(false);
    }
  };

  const loadApiConfiguration = async () => {
    try {
      const response = await sustainabilityService.getApiConfiguration();
      setApiConfig(response);
    } catch (error) {
      console.error('Error cargando configuracion de APIs:', error);
    }
  };

  const forceUpdate = async () => {
    try {
      setUpdating(true);
      setError(null);
      const response = await sustainabilityService.forceRealTimeUpdate();
      setLastUpdate({
        timestamp: new Date(),
        data: response.data,
        success: true
      });
      setTimeout(loadSystemStatus, 2000);
    } catch (error) {
      console.error('Error forzando actualizacion:', error);
      setError('Error al actualizar los datos');
      setLastUpdate({
        timestamp: new Date(),
        success: false,
        error: error.message
      });
    } finally {
      setUpdating(false);
    }
  };

  const toggleScheduler = async (action) => {
    try {
      setError(null);
      await sustainabilityService.toggleScheduler(action);
      setTimeout(loadSystemStatus, 1000);
    } catch (error) {
      console.error('Error controlando scheduler:', error);
      setError(`Error ${action === 'start' ? 'iniciando' : 'deteniendo'} las actualizaciones automaticas`);
    }
  };

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getStatusBadge = (isRunning) => {
    return (
      <Badge variant={isRunning ? "success" : "secondary"} className="flex items-center gap-1">
        {isRunning ? <Activity className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
        {isRunning ? 'Activo' : 'Detenido'}
      </Badge>
    );
  };

  const getApiStatusBadge = (enabled) => {
    return (
      <Badge variant={enabled ? "success" : "outline"} className="text-xs">
        {enabled ? (
          <><CheckCircle className="h-3 w-3 mr-1" />Configurada</>
        ) : (
          <><AlertCircle className="h-3 w-3 mr-1" />No configurada</>
        )}
      </Badge>
    );
  };

  if (loading && !systemStatus) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Cargando estado del sistema...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Panel de Control - Datos Reales</h2>
          <p className="text-gray-600 mt-1">
            Gestiona las actualizaciones automaticas de metricas de sostenibilidad
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={loadSystemStatus}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar Estado
          </Button>
          
          <Button
            onClick={forceUpdate}
            variant="default"
            size="sm"
            disabled={updating}
          >
            <Zap className={`h-4 w-4 mr-2 ${updating ? 'animate-pulse' : ''}`} />
            {updating ? 'Actualizando...' : 'Forzar Actualizacion'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {lastUpdate && (
        <Alert variant={lastUpdate.success ? "default" : "destructive"}>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            {lastUpdate.success ? (
              <>✅ Ultima actualizacion exitosa: {lastUpdate.timestamp.toLocaleString()}</>
            ) : (
              <>❌ Error en actualizacion: {lastUpdate.error}</>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Scheduler Automatico
                </CardTitle>
                <CardDescription>
                  Control de actualizaciones automaticas
                </CardDescription>
              </div>
              {systemStatus && getStatusBadge(systemStatus.scheduler?.isRunning)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-700">Estado</div>
                <div className="text-gray-600">
                  {systemStatus?.scheduler?.isRunning ? 'Ejecutandose' : 'Detenido'}
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Intervalo</div>
                <div className="text-gray-600">
                  {systemStatus?.scheduler?.updateInterval || 'No configurado'} min
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Ultima actualizacion</div>
                <div className="text-gray-600">
                  {systemStatus?.scheduler?.lastUpdate?.timestamp ? 
                    new Date(systemStatus.scheduler.lastUpdate.timestamp).toLocaleString() : 
                    'Nunca'
                  }
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Resultado</div>
                <div className={`text-sm ${
                  systemStatus?.scheduler?.lastUpdate?.success ? 'text-green-600' : 'text-red-600'
                }`}>
                  {systemStatus?.scheduler?.lastUpdate?.success ? '✅ Exito' : '❌ Error'}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => toggleScheduler('start')}
                variant="default"
                size="sm"
                disabled={systemStatus?.scheduler?.isRunning}
              >
                <Play className="h-4 w-4 mr-2" />
                Iniciar
              </Button>
              <Button
                onClick={() => toggleScheduler('stop')}
                variant="outline"
                size="sm"
                disabled={!systemStatus?.scheduler?.isRunning}
              >
                <Pause className="h-4 w-4 mr-2" />
                Detener
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Base de Datos
            </CardTitle>
            <CardDescription>
              Estadisticas de almacenamiento de metricas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-700">Total metricas</div>
                <div className="text-2xl font-bold text-blue-600">
                  {systemStatus?.database?.totalMetrics || 0}
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Actualizaciones hoy</div>
                <div className="text-2xl font-bold text-green-600">
                  {systemStatus?.database?.todayUpdates || 0}
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Datos en tiempo real</div>
                <div className={`text-sm ${
                  systemStatus?.database?.isRealTime ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {systemStatus?.database?.isRealTime ? '✅ Si' : '⚠️ Demo'}
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Ultima metrica</div>
                <div className="text-gray-600">
                  {systemStatus?.database?.lastUpdate ? 
                    new Date(systemStatus.database.lastUpdate).toLocaleString() : 
                    'Sin datos'
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              APIs Externas
            </CardTitle>
            <CardDescription>
              Estado de conexiones a servicios de datos ambientales
            </CardDescription>
          </CardHeader>
          <CardContent>
            {apiConfig ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(apiConfig.apis).map(([key, api]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">
                          {key === 'co2Signal' && '🌍 CO2 Signal'}
                          {key === 'openWeather' && '🌤️ OpenWeather'}
                          {key === 'airQuality' && '🏭 Air Quality'}
                          {key === 'electricityMap' && '⚡ Electricity Map'}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {api.url}
                        </div>
                      </div>
                      {getApiStatusBadge(api.enabled)}
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center gap-4 pt-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span>Ubicacion: {apiConfig.location.city}, {apiConfig.location.country}</span>
                  </div>
                  {apiConfig.fallbackMode && (
                    <Badge variant="outline">
                      Modo simulacion activo
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">
                Cargando configuracion de APIs...
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Estado del Sistema
            </CardTitle>
            <CardDescription>
              Informacion general del servidor
            </CardDescription>
          </CardHeader>
          <CardContent>
            {systemStatus?.system && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-medium text-gray-700">Entorno</div>
                  <Badge variant={systemStatus.system.environment === 'production' ? 'default' : 'secondary'}>
                    {systemStatus.system.environment || 'development'}
                  </Badge>
                </div>
                <div>
                  <div className="font-medium text-gray-700">Tiempo activo</div>
                  <div className="text-gray-600">
                    {formatUptime(systemStatus.system.uptime)}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">Ultima consulta</div>
                  <div className="text-gray-600">
                    {new Date(systemStatus.system.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">Estado</div>
                  <Badge variant="success">🟢 Operacional</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RealTimeControlPanel;