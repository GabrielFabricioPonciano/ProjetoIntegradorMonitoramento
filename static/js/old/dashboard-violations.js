// dashboard-violations.js - Violations functionality
// This extends the EnvironmentalDashboard class

EnvironmentalDashboard.prototype.loadViolations = async function () {
    console.log('Carregando violações...');
    const limit = document.getElementById('violations-limit')?.value || 10;
    const violationsUrl = `/api/violations?days=${this.currentPeriod}&limit=${limit}`;
    console.log('URL violações:', violationsUrl);

    try {
        const response = await fetch(violationsUrl);
        if (!response.ok) throw new Error(`Erro ao carregar violações: ${response.status}`);

        const violations = await response.json();
        console.log('Violações carregadas:', violations.length, 'registros');

        // Armazenar violações na instância
        this.violations = violations;
        console.log('Violações armazenadas na instância:', this.violations?.length || 0);

        this.filterViolations();

    } catch (error) {
        console.error('Erro ao carregar violações:', error);
        // Em caso de erro, mostrar tabela vazia
        this.violations = [];
        this.filterViolations();
    }
};

EnvironmentalDashboard.prototype.updateViolationsTable = function (violations) {
    console.log('Atualizando tabela de violações...');
    const tbody = document.getElementById('violations-table');
    if (!tbody) {
        console.error('Tabela de violações não encontrada');
        return;
    }

    if (!violations || violations.length === 0) {
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

    console.log('Processando violações:', violations);

    const rows = violations.map((violation, index) => {
        // Verificar se os dados existem - aceitar diferentes formatos
        if (!violation) {
            console.warn(`Violação ${index} é nula:`, violation);
            return '';
        }

        // Tentar diferentes campos de temperatura e umidade
        const temperature = violation.temperature || 0;
        const humidity = violation.humidity || violation.relative_humidity || violation.rh || 0;

        if (temperature === 0 && humidity === 0) {
            console.warn(`Violação ${index} não tem dados de temperatura/umidade:`, violation);
            // Ainda assim, vamos mostrar o que temos
        }

        const date = new Date(violation.timestamp);
        const formattedDate = date.toLocaleDateString('pt-BR') + ' ' +
            date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const tempValue = parseFloat(temperature) || 0;
        const humidityValue = parseFloat(humidity) || 0;

        const tempViolation = tempValue < 17 || tempValue > 19.5;
        const rhViolation = humidityValue > 62;
        const hasViolation = tempViolation || rhViolation || violation.reason; // Se tem reason, é uma violação

        const tempColor = tempViolation ? 'text-danger' : 'text-success';
        const rhColor = rhViolation ? 'text-danger' : 'text-success';

        // Se tem reason, mostrar isso
        let violationReason = '';
        if (violation.reason) {
            violationReason = violation.reason;
        } else if (hasViolation) {
            violationReason = tempViolation ? 'Temperatura fora do range' : 'Umidade acima do limite';
        } else {
            violationReason = 'Normal';
        }

        return `
            <tr>
                <td class="fw-semibold">${formattedDate}</td>
                <td class="${tempColor}">
                    ${tempValue.toFixed(1)}°C
                    ${tempViolation ?
                '<i class="fas fa-exclamation-triangle ms-1"></i>' :
                '<i class="fas fa-check ms-1"></i>'}
                </td>
                <td class="${rhColor}">
                    ${humidityValue.toFixed(1)}%
                    ${rhViolation ?
                '<i class="fas fa-exclamation-triangle ms-1"></i>' :
                '<i class="fas fa-check ms-1"></i>'}
                </td>
                <td>
                    <span class="badge ${hasViolation ? 'bg-danger' : 'bg-success'}" title="${violationReason}">
                        ${hasViolation ? 'Violação' : 'Normal'}
                    </span>
                </td>
            </tr>
        `;
    }).filter(row => row !== '').join('');

    tbody.innerHTML = rows || `
        <tr>
            <td colspan="4" class="text-center text-muted py-4">
                <i class="fas fa-exclamation-triangle text-warning me-2"></i>
                Dados de violações incompletos
            </td>
        </tr>
    `;

    console.log('Tabela de violações atualizada com', violations.length, 'registros');
};

EnvironmentalDashboard.prototype.filterViolations = function () {
    if (!this.violations) return;

    const showTemp = document.getElementById('filter-temp-violations')?.checked ?? true;
    const showHumidity = document.getElementById('filter-humidity-violations')?.checked ?? true;

    let filtered = this.violations;

    if (!showTemp || !showHumidity) {
        filtered = this.violations.filter(violation => {
            const temp = parseFloat(violation.temperature || 0);
            const humidity = parseFloat(violation.humidity || violation.relative_humidity || violation.rh || 0);

            const tempViolation = temp < 17 || temp > 19.5;
            const rhViolation = humidity > 62;

            if (!showTemp && tempViolation) return false;
            if (!showHumidity && rhViolation) return false;
            if (showTemp && showHumidity) return tempViolation || rhViolation;
            if (showTemp) return tempViolation;
            if (showHumidity) return rhViolation;

            return false;
        });
    }

    this.updateViolationsTable(filtered);
};