// dashboard-ai.js - AI functionality
// This extends the EnvironmentalDashboard class

EnvironmentalDashboard.prototype.loadAI = async function() {
    console.log('Carregando IA...');
    try {
        const insightsUrl = `/api/ai/insights?days=${this.currentPeriod}`;
        const anomaliesUrl = `/api/ai/anomalies?days=${this.currentPeriod}`;
        const predictionsUrl = `/api/ai/predictions?hours=12`;
        const patternsUrl = `/api/ai/patterns?days=${this.currentPeriod}`;

        const [insightsRes, anomaliesRes, predictionsRes, patternsRes] = await Promise.all([
            fetch(insightsUrl),
            fetch(anomaliesUrl),
            fetch(predictionsUrl),
            fetch(patternsUrl)
        ]);

        const insights = insightsRes.ok ? await insightsRes.json() : { error: 'Falha ao carregar' };
        const anomalies = anomaliesRes.ok ? await anomaliesRes.json() : { error: 'Falha ao carregar' };
        const predictions = predictionsRes.ok ? await predictionsRes.json() : { error: 'Falha ao carregar' };
        const patterns = patternsRes.ok ? await patternsRes.json() : { error: 'Falha ao carregar' };

        this.updateAISection(insights, anomalies, predictions, patterns);
    } catch (error) {
        console.error('Erro ao carregar IA:', error);
        this.updateAISection({ error: 'Erro ao carregar' }, { error: 'Erro ao carregar' }, { error: 'Erro ao carregar' }, { error: 'Erro ao carregar' });
    }
};

EnvironmentalDashboard.prototype.updateAISection = function(insights, anomalies, predictions, patterns) {
    // Esconder skeleton
    const skeleton = document.getElementById('ai-skeleton');
    if (skeleton) skeleton.style.display = 'none';

    // Mostrar conteúdo
    const content = document.getElementById('ai-content');
    if (content) content.style.display = 'block';

    // Atualizar badge de status
    const badge = document.getElementById('ai-status-badge');
    if (badge) {
        badge.className = 'badge bg-success ms-2';
        badge.innerHTML = '<i class="fas fa-check me-1"></i>Pronto';
    }

    // Atualizar anomalias
    const anomaliesEl = document.getElementById('ai-anomalies-content');
    if (anomaliesEl) {
        if (anomalies.error) {
            anomaliesEl.innerHTML = '<p class="text-muted mb-0">Erro ao carregar anomalias</p>';
        } else if (anomalies.anomalies && anomalies.anomalies.length > 0) {
            anomaliesEl.innerHTML = `<p class="mb-1">${anomalies.anomalies.length} anomalias detectadas</p><small class="text-muted">Taxa: ${anomalies.anomaly_rate?.toFixed(1) || 0}%</small>`;
        } else {
            anomaliesEl.innerHTML = '<p class="text-muted mb-0">Nenhuma anomalia detectada</p>';
        }
    }

    // Atualizar previsões
    const predictionsEl = document.getElementById('ai-predictions-content');
    if (predictionsEl) {
        if (predictions.error) {
            predictionsEl.innerHTML = '<p class="text-muted mb-0">Erro ao carregar previsões</p>';
        } else if (predictions.predictions && predictions.predictions.length > 0) {
            const next = predictions.predictions[0];
            predictionsEl.innerHTML = `<p class="mb-1">Próxima: ${next.predicted_temperature?.toFixed(1) || 'N/A'}°C, ${next.predicted_humidity?.toFixed(1) || 'N/A'}%</p><small class="text-muted">Risco violação: ${next.violation_probability?.toFixed(1) || 0}%</small>`;
        } else {
            predictionsEl.innerHTML = '<p class="text-muted mb-0">Previsões indisponíveis</p>';
        }
    }

    // Atualizar padrões
    const patternsEl = document.getElementById('ai-patterns-content');
    if (patternsEl) {
        if (patterns.error) {
            patternsEl.innerHTML = '<p class="text-muted mb-0">Erro ao carregar padrões</p>';
        } else {
            patternsEl.innerHTML = `<p class="mb-1">Taxa violação: ${patterns.violation_rate?.toFixed(1) || 0}%</p><small class="text-muted">${patterns.total_measurements || 0} medições analisadas</small>`;
        }
    }
};