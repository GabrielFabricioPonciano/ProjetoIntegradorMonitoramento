# 🐳 Docker Setup - PI Monitoring

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

Access the application at: **http://localhost:8000**

### Using Docker directly

```bash
# Build the image
docker build -t pi-monitoring .

# Run the container
docker run -d \
  --name pi-monitoring \
  -p 8000:8000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  pi-monitoring

# View logs
docker logs -f pi-monitoring

# Stop and remove
docker stop pi-monitoring
docker rm pi-monitoring
```

## Configuration

### Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

Key variables:
- `SERVER_HOST=0.0.0.0`
- `SERVER_PORT=8000`
- `DATABASE_PATH=data/monitoring.db`
- `LOG_LEVEL=INFO`
- `TIMEZONE=America/Sao_Paulo`

### Volumes

The Docker setup mounts two volumes for data persistence:

1. **`./data:/app/data`** - SQLite database storage
2. **`./logs:/app/logs`** - Application logs

These directories are created automatically if they don't exist.

## Health Check

The container includes a health check that runs every 30 seconds:

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' pi-monitoring

# View health check logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' pi-monitoring
```

Health check endpoint: `http://localhost:8000/api/system/health/`

## Useful Commands

```bash
# View container status
docker ps

# View all containers (including stopped)
docker ps -a

# View container logs (last 100 lines)
docker logs --tail 100 pi-monitoring

# Follow logs in real-time
docker logs -f pi-monitoring

# Execute commands inside container
docker exec -it pi-monitoring bash

# Restart container
docker restart pi-monitoring

# View container resource usage
docker stats pi-monitoring

# Remove container and image
docker-compose down
docker rmi pi-monitoring
```

## Production Deployment

### 1. Build optimized image

```bash
docker build -t pi-monitoring:latest --no-cache .
```

### 2. Configure environment

Edit `docker-compose.yml` and set:
- `DEBUG_MODE=false`
- `LOG_LEVEL=WARNING`
- Strong `SECRET_KEY`
- Specific `CORS_ORIGINS`

### 3. Start with compose

```bash
docker-compose up -d
```

### 4. Monitor

```bash
# Check health
curl http://localhost:8000/api/system/health/

# View metrics
docker stats pi-monitoring

# Monitor logs
docker logs -f pi-monitoring
```

## Troubleshooting

### Container won't start

```bash
# View detailed logs
docker logs pi-monitoring

# Check health check status
docker inspect pi-monitoring | grep -A 10 Health
```

### Database issues

```bash
# Check if data directory is mounted
docker exec pi-monitoring ls -la /app/data

# Check database file permissions
docker exec pi-monitoring ls -la /app/data/monitoring.db
```

### Port already in use

```bash
# Find process using port 8000
lsof -i :8000  # Linux/Mac
netstat -ano | findstr :8000  # Windows

# Use different port
docker run -p 8001:8000 pi-monitoring
```

### Reset everything

```bash
# Stop and remove container
docker-compose down

# Remove volumes
docker volume prune

# Remove images
docker rmi pi-monitoring

# Rebuild from scratch
docker-compose up -d --build
```

## Architecture

```
┌─────────────────────────────────────┐
│         Docker Container            │
│  ┌───────────────────────────────┐  │
│  │   FastAPI Application         │  │
│  │   - Python 3.12               │  │
│  │   - Uvicorn Server            │  │
│  │   - Port 8000                 │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌─────────────┐  ┌──────────────┐ │
│  │    Data     │  │     Logs     │ │
│  │  (SQLite)   │  │  (Rotating)  │ │
│  │             │  │              │ │
│  └─────────────┘  └──────────────┘ │
│         │                 │         │
└─────────┼─────────────────┼─────────┘
          │                 │
    ┌─────▼─────┐    ┌──────▼──────┐
    │ ./data/   │    │  ./logs/    │
    │ (Volume)  │    │  (Volume)   │
    └───────────┘    └─────────────┘
```

## Performance

The Docker image is optimized for:
- **Small size**: ~200MB (Python 3.12 slim + dependencies)
- **Fast startup**: ~2-3 seconds
- **Low memory**: ~50-100MB RAM usage
- **Efficient**: Multi-stage build with layer caching

## Security

- Non-root user execution
- Minimal base image (Python slim)
- No unnecessary packages
- Health checks enabled
- Secrets via environment variables
- Read-only root filesystem (optional)

## Next Steps

1. ✅ Test locally: `docker-compose up`
2. ✅ Check health: `curl http://localhost:8000/api/system/health/`
3. ✅ View logs: `docker-compose logs -f`
4. ✅ Access dashboard: http://localhost:8000
5. ✅ Check API docs: http://localhost:8000/api/docs

## Support

For issues or questions, check:
- Container logs: `docker logs pi-monitoring`
- Health status: http://localhost:8000/api/system/health/
- API documentation: http://localhost:8000/api/docs
