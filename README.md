# 🌡️ Sistema de Monitoramento de Temperatura e Umidade

Sistema Django REST API para monitoramento de dados ambientais com detecção de violações de limites operacionais.

## 📋 Visão Geral

Este sistema processa dados de temperatura e umidade coletados ao longo do tempo, oferecendo:
- **Importação de dados** a partir de planilhas Excel
- **APIs REST** para consulta de dados e violações
- **Detecção automática** de condições fora dos limites operacionais
- **Documentação interativa** com Swagger UI

### 🎯 Funcionalidades Principais

- ✅ Importação de dados Excel com cabeçalhos em português
- ✅ Conversão automática de unidades (°C, %) 
- ✅ Detecção de violações de temperatura e umidade
- ✅ APIs REST com paginação e filtros
- ✅ Timezone América/São_Paulo
- ✅ Documentação OpenAPI/Swagger

---

## 🛠️ Tecnologias Utilizadas

- **Backend**: Django 5.2.6 + Django REST Framework
- **Banco de dados**: PostgreSQL
- **Documentação**: drf-spectacular (Swagger/OpenAPI)
- **Processamento**: pandas + openpyxl
- **Python**: 3.12+

---

## 📊 Estrutura dos Dados

### Modelo de Medição (`Measurement`)

```python
class Measurement(models.Model):
    ts = models.DateTimeField(db_index=True)           # Timestamp
    temp_current = models.FloatField(null=True)        # Temperatura atual (°C)
    temp_min = models.FloatField(null=True)            # Temperatura mínima (°C)
    temp_max = models.FloatField(null=True)            # Temperatura máxima (°C)
    rh_current = models.FloatField(null=True)          # Umidade atual (fração 0-1)
    rh_min = models.FloatField(null=True)              # Umidade mínima (fração 0-1)
    rh_max = models.FloatField(null=True)              # Umidade máxima (fração 0-1)
```

### Limites Operacionais

```python
TEMP_LOW = 17.0°C    # Temperatura mínima aceitável
TEMP_HIGH = 19.5°C   # Temperatura máxima aceitável  
RH_LIMIT = 62.0%     # Umidade máxima aceitável
```

---

## 🔌 APIs Disponíveis

### Base URL
```
http://localhost:8000/api/
```

### 📈 1. Resumo Geral - `/api/summary`

**Método**: `GET`  
**Descrição**: Retorna estatísticas agregadas do sistema

#### Resposta
```json
{
  "temp_mean": 18.45,           // Temperatura média (°C)
  "temp_min": 16.2,             // Temperatura mínima (°C)
  "temp_max": 20.9,             // Temperatura máxima (°C)
  "rh_mean": 59.26,             // Umidade média (%)
  "rh_min": 54.0,               // Umidade mínima (%)
  "rh_max": 65.0,               // Umidade máxima (%)
  "total_measurements": 730,     // Total de medições
  "humidity_violations": 15      // Total de violações
}
```

#### Exemplo de uso
```bash
curl http://localhost:8000/api/summary
```

---

### 📊 2. Série Temporal - `/api/series`

**Método**: `GET`  
**Descrição**: Retorna série temporal de medições

#### Parâmetros
- `max_points` (opcional): Número máximo de pontos (5-2000, padrão: 2000)

#### Resposta
```json
{
  "points": [
    {
      "ts": "2025-01-01T07:30:00-03:00",    // Timestamp (timezone São Paulo)
      "temp": 18.4,                         // Temperatura (°C)
      "rh": 59.0                           // Umidade (%)
    },
    {
      "ts": "2025-01-01T16:30:00-03:00",
      "temp": 18.2,
      "rh": 58.5
    }
  ],
  "max_points": 2000
}
```

#### Exemplos de uso
```bash
# Todos os pontos (até 2000)
curl http://localhost:8000/api/series

# Últimos 100 pontos
curl http://localhost:8000/api/series?max_points=100
```

---

### 🚨 3. Violações - `/api/violations`

**Método**: `GET`  
**Descrição**: Retorna violações de limites operacionais

#### Parâmetros
- `limit` (opcional): Número de registros (padrão: 50)

#### Resposta
```json
{
  "items": [
    {
      "ts": "2025-12-28T07:30:00-03:00",                                    // Timestamp
      "temp_current": 19.7,                                                 // Temperatura atual
      "rh_current": 61.0,                                                   // Umidade atual (%)
      "reason": "Temperatura 19.7°C fora do intervalo 17.0°C - 19.5°C"    // Motivo da violação
    },
    {
      "ts": "2025-11-26T16:30:00-03:00",
      "temp_current": 18.5,
      "rh_current": 62.0,
      "reason": "Umidade relativa 62.0% acima do limite 62.0%"
    }
  ]
}
```

#### Tipos de Violações
1. **Temperatura baixa**: `< 17.0°C`
2. **Temperatura alta**: `> 19.5°C`
3. **Umidade alta**: `≥ 62.0%`
4. **Combinadas**: Múltiplas violações simultâneas

#### Exemplos de uso
```bash
# Últimas 50 violações
curl http://localhost:8000/api/violations

# Últimas 10 violações
curl http://localhost:8000/api/violations?limit=10
```

---

## 📚 Documentação Interativa

### Swagger UI
Acesse a documentação interativa em:
```
http://localhost:8000/api/docs/
```

### ReDoc (alternativa)
```
http://localhost:8000/api/redoc/
```

### Schema OpenAPI (JSON)
```
http://localhost:8000/api/schema/
```

---

## 💾 Importação de Dados

### Comando de Importação

```bash
python manage.py import_excel --file caminho/para/planilha.xlsx
```

#### Parâmetros Disponíveis
- `--file`: Caminho do arquivo Excel (obrigatório)
- `--sheet`: Nome/índice da planilha (padrão: 0)
- `--tz`: Timezone (padrão: America/Sao_Paulo)
- `--year-base`: Ano base para conversão (padrão: 2025)
- `--dry-run`: Apenas validação, sem gravar
- `--allow-outliers`: Permite valores extremos

#### Formatos Suportados
O sistema reconhece colunas em português:

| Português | Inglês |
|-----------|--------|
| `Data`, `Dia` | `date` |
| `Hora` | `time` |
| `Temperatura Atual` | `temp_current` |
| `Temperatura Min/Max` | `temp_min/max` |
| `Umidade Atual`, `UR Atual` | `rh_current` |
| `Umidade Min/Max` | `rh_min/max` |

#### Tratamento de Dados
- ✅ Remove unidades (`18.7 °C` → `18.7`)
- ✅ Converte vírgulas (`18,7` → `18.7`)
- ✅ Normaliza percentuais (`60%` → `0.6`)
- ✅ Converte dia do ano para datas reais
- ✅ Aplica timezone São Paulo

#### Exemplo de Importação
```bash
# Importação básica
python manage.py import_excel --file dados.xlsx

# Com validação prévia
python manage.py import_excel --file dados.xlsx --dry-run

# Planilha específica
python manage.py import_excel --file dados.xlsx --sheet "Dados2025"
```

---

## 🚀 Instalação e Configuração

### 1. Pré-requisitos
```bash
# Python 3.12+
# PostgreSQL 12+
```

### 2. Dependências
```bash
pip install django djangorestframework drf-spectacular pandas openpyxl psycopg2-binary
```

### 3. Configuração do Banco
```python
# settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'pi_monitoring',
        'USER': 'ultra_user',
        'PASSWORD': '1234',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

### 4. Executar Sistema
```bash
# Aplicar migrações
python manage.py migrate

# Iniciar servidor
python manage.py runserver

# Importar dados (opcional)
python manage.py import_excel --file dados.xlsx
```

---

## 📈 Exemplos de Uso Completos

### Monitoramento em Tempo Real
```python
import requests

# Verificar estado atual do sistema
summary = requests.get('http://localhost:8000/api/summary').json()
print(f"Total: {summary['total_measurements']} medições")
print(f"Violações: {summary['humidity_violations']}")

# Últimas medições
series = requests.get('http://localhost:8000/api/series?max_points=10').json()
latest = series['points'][-1]
print(f"Última medição: {latest['ts']}")
print(f"Temp: {latest['temp']}°C, RH: {latest['rh']}%")

# Violações recentes
violations = requests.get('http://localhost:8000/api/violations?limit=5').json()
if violations['items']:
    print(f"Violação mais recente: {violations['items'][0]['reason']}")
```

### Dashboard Simples
```python
import matplotlib.pyplot as plt
import requests

# Buscar dados
response = requests.get('http://localhost:8000/api/series?max_points=100')
data = response.json()

# Extrair temperaturas e timestamps
temps = [point['temp'] for point in data['points']]
times = [point['ts'] for point in data['points']]

# Plotar gráfico
plt.figure(figsize=(12, 6))
plt.plot(times[::10], temps[::10])  # A cada 10 pontos
plt.title('Temperatura ao Longo do Tempo')
plt.ylabel('Temperatura (°C)')
plt.xticks(rotation=45)
plt.grid(True)
plt.show()
```

---

## 🔧 Configurações Avançadas

### Limites Personalizados
Edite `monitoring/domain.py`:
```python
TEMP_LOW = 15.0    # Nova temperatura mínima
TEMP_HIGH = 22.0   # Nova temperatura máxima  
RH_LIMIT = 70.0    # Nova umidade máxima
```

### Timezone Personalizado
Edite `settings.py`:
```python
TIME_ZONE = 'America/Recife'  # Ou outro timezone
```

---

## 📊 Estatísticas do Sistema Atual

- **Total de medições**: 730
- **Período**: Janeiro a Dezembro 2025
- **Frequência**: 2 medições/dia (7:30 e 16:30)
- **Taxa de violações**: 2.1% (15 de 730)
- **Temperatura média**: 18.45°C
- **Umidade média**: 59.0%

---

## 🆘 Solução de Problemas

### Erro de Importação Excel
```bash
# Verificar formato das colunas
python manage.py import_excel --file dados.xlsx --dry-run
```

### APIs retornando 404
```bash
# Verificar se servidor está rodando
curl http://localhost:8000/api/summary
```

### Problemas de Timezone
- Dados são sempre convertidos para `America/Sao_Paulo`
- Timestamps incluem offset `-03:00`

### Performance
- Índice automático em `ts` (timestamp)
- Paginação nas APIs de série e violações
- Agregações otimizadas no banco

---

## 📝 Licença

Este projeto é parte do Projeto Integrador IV e é fornecido como está para fins educacionais.

---

## 🤝 Contribuição

Para sugestões ou melhorias:
1. Documente o problema/sugestão
2. Teste com dados de exemplo
3. Verifique compatibilidade com PostgreSQL
4. Mantenha formato de resposta das APIs

---

**Sistema desenvolvido para monitoramento ambiental com foco em qualidade e confiabilidade dos dados.** 🌡️📊
