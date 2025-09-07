import math
import re
import unicodedata
from zoneinfo import ZoneInfo
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from monitoring.models import Measurement

# pip install pandas openpyxl

# Aliases de colunas em PT-BR -> nomes esperados
COLUMN_ALIASES = {
    # tempo
    "ts": "ts",
    "data": "date",
    "dia": "date",
    "date": "date",
    "hora": "time",
    "time": "time",

    # temperatura
    "temperatura atual": "temp_current",
    "temperatura_atual": "temp_current",
    "temp atual": "temp_current",
    "temp_atual": "temp_current",
    "temp current": "temp_current",
    "temp_current": "temp_current",

    "temperatura min": "temp_min",
    "temperatura_min": "temp_min",
    "temp min": "temp_min",
    "temp_min": "temp_min",

    "temperatura max": "temp_max",
    "temperatura_max": "temp_max",
    "temp max": "temp_max",
    "temp_max": "temp_max",

    # umidade
    "umidade atual": "rh_current",
    "umidade_atual": "rh_current",
    "ur atual": "rh_current",
    "ur_atual": "rh_current",
    "rh atual": "rh_current",
    "rh_atual": "rh_current",
    "rh current": "rh_current",
    "rh_current": "rh_current",

    "umidade min": "rh_min",
    "umidade_min": "rh_min",
    "rh min": "rh_min",
    "rh_min": "rh_min",

    "umidade max": "rh_max",
    "umidade_max": "rh_max",
    "rh max": "rh_max",
    "rh_max": "rh_max",
}

EXPECTED = ["ts", "temp_current", "temp_min", "temp_max", "rh_current", "rh_min", "rh_max"]


def _normalize_header(s: str) -> str:
    s = str(s).strip().lower()
    # remove acentos
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    # normaliza espaços e separadores
    s = re.sub(r"[\s\-]+", " ", s).strip()
    return s


def _map_headers(cols):
    mapped = {}
    for c in cols:
        norm = _normalize_header(c)
        # tenta alias direto
        if norm in COLUMN_ALIASES:
            mapped[c] = COLUMN_ALIASES[norm]
        else:
            # se já vier no padrão esperado
            if norm in EXPECTED:
                mapped[c] = norm
            else:
                # não mapeado
                mapped[c] = None
    return mapped


def _nan_to_none(x):
    if x is None:
        return None
    if isinstance(x, float) and math.isnan(x):
        return None
    return x


def _clean_numeric_value(value):
    """
    Limpa valores numéricos removendo unidades, símbolos e normalizando vírgulas.
    Ex: '18.7 °C' -> 18.7, '0,6' -> 0.6
    """
    if value is None:
        return None
        
    # Converte para string
    s = str(value).strip()
    
    if not s or s.lower() in ['nan', 'null', '', 'none']:
        return None
    
    # Remove unidades comuns (°C, %, etc.)
    s = re.sub(r'[°%]C?', '', s)
    
    # Remove espaços extras
    s = re.sub(r'\s+', '', s)
    
    # Substitui vírgula por ponto
    s = s.replace(',', '.')
    
    # Extrai apenas números e ponto decimal (incluindo negativos)
    match = re.search(r'-?\d+(?:\.\d+)?', s)
    if match:
        try:
            return float(match.group())
        except ValueError:
            return None
    
    return None


class Command(BaseCommand):
    help = "Importa medições (Excel) para monitoring_measurement. Idempotente por ts. Suporta cabeçalhos PT-BR (dia/hora, temperatura/umidade)."

    def add_arguments(self, parser):
        parser.add_argument("--file", required=True, help="Caminho do arquivo .xlsx")
        parser.add_argument("--sheet", default=0, help="Nome ou índice da planilha (padrão: 0)")
        parser.add_argument("--batch-size", type=int, default=2000, help="Tamanho dos lotes de bulk_create")
        parser.add_argument("--tz", default="America/Sao_Paulo", help="Timezone default para timestamps sem tz")
        parser.add_argument("--dry-run", action="store_true", help="Só valida e reporta (não grava)")
        parser.add_argument("--allow-outliers", action="store_true", help="Não descarta outliers (por padrão descarta)")
        parser.add_argument("--year-base", type=int, default=2025, help="Ano base para conversão de 'dia do ano' (padrão: 2025)")
        parser.add_argument("--temp-range", nargs=2, type=float, default=[-40.0, 60.0], help="Faixa válida para temperatura em °C (padrão: -40 60)")
        parser.add_argument("--rh-range", nargs=2, type=float, default=[0.0, 100.0], help="Faixa válida para umidade em %% (padrão: 0 100)")

    def handle(self, *args, **opts):
        try:
            import pandas as pd
        except Exception as e:
            raise CommandError("Pandas não instalado. Use: pip install pandas openpyxl") from e

        path = Path(opts["file"])
        if not path.exists():
            raise CommandError(f"Arquivo não encontrado: {path}")

        sheet = opts["sheet"]
        batch_size = max(1, int(opts["batch_size"]))
        tzname = opts["tz"]
        dry_run = bool(opts["dry_run"])
        allow_outliers = bool(opts["allow_outliers"])
        year_base = int(opts["year_base"])
        temp_min, temp_max = opts["temp_range"]
        rh_min, rh_max = opts["rh_range"]

        # Leitura crua como string para preservar os valores originais
        try:
            df_raw = pd.read_excel(path, sheet_name=sheet, dtype=str, engine="openpyxl")
        except Exception as e:
            raise CommandError(f"Falha ao ler Excel: {e}")

        self.stdout.write(f"Colunas originais encontradas: {list(df_raw.columns)}")

        original_cols = list(df_raw.columns)
        header_map = _map_headers(original_cols)

        self.stdout.write(f"Mapeamento de colunas: {header_map}")

        # Renomeia colunas pelas mapeadas conhecidas (ignora as None)
        rename_dict = {orig: new for orig, new in header_map.items() if new is not None and new != orig}
        df = df_raw.rename(columns=rename_dict).copy()

        # Agora temos colunas em algum destes: ts/date/time/temp_current/.../rh_max
        # Se não houver ts mas houver date + time, construímos ts
        has_ts = "ts" in df.columns
        has_date = "date" in df.columns
        has_time = "time" in df.columns

        if not has_ts and not (has_date and has_time):
            # Falta mapeamento essencial
            raise CommandError(
                "Colunas obrigatórias ausentes. "
                f"Esperava 'ts' OU 'date'+'time'.\n"
                f"Cabeçalhos lidos: {original_cols}\n"
                f"Após normalização/alias: {list(df.columns)}"
            )

        # Garante que as demais colunas existam (se não existirem, cria com NaN)
        for col in ["temp_current", "temp_min", "temp_max", "rh_current", "rh_min", "rh_max"]:
            if col not in df.columns:
                df[col] = None

        # ---- Conversões ----
        # 1) Timestamp:
        tz = ZoneInfo(tzname)
        if has_ts:
            # parse direto de ts
            df["ts"] = pd.to_datetime(df["ts"], errors="coerce", dayfirst=True, utc=False)
        else:
            # date + time -> ts
            def parse_date_column(series):
                """Converte dia do ano ou data completa para timestamp"""
                def parse_day_of_year(x):
                    if x is None:
                        return pd.NaT
                    try:
                        day_num = int(float(str(x).strip()))
                        if 1 <= day_num <= 366:  # dia válido do ano
                            # Usa ano base configurável
                            base_date = pd.Timestamp(f'{year_base}-01-01')
                            return base_date + pd.Timedelta(days=day_num - 1)
                    except Exception:
                        pass
                    # Se não for número, tenta parsing normal de data
                    try:
                        return pd.to_datetime(str(x), errors="raise", dayfirst=True, utc=False)
                    except Exception:
                        return pd.NaT
                
                return series.map(parse_day_of_year)

            def parse_time_column(series):
                """Converte hora em qualquer formato para timedelta"""
                def parse_time(x):
                    if x is None:
                        return pd.NaT
                    
                    s = str(x).strip()
                    
                    # Formato HH:MM:SS ou HH:MM
                    if ':' in s:
                        parts = s.split(':')
                        if len(parts) >= 2:
                            try:
                                h = int(parts[0])
                                m = int(parts[1])
                                sec = int(parts[2]) if len(parts) > 2 else 0
                                if 0 <= h < 24 and 0 <= m < 60 and 0 <= sec < 60:
                                    return pd.Timedelta(hours=h, minutes=m, seconds=sec)
                            except ValueError:
                                pass
                    
                    # Tenta como número (fração do dia Excel)
                    try:
                        f = float(s)
                        if 0 <= f < 1:  # fração válida do dia
                            seconds = int(f * 86400)
                            return pd.Timedelta(seconds=seconds)
                    except ValueError:
                        pass
                    
                    return pd.NaT
                
                return series.map(parse_time)

            date_parsed = parse_date_column(df["date"])
            time_parsed = parse_time_column(df["time"])
            
            df["ts"] = date_parsed + time_parsed

        # aplica timezone se vier naive
        def ensure_tz(x):
            if pd.isna(x):
                return None
            if x.tzinfo is None:
                return x.replace(tzinfo=tz)
            return x

        df["ts"] = df["ts"].map(ensure_tz)

        # 2) Números: limpa valores com unidades e normaliza
        num_cols = ["temp_current", "temp_min", "temp_max", "rh_current", "rh_min", "rh_max"]
        
        for col in num_cols:
            if col in df.columns:
                # Primeiro mostra alguns valores originais para debug
                sample_values = df[col].head(3).tolist()
                self.stdout.write(f"Valores originais em '{col}': {sample_values}")
                
                # Limpa e converte os valores
                df[col] = df[col].map(_clean_numeric_value)
                
                # Mostra valores após limpeza
                sample_cleaned = df[col].head(3).tolist()
                self.stdout.write(f"Valores limpos em '{col}': {sample_cleaned}")

        # 3) Saneamento de outliers (opcional)
        def clip_or_nan(series, low, high):
            s = series.copy()
            mask_ok = (s >= low) & (s <= high)
            s = s.where(mask_ok, other=pd.NA)
            return s

        if not allow_outliers:
            df["temp_current"] = clip_or_nan(df["temp_current"], temp_min, temp_max)
            df["temp_min"]     = clip_or_nan(df["temp_min"],     temp_min, temp_max)
            df["temp_max"]     = clip_or_nan(df["temp_max"],     temp_min, temp_max)
            df["rh_current"]   = clip_or_nan(df["rh_current"],   rh_min, rh_max)
            df["rh_min"]       = clip_or_nan(df["rh_min"],       rh_min, rh_max)
            df["rh_max"]       = clip_or_nan(df["rh_max"],       rh_min, rh_max)

        # 4) Remove linhas com ts inválido
        total_rows = len(df_raw)
        before = len(df)
        df = df[df["ts"].notna()].copy()
        removed_no_ts = before - len(df)

        # 4.5) Remove duplicatas internas (mesmo ts na planilha)
        before_duplicates = len(df)
        df = df.sort_values("ts").drop_duplicates(subset=["ts"], keep="last")
        internal_duplicates = before_duplicates - len(df)

        # 5) Idempotência por ts (único ambiente)
        def fetch_existing_ts(candidates, chunk_size=10000):
            """Busca timestamps existentes em chunks para evitar consultas SQL muito grandes"""
            from itertools import islice
            existing = set()
            it = iter(candidates)
            while True:
                batch = list(islice(it, chunk_size))
                if not batch:
                    break
                existing |= set(Measurement.objects.filter(ts__in=batch).values_list("ts", flat=True))
            return existing

        candidate_ts = list(df["ts"].unique())
        existing_ts = fetch_existing_ts(candidate_ts)

        # 6) Monta objetos
        to_create = []
        for row in df.itertuples(index=False):
            ts = row.ts
            if ts in existing_ts:
                continue
            to_create.append(
                Measurement(
                    ts=ts,
                    temp_current=_nan_to_none(row.temp_current),
                    temp_min=_nan_to_none(row.temp_min),
                    temp_max=_nan_to_none(row.temp_max),
                    rh_current=_nan_to_none(row.rh_current),
                    rh_min=_nan_to_none(row.rh_min),
                    rh_max=_nan_to_none(row.rh_max),
                )
            )

        # Estatísticas
        duplicates_in_db = len(df) - len(to_create)

        self.stdout.write(self.style.NOTICE(
            f"\nExcel: {path.name}\n"
            f"Aba: {sheet}\n"
            f"Total linhas lidas: {total_rows}\n"
            f"Linhas com ts inválido removidas: {removed_no_ts}\n"
            f"Duplicatas internas removidas: {internal_duplicates}\n"
            f"Linhas após parse: {len(df)}\n"
            f"Timestamps já existentes no banco (ignorados): {duplicates_in_db}\n"
            f"Linhas a inserir: {len(to_create)}\n"
        ))

        if dry_run or not to_create:
            self.stdout.write(self.style.WARNING("Dry-run ativo ou nada para inserir. Nenhuma escrita realizada."))
            return

        # 7) Persistência em lotes
        created = 0
        with transaction.atomic():
            for i in range(0, len(to_create), batch_size):
                batch = to_create[i : i + batch_size]
                Measurement.objects.bulk_create(batch, batch_size=batch_size)
                created += len(batch)

        self.stdout.write(self.style.SUCCESS(f"Import finalizado com sucesso. Registros inseridos: {created}"))
