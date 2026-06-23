const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const { Certification, ProductCertification, Product, Notification, User } = require('../models');
const certificationDataService = require('./certificationDataService');

class CertificationScheduler {
  constructor() {
    this.isRunning = false;
    this.jobs = [];
    this.logPath = path.join(__dirname, '../../logs/certification-scheduler.log');
    this.lastRun = {
      verification: null,
      expiration_check: null,
      cleanup: null,
      daily_summary: null
    };
    
    // Configuración de horarios
    this.schedules = {
      // Verificación de certificaciones API cada 6 horas (horario comercial)
      verification: '0 9,15 * * *', // 9:00 y 15:00
      
      // Verificación de vencimientos cada 2 horas
      expiration_check: '0 */2 * * *',
      
      // Limpieza de certificaciones expiradas diaria a las 2:00 AM
      cleanup: '0 2 * * *',
      
      // Resumen diario a las 8:00 AM
      daily_summary: '0 8 * * *',
      
      // Verificación rápida cada 30 minutos (solo certificaciones críticas)
      quick_check: '*/30 * * * *'
    };

    this.statistics = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      certificationsVerified: 0,
      alertsSent: 0,
      errorsFound: 0
    };
  }

  
  async start() {
    if (this.isRunning) {
      console.log('🔄 Certification scheduler ya está ejecutándose');
      return;
    }

    try {
      await this.ensureLogDirectory();
      await this.log('🚀 Iniciando Certification Scheduler...');

      // Job 1: Verificación completa de certificaciones
      this.jobs.push(cron.schedule(this.schedules.verification, async () => {
        await this.runVerificationCheck();
      }, { 
        scheduled: false,
        name: 'certification-verification'
      }));

      // Job 2: Verificación de vencimientos
      this.jobs.push(cron.schedule(this.schedules.expiration_check, async () => {
        await this.runExpirationCheck();
      }, { 
        scheduled: false,
        name: 'expiration-check'
      }));

      // Job 3: Limpieza nocturna
      this.jobs.push(cron.schedule(this.schedules.cleanup, async () => {
        await this.runCleanup();
      }, { 
        scheduled: false,
        name: 'cleanup'
      }));

      // Job 4: Resumen diario
      this.jobs.push(cron.schedule(this.schedules.daily_summary, async () => {
        await this.generateDailySummary();
      }, { 
        scheduled: false,
        name: 'daily-summary'
      }));

      // Job 5: Verificación rápida
      this.jobs.push(cron.schedule(this.schedules.quick_check, async () => {
        await this.runQuickCheck();
      }, { 
        scheduled: false,
        name: 'quick-check'
      }));

      // Iniciar todos los jobs
      this.jobs.forEach(job => job.start());
      this.isRunning = true;

      await this.log(`✅ Certification Scheduler iniciado con ${this.jobs.length} trabajos programados`);
      await this.log(`📅 Próximas ejecuciones:
        - Verificación: ${this.schedules.verification}
        - Vencimientos: ${this.schedules.expiration_check} 
        - Limpieza: ${this.schedules.cleanup}
        - Resumen: ${this.schedules.daily_summary}
        - Verificación rápida: ${this.schedules.quick_check}`);

      console.log('✅ Certification Scheduler iniciado correctamente');
      
      // Ejecutar verificación inicial después de 30 segundos
      setTimeout(() => this.runInitialCheck(), 30000);

    } catch (error) {
      console.error('❌ Error iniciando Certification Scheduler:', error);
      await this.log(`❌ Error iniciando scheduler: ${error.message}`);
    }
  }

  
  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.jobs.forEach(job => {
      job.stop();
      job.destroy();
    });
    
    this.jobs = [];
    this.isRunning = false;
    
    await this.log('🛑 Certification Scheduler detenido');
    console.log('🛑 Certification Scheduler detenido');
  }

  
  async runInitialCheck() {
    try {
      await this.log('🔍 Ejecutando verificación inicial...');
      
      // Verificar certificaciones críticas próximas a vencer (7 días)
      const criticalCertifications = await ProductCertification.findExpiring(7);
      
      if (criticalCertifications.length > 0) {
        await this.log(`⚠️ ALERTA: ${criticalCertifications.length} certificaciones vencen en menos de 7 días`);
        await this.sendExpirationAlerts(criticalCertifications);
      }

      // Verificar certificaciones que necesitan renovación
      const pendingVerification = await ProductCertification.findPendingVerification();
      if (pendingVerification.length > 0) {
        await this.log(`🔄 ${pendingVerification.length} certificaciones necesitan verificación`);
      }

      await this.log('✅ Verificación inicial completada');
      
    } catch (error) {
      console.error('Error en verificación inicial:', error);
      await this.log(`❌ Error en verificación inicial: ${error.message}`);
    }
  }

  
  async runVerificationCheck() {
    const startTime = Date.now();
    this.statistics.totalRuns++;

    try {
      this.lastRun.verification = new Date();
      await this.log('🔍 Iniciando verificación completa de certificaciones...');

      const pendingCertifications = await ProductCertification.findPendingVerification();
      
      if (pendingCertifications.length === 0) {
        await this.log('✅ No hay certificaciones pendientes de verificación');
        return;
      }

      let verified = 0;
      let failed = 0;
      let errors = [];

      for (const productCert of pendingCertifications) {
        try {
          const verificationData = await certificationDataService.verifyProductCertification(
            productCert.certificationNumber,
            productCert.Certification.code
          );

          await productCert.update({
            verificationStatus: verificationData.verified ? 'verified' : 'error',
            lastVerification: new Date(),
            verificationData: verificationData.metadata || null,
            nextVerification: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
            score: verificationData.score || productCert.score,
            level: verificationData.level || productCert.level
          });

          if (verificationData.verified) {
            verified++;
          } else {
            failed++;
            errors.push(`${productCert.Product?.name || 'Producto desconocido'}: ${verificationData.error || 'Error desconocido'}`);
          }

          this.statistics.certificationsVerified++;
          
          // pausa entre llamadas
          await this.sleep(1000);

        } catch (error) {
          failed++;
          errors.push(`Error verificando ${productCert.id}: ${error.message}`);
          await this.log(`❌ Error verificando certificación ${productCert.id}: ${error.message}`);
        }
      }

      const duration = Date.now() - startTime;
      await this.log(`✅ Verificación completada en ${duration}ms: ${verified} exitosas, ${failed} fallidas`);
      
      if (errors.length > 0 && errors.length <= 5) {
        await this.log(`⚠️ Errores encontrados: ${errors.join(', ')}`);
      } else if (errors.length > 5) {
        await this.log(`⚠️ ${errors.length} errores encontrados (demasiados para listar)`);
      }

      this.statistics.successfulRuns++;
      this.statistics.errorsFound += failed;

      // alerta si hay muchos errores
      if (failed > pendingCertifications.length * 0.3) { 
        await this.sendAdminAlert('certification_failures', {
          failed,
          total: pendingCertifications.length,
          errors: errors.slice(0, 10) 
        });
      }

    } catch (error) {
      this.statistics.failedRuns++;
      console.error('Error en verificación de certificaciones:', error);
      await this.log(`❌ Error en verificación: ${error.message}`);
    }
  }

  
  async runExpirationCheck() {
    try {
      this.lastRun.expiration_check = new Date();
      await this.log('📅 Verificando certificaciones próximas a vencer...');

      
      const [
        expiring7Days,
        expiring15Days,
        expiring30Days,
        expired
      ] = await Promise.all([
        ProductCertification.findExpiring(7),
        ProductCertification.findExpiring(15),
        ProductCertification.findExpiring(30),
        ProductCertification.findExpired()
      ]);

      
      if (expired.length > 0) {
        await Promise.all(expired.map(cert => cert.update({ status: 'expired' })));
        await this.log(`🚫 ${expired.length} certificaciones marcadas como expiradas`);
      }

      
      if (expiring7Days.length > 0) {
        await this.sendExpirationAlerts(expiring7Days, 'critical');
        await this.log(`🚨 CRÍTICO: ${expiring7Days.length} certificaciones vencen en 7 días`);
      }

      if (expiring15Days.length > 0) {
        await this.sendExpirationAlerts(expiring15Days.filter(cert => 
          !expiring7Days.find(c => c.id === cert.id)
        ), 'warning');
        await this.log(`⚠️ ADVERTENCIA: ${expiring15Days.length - expiring7Days.length} certificaciones vencen en 15 días`);
      }

      if (expiring30Days.length > 0) {
        await this.sendExpirationAlerts(expiring30Days.filter(cert => 
          !expiring15Days.find(c => c.id === cert.id)
        ), 'info');
        await this.log(`ℹ️ INFO: ${expiring30Days.length - expiring15Days.length} certificaciones vencen en 30 días`);
      }

      await this.log('✅ Verificación de vencimientos completada');

    } catch (error) {
      console.error('Error verificando vencimientos:', error);
      await this.log(`❌ Error verificando vencimientos: ${error.message}`);
    }
  }

  
  async runQuickCheck() {
    try {
      
      const criticalCertifications = await ProductCertification.findExpiring(3);
      
      if (criticalCertifications.length > 0) {
        await this.log(`🚨 Quick check: ${criticalCertifications.length} certificaciones críticas`);
        
        
        for (const cert of criticalCertifications) {
          if (cert.needsVerification()) {
            const verificationData = await certificationDataService.verifyProductCertification(
              cert.certificationNumber,
              cert.Certification.code
            );

            if (!verificationData.verified) {
              await this.log(`🚨 ALERTA: Certificación ${cert.certificationNumber} no pudo ser verificada`);
            }
          }
        }
      }

    } catch (error) {
      await this.log(`❌ Error en quick check: ${error.message}`);
    }
  }

  
  async runCleanup() {
    try {
      this.lastRun.cleanup = new Date();
      await this.log('🧹 Iniciando limpieza nocturna...');

      
      const veryOldCertifications = await ProductCertification.findAll({
        where: {
          status: 'expired',
          updatedAt: {
            [require('sequelize').Op.lt]: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // 1 año
          }
        }
      });

      if (veryOldCertifications.length > 0) {
        await Promise.all(veryOldCertifications.map(cert => cert.destroy()));
        await this.log(`🗑️ ${veryOldCertifications.length} certificaciones antiguas archivadas`);
      }

      
      await this.cleanOldLogs();

      await this.log('✅ Limpieza completada');

    } catch (error) {
      console.error('Error en limpieza:', error);
      await this.log(`❌ Error en limpieza: ${error.message}`);
    }
  }

  
  async generateDailySummary() {
    try {
      this.lastRun.daily_summary = new Date();
      await this.log('📊 Generando resumen diario...');

      const [
        totalActive,
        expiring7Days,
        expiring30Days,
        needVerification,
        failedVerifications
      ] = await Promise.all([
        ProductCertification.count({ where: { status: 'active' } }),
        ProductCertification.findExpiring(7),
        ProductCertification.findExpiring(30),
        ProductCertification.findPendingVerification(),
        ProductCertification.count({ where: { verificationStatus: 'error' } })
      ]);

      const summary = {
        date: new Date().toISOString().split('T')[0],
        statistics: {
          ...this.statistics,
          activeCertifications: totalActive,
          expiring7Days: expiring7Days.length,
          expiring30Days: expiring30Days.length,
          needVerification: needVerification.length,
          failedVerifications
        },
        systemHealth: this.calculateSystemHealth(),
        lastRun: this.lastRun
      };

      await this.log(`📊 RESUMEN DIARIO:
        📈 Certificaciones activas: ${totalActive}
        🚨 Vencen en 7 días: ${expiring7Days.length}
        ⚠️ Vencen en 30 días: ${expiring30Days.length}
        🔄 Necesitan verificación: ${needVerification.length}
        ❌ Verificaciones fallidas: ${failedVerifications}
        ✅ Ejecuciones exitosas hoy: ${this.statistics.successfulRuns}
        ❌ Ejecuciones fallidas hoy: ${this.statistics.failedRuns}`);

      // Enviar resumen a administradores
      await this.sendDailySummaryToAdmins(summary);

      // reset stats diarias
      this.statistics.successfulRuns = 0;
      this.statistics.failedRuns = 0;
      this.statistics.certificationsVerified = 0;
      this.statistics.alertsSent = 0;
      this.statistics.errorsFound = 0;

    } catch (error) {
      console.error('Error generando resumen diario:', error);
      await this.log(`❌ Error generando resumen: ${error.message}`);
    }
  }

  
  async sendExpirationAlerts(certifications, severity = 'warning') {
    try {
      const alertMap = new Map();

      
      certifications.forEach(cert => {
        const productId = cert.productId;
        if (!alertMap.has(productId)) {
          alertMap.set(productId, []);
        }
        alertMap.get(productId).push(cert);
      });

      for (const [productId, certs] of alertMap) {
        
        const shouldSend = certs.some(cert => cert.shouldSendAlert(`expiry_${severity}`));
        
        if (shouldSend) {
          const productName = certs[0].Product?.name || 'Producto desconocido';
          const certNames = certs.map(c => c.Certification?.name).join(', ');
          const minDays = Math.min(...certs.map(c => c.getDaysUntilExpiry()));

          await this.createNotification({
            type: 'certification_expiry',
            severity,
            title: `Certificaciones próximas a vencer`,
            message: `El producto "${productName}" tiene ${certs.length} certificación(es) que vencen en ${minDays} días: ${certNames}`,
            data: {
              productId,
              certifications: certs.map(c => ({
                id: c.id,
                name: c.Certification?.name,
                expiryDate: c.expiryDate,
                daysUntilExpiry: c.getDaysUntilExpiry()
              }))
            }
          });

          
          await Promise.all(certs.map(cert => cert.markAlertSent(`expiry_${severity}`)));
          this.statistics.alertsSent++;
        }
      }

    } catch (error) {
      await this.log(`❌ Error enviando alertas: ${error.message}`);
    }
  }

  
  async createNotification({ type, severity, title, message, data }) {
    try {
      
      const adminUsers = await User.findAll({
        include: [{
          model: require('../models').UserRole,
          as: 'userRoles',
          include: [{
            model: require('../models').Role,
            as: 'role',
            where: { name: ['admin', 'manager'] }
          }]
        }]
      });

      
      const notifications = adminUsers.map(user => ({
        user_id: user.id,
        type,
        title,
        message,
        data,
        priority: severity === 'critical' ? 'high' : severity === 'warning' ? 'medium' : 'low',
        read: false
      }));

      await Notification.bulkCreate(notifications);

    } catch (error) {
      await this.log(`❌ Error creando notificaciones: ${error.message}`);
    }
  }

  async sendAdminAlert(type, data) {
    await this.createNotification({
      type: `admin_${type}`,
      severity: 'critical',
      title: 'Alerta del Sistema de Certificaciones',
      message: `Se detectaron problemas en el sistema: ${JSON.stringify(data)}`,
      data
    });
  }

  async sendDailySummaryToAdmins(summary) {
    await this.createNotification({
      type: 'daily_summary',
      severity: 'info',
      title: 'Resumen Diario - Certificaciones',
      message: `Resumen del sistema de certificaciones: ${summary.statistics.activeCertifications} activas, ${summary.statistics.expiring7Days} próximas a vencer`,
      data: summary
    });
  }

  calculateSystemHealth() {
    const errorRate = this.statistics.totalRuns > 0 ? 
      (this.statistics.failedRuns / this.statistics.totalRuns) : 0;
    
    if (errorRate > 0.5) return 'critical';
    if (errorRate > 0.2) return 'warning';
    return 'good';
  }

  async ensureLogDirectory() {
    const logDir = path.dirname(this.logPath);
    try {
      await fs.access(logDir);
    } catch {
      await fs.mkdir(logDir, { recursive: true });
    }
  }

  async log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}\n`;
    
    try {
      await fs.appendFile(this.logPath, logMessage);
    } catch (error) {
      console.error('Error escribiendo log:', error);
    }
    
    // También imprimir en consola en desarrollo
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[CertificationScheduler] ${message}`);
    }
  }

  async cleanOldLogs() {
    try {
      const stats = await fs.stat(this.logPath);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      if (stats.mtime < thirtyDaysAgo) {
        await fs.writeFile(this.logPath, `${new Date().toISOString()} - Log limpiado automáticamente\n`);
        await this.log('🧹 Log anterior archivado');
      }
    } catch (error) {
      
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobs: this.jobs.length,
      statistics: this.statistics,
      lastRun: this.lastRun,
      schedules: this.schedules,
      systemHealth: this.calculateSystemHealth()
    };
  }
}

module.exports = new CertificationScheduler();