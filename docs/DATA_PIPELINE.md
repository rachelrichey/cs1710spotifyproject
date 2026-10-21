# Data pipeline

## Source

`data/raw/spotify_tracks_with_dates_gender.csv`: 114,000 rows, 27 columns.
The first 20 columns are the Kaggle [Spotify Tracks Dataset](https://www.kaggle.com/datasets/maharshipandya/-spotify-tracks-dataset)
(114 genres x 1,000 tracks). Our team added: `Release Date`, `Date_Match`, `Dates_Cited_In_Notes`, `Date_Check_Detail`,
`Gender`, `Gender_Source`, `Notes`.

## Steps

### 1. `pipeline/clean_data.py` writes `data/processed/tracks_clean.csv`

| Problem in the raw file | What we do |
|---|---|
| Release dates in four formats (`2013`, `2013-05`, `4/8/22`, `10/28/08`) | Parse all four |
| Two-digit years are ambiguous (`/69`: 1969 or 2069?). The common pandas pivot puts hundreds of songs in 2060s | Match month/day/yy against the ISO dates cited in `Dates_Cited_In_Notes` (83,386 tracks). Otherwise guess: yy <= 22 means 20yy, else 19yy (2,827 tracks) |
| 13,707 tracks have no date | Keep them (`year` is empty). They still count in genre-only charts |
| A few years are nonsense (year 1, 1900) or after 2022 | Flag with `year_ok` (1950-2022). The story only uses 1960-2022 |
| `Gender` holds values like `Female; Male` | Split into `has_female`, `has_male`, `artist_type` |
| One row has no title | Dropped (113,999 rows remain) |

`year_source` records how every year was resolved: `year-only`, `notes-match`, `pivot-guess`, `missing`.

### 2. `pipeline/build_story_data.py` writes `public/data/*.json`

| File | Size | Used by |
|---|---|---|
| `meta.json` | tiny | hero, data section |
| `hook.json` | tiny | chapter 1 |
| `genres.json` | 23 KB | chapter 2 (114 genre means) |
| `sad_share.json` | 14 KB | chapter 3 (decade + 5-year rolling share of sad hits, example songs) |
| `genre_shift.json` | 7 KB | chapter 4 (valence before 2000 vs since 2010 per genre) |
| `hits.json` | 545 KB | chapter 5 (9,263 hits, columnar) |
| `decade_profile.json` | 3 KB | chapters 5, 6, 8 (average hit per decade) |
| `takeaways.json` | tiny | chapter 7 |
| `search.json` | 3.5 MB | chapter 8 (lazy-loaded when you scroll near it) |
| `bursts.json` | 88 KB | chapter 9 (28 sampled tracks per genre + genre means + nearest genre) |
| `extras.json` | 1 KB | not yet shown (Friday releases, hit length, collaborations, women's share) |

## Definitions (change them in ONE place: top of `build_story_data.py`)

- **Hit**: popularity >= 60.
- **Sounds sad**: valence < 0.40.
- Time charts use one row per `track_id`, years 1960-2022.
- Genre charts use one row per (`track_id`, genre). A track can appear in several genres.
- Genre before/after chart: genres need >= 30 tracks both before 2000 and since 2010.
- Takeaways: "instrumental" = instrumentalness > 0.5; top 1% = most popular 1% of unique tracks; "genre explains X% of popularity" uses all 114,000 (track, genre) rows.

## Checks against the process book

`npm test` asserts the numbers quoted in the process book still hold. Where we differ:

- Genres that got sadder: the pipeline gives **71 of 84 genres (85%)**. The process book says 84% of 83 genres. We could not recover the exact threshold used earlier, so the site uses 30 tracks per period.
- "1960s sad hits 18%" is 17.9% (rounds to 18%). 2020-22 valence is 0.475 (rounds to 0.48).

## Known limitations

1. **Popularity is a recent-streams score**, so older decades only contain songs people still play. Older hits are survivors.
2. **Valence is a model output**, not a measured emotion.
3. **Genre sample**: 1,000 tracks per genre, so genre averages describe the sample.
4. **Gender**: many artists have no label. Gender findings stay out of the main story.
5. 2,827 release years are guesses (`pivot-guess`). Only the 1950s-1960s boundary is really affected.
