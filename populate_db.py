"""
Script to populate SQLite database with sample monitoring data
Run this once to create sample data for the dashboard
"""
import random
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.database import engine, SessionLocal
from app.models import Base, Measurement

# Create all tables
print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("✅ Tables created!")

# Generate sample data
def generate_sample_data(days=365, readings_per_day=2):
    """
    Generate realistic sample data
    
    Args:
        days: Number of days to generate (default 365 = 1 year)
        readings_per_day: Number of readings per day (default 2: 07:30 and 16:30)
    """
    print(f"\nGenerating {days} days of data ({readings_per_day} readings/day)...")
    
    db = SessionLocal()
    
    try:
        # Check if data already exists
        existing_count = db.query(Measurement).count()
        if existing_count > 0:
            print(f"⚠️  Database already has {existing_count} records.")
            response = input("Delete and recreate? (y/N): ").lower()
            if response != 'y':
                print("Cancelled.")
                return
            
            # Clear existing data
            db.query(Measurement).delete()
            db.commit()
            print("🗑️  Existing data cleared.")
        
        # Time points for measurements (07:30 and 16:30)
        time_points = [
            (7, 30),   # Morning
            (16, 30)   # Afternoon
        ]
        
        # Generate data
        sao_paulo_tz = ZoneInfo("America/Sao_Paulo")
        start_date = datetime(2025, 1, 1, tzinfo=sao_paulo_tz)
        
        measurements = []
        for day in range(days):
            current_date = start_date + timedelta(days=day)
            
            for hour, minute in time_points:
                # Create timestamp
                ts = current_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
                
                # Generate realistic values
                # Temperature: mean 18.4°C, std 0.4°C, range [17.0, 19.5]
                temp = random.gauss(18.4, 0.4)
                temp = max(17.0, min(19.5, temp))
                
                # Humidity: mean 59%, std 2%, range [56%, 65%]
                # Occasionally crosses 62% to generate violations
                humidity_pct = random.gauss(59.0, 2.0)
                humidity_pct = max(56.0, min(65.0, humidity_pct))
                humidity = humidity_pct / 100.0  # Store as fraction
                
                measurement = Measurement(
                    ts=ts,
                    temp_current=round(temp, 2),
                    temp_min=round(temp, 2),  # Simplified: same as current
                    temp_max=round(temp, 2),
                    rh_current=round(humidity, 4),
                    rh_min=round(humidity, 4),
                    rh_max=round(humidity, 4)
                )
                measurements.append(measurement)
        
        # Bulk insert
        db.bulk_save_objects(measurements)
        db.commit()
        
        total_records = len(measurements)
        print(f"✅ Generated {total_records} measurements!")
        
        # Show statistics
        violations = sum(1 for m in measurements 
                        if m.temp_current < 17.0 or m.temp_current > 19.5 or m.rh_current >= 0.62)
        print(f"📊 Statistics:")
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
    
    # Generate 1 year of data (730 records)
    generate_sample_data(days=365, readings_per_day=2)
    
    print("\n✅ Done! You can now run the server with: python run.py")
    print("=" * 60)
