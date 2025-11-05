# 🌡️ PI Monitoring - Sistema de Monitoramento de Temperatura e Umidade

> **Projeto Integrador IV** - Sistema web moderno para monitoramento em tempo real de temperatura e umidade com análise preditiva usando Machine Learning.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.109.0-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.12-blue?style=flat&logo=python)](https://www.python.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat&logo=docker)](https://www.docker.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat)](LICENSE)

---

## 📋 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Tecnologias](#-tecnologias)
- [Instalação](#-instalação)
  - [Com Docker (Recomendado)](#-com-docker-recomendado)
  - [Instalação Local](#-instalação-local)
- [Como Usar](#-como-usar)
- [API Endpoints](#-api-endpoints)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Configuração](#-configuração)
- [Desenvolvimento](#-desenvolvimento)
- [Testes](#-testes)
- [Deploy](#-deploy)
- [Troubleshooting](#-troubleshooting)
- [Contribuindo](#-contribuindo)

---

## 🎯 Sobre o Projeto

O **PI Monitoring** é um sistema completo de monitoramento ambiental que coleta, armazena e analisa dados de temperatura e umidade em tempo real. O projeto utiliza **Machine Learning** para prever tendências futuras e identificar padrões sazonais, auxiliando na tomada de decisões sobre controle ambiental.

### Por que este projeto?

- ✅ **Monitoramento em Tempo Real**: Visualize dados atuais instantaneamente
- 📊 **Dashboard Interativo**: Gráficos dinâmicos e KPIs visuais
- 🤖 **Análise Preditiva**: ML para prever tendências de 7 dias
- 📈 **Padrões Sazonais**: Identifique comportamentos por hora/dia
- 🔗 **Análise de Correlações**: Entenda relações entre variáveis
- 📉 **Estatísticas Avançadas**: Quartis, assimetria, curtose e mais
- 🚀 **API REST Completa**: Integre com outros sistemas facilmente
- 🐳 **Docker Ready**: Deploy simples e portável

---

## ✨ Funcionalidades

### 📊 Dashboard Principal

- **KPIs em Tempo Real**
  - Temperatura atual com indicador de status
  - Umidade relativa atual
  - Total de medições registradas
  - Violações de limites detectadas

- **Gráficos Interativos**
  - Série temporal de temperatura
  - Série temporal de umidade
  - Visualização combinada com zoom/pan
  - Modo fullscreen para cada gráfico

- **Alertas de Violação**
  - Lista das últimas 10 violações
  - Timestamp, tipo e valores
  - Status visual por severidade

### 🤖 Analytics Avançado (Machine Learning)

#### 1. **Predição de Tendências**
- Regressão linear para temperatura e umidade
- Previsão de 7 dias futuros
- Score R² de qualidade do modelo
- Visualização gráfica das predições

#### 2. **Padrões Sazonais**
- Análise por hora do dia (24h)
- Análise por dia da semana
- Médias, mínimos e máximos
- Gráficos de barras e linhas

#### 3. **Análise de Correlações**
- Correlação de Pearson (linear)
- Correlação de Spearman (monotônica)
- P-valores e significância estatística
- Interpretação automática dos resultados

#### 4. **Estatísticas Avançadas**
- Medidas de tendência central (média, mediana)
- Dispersão (desvio padrão, variância)
- Quartis (Q1, Q2, Q3)
- Assimetria (skewness)
- Curtose (achatamento)

### 🔌 API REST

- ✅ Endpoints RESTful completos
- ✅ Documentação automática (Swagger/ReDoc)
- ✅ Validação de dados com Pydantic
- ✅ Respostas em JSON
- ✅ CORS configurável
- ✅ Health checks integrados

---

## 🛠️ Tecnologias

### Backend
- **[FastAPI](https://fastapi.tiangolo.com)** - Framework web moderno e rápido
- **[Python 3.12](https://www.python.org)** - Linguagem de programação
- **[SQLAlchemy](https://www.sqlalchemy.org)** - ORM para banco de dados
- **[SQLite](https://www.sqlite.org)** - Banco de dados relacional
- **[Uvicorn](https://www.uvicorn.org)** - Servidor ASGI de alta performance
- **[Pydantic](https://pydantic-docs.helpmanual.io)** - Validação de dados

### Machine Learning & Análise
- **[scikit-learn](https://scikit-learn.org)** - Modelos de ML (Regressão Linear)
- **[NumPy](https://numpy.org)** - Computação numérica
- **[SciPy](https://scipy.org)** - Análises estatísticas avançadas

### Frontend
- **[Bootstrap 5](https://getbootstrap.com)** - Framework CSS
- **[Chart.js](https://www.chartjs.org)** - Gráficos interativos
- **[Font Awesome](https://fontawesome.com)** - Ícones
- **Vanilla JavaScript** - Módulos ES6 nativos

### DevOps & Ferramentas
- **[Docker](https://www.docker.com)** - Containerização
- **[Docker Compose](https://docs.docker.com/compose)** - Orquestração
- **[pytest](https://pytest.org)** - Framework de testes
- **[Black](https://black.readthedocs.io)** - Code formatter
- **[Flake8](https://flake8.pycqa.org)** - Linter

---

## 🚀 Instalação

### 🐳 Com Docker (Recomendado)

#### Pré-requisitos
- [Docker](https://docs.docker.com/get-docker/) instalado
- [Docker Compose](https://docs.docker.com/compose/install/) instalado

#### Passo 1: Clone o repositório
```bash
git clone https://github.com/GabrielFabricioPonciano/ProjetoIntegradorMonitoramento.git
cd ProjetoIntegradorMonitoramento
```

#### Passo 2: Configure o ambiente (opcional)
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite conforme necessário
nano .env
```

#### Passo 3: Inicie com Docker Compose
```bash
# Build e start em modo daemon
docker-compose up -d

# Ou em modo interativo (ver logs)
docker-compose up
```

#### Passo 4: Acesse a aplicação
```
🌐 Dashboard: http://localhost:8000
📖 API Docs:  http://localhost:8000/api/docs
🔄 ReDoc:     http://localhost:8000/api/redoc
```

#### Comandos úteis
```bash
# Ver logs
docker-compose logs -f

# Parar os containers
docker-compose down

# Reiniciar
docker-compose restart

# Rebuild após mudanças
docker-compose up -d --build

# Ver status
docker-compose ps
```

---

### 💻 Instalação Local

#### Pré-requisitos
- Python 3.12+ instalado
- pip (gerenciador de pacotes Python)
- Git

#### Passo 1: Clone o repositório
```bash
git clone https://github.com/GabrielFabricioPonciano/ProjetoIntegradorMonitoramento.git
cd ProjetoIntegradorMonitoramento
```

#### Passo 2: Crie um ambiente virtual
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

#### Passo 3: Instale as dependências
```bash
pip install -r requirements-fastapi.txt
```

#### Passo 4: Configure o ambiente
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite as variáveis (opcional)
```

#### Passo 5: Inicie a aplicação
```bash
python run.py
```

#### Passo 6: Acesse
```
🌐 Dashboard: http://localhost:8000
📖 API Docs:  http://localhost:8000/api/docs
```

---

## 📖 Como Usar

### 1️⃣ Visualizar Dashboard

Acesse `http://localhost:8000` para ver:
- KPIs de temperatura e umidade atuais
- Gráficos de séries temporais
- Últimas violações de limites
- Análises de ML e estatísticas

### 2️⃣ Explorar Analytics

Clique na aba **"Analytics Avançado"** para:
- Ver predições de 7 dias (ML)
- Analisar padrões sazonais
- Verificar correlações
- Consultar estatísticas avançadas

### 3️⃣ Usar a API

#### Exemplo: Obter resumo atual
```bash
curl http://localhost:8000/api/summary/
```

Resposta:
```json
{
  "current_temp": 18.5,
  "current_rh": 60.2,
  "total_measurements": 730,
  "violations_count": 12,
  "last_measurement": "2025-10-28T14:30:00-03:00"
}
```

#### Exemplo: Obter séries temporais
```bash
curl http://localhost:8000/api/series/?max_points=100
```

#### Exemplo: Predições ML
```bash
curl http://localhost:8000/api/analytics/trends/
```

### 4️⃣ Inserir Dados

#### Via API
```bash
curl -X POST http://localhost:8000/api/measurements/ \
  -H "Content-Type: application/json" \
  -d '{
    "temp_current": 18.5,
    "rh_current": 0.602,
    "ts": "2025-10-28T14:30:00"
  }'
```

#### Via Script Python
```python
import requests

data = {
    "temp_current": 18.5,
    "rh_current": 0.602
}

response = requests.post(
    "http://localhost:8000/api/measurements/",
    json=data
)
print(response.json())
```

---

## 🌐 API Endpoints

### 📊 Dados

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/summary/` | Resumo geral do sistema |
| `GET` | `/api/series/` | Série temporal de medições |
| `GET` | `/api/violations/` | Lista de violações |
| `POST` | `/api/measurements/` | Criar nova medição |
| `GET` | `/api/measurements/{id}` | Obter medição específica |

### 🤖 Analytics (Machine Learning)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/analytics/trends/` | Predições de tendências (7 dias) |
| `GET` | `/api/analytics/patterns/` | Padrões sazonais (hora/dia) |
| `GET` | `/api/analytics/correlations/` | Análise de correlações |
| `GET` | `/api/analytics/statistics/` | Estatísticas avançadas |

### 🔧 Sistema

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/system/health/` | Health check do sistema |
| `GET` | `/api/docs` | Documentação Swagger |
| `GET` | `/api/redoc` | Documentação ReDoc |

### Parâmetros Comuns

- `max_points` - Limite de pontos retornados
- `days` - Dias de histórico para análise
- `limit` - Limite de resultados

---

## 📁 Estrutura do Projeto

```
ProjetoIntegradorMonitoramento/
├── 📂 app/                       # Código da aplicação
│   ├── analytics.py              # Engine de ML e análises
│   ├── cache.py                  # Sistema de cache
│   ├── config.py                 # Configurações
│   ├── database.py               # Conexão com DB
│   ├── logger.py                 # Sistema de logs
│   ├── models.py                 # Modelos SQLAlchemy
│   └── schemas.py                # Schemas Pydantic
│
├── 📂 static/                    # Arquivos estáticos
│   ├── 📂 css/                   # Estilos CSS
│   ├── 📂 js/                    # JavaScript
│   │   └── 📂 modules/           # Módulos JS (core, UI, charts, analytics)
│   └── 📂 images/                # Imagens e ícones
│
├── 📂 templates/                 # Templates HTML
│   └── dashboard_fastapi.html    # Dashboard principal
│
├── 📂 data/                      # Dados persistentes
│   └── monitoring.db             # Banco SQLite
│
├── 📂 logs/                      # Logs da aplicação
│   └── app.log                   # Log principal
│
├── 📂 tests/                     # Testes automatizados
│   └── test_api.py               # Testes da API
│
├── main.py                       # Aplicação FastAPI principal
├── run.py                        # Script de inicialização
├── Dockerfile                    # Imagem Docker
├── docker-compose.yml            # Orquestração Docker
├── .dockerignore                 # Arquivos ignorados no build
├── requirements-fastapi.txt      # Dependências Python
├── .env.example                  # Exemplo de configuração
└── README.md                     # Este arquivo
```

---

## ⚙️ Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` baseado no `.env.example`:

```bash
# Database
DATABASE_PATH=data/monitoring.db

# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
DEBUG_MODE=false

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/app.log

# Application
TIMEZONE=America/Sao_Paulo
TEMP_LOW=17.0
TEMP_HIGH=19.5
RH_LIMIT=62.0

# CORS
CORS_ORIGINS=*

# Cache
CACHE_TTL=30
```

### Limites de Temperatura e Umidade

Ajuste os limites no `.env`:
```bash
TEMP_LOW=17.0    # Temperatura mínima (°C)
TEMP_HIGH=19.5   # Temperatura máxima (°C)
RH_LIMIT=62.0    # Umidade máxima (%)
```

---

## 🔧 Desenvolvimento

### Executar em modo desenvolvimento
```bash
# Com hot-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Formatar código
```bash
# Black
black .

# Isort
isort .
```

### Verificar código
```bash
# Flake8
flake8 .
```

### Executar testes
```bash
# Todos os testes
pytest

# Com coverage
pytest --cov=app --cov-report=html

# Testes específicos
pytest tests/test_api.py -v
```

---

## 📦 Deploy

### Deploy com Docker

#### 1. Build da imagem
```bash
docker build -t pi-monitoring:latest .
```

#### 2. Push para registry (opcional)
```bash
docker tag pi-monitoring:latest your-registry/pi-monitoring:latest
docker push your-registry/pi-monitoring:latest
```

#### 3. Deploy em servidor
```bash
# Via Docker Compose
docker-compose up -d

# Ou via Docker run
docker run -d \
  --name pi-monitoring \
  -p 8000:8000 \
  -v /path/to/data:/app/data \
  -v /path/to/logs:/app/logs \
  --restart unless-stopped \
  pi-monitoring:latest
```

### Deploy em Cloud

#### AWS ECS/Fargate
1. Faça push da imagem para ECR
2. Crie task definition
3. Configure service com ALB
4. Configure volumes EFS para persistência

#### Azure Container Instances
```bash
az container create \
  --resource-group pi-monitoring-rg \
  --name pi-monitoring \
  --image your-registry/pi-monitoring:latest \
  --dns-name-label pi-monitoring \
  --ports 8000
```

#### Google Cloud Run
```bash
gcloud run deploy pi-monitoring \
  --image your-registry/pi-monitoring:latest \
  --platform managed \
  --port 8000 \
  --allow-unauthenticated
```

---

## 🐛 Troubleshooting

### Problema: Container não inicia

**Solução 1**: Verificar logs
```bash
docker logs pi-monitoring
```

**Solução 2**: Verificar health
```bash
docker inspect pi-monitoring | grep Health -A 10
```

### Problema: Banco de dados vazio

**Solução**: Popular com dados de exemplo
```bash
# Acessar container
docker exec -it pi-monitoring bash

# Executar script de população (criar se necessário)
python scripts/populate_db.py
```

### Problema: Porta em uso

**Solução**: Usar porta diferente
```bash
# No docker-compose.yml
ports:
  - "8001:8000"  # Mudou de 8000 para 8001
```

### Problema: Analytics não carrega

**Solução**: Verificar dependências ML
```bash
# Dentro do container
docker exec pi-monitoring pip list | grep -E "scikit|numpy|scipy"
```

### Problema: Permissões de arquivo

**Solução**: Ajustar permissões
```bash
# No host
sudo chown -R 1000:1000 data/ logs/

# Ou dar permissão total (desenvolvimento)
chmod -R 777 data/ logs/
```

---
</div>
