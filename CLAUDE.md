# CLAUDE.md

Scrollytelling site (React 18 + Vite + D3) for CS 1710: "Sadder, Not Slower". Full context in README.md, docs/CONTRIBUTING.md, docs/DATA_PIPELINE.md.

## Commands
- `npm run dev`: local site at http://localhost:5173
- `npm test`: must pass before pushing (CI runs it before deploying)
- `npm run data`: rebuild `public/data/*.json` from the raw CSV (needs Python + `data/raw/spotify_tracks_with_dates_gender.csv`, not in git)

## Choices to keep
- The site reads only `public/data/*.json`. Never load the raw CSV in the browser. New data goes through `pipeline/build_story_data.py`.
- Hit = popularity >= 60, sad = valence < 0.40, years 1960-2022. Defined once at the top of `build_story_data.py`.
- Never hard-code a statistic in text. Compute it from the data.
- Colours: blue = sad, gold = happy, green = calm/accent, purple = intense (`src/lib/format.js`, `src/styles/global.css`).
- One chart per file in `src/charts/`. Width comes from `useSize`. Every SVG gets `role="img"` + `aria-label`.
- Pushing to `main` deploys to GitHub Pages. Work on a branch and open a PR.
