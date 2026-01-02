import pandas as pd
import json
from pathlib import Path

# ======================================================
# PATHS
# ======================================================

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / "data/raw/living_conditions/living_conditions.xlsx"
AIRBNB = ROOT / "data/processed/cities_statistical_data.json"
OUT = ROOT / "data/processed/housing_pressure.json"

# ======================================================
# 1. LOAD RAW EXCEL (NO HEADERS)
# ======================================================

raw = pd.read_excel(XLSX, header=None)

# ======================================================
# 2. DETECT HEADER ROW (ROW CONTAINING YEARS)
# ======================================================

header_row = None
for i in range(len(raw)):
    row = raw.iloc[i].astype(str)
    if any(v.strip().startswith("20") for v in row):
        header_row = i
        break

if header_row is None:
    raise ValueError("Could not detect header row with year values")

print(f"Detected header row at index {header_row}")

# ======================================================
# 3. READ AGAIN WITH CORRECT HEADER
# ======================================================

df = pd.read_excel(XLSX, header=header_row)

# First column = city names
df = df.rename(columns={df.columns[0]: "city"})

# ======================================================
# 4. IDENTIFY YEAR COLUMNS
# ======================================================

year_cols = [
    c for c in df.columns
    if str(c).strip()[:4].isdigit()
]

if not year_cols:
    raise ValueError("No year columns found in living_conditions.xlsx")

# ======================================================
# 5. RESHAPE TO LONG FORMAT
# ======================================================

long = df.melt(
    id_vars=["city"],
    value_vars=year_cols,
    var_name="year",
    value_name="total_housing"
)

# Clean numeric values
long["total_housing"] = pd.to_numeric(long["total_housing"], errors="coerce")
long = long.dropna(subset=["total_housing"])

# Extract year as integer
long["year"] = (
    long["year"]
    .astype(str)
    .str.extract(r"(\d{4})")
    .astype(int)
)

# ======================================================
# 6. TAKE LATEST AVAILABLE YEAR PER CITY
# ======================================================

latest = (
    long.sort_values("year")
        .groupby("city", as_index=False)
        .tail(1)
)

# Normalize city names for merge
latest["city_norm"] = (
    latest["city"]
    .str.replace(r"\(.*\)", "", regex=True)
    .str.strip()
    .str.lower()
)

# ======================================================
# 7. LOAD AIRBNB DATA
# ======================================================

airbnb = json.loads(AIRBNB.read_text())
airbnb_df = pd.DataFrame(airbnb)

airbnb_df["city_norm"] = (
    airbnb_df["city"]
    .str.replace("*", "", regex=False)
    .str.strip()
    .str.lower()
)

# ======================================================
# 8. MERGE DATASETS
# ======================================================

merged = latest.merge(
    airbnb_df,
    on="city_norm",
    how="inner"
)

# Resolve duplicate city columns
if "city_y" in merged.columns:
    merged = merged.rename(columns={"city_y": "city"})

if "city_x" in merged.columns:
    merged = merged.drop(columns=["city_x"])

# ======================================================
# 9. COMPUTE HOUSING PRESSURE
# ======================================================

merged["airbnb_homes"] = merged["count"]
merged["airbnb_share"] = (
    merged["airbnb_homes"] / merged["total_housing"] * 100
)

# ======================================================
# 10. OUTPUT JSON
# ======================================================

out = merged[[
    "id",
    "city",
    "country",
    "year",
    "airbnb_homes",
    "total_housing",
    "airbnb_share"
]].round(2)

OUT.write_text(out.to_json(orient="records", indent=2))

print(f"✅ Saved {len(out)} cities → {OUT}")
