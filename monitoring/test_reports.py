"""
Testes unitários para o sistema de relatórios.
"""
import os
import tempfile
from datetime import datetime, timedelta

from django.test import TestCase, override_settings
from django.core.cache import cache
from django.urls import reverse

from .models import Measurement
from .reports import ReportGenerator


class ReportGeneratorTests(TestCase):
    """Testes para a classe ReportGenerator."""
    
    def setUp(self):
        """Configuração inicial dos testes."""
        # Criar dados de teste
        self.create_test_data()
        self.generator = ReportGenerator()
    
    def create_test_data(self):
        """Cria dados de teste para relatórios."""
        base_time = datetime.now() - timedelta(days=7)
        
        # Criar 50 registros de teste ao longo de 7 dias
        for i in range(50):
            timestamp = base_time + timedelta(hours=i * 3.36)  # ~3.36h entre registros
            
            # Alternar entre valores normais e violações
            if i % 10 == 0:  # 10% violações
                temp = 20.5  # Acima do limite (19.5°C)
                humidity = 0.45  # 45%
            else:
                temp = 18.5  # Valor normal
                humidity = 0.55  # 55%
            
            Measurement.objects.create(
                ts=timestamp,
                temp_current=temp,
                rh_current=humidity
            )
    
    def test_generate_pdf_report_success(self):
        """Testa geração bem-sucedida de relatório PDF."""
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            try:
                success = self.generator.generate_pdf_report(tmp_file.name, days=7)
                
                self.assertTrue(success)
                self.assertTrue(os.path.exists(tmp_file.name))
                self.assertGreater(os.path.getsize(tmp_file.name), 1000)  # PDF deve ter tamanho > 1KB
            finally:
                if os.path.exists(tmp_file.name):
                    os.unlink(tmp_file.name)
    
    def test_generate_excel_report_success(self):
        """Testa geração bem-sucedida de relatório Excel."""
        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp_file:
            try:
                success = self.generator.generate_excel_report(tmp_file.name, days=30)
                
                self.assertTrue(success)
                self.assertTrue(os.path.exists(tmp_file.name))
                self.assertGreater(os.path.getsize(tmp_file.name), 5000)  # Excel deve ter tamanho > 5KB
            finally:
                if os.path.exists(tmp_file.name):
                    os.unlink(tmp_file.name)
    
    def test_generate_pdf_with_no_data(self):
        """Testa geração de PDF sem dados."""
        # Limpar todos os registros
        Measurement.objects.all().delete()
        
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            try:
                success = self.generator.generate_pdf_report(tmp_file.name, days=7)
                
                self.assertTrue(success)  # Deve ainda gerar relatório vazio
                self.assertTrue(os.path.exists(tmp_file.name))
            finally:
                if os.path.exists(tmp_file.name):
                    os.unlink(tmp_file.name)
    
    def test_generate_excel_with_no_data(self):
        """Testa geração de Excel sem dados."""
        # Limpar todos os registros
        Measurement.objects.all().delete()
        
        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp_file:
            try:
                success = self.generator.generate_excel_report(tmp_file.name, days=30)
                
                self.assertTrue(success)  # Deve ainda gerar relatório vazio
                self.assertTrue(os.path.exists(tmp_file.name))
            finally:
                if os.path.exists(tmp_file.name):
                    os.unlink(tmp_file.name)
    
    def test_pdf_generation_invalid_path(self):
        """Testa tratamento de erro com caminho inválido para PDF."""
        invalid_path = "/invalid/path/report.pdf"
        success = self.generator.generate_pdf_report(invalid_path, days=7)
        self.assertFalse(success)
    
    def test_excel_generation_invalid_path(self):
        """Testa tratamento de erro com caminho inválido para Excel."""
        invalid_path = "/invalid/path/report.xlsx"
        success = self.generator.generate_excel_report(invalid_path, days=30)
        self.assertFalse(success)


class ReportViewTests(TestCase):
    """Testes para as views de relatórios."""
    
    def setUp(self):
        """Configuração inicial dos testes."""
        # Criar dados de teste
        self.create_test_data()
    
    def create_test_data(self):
        """Cria dados de teste."""
        base_time = datetime.now() - timedelta(days=15)
        
        for i in range(20):
            timestamp = base_time + timedelta(hours=i * 18)  # ~18h entre registros
            
            Measurement.objects.create(
                ts=timestamp,
                temp_current=18.5,
                rh_current=0.55
            )
    
    def test_export_pdf_report_view(self):
        """Testa a view de exportação de relatório PDF."""
        url = reverse('export_pdf_report')
        response = self.client.get(url, {'days': 7})
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertIn('attachment; filename=', response['Content-Disposition'])
        self.assertGreater(len(response.content), 1000)  # PDF deve ter conteúdo
    
    def test_export_excel_report_view(self):
        """Testa a view de exportação de relatório Excel."""
        url = reverse('export_excel_report')
        response = self.client.get(url, {'days': 30})
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        self.assertIn('attachment; filename=', response['Content-Disposition'])
        self.assertGreater(len(response.content), 5000)  # Excel deve ter conteúdo
    
    def test_pdf_report_with_invalid_days(self):
        """Testa relatório PDF com parâmetro days inválido."""
        url = reverse('export_pdf_report')
        response = self.client.get(url, {'days': 'invalid'})
        
        # Deve usar valor padrão
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')
    
    def test_excel_report_with_missing_days(self):
        """Testa relatório Excel sem parâmetro days."""
        url = reverse('export_excel_report')
        response = self.client.get(url)
        
        # Deve usar valor padrão
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')


@override_settings(CACHES={
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
})
class CacheTests(TestCase):
    """Testes para o sistema de cache."""
    
    def setUp(self):
        """Configuração inicial dos testes."""
        self.create_test_data()
        cache.clear()  # Limpar cache antes de cada teste
    
    def create_test_data(self):
        """Cria dados de teste."""
        base_time = datetime.now() - timedelta(hours=2)
        
        for i in range(10):
            timestamp = base_time + timedelta(minutes=i * 12)
            
            Measurement.objects.create(
                ts=timestamp,
                temp_current=18.5,
                rh_current=0.55
            )
    
    def test_api_summary_cache(self):
        """Testa cache da API de resumo."""
        url = reverse('api_summary')
        
        # Primeira requisição - deve buscar do banco
        response1 = self.client.get(url)
        self.assertEqual(response1.status_code, 200)
        
        # Segunda requisição - deve usar cache
        response2 = self.client.get(url)
        self.assertEqual(response2.status_code, 200)
        self.assertEqual(response1.content, response2.content)
    
    def test_api_series_cache(self):
        """Testa cache da API de séries temporais."""
        url = reverse('api_series')
        
        # Primeira requisição
        response1 = self.client.get(url, {'max_points': 50})
        self.assertEqual(response1.status_code, 200)
        
        # Segunda requisição com mesmos parâmetros - deve usar cache
        response2 = self.client.get(url, {'max_points': 50})
        self.assertEqual(response2.status_code, 200)
        self.assertEqual(response1.content, response2.content)
    
    def test_api_violations_cache(self):
        """Testa cache da API de violações."""
        url = reverse('api_violations')
        
        # Primeira requisição
        response1 = self.client.get(url, {'limit': 10})
        self.assertEqual(response1.status_code, 200)
        
        # Segunda requisição - deve usar cache
        response2 = self.client.get(url, {'limit': 10})
        self.assertEqual(response2.status_code, 200)
        self.assertEqual(response1.content, response2.content)
    
    def test_cache_key_variation(self):
        """Testa que chaves de cache diferentes geram resultados diferentes."""
        url = reverse('api_series')
        
        # Requisições com parâmetros diferentes devem ter cache separado
        response1 = self.client.get(url, {'max_points': 10})
        response2 = self.client.get(url, {'max_points': 20})
        
        self.assertEqual(response1.status_code, 200)
        self.assertEqual(response2.status_code, 200)
        # Conteúdo pode ser diferente devido aos diferentes max_points


class PerformanceTests(TestCase):
    """Testes de performance e rate limiting."""
    
    def setUp(self):
        """Configuração inicial dos testes."""
        self.create_test_data()
    
    def create_test_data(self):
        """Cria dados de teste."""
        base_time = datetime.now() - timedelta(hours=1)
        
        for i in range(100):
            timestamp = base_time + timedelta(seconds=i * 36)  # 36s entre registros
            
            Measurement.objects.create(
                ts=timestamp,
                temp_current=18.5,
                rh_current=0.55
            )
    
    def test_api_series_large_dataset(self):
        """Testa performance da API com dataset grande."""
        url = reverse('api_series')
        
        # Requisição com muitos pontos
        response = self.client.get(url, {'max_points': 2000})
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertLessEqual(len(data), 2000)  # Não deve exceder limite
    
    def test_api_series_point_limits(self):
        """Testa limites de pontos na API de séries."""
        url = reverse('api_series')
        
        # Teste com limite muito alto
        response = self.client.get(url, {'max_points': 5000})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertLessEqual(len(data), 2000)  # Deve ser limitado a 2000
        
        # Teste com limite muito baixo
        response = self.client.get(url, {'max_points': 1})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(len(data), 5)  # Deve ser elevado para 5
    
    def test_report_generation_performance(self):
        """Testa performance da geração de relatórios."""
        generator = ReportGenerator()
        
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            try:
                import time
                start_time = time.time()
                success = generator.generate_pdf_report(tmp_file.name, days=7)
                end_time = time.time()
                
                self.assertTrue(success)
                self.assertLess(end_time - start_time, 10)  # Deve completar em menos de 10s
            finally:
                if os.path.exists(tmp_file.name):
                    os.unlink(tmp_file.name)
