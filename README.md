# Sistema Inteligente de Monitoramento de Temperatura e Umidade

![Status](https://img.shields.io/badge/Status-Funcional-green)
![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-4.2.12-green?logo=django&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue?logo=postgresql&logoColor=white)
![Frontend](https://img.shields.io/badge/Frontend-Bootstrap_5_&_Chart.js-purple)

### 📋 Visão Geral do Projeto

Este repositório contém o código-fonte do **Sistema Inteligente de Monitoramento**, um projeto acadêmico da UNIVESP. O sistema monitora em tempo real as condições de temperatura e umidade de um laboratório de sementes, garantindo que os parâmetros ideais sejam mantidos.

**Funcionalidades Implementadas:**
- ✅ Dashboard interativo com gráficos em tempo real
- ✅ API RESTful completa com documentação Swagger
- ✅ Sistema de simulação automática de dados
- ✅ Monitoramento de violações de limites
- ✅ Interface responsiva e moderna
- ✅ Sistema de backup automatizado
- ✅ Logging e monitoramento de performance

---

### 🎯 O Problema Resolvido

O monitoramento manual de ambientes controlados apresenta várias limitações:
- **Falta de monitoramento contínuo:** Sistema manual não cobre fins de semana ou períodos noturnos
- **Vulnerabilidade a falhas:** Quedas de energia ou defeitos não são detectados em tempo real
- **Risco de erro humano:** Anotações manuais são suscetíveis a imprecisões

**Condições Ideais Monitoradas:**
- **Temperatura:** entre **17.0°C e 19.5°C**
- **Umidade Relativa:** abaixo de **62.0%**

---

### 🏗️ Arquitetura e Tecnologias

| Componente | Tecnologia | Descrição |
|------------|------------|-----------|
| **Backend** | Django 4.2.12 + DRF | Framework robusto para APIs REST |
| **Banco de Dados** | PostgreSQL | Dados ambientais e histórico |
| **Frontend** | HTML5 + Bootstrap 5 + Chart.js | Interface moderna e responsiva |
| **Tarefas Assíncronas** | Celery | Simulação e processamento em background |
| **Documentação** | DRF Spectacular | API docs automática (Swagger/OpenAPI) |
| **Monitoramento** | Sentry (opcional) | Rastreamento de erros em produção |

---

### 🚀 Como Executar o Projeto

#### Pré-requisitos
- Python 3.10+
- PostgreSQL 15+
- Git

#### Instalação e Configuração

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/GabrielFabricioPonciano/ProjetoIntegradorMonitoramento.git
   cd ProjetoIntegradorMonitoramento
   ```

2. **Configure o ambiente virtual:**
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # Linux/Mac
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Instale as dependências:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure o banco de dados:**
   - Instale e configure PostgreSQL
   - Crie um banco de dados chamado `pi_monitoring`
   - Atualize as credenciais no arquivo `pi_monitoring/settings.py` se necessário

5. **Execute as migrações:**
   ```bash
   python manage.py migrate
   ```

6. **Inicie o servidor:**
   ```bash
   python manage.py runserver
   ```

7. **Acesse o sistema:**
   - **Dashboard:** http://localhost:8000/
   - **API Docs:** http://localhost:8000/api/docs/

---

### 📊 APIs Disponíveis

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/summary/` | GET | KPIs: temperatura média, umidade média, total de medições, violações |
| `/api/series/` | GET | Dados históricos para gráficos (parâmetros: `max_points`, `days`) |
| `/api/violations/` | GET | Lista de violações de limites (parâmetro: `limit`) |
| `/api/docs/` | GET | Documentação interativa da API (Swagger) |

**Exemplos de uso:**
```bash
# Resumo dos KPIs
curl http://localhost:8000/api/summary/

# Dados para gráficos (últimos 7 dias, máximo 100 pontos)
curl "http://localhost:8000/api/series/?days=7&max_points=100"

# Últimas 10 violações
curl "http://localhost:8000/api/violations/?limit=10"
```

---

### 🎨 Interface do Usuário

O dashboard apresenta:
- **Cards de KPIs:** Métricas principais em tempo real
- **Gráficos Interativos:** Temperatura e umidade com Chart.js
- **Filtros de Período:** 1 dia, 7 dias, 30 dias
- **Status do Sistema:** Indicador online/offline
- **Lista de Violações:** Últimas ocorrências fora dos limites
- **Design Responsivo:** Bootstrap 5 com glassmorphism

---

### 🔧 Sistema de Simulação

O sistema gera dados automaticamente:
- **Frequência:** A cada 60 segundos (configurável)
- **Horários:** 07:30 e 16:30 diariamente
- **Janela de Dados:** Últimos 365 dias (730 registros)
- **Limpeza Automática:** Remove dados antigos automaticamente

**Comandos de gerenciamento:**
```bash
# Executar simulação manual
python manage.py simulate_data

# Criar dados históricos
python manage.py populate_history

# Backup do banco
python manage.py backup_db
```

---

### 📁 Estrutura do Projeto

```
ProjetoIntegradorMonitoramento/
├── pi_monitoring/           # Configurações Django
│   ├── settings.py         # Configurações principais
│   ├── celery.py          # Configuração Celery
│   └── urls.py            # URLs principais
├── monitoring/             # App principal
│   ├── models.py          # Modelos de dados
│   ├── views.py           # Views da API
│   ├── tasks.py           # Tarefas assíncronas
│   └── management/        # Comandos customizados
├── static/                 # Arquivos estáticos
│   ├── css/
│   └── js/modules/        # JavaScript modular
├── templates/              # Templates HTML
├── backups/                # Backups automáticos
├── requirements.txt        # Dependências Python
└── README.md              # Esta documentação
```

---

### 🔒 Segurança e Configuração

**Variáveis de Ambiente (.env):**
```env
DEBUG=True
SECRET_KEY=sua-chave-secreta
DATABASE_URL=postgresql://user:password@localhost:5432/pi_monitoring
SENTRY_DSN=your-sentry-dsn
```

**Configurações de Segurança:**
- CSRF protection habilitado
- Headers de segurança (X-Frame-Options, CSP, etc.)
- Validação de entrada de dados
- Logs de segurança

---

### 📈 Monitoramento e Logs

**Sistema de Logging:**
- Logs de aplicação em tempo real
- Monitoramento de performance
- Rastreamento de erros com Sentry
- Logs de tarefas assíncronas

**Métricas Monitoradas:**
- Tempo de resposta das APIs
- Taxa de sucesso das requisições
- Status do sistema de simulação
- Performance do banco de dados

---

### 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

### 📝 Licença

Este projeto é parte do trabalho acadêmico da UNIVESP - Universidade Virtual do Estado de São Paulo.

---

### 📞 Suporte

Para dúvidas ou sugestões, abra uma issue no repositório ou entre em contato com a equipe de desenvolvimento.