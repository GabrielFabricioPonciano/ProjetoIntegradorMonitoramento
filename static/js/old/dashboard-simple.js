// dashboard-simple.js - Versão simplificada sem módulos ES6
console.log('Dashboard script carregado');

class SimpleDashboard {
    constructor() {
        console.log('Construtor do dashboard chamado');
        this.data = null;
        this.init();
    }

    async init() {
        console.log('Inicializando dashboard simplificado...');

        try {
            // Carregar dados
            await this.loadData();
            console.log('Dados carregados:', this.data);

            // Carregar violações
            await this.loadViolations();
            console.log('Violações carregadas');

            // Atualizar interface
            this.updateUI();
            console.log('Interface atualizada');

            // Esconder loading
            this.hideLoading();

        } catch (error) {
            console.error('Erro ao inicializar:', error);
            this.hideLoading(); // Esconder loading mesmo em caso de erro
        }
    }

    async loadData() {
        const response = await fetch('/api/summary/', {
            headers: {
                'X-CSRFToken': this.getCSRFToken()
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        this.data = await response.json();
    }

    async loadViolations() {
        const response = await fetch('/api/violations?days=30&limit=10', {
            headers: {
                'X-CSRFToken': this.getCSRFToken()
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        this.violations = await response.json();
    }

    getCSRFToken() {
        const token = document.querySelector('[name=csrfmiddlewaretoken]');
        return token ? token.value : '';
    }

    updateUI() {
        console.log('Atualizando UI...');

        // Verificar se elementos existem
        const tempElement = document.getElementById('temp-mean');
        const humidityElement = document.getElementById('rh-mean');
        const measurementsElement = document.getElementById('total-measurements');
        const violationsElement = document.getElementById('violations-count');

        console.log('Elementos encontrados:', {
            temp: !!tempElement,
            humidity: !!humidityElement,
            measurements: !!measurementsElement,
            violations: !!violationsElement
        });

        // Atualizar KPIs
        if (tempElement && this.data.temperature) {
            tempElement.textContent = this.data.temperature.current || '--';
            console.log('Temperatura atualizada para:', this.data.temperature.current);
        }

        if (humidityElement && this.data.humidity) {
            humidityElement.textContent = this.data.humidity.current || '--';
            console.log('Umidade atualizada para:', this.data.humidity.current);
        }

        if (measurementsElement) {
            measurementsElement.textContent = this.data.measurements || 0;
        }

        if (violationsElement) {
            violationsElement.textContent = this.data.violations || 0;
        }

        // Atualizar tabela de violações
        this.updateViolationsTable();

        // Esconder placeholders de gráficos
        document.querySelectorAll('.chart-placeholder').forEach(el => {
            el.style.display = 'none';
        });
        document.querySelectorAll('.chart-container').forEach(el => {
            el.style.display = 'block';
            el.innerHTML = '<div class="text-center py-5"><p class="text-muted">Gráfico não disponível na versão simplificada</p></div>';
        });

        // Esconder AI skeleton e mostrar mensagem
        const aiSkeleton = document.getElementById('ai-skeleton');
        const aiContent = document.getElementById('ai-content');
        const aiBadge = document.getElementById('ai-status-badge');
        if (aiSkeleton) aiSkeleton.style.display = 'none';
        if (aiContent) aiContent.style.display = 'block';
        if (aiBadge) {
            aiBadge.className = 'badge bg-secondary ms-2';
            aiBadge.innerHTML = '<i class="fas fa-info me-1"></i>Não disponível';
        }

        // Esconder skeletons
        document.querySelectorAll('.skeleton-loader').forEach(el => {
            el.style.display = 'none';
        });

        document.querySelectorAll('.kpi-content').forEach(el => {
            el.style.display = 'block';
        });

        console.log('UI atualizada');
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    updateViolationsTable() {
        const tbody = document.getElementById('violations-table');
        if (!tbody) return;

        if (!this.violations || this.violations.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted py-4">
                        <i class="fas fa-check-circle text-success me-2"></i>
                        Nenhuma violação encontrada no período
                    </td>
                </tr>
            `;
            return;
        }

        const rows = this.violations.map(violation => {
            const date = new Date(violation.timestamp);
            const formattedDate = date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const temp = violation.temperature || 0;
            const humidity = violation.humidity || 0;
            const reason = violation.reason || 'Violação';

            return `
                <tr>
                    <td class="fw-semibold">${formattedDate}</td>
                    <td class="text-danger">${temp.toFixed(1)}°C</td>
                    <td class="text-primary">${humidity.toFixed(1)}%</td>
                    <td>${reason}</td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = rows;
    }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM pronto, aguardando 1 segundo...');
    setTimeout(() => {
        console.log('Inicializando dashboard...');
        window.simpleDashboard = new SimpleDashboard();
    }, 1000);
});