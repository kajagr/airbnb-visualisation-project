import json
import re
from pathlib import Path

import pandas as pd
import difflib

AIRBNB_JSON_PATH = Path("../data/processed/cities_statistical_data.json")
EUROSTAT_XLSX_PATH = Path("../data/raw/rentals/rentals_data.xlsx")
OUT_CITIES_JSON = Path("../data/processed/cities_affordability_2023.json")

YEAR = "2023"
NIGHTS_PER_MONTH = 30

MANUAL_CITY_MAP = {
    "hague": "den haag",
    "the hague": "den haag",
    "munich": "münchen",
    "florence": "firenze",
    "vienna": "wien",
    "prague": "praha",
    "geneva": "genève",
}

REGIONS = {
    "crete",
    "euskadi",
    "mallorca",
    "menorca",
    "malta",
    "sicily",
    "south aegean",
    "pays basque",
    "puglia",
    "trentino",
    "vaud",
    "greater manchester",
}

def normalize_place(name: str) -> str:
    if name is None or (isinstance(name, float) and pd.isna(name)):
        return ""
    name = str(name).lower()
    name = re.sub(r"\(.*?\)", "", name)
    name = name.replace("greater city", "")
    name = name.replace("-", " ")
    name = re.sub(r"\s+", " ", name).strip()
    name = MANUAL_CITY_MAP.get(name, name)
    return name

def parse_eurostat_sheet(xlsx_path: Path, sheet_name: str, year: str) -> pd.DataFrame:
    df = pd.read_excel(xlsx_path, sheet_name=sheet_name)
    first_col = df.columns[0]
    time_row_idx_list = df.index[df[first_col].astype(str).str.strip() == "TIME"].tolist()
    if not time_row_idx_list:
        raise RuntimeError(f"Sheet '{sheet_name}': can't find TIME row.")
    time_row_idx = time_row_idx_list[0]
    time_row = df.iloc[time_row_idx]
    col_to_year = {}
    for col in df.columns:
        val = time_row[col]
        if isinstance(val, str) and val.strip().isdigit():
            col_to_year[col] = val.strip()
    geo_row_idx_list = df.index[df[first_col].astype(str).str.contains("GEO", na=False)].tolist()
    if not geo_row_idx_list:
        raise RuntimeError(f"Sheet '{sheet_name}': can't find GEO row.")
    geo_row_idx = geo_row_idx_list[0]
    data_start = geo_row_idx + 1
    data_df = df.iloc[data_start:].copy()
    data_df = data_df.rename(columns={first_col: "city_label"})
    data_df["city_label"] = data_df["city_label"].astype(str).str.strip()
    year_cols = [col for col, y in col_to_year.items() if y == year]
    if not year_cols:
        raise RuntimeError(f"Sheet '{sheet_name}': year {year} not found.")
    def to_number(x):
        if pd.isna(x):
            return None
        if isinstance(x, str):
            x = x.strip()
            if x == ":" or x == "":
                return None
            x = x.replace(",", "")
            try:
                return float(x)
            except ValueError:
                return None
        if isinstance(x, (int, float)):
            return float(x)
        return None
    values = []
    for _, r in data_df.iterrows():
        found = None
        for col in year_cols:
            v = to_number(r.get(col))
            if v is not None:
                found = v
                break
        values.append(found)
    out = pd.DataFrame({
        "city_label": data_df["city_label"].values,
        "rent_eur_month": values,
    })
    out = out[out["city_label"].notna() & (out["city_label"] != "nan")].copy()
    out["city_norm"] = out["city_label"].apply(normalize_place)
    out = out[out["rent_eur_month"].notna()].copy()
    return out

def build_rent_table_2023(xlsx_path: Path) -> pd.DataFrame:
    rent_1bed = parse_eurostat_sheet(xlsx_path, "Sheet 5", YEAR).rename(
        columns={"rent_eur_month": "rent_1bed_month"}
    )
    rent_non_detached = parse_eurostat_sheet(xlsx_path, "Sheet 1", YEAR).rename(
        columns={"rent_eur_month": "rent_house_non_detached_month"}
    )
    rent_detached = parse_eurostat_sheet(xlsx_path, "Sheet 2", YEAR).rename(
        columns={"rent_eur_month": "rent_house_detached_month"}
    )
    rents = rent_1bed[["city_norm", "city_label", "rent_1bed_month"]].merge(
        rent_non_detached[["city_norm", "rent_house_non_detached_month"]],
        on="city_norm",
        how="outer",
    ).merge(
        rent_detached[["city_norm", "rent_house_detached_month"]],
        on="city_norm",
        how="outer",
    )
    # Only need rent_1bed_month and rent_house_detached_month for output
    return rents

def fuzzy_match_city(city_norm: str, rent_choices: list[str], cutoff: float = 0.85):
    if not city_norm:
        return None
    matches = difflib.get_close_matches(
        city_norm,
        rent_choices,
        n=1,
        cutoff=cutoff
    )
    if not matches:
        return None
    return matches[0]

def main():
    OUT_CITIES_JSON.parent.mkdir(parents=True, exist_ok=True)
    airbnb = pd.read_json(AIRBNB_JSON_PATH)
    airbnb["city_norm"] = airbnb["city"].apply(normalize_place)
    airbnb["is_region"] = airbnb["city_norm"].isin(REGIONS)
    rents = build_rent_table_2023(EUROSTAT_XLSX_PATH)
    rent_choices = rents["city_norm"].dropna().unique().tolist()
    cities_only = airbnb[~airbnb["is_region"]].copy()
    result_rows = []
    for _, r in cities_only.iterrows():
        match = fuzzy_match_city(r["city_norm"], rent_choices)
        if match is not None:
            rent_row = rents[rents["city_norm"] == match].iloc[0]
            # Only include if all required rents and prices are present
            rent_1bed = rent_row.get("rent_1bed_month")
            rent_detached = rent_row.get("rent_house_detached_month")
            if (
                pd.notna(r.get("avg_price_private_room"))
                and pd.notna(r.get("avg_price_entire_home"))
                and pd.notna(rent_1bed)
                and pd.notna(rent_detached)
            ):
                # Try to get 'country' - if not in Airbnb JSON, default ""
                country = r.get("country", "")
                aff_private_vs_rent = r["avg_price_private_room"] * NIGHTS_PER_MONTH / rent_1bed
                aff_entire_vs_house = r["avg_price_entire_home"] * NIGHTS_PER_MONTH / rent_detached
                result_rows.append({
                    "country": country,
                    "city": r["city"],
                    "city_norm_rent": match,
                    "rent_1bed_month": rent_1bed,
                    "rent_house_detached_month": rent_detached,
                    "affordability_private_room_vs_1bed_rent": aff_private_vs_rent,
                    "affordability_entire_home_vs_house_rent": aff_entire_vs_house,
                })
    OUT_CITIES_JSON.write_text(json.dumps(result_rows, ensure_ascii=False, indent=2), encoding="utf-8")

if __name__ == "__main__":
    main()
