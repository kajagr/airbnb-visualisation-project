import pandas as pd
import json
from pathlib import Path
import numpy as np

RAW_DIR = Path("../data/raw/listings/")
OUT_DIR = Path("../data/processed")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Manually define fixed conversion rates (as of mid-2024 or approx)
CURRENCY_RATES_TO_EUR = {
    "EUR": 1.0,
    "CHF": 1.06,    # Swiss Franc to EUR
    "SEK": 0.087,   # Swedish Krona to EUR
    "GBP": 1.17,    # British Pound to EUR
    "DKK": 0.13,    # Danish Krone to EUR
    "NOK": 0.088,   # Norwegian Krone to EUR
    "TRY": 0.029,   # Turkish Lira to EUR
    "HUF": 0.0026,  # Hungarian Forint to EUR
    "CZK": 0.040,   # Czech Koruna to EUR
}

# Load cities data from JSON file
with open(Path("../data/raw/mapping_info/cities_data.json"), "r") as f:
    cities_data = json.load(f)

cities_data_output = []

for city_info in cities_data:
    country = city_info["country"]
    city = city_info["city"]
    filename = city_info["filename"]
    currency = city_info.get("currency", "EUR")
    
    df = pd.read_csv(RAW_DIR / filename)

    # Remove any non-numeric, missing, or NaN values BEFORE conversion
    df["price"] = df["price"].astype(str).str.replace(r"[\$,]", "", regex=True)
    # If empty string or only whitespace, set to NaN
    df["price"] = df["price"].replace(r"^\s*$", np.nan, regex=True)
    df["price"] = pd.to_numeric(df["price"], errors="coerce")

    conversion_rate = CURRENCY_RATES_TO_EUR.get(currency)
    if conversion_rate is None:
        raise ValueError(f"Unknown currency {currency} for {city}, please provide a rate.")

    # Prepare for segmented means by room_type
    avg_price_native_all = None
    avg_price_native_entire_home = None
    avg_price_native_private_room = None

    # Overall average
    if df["price"].notna().sum() == 0:
        avg_price_native_all = None
    else:
        avg_price_native_all = df.loc[df["price"].notna(), "price"].mean()

    # Segmented by room_type
    if "room_type" in df.columns:
        # Entire home/apt
        mask_entire = (df["room_type"] == "Entire home/apt") & df["price"].notna()
        if mask_entire.sum() == 0:
            avg_price_native_entire_home = None
        else:
            avg_price_native_entire_home = df.loc[mask_entire, "price"].mean()

        # Private room
        mask_private = (df["room_type"] == "Private room") & df["price"].notna()
        if mask_private.sum() == 0:
            avg_price_native_private_room = None
        else:
            avg_price_native_private_room = df.loc[mask_private, "price"].mean()
    else:
        avg_price_native_entire_home = None
        avg_price_native_private_room = None

    # Convert to euros
    def convert(price):
        if price is None or pd.isna(price):
            return None
        return price * conversion_rate

    avg_price_eur = convert(avg_price_native_all)
    avg_price_entire_home_eur = convert(avg_price_native_entire_home)
    avg_price_private_room_eur = convert(avg_price_native_private_room)

    count = len(df)
    # Center of the city
    lat = df["latitude"].mean()
    lng = df["longitude"].mean()

    item = {
        "id": city.lower().replace(" ", "_"),
        "country": country,
        "city": city,
        "avg_price": None if avg_price_eur is None or pd.isna(avg_price_eur) else avg_price_eur,
        "avg_price_entire_home": None if avg_price_entire_home_eur is None or pd.isna(avg_price_entire_home_eur) else avg_price_entire_home_eur,
        "avg_price_private_room": None if avg_price_private_room_eur is None or pd.isna(avg_price_private_room_eur) else avg_price_private_room_eur,
        "count": count,
        "lat": lat,
        "lng": lng,
    }
    cities_data_output.append(item)

# Write to a single JSON file
with open(OUT_DIR / "cities_statistical_data.json", "w") as f:
    json.dump(cities_data_output, f, indent=2)

print(f"✅ Processed {len(cities_data_output)} cities")
print(f"📁 Output: {OUT_DIR / 'cities_statistical_data.json'}")