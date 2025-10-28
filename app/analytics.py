"""
Advanced Analytics Module
Provides ML-based predictions, pattern analysis, and correlations
"""
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from zoneinfo import ZoneInfo
import numpy as np
from scipy import stats
from sklearn.linear_model import LinearRegression
from sqlalchemy.orm import Session
from sqlalchemy import text

from app import models


class AnalyticsEngine:
    """Engine for advanced data analytics"""
    
    def __init__(self, timezone: str = "America/Sao_Paulo"):
        self.timezone = ZoneInfo(timezone)
    
    def predict_trends(
        self, 
        db: Session, 
        days_history: int = 30, 
        days_forecast: int = 7
    ) -> Dict[str, Any]:
        """
        Predict temperature and humidity trends using linear regression
        
        Args:
            db: Database session
            days_history: Number of days to use for training
            days_forecast: Number of days to predict into future
        
        Returns:
            Dictionary with trend analysis and predictions
        """
        # Fetch historical data
        cutoff_date = datetime.now(self.timezone) - timedelta(days=days_history)
        records = db.query(models.Measurement).filter(
            models.Measurement.ts >= cutoff_date
        ).order_by(models.Measurement.ts).all()
        
        if len(records) < 10:
            return {
                "error": "Insufficient data for trend analysis",
                "minimum_required": 10,
                "found": len(records)
            }
        
        # Prepare data
        timestamps = np.array([(r.ts - records[0].ts).total_seconds() / 3600 for r in records])
        temperatures = np.array([r.temp_current for r in records if r.temp_current is not None])
        humidities = np.array([r.rh_current * 100 for r in records if r.rh_current is not None])
        
        X = timestamps.reshape(-1, 1)
        
        # Train models
        temp_model = LinearRegression()
        temp_model.fit(X[:len(temperatures)].reshape(-1, 1), temperatures)
        
        rh_model = LinearRegression()
        rh_model.fit(X[:len(humidities)].reshape(-1, 1), humidities)
        
        # Calculate R² scores
        temp_r2 = temp_model.score(X[:len(temperatures)].reshape(-1, 1), temperatures)
        rh_r2 = rh_model.score(X[:len(humidities)].reshape(-1, 1), humidities)
        
        # Generate predictions
        last_timestamp = timestamps[-1]
        future_hours = np.array([last_timestamp + (24 * i) for i in range(1, days_forecast + 1)])
        future_X = future_hours.reshape(-1, 1)
        
        temp_predictions = temp_model.predict(future_X)
        rh_predictions = rh_model.predict(future_X)
        
        # Generate prediction dates
        last_date = records[-1].ts
        prediction_dates = [
            (last_date + timedelta(days=i)).isoformat()
            for i in range(1, days_forecast + 1)
        ]
        
        return {
            "analysis_period": {
                "start": records[0].ts.isoformat(),
                "end": records[-1].ts.isoformat(),
                "days": days_history,
                "samples": len(records)
            },
            "temperature": {
                "current_value": float(temperatures[-1]),
                "trend_slope": float(temp_model.coef_[0]),
                "trend_direction": "increasing" if temp_model.coef_[0] > 0 else "decreasing",
                "r2_score": float(temp_r2),
                "model_quality": self._interpret_r2(temp_r2),
                "predictions": [
                    {
                        "date": date,
                        "value": float(pred),
                        "days_ahead": i + 1
                    }
                    for i, (date, pred) in enumerate(zip(prediction_dates, temp_predictions))
                ]
            },
            "humidity": {
                "current_value": float(humidities[-1]),
                "trend_slope": float(rh_model.coef_[0]),
                "trend_direction": "increasing" if rh_model.coef_[0] > 0 else "decreasing",
                "r2_score": float(rh_r2),
                "model_quality": self._interpret_r2(rh_r2),
                "predictions": [
                    {
                        "date": date,
                        "value": float(pred),
                        "days_ahead": i + 1
                    }
                    for i, (date, pred) in enumerate(zip(prediction_dates, rh_predictions))
                ]
            }
        }
    
    def analyze_patterns(self, db: Session) -> Dict[str, Any]:
        """
        Analyze seasonal patterns (hourly, daily, weekly)
        
        Args:
            db: Database session
        
        Returns:
            Dictionary with pattern analysis
        """
        # Hourly patterns
        hourly_query = text("""
            SELECT 
                CAST(strftime('%H', ts) AS INTEGER) as hour,
                AVG(temp_current) as avg_temp,
                MIN(temp_current) as min_temp,
                MAX(temp_current) as max_temp,
                AVG(rh_current * 100) as avg_rh,
                MIN(rh_current * 100) as min_rh,
                MAX(rh_current * 100) as max_rh,
                COUNT(*) as samples
            FROM monitoring_measurement
            WHERE temp_current IS NOT NULL AND rh_current IS NOT NULL
            GROUP BY hour
            ORDER BY hour
        """)
        
        hourly_results = db.execute(hourly_query).fetchall()
        
        # Day of week patterns
        dow_query = text("""
            SELECT 
                CAST(strftime('%w', ts) AS INTEGER) as day_of_week,
                AVG(temp_current) as avg_temp,
                AVG(rh_current * 100) as avg_rh,
                COUNT(*) as samples
            FROM monitoring_measurement
            WHERE temp_current IS NOT NULL AND rh_current IS NOT NULL
            GROUP BY day_of_week
            ORDER BY day_of_week
        """)
        
        dow_results = db.execute(dow_query).fetchall()
        
        day_names = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
        
        return {
            "hourly_patterns": [
                {
                    "hour": r.hour,
                    "hour_label": f"{r.hour:02d}:00",
                    "temperature": {
                        "average": round(r.avg_temp, 2),
                        "min": round(r.min_temp, 2),
                        "max": round(r.max_temp, 2)
                    },
                    "humidity": {
                        "average": round(r.avg_rh, 2),
                        "min": round(r.min_rh, 2),
                        "max": round(r.max_rh, 2)
                    },
                    "sample_count": r.samples
                }
                for r in hourly_results
            ],
            "daily_patterns": [
                {
                    "day_of_week": r.day_of_week,
                    "day_name": day_names[r.day_of_week],
                    "temperature_avg": round(r.avg_temp, 2),
                    "humidity_avg": round(r.avg_rh, 2),
                    "sample_count": r.samples
                }
                for r in dow_results
            ],
            "insights": self._generate_pattern_insights(hourly_results, dow_results)
        }
    
    def calculate_correlations(self, db: Session, days: int = 30) -> Dict[str, Any]:
        """
        Calculate correlations between temperature and humidity
        
        Args:
            db: Database session
            days: Number of days to analyze
        
        Returns:
            Dictionary with correlation analysis
        """
        cutoff_date = datetime.now(self.timezone) - timedelta(days=days)
        records = db.query(models.Measurement).filter(
            models.Measurement.ts >= cutoff_date,
            models.Measurement.temp_current.isnot(None),
            models.Measurement.rh_current.isnot(None)
        ).all()
        
        if len(records) < 10:
            return {
                "error": "Insufficient data for correlation analysis",
                "minimum_required": 10,
                "found": len(records)
            }
        
        temperatures = np.array([r.temp_current for r in records])
        humidities = np.array([r.rh_current * 100 for r in records])
        
        # Pearson correlation
        pearson_corr, pearson_pvalue = stats.pearsonr(temperatures, humidities)
        
        # Spearman correlation (for non-linear relationships)
        spearman_corr, spearman_pvalue = stats.spearmanr(temperatures, humidities)
        
        return {
            "analysis_period": {
                "days": days,
                "samples": len(records),
                "start": records[0].ts.isoformat(),
                "end": records[-1].ts.isoformat()
            },
            "pearson_correlation": {
                "coefficient": round(float(pearson_corr), 4),
                "p_value": float(pearson_pvalue),
                "significance": "significant" if pearson_pvalue < 0.05 else "not significant",
                "strength": self._interpret_correlation(pearson_corr),
                "interpretation": self._interpret_pearson(pearson_corr)
            },
            "spearman_correlation": {
                "coefficient": round(float(spearman_corr), 4),
                "p_value": float(spearman_pvalue),
                "significance": "significant" if spearman_pvalue < 0.05 else "not significant",
                "strength": self._interpret_correlation(spearman_corr),
                "interpretation": "Correlação monotônica entre temperatura e umidade"
            },
            "statistics": {
                "temperature": {
                    "mean": round(float(np.mean(temperatures)), 2),
                    "std": round(float(np.std(temperatures)), 2),
                    "min": round(float(np.min(temperatures)), 2),
                    "max": round(float(np.max(temperatures)), 2)
                },
                "humidity": {
                    "mean": round(float(np.mean(humidities)), 2),
                    "std": round(float(np.std(humidities)), 2),
                    "min": round(float(np.min(humidities)), 2),
                    "max": round(float(np.max(humidities)), 2)
                }
            }
        }
    
    def advanced_statistics(self, db: Session, days: int = 30) -> Dict[str, Any]:
        """
        Calculate advanced statistical metrics
        
        Args:
            db: Database session
            days: Number of days to analyze
        
        Returns:
            Dictionary with advanced statistics
        """
        cutoff_date = datetime.now(self.timezone) - timedelta(days=days)
        records = db.query(models.Measurement).filter(
            models.Measurement.ts >= cutoff_date,
            models.Measurement.temp_current.isnot(None),
            models.Measurement.rh_current.isnot(None)
        ).all()
        
        if len(records) < 10:
            return {"error": "Insufficient data"}
        
        temperatures = np.array([r.temp_current for r in records])
        humidities = np.array([r.rh_current * 100 for r in records])
        
        return {
            "period": {
                "days": days,
                "samples": len(records)
            },
            "temperature": {
                "mean": round(float(np.mean(temperatures)), 2),
                "median": round(float(np.median(temperatures)), 2),
                "std_dev": round(float(np.std(temperatures)), 2),
                "variance": round(float(np.var(temperatures)), 2),
                "quartiles": {
                    "q1": round(float(np.percentile(temperatures, 25)), 2),
                    "q2": round(float(np.percentile(temperatures, 50)), 2),
                    "q3": round(float(np.percentile(temperatures, 75)), 2)
                },
                "skewness": round(float(stats.skew(temperatures)), 3),
                "kurtosis": round(float(stats.kurtosis(temperatures)), 3)
            },
            "humidity": {
                "mean": round(float(np.mean(humidities)), 2),
                "median": round(float(np.median(humidities)), 2),
                "std_dev": round(float(np.std(humidities)), 2),
                "variance": round(float(np.var(humidities)), 2),
                "quartiles": {
                    "q1": round(float(np.percentile(humidities, 25)), 2),
                    "q2": round(float(np.percentile(humidities, 50)), 2),
                    "q3": round(float(np.percentile(humidities, 75)), 2)
                },
                "skewness": round(float(stats.skew(humidities)), 3),
                "kurtosis": round(float(stats.kurtosis(humidities)), 3)
            }
        }
    
    # Helper methods
    
    def _interpret_r2(self, r2: float) -> str:
        """Interpret R² score"""
        if r2 >= 0.9:
            return "excelente"
        elif r2 >= 0.7:
            return "boa"
        elif r2 >= 0.5:
            return "moderada"
        else:
            return "fraca"
    
    def _interpret_correlation(self, corr: float) -> str:
        """Interpret correlation coefficient"""
        abs_corr = abs(corr)
        if abs_corr >= 0.9:
            return "muito forte"
        elif abs_corr >= 0.7:
            return "forte"
        elif abs_corr >= 0.5:
            return "moderada"
        elif abs_corr >= 0.3:
            return "fraca"
        else:
            return "muito fraca"
    
    def _interpret_pearson(self, corr: float) -> str:
        """Interpret Pearson correlation"""
        if corr > 0:
            return f"Correlação positiva: quando temperatura aumenta, umidade tende a {'aumentar' if corr > 0 else 'diminuir'}"
        else:
            return f"Correlação negativa: quando temperatura aumenta, umidade tende a diminuir"
    
    def _generate_pattern_insights(self, hourly_data, daily_data) -> List[str]:
        """Generate insights from pattern analysis"""
        insights = []
        
        if hourly_data:
            # Find peak temperature hour
            peak_hour = max(hourly_data, key=lambda x: x.avg_temp)
            insights.append(f"Maior temperatura média ocorre às {peak_hour.hour:02d}:00 ({peak_hour.avg_temp:.1f}°C)")
            
            # Find lowest temperature hour
            low_hour = min(hourly_data, key=lambda x: x.avg_temp)
            insights.append(f"Menor temperatura média ocorre às {low_hour.hour:02d}:00 ({low_hour.avg_temp:.1f}°C)")
        
        if daily_data:
            day_names = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
            peak_day = max(daily_data, key=lambda x: x.avg_temp)
            insights.append(f"Temperatura mais alta em média: {day_names[peak_day.day_of_week]} ({peak_day.avg_temp:.1f}°C)")
        
        return insights


# Global instance
analytics_engine = AnalyticsEngine()
