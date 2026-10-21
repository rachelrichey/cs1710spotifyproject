"""
Step 2 of the data pipeline: aggregate the clean track table into the small
JSON files the website loads.

    data/processed/tracks_clean.csv  ->  public/data/*.json

Definitions (kept in one place so the whole team uses the same ones)
---------------------------------------------------------------------
  HIT   popularity >= 60                    (reproduces the numbers in our process book)
  SAD   valence    <  0.40                  ("sounds sad" on Spotify's happiness score)
  Time analyses use one row per track_id, years 1960-2022 only.
  Genre analyses use one row per (track_id, genre).
  Spotify popularity is a *recent-streams* score, so older decades only contain
  songs people still play today.  Every time chart should say so.

Run:  python pipeline/build_story_data.py
"""
from pathlib import Path
import json
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data" / "processed" / "tracks_clean.csv"
OUT = ROOT / "public" / "data"
OUT.mkdir(parents=True, exist_ok=True)

HIT = 60
SAD = 0.40
START, END = 1960, 2022
MIN_GENRE_TRACKS = 30          # per period, for the genre before/after chart
FEATURES = ["valence", "danceability", "energy", "acousticness", "speechiness",
            "liveness", "instrumentalness", "loudness", "tempo", "duration_s"]

DECADES = [("1960s", 1960, 1969), ("1970s", 1970, 1979), ("1980s", 1980, 1989),
           ("1990s", 1990, 1999), ("2000s", 2000, 2009), ("2010s", 2010, 2019),
           ("2020-22", 2020, 2022)]


def dump(name, obj):
    path = OUT / name
    with open(path, "w") as f:
        json.dump(obj, f, separators=(",", ":"), ensure_ascii=False, allow_nan=False)
    print(f"  {name:<22} {path.stat().st_size/1024:8.1f} KB")


def r(x, n=3):
    return None if pd.isna(x) else round(float(x), n)


def short(s, n=40):
    s = str(s)
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"


def song(row):
    return {"name": short(row.track_name), "artist": short(row.artists.split(";")[0], 32),
            "year": int(row.year), "valence": r(row.valence), "energy": r(row.energy),
            "danceability": r(row.danceability), "popularity": int(row.popularity)}


def main():
    if not SRC.exists():
        raise SystemExit("Run pipeline/clean_data.py first (npm run data does both steps).")
    raw = pd.read_csv(SRC, low_memory=False)
    print(f"clean rows: {len(raw):,}")

    # one row per track (keep the most popular copy) ------------------------
    tracks = raw.sort_values("popularity", ascending=False).drop_duplicates("track_id")
    timed = tracks[tracks.year_ok & tracks.year.between(START, END)].copy()
    timed["year"] = timed["year"].astype(int)
    hits = timed[timed.popularity >= HIT].copy()
    print(f"unique tracks: {len(tracks):,} | with year {START}-{END}: {len(timed):,} | hits: {len(hits):,}")

    def decade_of(y):
        for label, a, b in DECADES:
            if a <= y <= b:
                return label
    hits["decade"] = hits.year.map(decade_of)
    timed["decade"] = timed.year.map(decade_of)

    # ---------------------------------------------------------------- meta
    dump("meta.json", {
        "hitThreshold": HIT, "sadThreshold": SAD, "yearRange": [START, END],
        "rawRows": int(len(raw)), "uniqueTracks": int(len(tracks)),
        "tracksWithYear": int(len(timed)), "hits": int(len(hits)),
        "genres": int(raw.track_genre.nunique()),
        "yearSources": raw.year_source.value_counts().to_dict(),
        "decades": [{"label": l, "start": a, "end": b} for l, a, b in DECADES],
    })

    # ---------------------------------------------------------------- hook
    cc = tracks[(tracks.track_name == "Bad Moon Rising") & (tracks.artists == "Creedence Clearwater Revival")].iloc[0]
    un = tracks[tracks.track_name.str.startswith("Unholy")].sort_values("popularity", ascending=False).iloc[0]
    def card(t):
        return {"name": t.track_name, "artist": t.artists.replace(";", ", "), "year": int(t.year),
                "valence": r(t.valence, 2), "danceability": r(t.danceability, 2), "energy": r(t.energy, 2),
                "tempo": r(t.tempo, 0), "popularity": int(t.popularity), "genre": t.track_genre}
    first, last = hits[hits.decade == "1960s"], hits[hits.decade == "2010s"]
    dump("hook.json", {
        "then": card(cc), "now": card(un),
        "nowIsMostPopular": bool(un.popularity == tracks.popularity.max()),
        "sad1960s": r((first.valence < SAD).mean(), 3), "sad2010s": r((last.valence < SAD).mean(), 3),
    })

    # ----------------------------------------------- genres (mood map)
    g = raw.groupby("track_genre")
    genres = g[["valence", "energy", "danceability", "acousticness", "instrumentalness",
                "speechiness", "tempo", "popularity"]].mean().round(4)
    genres["n"] = g.size()
    genres["hitRate"] = g.apply(lambda d: (d.popularity >= HIT).mean()).round(4)
    genres = genres.reset_index().rename(columns={"track_genre": "genre"})
    dump("genres.json", genres.to_dict(orient="records"))

    # --------------------------------------- % of hits that sound sad
    rows = []
    for label, a, b in DECADES:
        h = hits[hits.decade == label]
        ex_sad = (h[h.valence < SAD].drop_duplicates(["track_name", "artists"]).head(4))
        ex_happy = (h[h.valence >= 0.7].drop_duplicates(["track_name", "artists"]).head(4))
        rows.append({
            "label": label, "start": a, "end": b, "nHits": int(len(h)),
            "sadShare": r((h.valence < SAD).mean(), 4), "valence": r(h.valence.mean(), 3),
            "danceability": r(h.danceability.mean(), 3), "energy": r(h.energy.mean(), 3),
            "exampleSad": [song(x) for x in ex_sad.itertuples()],
            "exampleHappy": [song(x) for x in ex_happy.itertuples()],
        })
    annual = []
    for y in range(START, END + 1):
        w = hits[hits.year.between(y - 2, y + 2)]
        annual.append({"year": y, "nHits": int(len(w)), "sadShare": r((w.valence < SAD).mean(), 4),
                       "valence": r(w.valence.mean(), 3), "danceability": r(w.danceability.mean(), 3),
                       "energy": r(w.energy.mean(), 3)})
    dump("sad_share.json", {"decades": rows, "annual5yr": annual})

    # -------------------------------------- genre before / after
    gt = raw[raw.year_ok & raw.year.between(START, END)].drop_duplicates(["track_id", "track_genre"])
    pre = gt[gt.year < 2000].groupby("track_genre").valence.agg(["mean", "size"])
    post = gt[gt.year >= 2010].groupby("track_genre").valence.agg(["mean", "size"])
    j = pre.join(post, lsuffix="_pre", rsuffix="_post", how="inner")
    j = j[(j.size_pre >= MIN_GENRE_TRACKS) & (j.size_post >= MIN_GENRE_TRACKS)].copy()
    j["delta"] = j.mean_post - j.mean_pre
    j = j.sort_values("delta")
    dump("genre_shift.json", {
        "minTracks": MIN_GENRE_TRACKS, "nGenres": int(len(j)),
        "shareSadder": r((j.delta < 0).mean(), 3), "nSadder": int((j.delta < 0).sum()),
        "genres": [{"genre": k, "pre": r(v.mean_pre, 3), "post": r(v.mean_post, 3), "delta": r(v.delta, 3),
                    "nPre": int(v.size_pre), "nPost": int(v.size_post)} for k, v in j.iterrows()],
    })

    # -------------------------------------- hits for the animated mood map
    hs = hits.sort_values(["year", "popularity"], ascending=[True, False])
    dump("hits.json", {
        "cols": ["year", "valence", "energy", "danceability", "popularity", "name", "artist"],
        "rows": [[int(t.year), r(t.valence), r(t.energy), r(t.danceability), int(t.popularity),
                  short(t.track_name, 36), short(t.artists.split(";")[0], 28)] for t in hs.itertuples()],
    })

    # -------------------------------------- decade audio profile (radar)
    prof = []
    for label, a, b in DECADES:
        h, allt = hits[hits.decade == label], timed[timed.decade == label]
        prof.append({"label": label, "nHits": int(len(h)), "nTracks": int(len(allt)),
                     "hits": {f: r(h[f].mean(), 3) for f in FEATURES},
                     "all": {f: r(allt[f].mean(), 3) for f in FEATURES}})
    dump("decade_profile.json", prof)

    # -------------------------------------- takeaway statistics
    # one row per unique track, "instrumental" = instrumentalness > 0.5, top 1% = 1% most popular tracks
    top1 = tracks.nlargest(int(round(len(tracks) * 0.01)), "popularity")
    instr = lambda d: (d.instrumentalness > 0.5).mean()
    # "how much of popularity does genre / mood explain?" uses every (track, genre) row,
    # because genre is the grouping variable
    pop_var = raw.popularity.var(ddof=0)
    genre_eta2 = (raw.groupby("track_genre").popularity.transform("mean") - raw.popularity.mean()).pow(2).mean() / pop_var
    valence_r2 = np.corrcoef(raw.valence, raw.popularity)[0, 1] ** 2
    today = hits[hits.decade == "2020-22"]
    dump("takeaways.json", {
        "energyToday": r(today.energy.mean(), 2), "energy1960s": r(hits[hits.decade == "1960s"].energy.mean(), 2),
        "instrumentalAll": r(instr(tracks), 3), "instrumentalTop1": r(instr(top1), 3),
        "instrumentalHitRate": r((tracks[tracks.instrumentalness > 0.5].popularity >= HIT).mean(), 3),
        "vocalHitRate": r((tracks[tracks.instrumentalness <= 0.5].popularity >= HIT).mean(), 3),
        "genreExplains": r(genre_eta2, 3), "valenceExplains": r(valence_r2, 4),
        "top1Cutoff": int(top1.popularity.min()),
    })

    # -------------------------------------- song search index (lazy loaded)
    s = tracks[(tracks.popularity >= 30)].drop_duplicates(["track_name", "artists"])
    s = s.sort_values("popularity", ascending=False)
    dump("search.json", {
        "cols": ["name", "artist", "year", "genre", "valence", "energy", "danceability", "popularity"],
        "rows": [[short(t.track_name, 44), short(t.artists.replace(";", ", "), 36),
                  (int(t.year) if t.year_ok else None), t.track_genre,
                  r(t.valence), r(t.energy), r(t.danceability), int(t.popularity)] for t in s.itertuples()],
    })

    # -------------------------------------- genre "burst" glyph data
    rng = np.random.RandomState(171)
    z = genres.set_index("genre")[["danceability", "energy", "valence", "acousticness"]]
    z = (z - z.mean()) / z.std()
    bursts = []
    for gname, d in raw.groupby("track_genre"):
        samp = d.sample(min(28, len(d)), random_state=rng)
        dist = ((z - z.loc[gname]) ** 2).sum(axis=1).drop(gname).sort_values()
        row = genres.set_index("genre").loc[gname]
        bursts.append({
            "genre": gname, "n": int(len(d)),
            "energy": r(row.energy, 3), "valence": r(row.valence, 3), "danceability": r(row.danceability, 3),
            "acousticness": r(row.acousticness, 3), "tempo": r(row.tempo, 1), "popularity": r(row.popularity, 1),
            "nearest": dist.index[0],
            "tracks": [[r(t.tempo, 1), r(t.energy, 3), r(t.valence, 3), int(t.popularity)] for t in samp.itertuples()],
        })
    bursts.sort(key=lambda b: b["energy"])
    dump("bursts.json", bursts)

    # -------------------------------------- extras (data for the optional views)
    wk = raw[raw.release_weekday.notna() & raw.year.between(1995, 2022)].drop_duplicates("track_id")
    friday = wk.groupby("year").release_weekday.apply(lambda s: (s == 4).mean()).round(3)
    extras = {
        "fridayShareByYear": {int(k): float(v) for k, v in friday.items()},
        "medianHitDurationSec": {l: r(hits[hits.decade == l].duration_s.median(), 1) for l, _, _ in DECADES},
        "collabShareOfHits": {l: r((hits[hits.decade == l].n_artists > 1).mean(), 3) for l, _, _ in DECADES},
        "womenShareOfHits": {l: r(hits[hits.decade == l].has_female.mean(), 3) for l, _, _ in DECADES},
        "womenShareOfAll": {l: r(timed[timed.decade == l].has_female.mean(), 3) for l, _, _ in DECADES},
    }
    dump("extras.json", extras)

    print("\nheadline checks")
    print("  sad share 1960s -> 2010s:", rows[0]["sadShare"], "->", rows[5]["sadShare"], "| 2020-22:", rows[6]["sadShare"])
    print("  valence 1960s -> 2020-22:", prof[0]["hits"]["valence"], "->", prof[6]["hits"]["valence"])


if __name__ == "__main__":
    main()
