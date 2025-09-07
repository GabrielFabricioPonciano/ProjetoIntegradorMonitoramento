import os
import logging
from django.apps import AppConfig

logger = logging.getLogger(__name__)


class MonitoringConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'monitoring'
    
    def ready(self):
        """
        Inicializa o agendador de simulação quando o app estiver pronto.
        
        Protegido contra execução dupla durante autoreload do runserver
        e comandos administrativos como migrate.
        """
        # Guard 1: Evitar execução durante autoreload do runserver
        # O Django cria dois processos durante runserver: um pai e um filho
        # Só queremos executar no processo filho (RUN_MAIN == "true")
        if os.environ.get("RUN_MAIN") != "true":
            logger.debug("Pulando inicialização do agendador (processo pai do runserver)")
            return
        
        # Guard 2: Evitar execução durante comandos administrativos
        import sys
        if len(sys.argv) > 1:
            command = sys.argv[1]
            excluded_commands = [
                'migrate', 'makemigrations', 'collectstatic', 
                'createsuperuser', 'shell', 'check', 'test',
                'showmigrations', 'sqlmigrate', 'dbshell'
            ]
            if command in excluded_commands:
                logger.debug(f"Pulando inicialização do agendador durante comando: {command}")
                return
        
        # Importar e iniciar o agendador
        try:
            from .tasks import start_background_scheduler
            
            success = start_background_scheduler()
            if success:
                logger.info("Agendador de simulação inicializado com sucesso")
            else:
                logger.info("Agendador de simulação não foi iniciado (desabilitado ou já rodando)")
                
        except Exception as e:
            logger.error(f"Erro ao inicializar agendador de simulação: {e}", exc_info=True)
