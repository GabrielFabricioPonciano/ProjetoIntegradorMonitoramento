/**
 * Dashboard Violations Module
 * Violations display and management for the environmental monitoring dashboard
 */

class DashboardViolations {
    constructor() {
        this.currentFilters = {
            temperature: true,
            humidity: true
        };
        this.currentLimit = 10;
        this.currentSort = {
            column: 'timestamp',
            order: 'desc'
        };
        this.init();
    }

    init() {
        console.log('Dashboard Violations: Initializing...');
        this.bindSortingEvents();
    }

    bindSortingEvents() {
        const sortableHeaders = document.querySelectorAll('.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                e.preventDefault();
                const column = header.getAttribute('data-sort');
                this.handleSort(column);
            });
            header.style.cursor = 'pointer';
        });
    }

    handleSort(column) {
        // Toggle sort order if same column, otherwise set to desc
        if (this.currentSort.column === column) {
            this.currentSort.order = this.currentSort.order === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.column = column;
            this.currentSort.order = 'desc';
        }

        // Update sort icons
        this.updateSortIcons();

        // Reload data with new sorting
        if (window.dashboard && window.dashboard.core) {
            window.dashboard.core.loadViolations();
        }
    }

    updateSortIcons() {
        const sortableHeaders = document.querySelectorAll('.sortable');
        sortableHeaders.forEach(header => {
            const sortIcon = header.querySelector('.sort-icon');
            const column = header.getAttribute('data-sort');

            if (column === this.currentSort.column) {
                sortIcon.className = `fas fa-sort-${this.currentSort.order === 'asc' ? 'up' : 'down'} sort-icon text-blue-400`;
            } else {
                sortIcon.className = 'fas fa-sort sort-icon text-slate-500';
            }
        });
    }

    updateViolationsUI(violationsData) {
        console.log('Dashboard Violations: Updating violations UI...', violationsData);

        const tableBody = document.getElementById('violations-table');
        if (!tableBody) return;

        // Apply current sorting
        let sortedData = this.sortViolations(violationsData, this.currentSort.column, this.currentSort.order);

        if (sortedData && Array.isArray(sortedData) && sortedData.length > 0) {
            const violationsHtml = sortedData.map(violation =>
                this.createViolationRow(violation)
            ).join('');

            tableBody.innerHTML = violationsHtml;
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-4" style="color: rgba(255,255,255,0.6);">
                        <i class="fas fa-check-circle fa-2x mb-3" style="color: rgba(67, 233, 123, 0.5);"></i>
                        <br>Nenhuma violação encontrada no período selecionado
                    </td>
                </tr>
            `;
        }

        // Update sort icons after rendering
        this.updateSortIcons();
    }

    createViolationRow(violation) {
        const timestamp = this.formatViolationDateTime(violation.timestamp);
        const temp = violation.temperature !== null ? `${violation.temperature.toFixed(1)}°C` : '--';
        const humidity = violation.humidity !== null ? `${violation.humidity.toFixed(1)}%` : '--';
        const reason = this.formatViolationReason(violation.reason, violation.type);

        const rowClass = violation.type === 'temperature' ? 'table-warning' : 'table-info';
        const iconClass = violation.type === 'temperature' ? 'fa-thermometer-half text-warning' : 'fa-tint text-info';

        return `
            <tr class="${rowClass}" style="border-color: rgba(255,255,255,0.1);">
                <td style="color: rgba(255,255,255,0.9); vertical-align: middle;">
                    <i class="fas fa-clock me-2" style="color: rgba(255,255,255,0.6);"></i>
                    ${timestamp}
                </td>
                <td style="color: rgba(255,255,255,0.9); vertical-align: middle; font-weight: 600;">
                    <i class="fas ${iconClass} me-2"></i>
                    ${temp}
                </td>
                <td style="color: rgba(255,255,255,0.9); vertical-align: middle; font-weight: 600;">
                    <i class="fas ${iconClass} me-2"></i>
                    ${humidity}
                </td>
                <td style="color: rgba(255,255,255,0.9); vertical-align: middle;">
                    ${reason}
                </td>
            </tr>
        `;
    }

    formatViolationDateTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = diffMs / (1000 * 60 * 60);
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        let timeStr;
        if (diffHours < 1) {
            timeStr = `${Math.floor(diffMs / (1000 * 60))} min atrás`;
        } else if (diffHours < 24) {
            timeStr = `${Math.floor(diffHours)}h atrás`;
        } else if (diffDays < 7) {
            timeStr = `${Math.floor(diffDays)} dias atrás`;
        } else {
            timeStr = date.toLocaleDateString('pt-BR');
        }

        return `${date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        })}<br><small style="color: rgba(255,255,255,0.6); font-size: 0.8em;">${timeStr}</small>`;
    }

    formatViolationReason(reason, type) {
        const reasons = {
            'temperature_high': 'Temperatura acima do limite ideal (>19,5°C)',
            'temperature_low': 'Temperatura abaixo do limite ideal (<17°C)',
            'humidity_high': 'Umidade relativa acima do limite ideal (>62%)',
            'temperature_too_high': 'Temperatura muito elevada (risco crítico)',
            'temperature_too_low': 'Temperatura muito baixa (risco crítico)',
            'humidity_too_high': 'Umidade muito elevada (risco crítico)'
        };

        const formattedReason = reasons[reason] || reason || 'Violação detectada';

        const badgeClass = type === 'temperature' ? 'bg-warning' : 'bg-info';
        const iconClass = type === 'temperature' ? 'fa-thermometer-half' : 'fa-tint';

        return `
            <span class="badge ${badgeClass} me-2">
                <i class="fas ${iconClass} me-1"></i>
                ${type === 'temperature' ? 'Temperatura' : 'Umidade'}
            </span>
            <span style="color: rgba(255,255,255,0.8);">${formattedReason}</span>
        `;
    }

    updateFilters() {
        const tempFilter = document.getElementById('filter-temp-violations');
        const humidityFilter = document.getElementById('filter-humidity-violations');

        this.currentFilters.temperature = tempFilter ? tempFilter.checked : true;
        this.currentFilters.humidity = humidityFilter ? humidityFilter.checked : true;
    }

    getActiveFilters() {
        const types = [];
        if (this.currentFilters.temperature) types.push('temperature');
        if (this.currentFilters.humidity) types.push('humidity');
        return types;
    }

    updateLimit() {
        const limitSelect = document.getElementById('violations-limit');
        this.currentLimit = limitSelect ? parseInt(limitSelect.value) : 10;
    }

    getCurrentLimit() {
        return this.currentLimit;
    }

    filterViolations(violations, activeFilters) {
        if (!violations || activeFilters.length === 0) return violations;

        return violations.filter(violation => {
            return activeFilters.includes(violation.type);
        });
    }

    sortViolations(violations, sortBy = 'timestamp', sortOrder = 'desc') {
        if (!violations) return [];

        return [...violations].sort((a, b) => {
            let aValue, bValue;

            switch (sortBy) {
                case 'timestamp':
                    aValue = new Date(a.timestamp);
                    bValue = new Date(b.timestamp);
                    break;
                case 'temperature':
                    aValue = a.temperature || 0;
                    bValue = b.temperature || 0;
                    break;
                case 'humidity':
                    aValue = a.humidity || 0;
                    bValue = b.humidity || 0;
                    break;
                default:
                    aValue = new Date(a.timestamp);
                    bValue = new Date(b.timestamp);
            }

            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });
    }

    paginateViolations(violations, page = 1, limit = 10) {
        if (!violations) return { data: [], total: 0, page, limit, totalPages: 0 };

        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedData = violations.slice(startIndex, endIndex);

        return {
            data: paginatedData,
            total: violations.length,
            page,
            limit,
            totalPages: Math.ceil(violations.length / limit)
        };
    }

    getViolationStats(violations) {
        if (!violations || violations.length === 0) {
            return {
                total: 0,
                byType: { temperature: 0, humidity: 0 },
                bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
                recentCount: 0
            };
        }

        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const stats = {
            total: violations.length,
            byType: { temperature: 0, humidity: 0 },
            bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
            recentCount: 0
        };

        violations.forEach(violation => {
            // Count by type
            if (violation.type) {
                stats.byType[violation.type] = (stats.byType[violation.type] || 0) + 1;
            }

            // Count by severity (based on reason)
            const severity = this.getViolationSeverity(violation.reason);
            stats.bySeverity[severity]++;

            // Count recent violations
            if (new Date(violation.timestamp) > oneDayAgo) {
                stats.recentCount++;
            }
        });

        return stats;
    }

    getViolationSeverity(reason) {
        const criticalReasons = ['temperature_too_high', 'temperature_too_low', 'humidity_too_high'];
        const highReasons = ['temperature_high', 'temperature_low', 'humidity_high'];

        if (criticalReasons.includes(reason)) return 'critical';
        if (highReasons.includes(reason)) return 'high';

        return 'medium';
    }

    exportViolations(violations, format = 'csv') {
        if (!violations || violations.length === 0) return null;

        if (format === 'csv') {
            const headers = ['Data/Hora', 'Temperatura', 'Umidade', 'Tipo', 'Motivo'];
            const rows = violations.map(v => [
                new Date(v.timestamp).toLocaleString('pt-BR'),
                v.temperature || '',
                v.humidity || '',
                v.type || '',
                v.reason || ''
            ]);

            const csvContent = [headers, ...rows]
                .map(row => row.map(cell => `"${cell}"`).join(','))
                .join('\n');

            return csvContent;
        }

        return null;
    }

    highlightRecentViolations(violations, hours = 24) {
        const now = new Date();
        const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);

        return violations.map(violation => ({
            ...violation,
            isRecent: new Date(violation.timestamp) > cutoff
        }));
    }

    createViolationSummary(violations) {
        const stats = this.getViolationStats(violations);

        return {
            totalViolations: stats.total,
            temperatureViolations: stats.byType.temperature,
            humidityViolations: stats.byType.humidity,
            recentViolations: stats.recentCount,
            mostCommonType: stats.byType.temperature > stats.byType.humidity ? 'temperature' : 'humidity',
            severityBreakdown: stats.bySeverity
        };
    }
}

// Make violations available as a module property
window.dashboard.violations = new DashboardViolations();