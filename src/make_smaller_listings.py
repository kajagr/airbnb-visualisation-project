"""
Extract only the 5 columns we need for dots + heatmaps
This should make files WAY smaller
"""

import pandas as pd
from pathlib import Path

# Where your big CSV files are
RAW_DIR = Path("data/raw/listings")

# Where small files will go
OUT_DIR = Path("data/processed/heatmaps")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# 8 cities we need
CITIES = [
    'london',
    'paris', 
    'rome',
    'istanbul',
    'madrid',
    'barcelona',
    'lisbon',
    'amsterdam'
]

print("Creating small files with only needed columns...\n")

for city in CITIES:
    input_file = RAW_DIR / f"{city}.csv"
    output_file = OUT_DIR / f"{city}_heatmap.csv"
    
    if not input_file.exists():
        print(f"❌ {city}.csv not found - skipping")
        continue
    
    try:
        # Read ONLY the 5 columns we need
        df = pd.read_csv(
            input_file, 
            usecols=['latitude', 'longitude', 'price', 'room_type', 'name']
        )
        
        # Clean price (remove $ and commas)
        df['price'] = df['price'].astype(str).str.replace(r'[\$,]', '', regex=True)
        df['price'] = pd.to_numeric(df['price'], errors='coerce')
        
        # Remove rows with missing lat/lng (keep if price/name missing)
        df = df.dropna(subset=['latitude', 'longitude'])
        
        # Save
        df.to_csv(output_file, index=False)
        
        # Show results
        original_mb = input_file.stat().st_size / (1024 * 1024)
        new_mb = output_file.stat().st_size / (1024 * 1024)
        reduction = 100 * (1 - new_mb / original_mb)
        
        print(f"✅ {city:12} {original_mb:6.1f} MB → {new_mb:5.2f} MB  ({reduction:.0f}% smaller, {len(df):,} listings)")
        
    except Exception as e:
        print(f"❌ {city}: {e}")

total_size = sum(f.stat().st_size for f in OUT_DIR.glob('*.csv')) / (1024*1024)
print(f"\n✅ Done! Files saved to: {OUT_DIR}")
print(f"📦 Total size: {total_size:.1f} MB")
