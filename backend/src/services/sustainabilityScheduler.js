const cron = require('node-cron');
const RealTimeDataService = require('./realTimeDataService');

class SustainabilityScheduler {
    constructor() {
        this.dataService = new RealTimeDataService();
        this.isRunning = false;
        this.lastUpdate = null;
        this.updateInterval = process.env.SUSTAINABILITY_UPDATE_INTERVAL || '*/30'; // Cada 30 minutos por defecto
    }

    
    start() {
        if (this.isRunning) {
            console.log('⚠️ Scheduler ya está ejecutándose');
            return;
        }

        console.log('🚀 Iniciando scheduler de métricas de sostenibilidad...');
        
        
        
        cron.schedule(`${this.updateInterval} 9-18 * * 1-5`, async () => {
            await this.runUpdate('scheduled_business_hours');
        });

        
        cron.schedule('0 */2 * * *', async () => {
            const hour = new Date().getHours();
            const isBusinessHours = hour >= 9 && hour <= 18;
            const isWeekday = ![0, 6].includes(new Date().getDay());
            
            if (!isBusinessHours || !isWeekday) {
                await this.runUpdate('scheduled_off_hours');
            }
        });

        
        cron.schedule('0 12-14,16-18 * * 1-5', async () => {
            await this.runUpdate('scheduled_peak_hours');
        });

        
        cron.schedule('45 23 * * *', async () => {
            await this.generateDailySummary();
        });

        this.isRunning = true;
        console.log('✅ Scheduler iniciado correctamente');
        console.log(`📅 Próximas actualizaciones:`);
        console.log(`   • Horario comercial (L-V 9-18h): cada 30 minutos`);
        console.log(`   • Fuera de horario: cada 2 horas`);
        console.log(`   • Horas pico (12-14h, 16-18h): cada hora`);
        console.log(`   • Resumen diario: 23:45h`);
        
        
        setTimeout(() => {
            this.runUpdate('initial_startup');
        }, 5000); 
    }

    
    stop() {
        this.isRunning = false;
        console.log('🛑 Scheduler de sostenibilidad detenido');
    }

    
    async runUpdate(trigger = 'manual') {
        const startTime = new Date();
        
        try {
            console.log(`\n🌍 [${startTime.toLocaleString()}] Iniciando actualización de métricas (${trigger})`);
            
            const result = await this.dataService.updateSustainabilityMetrics();
            
            const duration = new Date() - startTime;
            this.lastUpdate = {
                timestamp: startTime,
                duration,
                trigger,
                success: true,
                summary: result.summary
            };

            console.log(`✅ Actualización completada en ${duration}ms`);
            console.log(`📊 Resumen: CO2=${result.summary.carbonFootprint}kg, Energía=${result.summary.energyConsumption}kWh, Renovable=${result.summary.renewablePercentage}%`);
            
            
            this.notifyClients(result.summary);
            
            return result;

        } catch (error) {
            const duration = new Date() - startTime;
            
            this.lastUpdate = {
                timestamp: startTime,
                duration,
                trigger,
                success: false,
                error: error.message
            };

            console.error(`❌ Error en actualización de sostenibilidad (${duration}ms):`, error.message);
            
            
            if (process.env.NODE_ENV === 'development') {
                console.error('Stack trace:', error.stack);
            }

            // Do NOT re-throw: a single failed update must not crash the scheduler.
            // The error is already recorded in this.lastUpdate; cron callbacks continue normally.
            return null;
        }
    }

    
    async generateDailySummary() {
        try {
            console.log('\n📋 Generando resumen diario de sostenibilidad...');
            
            const { SustainabilityMetric } = require('../models');
            const { Op } = require('sequelize');
            
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            
            const todayMetrics = await SustainabilityMetric.findAll({
                where: {
                    created_at: {
                        [Op.gte]: new Date(today.getFullYear(), today.getMonth(), today.getDate())
                    }
                }
            });

            if (todayMetrics.length === 0) {
                console.log('ℹ️ No hay métricas para generar resumen diario');
                return;
            }

            
            const summary = {};
            todayMetrics.forEach(metric => {
                if (!summary[metric.metric_type]) {
                    summary[metric.metric_type] = [];
                }
                summary[metric.metric_type].push({
                    value: parseFloat(metric.value),
                    unit: metric.unit,
                    timestamp: metric.created_at
                });
            });

            
            const dailyStats = {};
            Object.keys(summary).forEach(type => {
                const values = summary[type].map(m => m.value);
                dailyStats[type] = {
                    count: values.length,
                    avg: values.reduce((a, b) => a + b, 0) / values.length,
                    min: Math.min(...values),
                    max: Math.max(...values),
                    latest: values[values.length - 1],
                    unit: summary[type][0].unit
                };
            });

            console.log('📊 Resumen diario de sostenibilidad:');
            Object.entries(dailyStats).forEach(([type, stats]) => {
                console.log(`   • ${type}: ${stats.latest} ${stats.unit} (Promedio: ${stats.avg.toFixed(2)}, Min: ${stats.min}, Max: ${stats.max})`);
            });

            
            this.saveDailySummaryToLog(dailyStats, today);
            
        } catch (error) {
            console.error('❌ Error generando resumen diario:', error);
        }
    }

    
    saveDailySummaryToLog(stats, date) {
        const fs = require('fs');
        const path = require('path');
        
        try {
            const logDir = path.join(process.cwd(), 'logs', 'sustainability');
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            
            const logFile = path.join(logDir, `daily-summary-${date.toISOString().split('T')[0]}.json`);
            const logData = {
                date: date.toISOString().split('T')[0],
                timestamp: new Date().toISOString(),
                metrics: stats,
                summary: {
                    total_updates: Object.values(stats).reduce((sum, s) => sum + s.count, 0),
                    data_quality: this.assessDataQuality(stats),
                    sustainability_score: this.calculateSustainabilityScore(stats)
                }
            };
            
            fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));
            console.log(`💾 Resumen guardado en: ${logFile}`);
            
        } catch (error) {
            console.error('❌ Error guardando resumen diario:', error);
        }
    }

    
    assessDataQuality(stats) {
        const typeCount = Object.keys(stats).length;
        const expectedTypes = 5; // carbon_footprint, energy_consumption, water_usage, waste_generated, recycling_rate
        
        const completeness = typeCount / expectedTypes;
        const consistency = Object.values(stats).every(s => s.count > 0) ? 1 : 0.5;
        
        const quality = (completeness + consistency) / 2;
        
        if (quality >= 0.9) return 'Excelente';
        if (quality >= 0.7) return 'Buena';
        if (quality >= 0.5) return 'Regular';
        return 'Deficiente';
    }

    
    calculateSustainabilityScore(stats) {
        let score = 50; // Base 50/100
        
        // Bonificación por baja huella de carbono
        if (stats.carbon_footprint && stats.carbon_footprint.latest < 500) {
            score += 15;
        }
        
        // Bonificación por alta tasa de reciclaje
        if (stats.recycling_rate && stats.recycling_rate.latest > 75) {
            score += 20;
        }
        
        // Bonificación por eficiencia energética
        if (stats.energy_consumption && stats.energy_consumption.latest < 1000) {
            score += 10;
        }
        
        // Bonificación por bajo consumo de agua
        if (stats.water_usage && stats.water_usage.latest < 600) {
            score += 5;
        }
        
        return Math.min(score, 100);
    }

    
    notifyClients(summary) {

        if (global.io) {
            global.io.emit('sustainability_update', {
                timestamp: new Date(),
                data: summary,
                type: 'real_time_update'
            });
        }

    }

    
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastUpdate: this.lastUpdate,
            updateInterval: this.updateInterval,
            nextUpdate: this.isRunning ? 'En ejecución automática' : 'Detenido'
        };
    }

    
    async forceUpdate() {
        console.log('🔄 Forzando actualización manual de métricas...');
        return await this.runUpdate('manual_force');
    }
}

let schedulerInstance = null;

function getSustainabilityScheduler() {
    if (!schedulerInstance) {
        schedulerInstance = new SustainabilityScheduler();
    }
    return schedulerInstance;
}

module.exports = {
    SustainabilityScheduler,
    getSustainabilityScheduler
};