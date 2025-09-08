"""
Sistema de backup automatizado para PostgreSQL.
Permite backup manual e agendamento automático.
"""
import os
import subprocess
import logging
from datetime import datetime, timedelta
from pathlib import Path
from django.conf import settings
from django.core.management.base import BaseCommand
from django.core.mail import mail_admins


logger = logging.getLogger(__name__)


class BackupManager:
    """Gerenciador de backups do banco de dados."""
    
    def __init__(self):
        self.backup_dir = Path(getattr(settings, 'BACKUP_DIR', 'backups'))
        self.backup_dir.mkdir(exist_ok=True)
        
        # Configurações do banco
        self.db_config = settings.DATABASES['default']
        self.db_name = self.db_config['NAME']
        self.db_user = self.db_config['USER']
        self.db_password = self.db_config['PASSWORD']
        self.db_host = self.db_config.get('HOST', 'localhost')
        self.db_port = self.db_config.get('PORT', '5432')
    
    def create_backup(self, backup_name=None):
        """
        Cria um backup do banco de dados.
        
        Args:
            backup_name (str, optional): Nome do arquivo de backup.
                                       Se None, usa timestamp atual.
        
        Returns:
            tuple: (sucesso: bool, caminho_arquivo: str, mensagem: str)
        """
        try:
            # Gerar nome do arquivo se não fornecido
            if not backup_name:
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                backup_name = f"backup_{self.db_name}_{timestamp}.sql"
            
            backup_path = self.backup_dir / backup_name
            
            # Configurar variáveis de ambiente para autenticação
            env = os.environ.copy()
            env['PGPASSWORD'] = self.db_password
            
            # Comando pg_dump
            cmd = [
                'pg_dump',
                '--host', self.db_host,
                '--port', str(self.db_port),
                '--username', self.db_user,
                '--no-password',
                '--format', 'custom',
                '--verbose',
                '--file', str(backup_path),
                self.db_name
            ]
            
            logger.info(f"Iniciando backup: {backup_path}")
            
            # Executar backup
            result = subprocess.run(
                cmd,
                env=env,
                capture_output=True,
                text=True,
                timeout=3600  # Timeout de 1 hora
            )
            
            if result.returncode == 0:
                # Backup bem-sucedido
                file_size = backup_path.stat().st_size
                size_mb = file_size / (1024 * 1024)
                
                message = f"Backup criado com sucesso: {backup_path} ({size_mb:.1f} MB)"
                logger.info(message)
                
                return True, str(backup_path), message
            else:
                # Erro no backup
                error_msg = f"Erro no backup: {result.stderr}"
                logger.error(error_msg)
                
                # Remover arquivo parcial se existir
                if backup_path.exists():
                    backup_path.unlink()
                
                return False, "", error_msg
                
        except subprocess.TimeoutExpired:
            error_msg = "Backup cancelado por timeout (1 hora)"
            logger.error(error_msg)
            return False, "", error_msg
            
        except Exception as e:
            error_msg = f"Erro inesperado no backup: {str(e)}"
            logger.error(error_msg)
            return False, "", error_msg
    
    def restore_backup(self, backup_path):
        """
        Restaura um backup do banco de dados.
        
        Args:
            backup_path (str): Caminho para o arquivo de backup.
        
        Returns:
            tuple: (sucesso: bool, mensagem: str)
        """
        try:
            backup_file = Path(backup_path)
            if not backup_file.exists():
                return False, f"Arquivo de backup não encontrado: {backup_path}"
            
            # Configurar variáveis de ambiente
            env = os.environ.copy()
            env['PGPASSWORD'] = self.db_password
            
            # Comando pg_restore
            cmd = [
                'pg_restore',
                '--host', self.db_host,
                '--port', str(self.db_port),
                '--username', self.db_user,
                '--no-password',
                '--dbname', self.db_name,
                '--clean',
                '--verbose',
                str(backup_file)
            ]
            
            logger.info(f"Iniciando restauração: {backup_path}")
            
            # Executar restauração
            result = subprocess.run(
                cmd,
                env=env,
                capture_output=True,
                text=True,
                timeout=3600  # Timeout de 1 hora
            )
            
            if result.returncode == 0:
                message = f"Backup restaurado com sucesso: {backup_path}"
                logger.info(message)
                return True, message
            else:
                error_msg = f"Erro na restauração: {result.stderr}"
                logger.error(error_msg)
                return False, error_msg
                
        except subprocess.TimeoutExpired:
            error_msg = "Restauração cancelada por timeout (1 hora)"
            logger.error(error_msg)
            return False, error_msg
            
        except Exception as e:
            error_msg = f"Erro inesperado na restauração: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
    
    def list_backups(self):
        """
        Lista todos os backups disponíveis.
        
        Returns:
            list: Lista de dicionários com informações dos backups.
        """
        backups = []
        
        try:
            for backup_file in self.backup_dir.glob("*.sql"):
                stat = backup_file.stat()
                
                backups.append({
                    'name': backup_file.name,
                    'path': str(backup_file),
                    'size': stat.st_size,
                    'size_mb': round(stat.st_size / (1024 * 1024), 1),
                    'created_at': datetime.fromtimestamp(stat.st_ctime),
                    'modified_at': datetime.fromtimestamp(stat.st_mtime),
                })
            
            # Ordenar por data de criação (mais recentes primeiro)
            backups.sort(key=lambda x: x['created_at'], reverse=True)
            
        except Exception as e:
            logger.error(f"Erro ao listar backups: {str(e)}")
        
        return backups
    
    def cleanup_old_backups(self, keep_days=30):
        """
        Remove backups antigos.
        
        Args:
            keep_days (int): Número de dias para manter os backups.
        
        Returns:
            tuple: (quantidade_removida: int, mensagem: str)
        """
        try:
            cutoff_date = datetime.now() - timedelta(days=keep_days)
            removed_count = 0
            
            for backup_file in self.backup_dir.glob("*.sql"):
                file_date = datetime.fromtimestamp(backup_file.stat().st_ctime)
                
                if file_date < cutoff_date:
                    logger.info(f"Removendo backup antigo: {backup_file.name}")
                    backup_file.unlink()
                    removed_count += 1
            
            message = f"Removidos {removed_count} backups antigos (mais de {keep_days} dias)"
            logger.info(message)
            
            return removed_count, message
            
        except Exception as e:
            error_msg = f"Erro na limpeza de backups: {str(e)}"
            logger.error(error_msg)
            return 0, error_msg
    
    def get_backup_stats(self):
        """
        Retorna estatísticas dos backups.
        
        Returns:
            dict: Estatísticas dos backups.
        """
        try:
            backups = self.list_backups()
            
            if not backups:
                return {
                    'total_backups': 0,
                    'total_size_mb': 0,
                    'latest_backup': None,
                    'oldest_backup': None,
                }
            
            total_size = sum(b['size'] for b in backups)
            
            return {
                'total_backups': len(backups),
                'total_size_mb': round(total_size / (1024 * 1024), 1),
                'latest_backup': backups[0],
                'oldest_backup': backups[-1],
            }
            
        except Exception as e:
            logger.error(f"Erro ao obter estatísticas: {str(e)}")
            return {}


class Command(BaseCommand):
    """Comando Django para gerenciar backups."""
    
    help = 'Gerencia backups do banco de dados'
    
    def add_arguments(self, parser):
        parser.add_argument(
            'action',
            choices=['create', 'list', 'cleanup', 'stats'],
            help='Ação a ser executada'
        )
        parser.add_argument(
            '--name',
            help='Nome do arquivo de backup (apenas para create)'
        )
        parser.add_argument(
            '--keep-days',
            type=int,
            default=30,
            help='Dias para manter backups (apenas para cleanup)'
        )
    
    def handle(self, *args, **options):
        backup_manager = BackupManager()
        action = options['action']
        
        if action == 'create':
            self.stdout.write("Criando backup...")
            success, path, message = backup_manager.create_backup(options.get('name'))
            
            if success:
                self.stdout.write(
                    self.style.SUCCESS(f"✓ {message}")
                )
            else:
                self.stdout.write(
                    self.style.ERROR(f"✗ {message}")
                )
                
        elif action == 'list':
            backups = backup_manager.list_backups()
            
            if not backups:
                self.stdout.write("Nenhum backup encontrado.")
                return
            
            self.stdout.write(f"\n{len(backups)} backup(s) encontrado(s):\n")
            
            for backup in backups:
                self.stdout.write(
                    f"  {backup['name']} - {backup['size_mb']} MB - {backup['created_at']}"
                )
                
        elif action == 'cleanup':
            keep_days = options['keep_days']
            self.stdout.write(f"Limpando backups mais antigos que {keep_days} dias...")
            
            removed_count, message = backup_manager.cleanup_old_backups(keep_days)
            
            self.stdout.write(
                self.style.SUCCESS(f"✓ {message}")
            )
            
        elif action == 'stats':
            stats = backup_manager.get_backup_stats()
            
            if not stats:
                self.stdout.write("Erro ao obter estatísticas.")
                return
            
            self.stdout.write("\nEstatísticas de Backup:")
            self.stdout.write(f"  Total de backups: {stats['total_backups']}")
            self.stdout.write(f"  Tamanho total: {stats['total_size_mb']} MB")
            
            if stats['latest_backup']:
                latest = stats['latest_backup']
                self.stdout.write(f"  Backup mais recente: {latest['name']} ({latest['created_at']})")
            
            if stats['oldest_backup']:
                oldest = stats['oldest_backup']
                self.stdout.write(f"  Backup mais antigo: {oldest['name']} ({oldest['created_at']})")


# Função auxiliar para uso em views
def create_backup_now():
    """
    Cria um backup imediatamente.
    Função auxiliar para uso em views ou APIs.
    
    Returns:
        dict: Resultado da operação de backup.
    """
    backup_manager = BackupManager()
    success, path, message = backup_manager.create_backup()
    
    return {
        'success': success,
        'path': path,
        'message': message,
        'timestamp': datetime.now().isoformat()
    }
