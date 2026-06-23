import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  CheckCircle,
  Shield,
  ExternalLink,
  Calendar,
  Award,
  Star,
  Leaf,
  Zap,
  Users,
  Recycle,
  AlertTriangle,
  Info
} from 'lucide-react';

const CertificationBadge = ({ 
  productId, 
  showDetails = false, 
  maxBadges = 3,
  size = 'sm',
  variant = 'compact' // compact, detailed, list
}) => {
  const [certifications, setCertifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (productId) {
      loadProductCertifications();
    }
  }, [productId]);

  
  const loadProductCertifications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/certifications/products/${productId}`);
      
      if (response.ok) {
        const data = await response.json();
        setCertifications(data.data || []);
      }
    } catch (error) {
      console.error('Error cargando certificaciones del producto:', error);
    } finally {
      setLoading(false);
    }
  };

  
  const getTypeIcon = (type) => {
    const iconClass = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
    
    const icons = {
      environmental: <Leaf className={iconClass} />,
      energy: <Zap className={iconClass} />,
      quality: <Award className={iconClass} />,
      social: <Users className={iconClass} />,
      organic: <Leaf className={iconClass} />,
      safety: <Shield className={iconClass} />,
      recycling: <Recycle className={iconClass} />
    };
    
    return icons[type] || <Shield className={iconClass} />;
  };

  
  const getTypeColor = (type) => {
    const colors = {
      environmental: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
      energy: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
      quality: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
      social: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
      organic: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200',
      safety: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
      recycling: 'bg-cyan-100 text-cyan-800 border-cyan-200 hover:bg-cyan-200'
    };
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200';
  };

  
  const getScoreColor = (score) => {
    if (score >= 9) return 'text-green-600';
    if (score >= 8) return 'text-blue-600';
    if (score >= 7) return 'text-yellow-600';
    return 'text-gray-600';
  };

  
  const isExpiringSoon = (expiryDate, days = 30) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const timeDiff = expiry.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff <= days && daysDiff > 0;
  };

  
  const isExpired = (expiryDate) => {
    return new Date() > new Date(expiryDate);
  };

  
  const getDaysUntilExpiry = (expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const timeDiff = expiry.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (daysDiff < 0) return 'Expirado';
    if (daysDiff === 0) return 'Expira hoy';
    if (daysDiff === 1) return 'Expira mañana';
    return `${daysDiff} días`;
  };

  if (loading) {
    return (
      <div className="flex space-x-1">
        {[...Array(3)].map((_, i) => (
          <div 
            key={i} 
            className="h-6 w-16 bg-gray-200 animate-pulse rounded-full"
          />
        ))}
      </div>
    );
  }

  if (certifications.length === 0) {
    return null;
  }

  // Filtrar certificaciones activas y ordenar por prioridad
  const activeCertifications = certifications
    .filter(cert => cert.status === 'active' && cert.isPublic)
    .sort((a, b) => {
      // Primero por prioridad, luego por score
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.score && b.score) return b.score - a.score;
      return 0;
    });

  if (activeCertifications.length === 0) {
    return null;
  }

  // Variante compacta (para cards de productos)
  if (variant === 'compact') {
    const visibleCerts = activeCertifications.slice(0, maxBadges);
    const hiddenCount = Math.max(0, activeCertifications.length - maxBadges);

    return (
      <div className="flex flex-wrap gap-1">
        {visibleCerts.map(cert => {
          const isExpiring = isExpiringSoon(cert.expiryDate);
          const expired = isExpired(cert.expiryDate);
          
          return (
            <Dialog key={cert.id}>
              <DialogTrigger asChild>
                <Badge
                  className={`
                    ${getTypeColor(cert.Certification.type)}
                    cursor-pointer transition-all duration-200
                    flex items-center space-x-1 border
                    ${expired ? 'opacity-50 line-through' : ''}
                    ${isExpiring ? 'ring-1 ring-yellow-400' : ''}
                  `}
                  variant="outline"
                >
                  {getTypeIcon(cert.Certification.type)}
                  <span className="text-xs font-medium">
                    {cert.Certification.code}
                  </span>
                  {cert.score && (
                    <span className={`text-xs font-bold ${getScoreColor(cert.score)}`}>
                      {cert.score}
                    </span>
                  )}
                  {isExpiring && (
                    <AlertTriangle className="h-3 w-3 text-yellow-600" />
                  )}
                </Badge>
              </DialogTrigger>
              
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    {getTypeIcon(cert.Certification.type)}
                    <span>{cert.Certification.name}</span>
                    {cert.verificationStatus === 'verified' && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </DialogTitle>
                  <DialogDescription>
                    {cert.Certification.description}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Información básica */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Código:</span>
                      <p className="font-mono">{cert.certificationNumber}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Nivel:</span>
                      <p className="font-medium capitalize">{cert.level || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Emisor:</span>
                      <p>{cert.certifyingBody}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Estado:</span>
                      <Badge 
                        variant={cert.status === 'active' ? 'default' : 'destructive'}
                        className="capitalize"
                      >
                        {cert.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Score y fechas */}
                  {cert.score && (
                    <div className="flex items-center space-x-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">Puntuación:</span>
                      <span className={`font-bold ${getScoreColor(cert.score)}`}>
                        {cert.score}/10
                      </span>
                    </div>
                  )}

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>Válido hasta:</span>
                      <span className={expired ? 'text-red-600 font-medium' : 'text-gray-900'}>
                        {new Date(cert.expiryDate).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {!expired && (
                      <div className="flex items-center space-x-2">
                        <Info className="h-4 w-4 text-blue-400" />
                        <span>Tiempo restante:</span>
                        <span className={isExpiring ? 'text-yellow-600 font-medium' : 'text-gray-600'}>
                          {getDaysUntilExpiry(cert.expiryDate)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Impacto ambiental */}
                  {cert.Certification.impact && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-2">Impacto Ambiental</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(cert.Certification.impact).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-green-700 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                            </span>
                            <span className="font-medium text-green-900">{value}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Enlaces */}
                  <div className="flex space-x-2">
                    {cert.verificationUrl && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => window.open(cert.verificationUrl, '_blank')}
                        className="flex items-center space-x-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Verificar</span>
                      </Button>
                    )}
                    {cert.Certification.website && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => window.open(cert.Certification.website, '_blank')}
                        className="flex items-center space-x-1"
                      >
                        <Info className="h-3 w-3" />
                        <span>Más Info</span>
                      </Button>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          );
        })}
        
        {hiddenCount > 0 && (
          <Badge variant="outline" className="text-xs text-gray-600">
            +{hiddenCount} más
          </Badge>
        )}
      </div>
    );
  }

  // Variante detallada (para páginas de producto)
  if (variant === 'detailed') {
    return (
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900 flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>Certificaciones Sostenibles</span>
          <Badge variant="outline">{activeCertifications.length}</Badge>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activeCertifications.map(cert => {
            const isExpiring = isExpiringSoon(cert.expiryDate);
            const expired = isExpired(cert.expiryDate);
            
            return (
              <Card 
                key={cert.id} 
                className={`
                  ${expired ? 'opacity-60 border-gray-300' : 'border-gray-200'}
                  ${isExpiring ? 'border-yellow-300 bg-yellow-50' : ''}
                  hover:shadow-md transition-all duration-200
                `}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(cert.Certification.type)}
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {cert.Certification.name}
                        </h4>
                        <p className="text-xs text-gray-500 font-mono">
                          {cert.certificationNumber}
                        </p>
                      </div>
                    </div>
                    {cert.verificationStatus === 'verified' && (
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>{cert.certifyingBody}</span>
                    {cert.score && (
                      <span className={`font-bold ${getScoreColor(cert.score)}`}>
                        {cert.score}/10
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs mt-2">
                    <span className={expired ? 'text-red-600' : isExpiring ? 'text-yellow-600' : 'text-gray-500'}>
                      {expired ? 'Expirado' : getDaysUntilExpiry(cert.expiryDate)}
                    </span>
                    <Badge 
                      className={getTypeColor(cert.Certification.type)}
                      variant="outline"
                    >
                      {cert.Certification.type}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Variante lista (para administración)
  if (variant === 'list') {
    return (
      <div className="space-y-2">
        {activeCertifications.map(cert => {
          const isExpiring = isExpiringSoon(cert.expiryDate);
          const expired = isExpired(cert.expiryDate);
          
          return (
            <div 
              key={cert.id} 
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${getTypeColor(cert.Certification.type)}`}>
                  {getTypeIcon(cert.Certification.type)}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    {cert.Certification.name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {cert.certificationNumber} • {cert.certifyingBody}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                {cert.score && (
                  <p className={`text-sm font-bold ${getScoreColor(cert.score)}`}>
                    {cert.score}/10
                  </p>
                )}
                <p className={`text-xs ${expired ? 'text-red-600' : isExpiring ? 'text-yellow-600' : 'text-gray-500'}`}>
                  {expired ? 'Expirado' : getDaysUntilExpiry(cert.expiryDate)}
                </p>
                {isExpiring && (
                  <AlertTriangle className="h-3 w-3 text-yellow-600 ml-auto mt-1" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return null;
};

export default CertificationBadge;