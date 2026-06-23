import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  ExternalLink, 
  Award,
  Leaf,
  Zap,
  Star,
  Users,
  Recycle,
  ShieldCheck
} from 'lucide-react';
import { certificationService } from '../services/certificationService';

const CertificationBadges = ({ productId, showDetails = false, maxVisible = 3, size = 'sm' }) => {
  const [certifications, setCertifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (productId) {
      loadCertifications();
    }
  }, [productId]);

  const loadCertifications = async () => {
    try {
      setLoading(true);
      const response = await certificationService.getProductCertifications(productId, true);
      setCertifications(Array.isArray(response) ? response : (response?.data || []));
    } catch (error) {
      console.error('Error cargando certificaciones:', error);
      setCertifications([]);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      environmental: Leaf,
      energy: Zap,
      quality: Star,
      social: Users,
      organic: Leaf,
      safety: ShieldCheck,
      recycling: Recycle
    };
    return icons[type] || Award;
  };

  const getStatusIcon = (status, verificationStatus) => {
    if (verificationStatus === 'verified' && status === 'active') return CheckCircle;
    if (verificationStatus === 'error') return XCircle;
    if (verificationStatus === 'pending') return AlertTriangle;
    return Shield;
  };

  const getStatusColor = (status, verificationStatus, expiryDate) => {
    if (status !== 'active') return 'text-gray-400';
    if (verificationStatus === 'error') return 'text-red-500';
    
    const daysUntilExpiry = certificationService.getDaysUntilExpiry(expiryDate);
    if (daysUntilExpiry < 0) return 'text-red-500';
    if (daysUntilExpiry <= 7) return 'text-orange-500';
    if (daysUntilExpiry <= 30) return 'text-yellow-500';
    
    return verificationStatus === 'verified' ? 'text-green-500' : 'text-blue-500';
  };

  const getBadgeStyle = (certification, isCompact = false) => {
    const statusColor = getStatusColor(
      certification.status, 
      certification.verificationStatus, 
      certification.expiryDate
    );

    const baseStyle = isCompact 
      ? 'inline-flex items-center px-2 py-1 text-xs font-medium rounded-full'
      : 'inline-flex items-center px-3 py-1 text-sm font-medium rounded-full';

    const colorClass = statusColor.replace('text-', 'bg-').replace('-500', '-100');
    const textColorClass = statusColor.replace('-500', '-800');
    
    return `${baseStyle} ${colorClass} ${textColorClass}`;
  };

  const renderCompactBadge = (certification, _index) => {
    const TypeIcon = getTypeIcon(certification.Certification.type);
    const StatusIcon = getStatusIcon(certification.status, certification.verificationStatus);
    
    return (
      <div
        key={certification.id}
        className={getBadgeStyle(certification, true)}
        title={`${certification.Certification.name} - ${certificationService.formatVerificationStatus(certification.verificationStatus).text}`}
      >
        <TypeIcon className="w-3 h-3 mr-1" />
        <span className="truncate max-w-[80px]">
          {certification.Certification.code}
        </span>
        <StatusIcon className="w-3 h-3 ml-1" />
      </div>
    );
  };

  const renderDetailedBadge = (certification, _index) => {
    const TypeIcon = getTypeIcon(certification.Certification.type);
    const StatusIcon = getStatusIcon(certification.status, certification.verificationStatus);
    const daysUntilExpiry = certificationService.getDaysUntilExpiry(certification.expiryDate);
    
    return (
      <div
        key={certification.id}
        className="bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: certification.Certification.color + '20' }}
            >
              <TypeIcon 
                className="w-4 h-4" 
                style={{ color: certification.Certification.color }}
              />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm">
                {certification.Certification.name}
              </h4>
              <p className="text-xs text-gray-500">
                {certification.Certification.code}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            <StatusIcon className={`w-4 h-4 ${getStatusColor(certification.status, certification.verificationStatus, certification.expiryDate)}`} />
          </div>
        </div>

        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Estado:</span>
            <span className={`font-medium ${getStatusColor(certification.status, certification.verificationStatus, certification.expiryDate).replace('text-', 'text-')}`}>
              {certificationService.formatCertificationStatus(certification.status).text}
            </span>
          </div>
          
          {certification.level && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Nivel:</span>
              <span className="font-medium text-gray-700">
                {certificationService.formatCertificationLevel(certification.level).text}
              </span>
            </div>
          )}
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Vence:</span>
            <span className={`font-medium ${certificationService.getExpiryStatusColor(certification.expiryDate)}`}>
              {daysUntilExpiry > 0 ? `${daysUntilExpiry} días` : 'Expirada'}
            </span>
          </div>

          {certification.score && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Puntuación:</span>
              <span className="font-medium text-gray-700">
                {certification.score}/10
              </span>
            </div>
          )}
        </div>

        {certification.verificationUrl && (
          <div className="mt-2 pt-2 border-t">
            <a
              href={certification.verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Verificar online
            </a>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex space-x-2">
        {[...Array(2)].map((_, index) => (
          <div 
            key={index}
            className="animate-pulse bg-gray-200 rounded-full px-3 py-1"
            style={{ width: '80px', height: '24px' }}
          />
        ))}
      </div>
    );
  }

  if (!certifications.length) {
    return showDetails ? (
      <div className="text-xs text-gray-500 italic">
        Sin certificaciones
      </div>
    ) : null;
  }

  const activeCertifications = certifications.filter(cert => cert.status === 'active');
  const visibleCertifications = showAll ? activeCertifications : activeCertifications.slice(0, maxVisible);
  const hasMore = activeCertifications.length > maxVisible && !showAll;

  return (
    <div className="certification-badges">
      {showDetails ? (
        // Vista detallada para páginas de producto
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center">
            <Award className="w-4 h-4 mr-2" />
            Certificaciones ({activeCertifications.length})
          </h3>
          
          <div className="grid gap-3">
            {visibleCertifications.map((cert, index) => renderDetailedBadge(cert, index))}
          </div>
          
          {hasMore && (
            <button
              onClick={() => setShowAll(true)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Ver {activeCertifications.length - maxVisible} certificaciones más
            </button>
          )}
        </div>
      ) : (
        // Vista compacta para cards de productos
        <div className="flex flex-wrap gap-1">
          {visibleCertifications.map((cert, index) => renderCompactBadge(cert, index))}
          
          {hasMore && (
            <button
              onClick={() => setShowAll(true)}
              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
              title={`Ver ${activeCertifications.length - maxVisible} certificaciones más`}
            >
              +{activeCertifications.length - maxVisible}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CertificationBadges;