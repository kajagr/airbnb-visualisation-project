import json
import re
import unicodedata
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parent.parent
POP_XLSX = ROOT / "data" / "raw" / "population" / "population.xlsx"
CITY_STATS = ROOT / "data" / "processed" / "cities_statistical_data.json"
OUT = ROOT / "data" / "processed" / "city_population_density.json"


def normalize_key(s: str) -> str:
    """Make keys comparable across datasets: ascii-ish, underscores, no diacritics."""
    s = str(s).strip().lower()

    # manual transliteration for common European chars
    translit = {
        "ø": "o", "å": "a", "æ": "ae", "œ": "oe", "ß": "ss",
        "đ": "d", "ð": "d", "ł": "l", "ı": "i",
        "č": "c", "ć": "c", "ž": "z", "š": "s",
        "ğ": "g", "ş": "s", "ñ": "n",
    }
    s = "".join(translit.get(ch, ch) for ch in s)

    # remove accents (é -> e)
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))

    # remove parenthetical notes
    s = re.sub(r"\s*\(.*?\)\s*", "", s)

    # unify separators and remove junk
    s = s.replace("&", "and")
    s = re.sub(r"[/,_\-]+", " ", s)
    s = re.sub(r"[^a-z0-9 ]+", "", s)
    s = re.sub(r"\s+", " ", s).strip()

    return s.replace(" ", "_")


# Excel city label -> Airbnb id (CANONICAL)
ALIASES = {
    # Belgium / NL
    "bruxelles_brussel": "brussels",
    "antwerpen": "antwerp",
    "gent": "ghent",

    # Greece
    "athina": "athens",

    # Denmark / Germany / Austria
    "kobenhavn": "copenhagen",
    "munchen": "munich",
    "wien": "vienna",

    # Switzerland / France
    "geneve": "geneva",

    # Italy
    "firenze": "florence",
    "venezia": "venice",
    "roma": "rome",
    "napoli": "naples",
    "milano": "milan",

    # Portugal / Czechia
    "lisboa": "lisbon",
    "praha": "prague",

    # 🇳🇱 
    "hague": "the_hague",
    "hagen": "the_hague",
    "den_haag": "the_hague",
    "s_gravenhage": "the_hague",

    # Turkey
    "istanbul_buyuksehir": "istanbul",

    # Airbnb region / island IDs
    "palma_de_mallorca": "mallorca",
    "manchester": "greater_manchester",

    # Regions explicitly used by Airbnb
    "sicilia": "sicily",
    "puglia_region": "puglia",
    "trentino_alto_adige": "trentino",
    "crete_region": "crete",
    "south_aegean_region": "south_aegean",
    "illes_balears_menorca": "menorca",
    "euskadi_pais_vasco": "euskadi",
    "pays_basque_region": "pays_basque",
    "vaud_canton": "vaud",
}


def pick_latest_population(row: pd.Series, year_cols: list[str]):
    """Return (year:int, pop:float) choosing the most recent numeric value."""
    for y in reversed(year_cols):
        v = pd.to_numeric(row.get(y), errors="coerce")  # ':' -> NaN
        if pd.notna(v):
            return int(y), float(v)
    return None, None


def main():
    pop_df = pd.read_excel(POP_XLSX, sheet_name=0, header=7)
    pop_df = pop_df.rename(columns={pop_df.columns[0]: "city_raw"})

    year_cols = [c for c in pop_df.columns if str(c).isdigit()]
    year_cols = sorted(year_cols, key=lambda x: int(str(x)))
    if not year_cols:
        raise ValueError("No year columns found in Excel file.")

    # Build population map: airbnb_id -> (population, year_used)
    pop_map = {}
    for _, r in pop_df.iterrows():
        city_raw = r.get("city_raw")
        if pd.isna(city_raw):
            continue

        city_raw = str(city_raw).strip()
        if not city_raw or city_raw.lower().startswith("cities"):
            continue

        key = normalize_key(city_raw)
        key = ALIASES.get(key, key)

        y, pop = pick_latest_population(r, year_cols)
        if y is None:
            continue

        pop_map[key] = (pop, y)

    with CITY_STATS.open("r", encoding="utf-8") as f:
        stats = json.load(f)

    rows = []
    missing = []

    for row in stats:
        cid = normalize_key(row["id"])

        if cid not in pop_map:
            missing.append(cid)
            continue

        population, pop_year = pop_map[cid]
        listings = float(row["count"])

        rows.append({
            "id": cid,
            "city": row["city"],
            "country": row["country"],
            "population": population,
            "population_year": pop_year,
            "listings": listings,
            "airbnbs_per_1k": round(listings / population * 1000, 2),
        })

    rows.sort(key=lambda r: r["airbnbs_per_1k"], reverse=True)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Wrote {len(rows)} rows to {OUT}")
    print(f"Missing population for {len(missing)} Airbnb locations:")
    for m in sorted(set(missing)):
        print(" -", m)


if __name__ == "__main__":
    main()
