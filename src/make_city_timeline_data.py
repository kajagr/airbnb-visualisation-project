import pandas as pd
import os

CITIES = [
    ("amsterdam", "data/raw/full_listings/amsterdam.csv", "data/processed/amsterdam_timeline_points.csv"),
    ("barcelona", "data/raw/full_listings/barcelona.csv", "data/processed/barcelona_timeline_points.csv"),
    ("berlin", "data/raw/full_listings/berlin.csv", "data/processed/berlin_timeline_points.csv"),
    ("paris", "data/raw/full_listings/paris.csv", "data/processed/paris_timeline_points.csv"),
]

for city, in_csv, out_csv in CITIES:
    if not os.path.exists(in_csv):
        print(f"WARNING: Input file for {city} does not exist: {in_csv}")
        continue

    df = pd.read_csv(in_csv, low_memory=False)

    # first_review -> year (proxy start)
    df["first_review"] = pd.to_datetime(df["first_review"], errors="coerce")
    df["first_year"] = df["first_review"].dt.year

    # last_review -> year (proxy end)
    df["last_review"] = pd.to_datetime(df["last_review"], errors="coerce")
    df["last_year"] = df["last_review"].dt.year

    # keep only the useful columns
    keep = df[["id", "latitude", "longitude", "room_type", "first_year", "last_year"]].copy()
    keep = keep.dropna(subset=["latitude", "longitude", "first_year", "last_year"])

    # from 2015 on
    keep = keep[keep["first_year"] >= 2015]

    keep.to_csv(out_csv, index=False)
    print(f"Saved: {out_csv} rows: {len(keep)}")
