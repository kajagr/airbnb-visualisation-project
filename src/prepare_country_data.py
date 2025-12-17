import pandas as pd
import json
from pathlib import Path

RAW_DIR = Path("../data/raw/listings/")
OUT_DIR = Path("../data/processed")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Load cities data from JSON file
with open(Path("../data/raw/mapping_info/cities_data.json"), "r") as f:
    cities_data = json.load(f)

cities_data_output = []

for city_info in cities_data:
    country = city_info["country"]
    city = city_info["city"]
    filename = city_info["filename"]
    
    df = pd.read_csv(RAW_DIR / filename)

    df["price"] = (
        df["price"]
        .astype(str)
        .str.replace(r"[\$,]", "", regex=True)
        .astype(float)
    )

    avg_price = df["price"].mean()
    count = len(df)
    # center of the city
    lat = df["latitude"].mean()
    lng = df["longitude"].mean()

    cities_data_output.append({
        "id": city.lower().replace(" ", "_"),
        "country": country,
        "city": city,
        "avg_price": None if pd.isna(avg_price) else avg_price,  # FIX: Convert NaN to None
        "count": count,
        "lat": lat,
        "lng": lng,
    })

# Write to a single JSON file
with open(OUT_DIR / "cities_statistical_data.json", "w") as f:
    json.dump(cities_data_output, f, indent=2)

print(f"✅ Processed {len(cities_data_output)} cities")
print(f"📁 Output: {OUT_DIR / 'cities_statistical_data.json'}")