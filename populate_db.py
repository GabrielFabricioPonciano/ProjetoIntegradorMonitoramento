import random
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.database import engine, SessionLocal
from app.models import Base, Measurement

print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("✅ Tables created!")

def generate_sample_data(days=365, readings_per_day=2):
    print(f"\nGenerating {days} days of data ({readings_per_day} readings/day)...")
    
    db = SessionLocal()
    
    try:
        existing_count = db.query(Measurement).count()
        if existing_count > 0:
            print(f"⚠️  Database already has {existing_count} records.")
            response = input("Delete and recreate? (y/N): ").lower()
            if response != 'y':
                print("Cancelled.")
                return
            
            db.query(Measurement).delete()
            db.commit()
            print("🗑️  Existing data cleared.")
        
        time_points = [
            (7, 30),
            (16, 30)
        ]
        
        sao_paulo_tz = ZoneInfo("America/Sao_Paulo")
        start_date = datetime(2025, 1, 1, tzinfo=sao_paulo_tz)
        
        measurements = []
        for day in range(days):
            current_date = start_date + timedelta(days=day)
            
            for hour, minute in time_points:
                ts = current_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
                
                temp = random.gauss(18.4, 0.4)
                temp = max(17.0, min(19.5, temp))
                
                humidity_pct = random.gauss(59.0, 2.0)
                humidity_pct = max(56.0, min(65.0, humidity_pct))
                humidity = humidity_pct / 100.0
                
                measurement = Measurement(
                    ts=ts,
                    temp_current=round(temp, 2),
                    temp_min=round(temp, 2),
                    temp_max=round(temp, 2),
                    rh_current=round(humidity, 4),
                    rh_min=round(humidity, 4),
                    rh_max=round(humidity, 4)
                )
                measurements.append(measurement)
        
        db.bulk_save_objects(measurements)
        db.commit()
        
        total_records = len(measurements)
        print(f"✅ Generated {total_records} measurements!")
        
        violations = sum(1 for m in measurements 
                        if m.temp_current < 17.0 or m.temp_current > 19.5 or m.rh_current >= 0.62)
        print("📊 Statistics:")
        print(f"   Total records: {total_records}")
        print(f"   Violations: {violations} ({violations/total_records*100:.1f}%)")
        print(f"   Date range: {start_date.date()} to {(start_date + timedelta(days=days-1)).date()}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("🌡️  Environmental Monitoring - Database Populator")
    print("=" * 60)
    
    generate_sample_data(days=365, readings_per_day=2)
    
    print("\n✅ Done! You can now run the server with: python run.py")
    print("=" * 60)
