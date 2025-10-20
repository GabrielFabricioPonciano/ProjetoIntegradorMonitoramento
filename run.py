# FastAPI Server Runner
# Run this file to start the server

if __name__ == "__main__":
    import uvicorn
    from app.config import settings
    
    print(f"""
    ╔══════════════════════════════════════════════════════════╗
    ║  🚀 {settings.app_name} v{settings.app_version}                         ║
    ║  FastAPI - Rápido, Moderno, Eficiente                    ║
    ╚══════════════════════════════════════════════════════════╝
    
    📊 Dashboard:  http://{settings.host}:{settings.port}
    📖 API Docs:   http://{settings.host}:{settings.port}/api/docs
    🔄 ReDoc:      http://{settings.host}:{settings.port}/api/redoc
    
    Pressione CTRL+C para parar o servidor
    """)
    
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,  # Auto-reload em modo debug
        log_level="info"
    )
