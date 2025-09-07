from django.db import models

class Measurement(models.Model):
    ts = models.DateTimeField(db_index=True)
    temp_current = models.FloatField(null=True, blank=True)
    temp_min = models.FloatField(null=True, blank=True)
    temp_max = models.FloatField(null=True, blank=True)
    rh_current = models.FloatField(null=True, blank=True)
    rh_min = models.FloatField(null=True, blank=True)
    rh_max = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = "monitoring_measurement"
        ordering = ["ts"]
        get_latest_by = "ts"
        indexes = [
            models.Index(fields=["ts"], name="mm_ts_idx"),
        ]
        verbose_name = "Medição"
        verbose_name_plural = "Medições"

    def __str__(self):
        return f"Measurement at {self.ts}: Temp {self.temp_current}°C, RH {self.rh_current}%"