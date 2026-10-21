"""
Step 1 of the data pipeline: clean the raw track table.

    raw CSV  ->  data/processed/tracks_clean.csv

What the raw file is
--------------------
The Kaggle "Spotify Tracks Dataset" (114,000 tracks, 114 genres x 1,000 tracks)
that our team extended with three things:
  * a release date per track (scraped from Wikipedia / MusicBrainz / Deezer),
  * the date sources cited in the notes column,
  * an artist gender label (mostly from Wikidata).

What this script fixes
----------------------
1. Release dates come in four formats: "2013", "2013-05", "4/8/22", "10/28/08".
   The two-digit years are ambiguous ("/69" is 1969, "/22" is 2022), and the
   usual pandas pivot (69 -> 1969, 68 -> 2068) puts hundreds of songs in the
   future.  We resolve the century in this order:
       a. four-digit year as-is                              (year_source = "year-only")
       b. match month/day/yy to an ISO date cited in notes   (year_source = "notes-match")
       c. otherwise pivot: yy <= 22 -> 20yy, else 19yy       (year_source = "pivot-guess")
      The dataset was collected in 2022, so a pivot at 22 is the safest guess.
2. Tracks with no usable date are kept but get year = NaN (they still count for
   genre-level statistics, just not for anything over time).
3. Dates outside 1950-2022 are flagged, not deleted (`year_ok`).
4. Multi-valued gender strings ("Female; Male") become explicit flags.
5. Column names become snake_case; duration becomes seconds.

Run:  python pipeline/clean_data.py
"""
from pathlib import Path
import re
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "spotify_tracks_with_dates_gender.csv"
OUT = ROOT / "data" / "processed" / "tracks_clean.csv"

YEAR_MIN, YEAR_MAX = 1950, 2022
PIVOT = 22  # two-digit years <= PIVOT are 20xx, above are 19xx

ISO = re.compile(r"(\d{4})-(\d{2})-(\d{2})")
YEAR_ONLY = re.compile(r"(\d{4})(?:-\d{2})?")
MDY = re.compile(r"(\d{1,2})/(\d{1,2})/(\d{2})")


def resolve_year(release_date, cited_notes):
    """Return (year, source) for one raw release-date string."""
    if pd.isna(release_date):
        return np.nan, "missing"
    s = str(release_date).strip()
    m = YEAR_ONLY.fullmatch(s)
    if m:
        return int(m.group(1)), "year-only"
    m = MDY.fullmatch(s)
    if m:
        month, day, yy = (int(g) for g in m.groups())
        if isinstance(cited_notes, str):
            for y, mo, da in ISO.findall(cited_notes):
                if int(mo) == month and int(da) == day and int(y) % 100 == yy:
                    return int(y), "notes-match"
        return (2000 + yy if yy <= PIVOT else 1900 + yy), "pivot-guess"
    return np.nan, "unparsed"


def gender_flags(g):
    """'Female; Male' -> (has_female, has_male, artist_type)."""
    if not isinstance(g, str):
        return False, False, "unknown"
    parts = [p.strip() for p in g.split(";")]
    has_f, has_m = "Female" in parts, "Male" in parts
    if "Group" in parts:
        kind = "group"
    elif len(parts) == 1 and has_f:
        kind = "female solo"
    elif len(parts) == 1 and has_m:
        kind = "male solo"
    elif has_f and has_m:
        kind = "mixed"
    elif has_f:
        kind = "women collab"
    elif has_m:
        kind = "men collab"
    else:
        kind = "unknown"
    return has_f, has_m, kind


def main():
    if not RAW.exists():
        raise SystemExit(
            f"Raw data not found: {RAW.relative_to(ROOT)}\n"
            "Put the team's CSV there (it is ~50 MB and not stored in git; see data/raw/README.md)."
        )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(RAW, low_memory=False)
    print(f"raw rows: {len(df):,}")

    df = df.rename(columns={
        "Release Date": "release_date", "Date_Match": "date_match",
        "Dates_Cited_In_Notes": "dates_cited", "Date_Check_Detail": "date_check",
        "Gender": "gender", "Gender_Source": "gender_source", "Notes": "notes",
    })

    # --- basic hygiene --------------------------------------------------
    df = df.dropna(subset=["track_name", "artists"]).copy()
    df["track_name"] = df["track_name"].str.strip()
    df["artists"] = df["artists"].str.strip()
    df["duration_s"] = df["duration_ms"] / 1000.0
    df["explicit"] = df["explicit"].astype(bool)

    # --- release years --------------------------------------------------
    res = [resolve_year(r, c) for r, c in zip(df["release_date"], df["dates_cited"])]
    df["year"] = [r[0] for r in res]
    df["year_source"] = [r[1] for r in res]
    df["year_ok"] = df["year"].between(YEAR_MIN, YEAR_MAX)

    # release weekday (only when we have a full m/d/yy date)
    full = pd.to_datetime(df["release_date"], format="%m/%d/%y", errors="coerce")
    full = full.where(df["year_source"].isin(["notes-match", "pivot-guess"]))
    # rebuild with the resolved year so the weekday is right
    def weekday(row_date, year):
        if pd.isna(row_date) or pd.isna(year):
            return np.nan
        try:
            return row_date.replace(year=int(year)).dayofweek  # 0 = Monday
        except ValueError:
            return np.nan
    df["release_weekday"] = [weekday(d, y) for d, y in zip(full, df["year"])]

    # --- gender -----------------------------------------------------------
    flags = [gender_flags(g) for g in df["gender"]]
    df["has_female"] = [f[0] for f in flags]
    df["has_male"] = [f[1] for f in flags]
    df["artist_type"] = [f[2] for f in flags]
    df["n_artists"] = df["artists"].str.count(";") + 1

    keep = [
        "track_id", "track_name", "artists", "album_name", "track_genre",
        "popularity", "duration_s", "explicit", "danceability", "energy", "key",
        "loudness", "mode", "speechiness", "acousticness", "instrumentalness",
        "liveness", "valence", "tempo", "time_signature",
        "year", "year_source", "year_ok", "release_weekday",
        "gender", "has_female", "has_male", "artist_type", "n_artists",
    ]
    df[keep].to_csv(OUT, index=False)

    # --- a short quality report ------------------------------------------
    print("year sources:\n", df["year_source"].value_counts().to_string())
    print(f"tracks with a usable year (1950-2022): {df['year_ok'].sum():,}")
    print(f"unique track_ids: {df['track_id'].nunique():,}")
    print(f"wrote {OUT.relative_to(ROOT)}  ({len(df):,} rows)")


if __name__ == "__main__":
    main()
