# 🚀 Deploy no Render.com - PI Monitoring

> Guia completo para fazer deploy **GRATUITO** no Render.com

---

## 🎯 Por que Render?

✅ **Totalmente GRATUITO** (tier Free permanente)
✅ **Zero configuração** - apenas conectar GitHub
✅ **Deploy automático** a cada push
✅ **HTTPS grátis** com certificado SSL
✅ **Mais fácil** que Google Cloud Run
✅ **Interface amigável**
✅ **Build automático** do Dockerfile
✅ **Logs em tempo real**

---

## 📋 Pré-requisitos

- ✅ Conta GitHub (você já tem!)
- ✅ Repositório do projeto no GitHub
- ✅ Conta Render.com (grátis)

---

## 🚀 Deploy em 3 Passos

### Passo 1: Criar conta no Render

1. Acesse: https://render.com
2. Clique em **"Get Started for Free"**
3. Escolha **"Sign up with GitHub"**
4. Autorize o Render a acessar seus repositórios

### Passo 2: Criar Web Service

Você já está na tela certa! Agora preencha:

#### ✅ **Source Code**
- Repository: `GabrielFabricioPonciano/ProjetoIntegradorMonitoramento`
- Branch: `main` (ou `feature/fastapi-migration` se ainda não fez merge)

#### ✅ **Name**
```
pi-monitoring
```

#### ✅ **Region**
```
Oregon (US West)
```
> Escolha a região mais próxima para melhor performance

#### ✅ **Root Directory**
```
(deixe vazio)
```

#### ✅ **Dockerfile Path**
```
./Dockerfile
```

#### ✅ **Instance Type**
```
Free - $0/month
512 MB RAM, 0.1 CPU
```

### Passo 3: Configurar Variáveis de Ambiente

Clique em **"Add Environment Variable"** e adicione:

```
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
DEBUG_MODE=false
LOG_LEVEL=INFO
TIMEZONE=America/Sao_Paulo
TEMP_LOW=17.0
TEMP_HIGH=19.5
RH_LIMIT=62.0
CORS_ORIGINS=*
CACHE_TTL=30
DATABASE_PATH=data/monitoring.db
```

**OU** clique em **"Add from .env"** e cole isto:

```env
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
DEBUG_MODE=false
LOG_LEVEL=INFO
TIMEZONE=America/Sao_Paulo
TEMP_LOW=17.0
TEMP_HIGH=19.5
RH_LIMIT=62.0
CORS_ORIGINS=*
CACHE_TTL=30
DATABASE_PATH=data/monitoring.db
```

### Passo 4: Deploy!

1. Clique em **"Deploy web service"** (botão azul)
2. Aguarde o build (2-5 minutos)
3. Seu app estará disponível em: `https://pi-monitoring.onrender.com`

---

## ✅ Verificar Deploy

Após o deploy, você verá:

```
✓ Build succeeded
✓ Service is live
```

Acesse: `https://pi-monitoring.onrender.com`

### Testar Endpoints

```bash
# Dashboard
https://pi-monitoring.onrender.com/

# Health Check
https://pi-monitoring.onrender.com/api/system/health/

# Resumo
https://pi-monitoring.onrender.com/api/summary/

# API Docs
https://pi-monitoring.onrender.com/api/docs
```

---

## 🔧 Configurações Importantes

### ⚠️ Limitações do Plano Free

- **Spin down**: Após 15 minutos sem acesso, o serviço "dorme"
- **Spin up**: Demora ~30 segundos para "acordar" no primeiro acesso
- **RAM**: 512 MB (suficiente para nosso app)
- **CPU**: 0.1 CPU compartilhado
- **Largura de banda**: 100 GB/mês
- **Build time**: 500 horas/mês

### ✅ Como evitar o "Spin down"

**Opção 1**: Atualizar para Starter ($7/mês) - mantém sempre ativo

**Opção 2**: Usar um serviço de "ping" gratuito:
- https://uptimerobot.com (free)
- https://cron-job.org (free)
- Configurar para fazer ping a cada 14 minutos

**Opção 3**: Criar um GitHub Action que faz ping:

```yaml
# .github/workflows/keep-alive.yml
name: Keep Alive
on:
  schedule:
    - cron: '*/10 * * * *'  # A cada 10 minutos
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping service
        run: curl https://pi-monitoring.onrender.com/api/system/health/
```

---

## 🔄 Deploy Automático

Render faz **deploy automático** quando você faz push para o GitHub!

```bash
# Fazer mudanças
git add .
git commit -m "Update: melhorias no analytics"
git push origin main

# Render detecta automaticamente e faz deploy! 🚀
```

---

## 📊 Monitoramento

### Ver Logs em Tempo Real

1. Entre no Render Dashboard
2. Clique no seu serviço `pi-monitoring`
3. Vá em **"Logs"**

### Métricas

1. Clique em **"Metrics"**
2. Veja:
   - CPU usage
   - Memory usage
   - Request count
   - Response time

### Eventos

1. Clique em **"Events"**
2. Veja histórico de deploys

---

## 🎨 Configurações Avançadas

### Custom Domain (Domínio Personalizado)

Se você tem um domínio próprio:

1. Vá em **"Settings"**
2. Clique em **"Custom Domains"**
3. Adicione seu domínio (ex: `api.seudominio.com`)
4. Configure DNS conforme instruído
5. HTTPS é configurado automaticamente!

### Environment Groups

Para reutilizar variáveis em múltiplos serviços:

1. Vá em **"Environment Groups"** (menu lateral)
2. Clique em **"New Environment Group"**
3. Nome: `pi-monitoring-env`
4. Adicione todas as variáveis
5. No serviço, clique em **"Environment"** > **"Link Environment Group"**

### Persistent Disk (para dados)

⚠️ Plano Free **NÃO** tem persistent disk!

Para salvar dados permanentemente:

**Opção 1**: Upgrade para Starter ($7/mês) e adicionar disk
**Opção 2**: Usar banco de dados externo (PostgreSQL, SQLite Cloud)
**Opção 3**: Usar storage externo (AWS S3, Cloudinary)

### Health Checks

Render já monitora automaticamente `/` mas você pode customizar:

1. Vá em **"Settings"**
2. Clique em **"Health & Alerts"**
3. Configure:
   - Health Check Path: `/api/system/health/`
   - Alert emails

---

## 🐛 Troubleshooting

### Deploy falhou

1. Verifique os **Logs** no Render
2. Verifique se o `Dockerfile` está correto
3. Teste localmente:
   ```bash
   docker build -t pi-monitoring .
   docker run -p 8000:8000 pi-monitoring
   ```

### App não responde

1. Verifique se não está em "spin down" (plano Free)
2. Aguarde 30 segundos no primeiro acesso
3. Veja os logs para erros

### Erro de memória

Se ultrapassar 512 MB:

1. Otimize imports do Python
2. Reduza cache se estiver usando
3. Considere upgrade para Starter (512 MB → 2 GB)

### Dados perdidos após deploy

Plano Free **não persiste dados**! Soluções:

1. Use PostgreSQL do Render (free tier disponível)
2. Use SQLite em memória apenas
3. Upgrade para Starter + Persistent Disk

---

## 💡 Dicas Pro

### 1. Otimizar Dockerfile para Render

Seu Dockerfile já está ótimo! Mas pode melhorar:

```dockerfile
# Multi-stage build (reduz tamanho)
FROM python:3.12-slim as builder
WORKDIR /app
COPY requirements-fastapi.txt .
RUN pip install --user --no-cache-dir -r requirements-fastapi.txt

FROM python:3.12-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2. Adicionar health check no código

Já temos! Endpoint `/api/system/health/` funciona perfeitamente.

### 3. Configurar CORS para produção

No deploy de produção, use:

```env
CORS_ORIGINS=https://pi-monitoring.onrender.com,https://seudominio.com
```

### 4. Logs estruturados

Nosso logger já está configurado! Render captura automaticamente.

---

## 📈 Upgrade para Starter?

### Benefícios ($7/mês):

✅ **Sem spin down** - sempre ativo
✅ **Mais CPU** - 0.5 vCPU (5x mais rápido)
✅ **Persistent Disk** - até 1 GB
✅ **SSH access** - acesso direto ao container
✅ **Zero downtime deploys**
✅ **Suporte prioritário**

### Vale a pena?

- 🟢 **SIM** - Se você precisa que o app esteja sempre disponível
- 🟢 **SIM** - Se precisa salvar dados entre deploys
- 🔴 **NÃO** - Se é apenas para testes/demonstração

---

## 🎉 Pronto!

Seu app está no ar em: **https://pi-monitoring.onrender.com**

### Próximos passos:

- [ ] Testar todos os endpoints
- [ ] Verificar logs
- [ ] Configurar alertas
- [ ] Adicionar domínio personalizado (opcional)
- [ ] Configurar "keep alive" se necessário
- [ ] Compartilhar com o mundo! 🚀

---

## 📚 Recursos

- 📖 [Documentação Render](https://render.com/docs)
- 💬 [Community Forum](https://community.render.com)
- 🎓 [Render Blog](https://render.com/blog)
- 🐛 [Status Page](https://status.render.com)

---

<div align="center">

**Deploy feito em menos de 5 minutos!** ⚡

🎉 **Render.com + FastAPI = ❤️** 🎉

</div>
