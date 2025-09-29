/**
 * Dashboard Performance Monitor Module
 * Monitora performance, métricas e otimiza carregamento
 */

class DashboardPerformanceMonitor {
    constructor(config = {}) {
        this.config = {
            enableMonitoring: true,
            reportInterval: 30000, // 30 seconds
            slowThreshold: 1000, // ms - Aumentado para 1 segundo para reduzir falsos positivos
            memoryThreshold: 50 * 1024 * 1024, // 50MB
            ...config
        };

        this.metrics = {
            pageLoad: null,
            componentLoad: {},
            apiCalls: [],
            chartRenders: [],
            memoryUsage: [],
            errors: []
        };

        this.timers = new Map();
        this.observers = new Map();

        this.init();
    }

    init() {
        if (!this.config.enableMonitoring) return;

        this.setupPerformanceObservers();
        this.measurePageLoad();
        this.startReporting();

        console.log('Dashboard Performance Monitor initialized');
    }

    /**
     * Configura observadores de performance
     */
    setupPerformanceObservers() {
        if ('PerformanceObserver' in window) {
            // Observar carregamento de recursos
            try {
                const resourceObserver = new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                        if (entry.name.includes('dashboard') || entry.name.includes('chart')) {
                            this.recordResourceLoad(entry);
                        }
                    });
                });
                resourceObserver.observe({ entryTypes: ['resource'] });

                // Observar paint timing
                const paintObserver = new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                        this.recordPaintTiming(entry);
                    });
                });
                paintObserver.observe({ entryTypes: ['paint'] });

                this.observers.set('resource', resourceObserver);
                this.observers.set('paint', paintObserver);

            } catch (error) {
                console.warn('Performance observers not fully supported:', error);
            }
        }
    }

    /**
     * Mede tempo de carregamento da página
     */
    measurePageLoad() {
        if ('performance' in window && performance.timing) {
            const timing = performance.timing;
            const loadTime = timing.loadEventEnd - timing.navigationStart;

            this.metrics.pageLoad = {
                timestamp: Date.now(),
                loadTime,
                domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
                firstPaint: this.getFirstPaintTime(),
                largestContentfulPaint: this.getLargestContentfulPaint()
            };
        }
    }

    /**
     * Obtém tempo do first paint
     */
    getFirstPaintTime() {
        if ('performance' in window) {
            const paintEntries = performance.getEntriesByType('paint');
            const fpEntry = paintEntries.find(entry => entry.name === 'first-paint');
            return fpEntry ? fpEntry.startTime : null;
        }
        return null;
    }

    /**
     * Obtém LCP (Largest Contentful Paint)
     */
    getLargestContentfulPaint() {
        if ('PerformanceObserver' in window) {
            try {
                let lcpValue = null;
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    lcpValue = lastEntry.startTime;
                });
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

                // Cleanup after a delay
                setTimeout(() => lcpObserver.disconnect(), 5000);
                return lcpValue;
            } catch (error) {
                return null;
            }
        }
        return null;
    }

    /**
     * Inicia timer para operação
     * @param {string} operation - Nome da operação
     * @param {object} metadata - Metadados adicionais
     */
    startTimer(operation, metadata = {}) {
        const id = `${operation}_${Date.now()}_${Math.random()}`;
        this.timers.set(id, {
            operation,
            startTime: performance.now(),
            metadata
        });
        return id;
    }

    /**
     * Finaliza timer e registra métrica
     * @param {string} timerId - ID do timer
     * @param {object} result - Resultado da operação
     */
    endTimer(timerId, result = {}) {
        const timer = this.timers.get(timerId);
        if (!timer) return;

        const duration = performance.now() - timer.startTime;
        const metric = {
            operation: timer.operation,
            duration,
            timestamp: Date.now(),
            metadata: timer.metadata,
            result
        };

        this.recordMetric(timer.operation, metric);
        this.timers.delete(timerId);

        // Verificar se é lento
        if (duration > this.config.slowThreshold) {
            this.reportSlowOperation(metric);
        }

        return metric;
    }

    /**
     * Registra métrica
     * @param {string} type - Tipo da métrica
     * @param {object} data - Dados da métrica
     */
    recordMetric(type, data) {
        switch (type) {
            case 'api_call':
                this.metrics.apiCalls.push(data);
                break;
            case 'chart_render':
                this.metrics.chartRenders.push(data);
                break;
            case 'component_load':
                this.metrics.componentLoad[data.metadata.component] = data;
                break;
            default:
                if (!this.metrics[type]) {
                    this.metrics[type] = [];
                }
                this.metrics[type].push(data);
        }
    }

    /**
     * Registra carregamento de recurso
     * @param {PerformanceEntry} entry - Entrada de performance
     */
    recordResourceLoad(entry) {
        this.recordMetric('resource_load', {
            name: entry.name,
            duration: entry.duration,
            size: entry.transferSize,
            timestamp: Date.now()
        });
    }

    /**
     * Registra timing de paint
     * @param {PerformanceEntry} entry - Entrada de paint
     */
    recordPaintTiming(entry) {
        this.recordMetric('paint_timing', {
            name: entry.name,
            startTime: entry.startTime,
            timestamp: Date.now()
        });
    }

    /**
     * Registra uso de memória
     */
    recordMemoryUsage() {
        if ('memory' in performance) {
            const memory = performance.memory;
            const usage = {
                timestamp: Date.now(),
                used: memory.usedJSHeapSize,
                total: memory.totalJSHeapSize,
                limit: memory.jsHeapSizeLimit,
                percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
            };

            this.metrics.memoryUsage.push(usage);

            // Alertar se uso alto
            if (usage.used > this.config.memoryThreshold) {
                this.reportHighMemoryUsage(usage);
            }
        }
    }

    /**
     * Reporta operação lenta
     * @param {object} metric - Métrica da operação lenta
     */
    reportSlowOperation(metric) {
        console.warn(`Slow operation detected: ${metric.operation} took ${metric.duration.toFixed(2)}ms`, metric);

        // Enviar para error handler se disponível
        if (window.dashboardErrorHandler) {
            window.dashboardErrorHandler.handleError(
                new Error(`Slow operation: ${metric.operation}`),
                {
                    component: 'performance',
                    operation: metric.operation,
                    duration: metric.duration,
                    severity: 'low'
                }
            );
        }
    }

    /**
     * Reporta alto uso de memória
     * @param {object} usage - Dados de uso de memória
     */
    reportHighMemoryUsage(usage) {
        console.warn(`High memory usage: ${(usage.used / 1024 / 1024).toFixed(2)}MB used`);

        // Trigger garbage collection se possível
        if (window.gc) {
            window.gc();
        }
    }

    /**
     * Inicia relatório periódico
     */
    startReporting() {
        setInterval(() => {
            this.generateReport();
            this.recordMemoryUsage();
        }, this.config.reportInterval);
    }

    /**
     * Gera relatório de performance
     */
    generateReport() {
        const report = {
            timestamp: Date.now(),
            pageLoad: this.metrics.pageLoad,
            componentLoad: this.metrics.componentLoad,
            apiCalls: this.summarizeMetrics(this.metrics.apiCalls),
            chartRenders: this.summarizeMetrics(this.metrics.chartRenders),
            memoryUsage: this.getLatestMemoryUsage(),
            errors: this.metrics.errors.length
        };

        console.log('Performance Report:', report);

        // Enviar para analytics se habilitado
        if (window.dashboardConfig && window.dashboardConfig.isFeatureEnabled('analytics')) {
            this.sendAnalytics(report);
        }

        return report;
    }

    /**
     * Resume métricas
     * @param {Array} metrics - Array de métricas
     * @returns {object} Resumo
     */
    summarizeMetrics(metrics) {
        if (!metrics || metrics.length === 0) return null;

        const durations = metrics.map(m => m.duration).filter(d => d);
        return {
            count: metrics.length,
            avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
            minDuration: Math.min(...durations),
            maxDuration: Math.max(...durations),
            lastDuration: durations[durations.length - 1]
        };
    }

    /**
     * Obtém último uso de memória
     * @returns {object} Uso de memória
     */
    getLatestMemoryUsage() {
        const latest = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
        return latest ? {
            used: (latest.used / 1024 / 1024).toFixed(2) + 'MB',
            percentage: latest.percentage.toFixed(2) + '%'
        } : null;
    }

    /**
     * Envia dados para analytics
     * @param {object} report - Relatório a enviar
     */
    sendAnalytics(report) {
        // Implementar envio para serviço de analytics
        console.log('Sending analytics data:', report);
    }

    /**
     * Obtém todas as métricas
     * @returns {object} Métricas
     */
    getMetrics() {
        return { ...this.metrics };
    }

    /**
     * Limpa métricas antigas
     * @param {number} maxAge - Idade máxima em ms (padrão: 1 hora)
     */
    cleanup(maxAge = 3600000) {
        const cutoff = Date.now() - maxAge;

        Object.keys(this.metrics).forEach(key => {
            if (Array.isArray(this.metrics[key])) {
                this.metrics[key] = this.metrics[key].filter(
                    item => item.timestamp > cutoff
                );
            }
        });
    }

    /**
     * Para monitoramento
     */
    stop() {
        // Limpar timers
        this.timers.clear();

        // Desconectar observers
        this.observers.forEach(observer => {
            if (observer.disconnect) {
                observer.disconnect();
            }
        });
        this.observers.clear();

        console.log('Performance monitoring stopped');
    }
}

// Singleton instance
const dashboardPerformanceMonitor = new DashboardPerformanceMonitor();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardPerformanceMonitor;
} else if (typeof define === 'function' && define.amd) {
    define([], () => DashboardPerformanceMonitor);
} else {
    window.DashboardPerformanceMonitor = DashboardPerformanceMonitor;
    window.dashboardPerformanceMonitor = dashboardPerformanceMonitor;
}

console.log('Dashboard Performance Monitor module loaded');