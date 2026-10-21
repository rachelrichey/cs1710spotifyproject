# Contributing

## Workflow

1. `git checkout -b yourname/short-description`
2. `npm run dev` and work.
3. `npm test` must pass before you push.
4. Open a pull request, ask one teammate to look at it in the browser.

## Add a new chart

1. Put the data in the pipeline: add a `dump("my_data.json", ...)` in `pipeline/build_story_data.py`, run `npm run data`.
2. Create `src/charts/MyChart.jsx`. Copy a small chart (`TakeawayCards.jsx` is the simplest, `MoodMap.jsx` is the best pattern for SVG + tooltip).
3. Wire it into a chapter in `src/sections/StorySections.jsx`:
   - fixed chart: `<Reveal><MyChart data={...} /></Reveal>`
   - scroll-driven chart: `<Scrolly steps={[...]}>{(step) => <MyChart step={step} />}</Scrolly>`
4. Load the data in `src/App.jsx` with `useData('my_data')`.
5. Add an assertion to `src/__tests__/app.test.jsx`.

## Rules we follow

- **Never type a statistic into text.** Compute it from the data so text and charts cannot disagree.
- **One colour language:** blue = sad, gold = happy, green = calm and the Spotify accent, purple = intense. Colours live in `src/lib/format.js` and `src/styles/global.css`.
- **Show uncertainty and caveats** next to the chart they affect (popularity is about recent streams).
- Charts get their width from `useSize`, never a fixed pixel width. Test at 390px wide.
- Give every SVG a `role="img"` and an `aria-label`.
- Respect `prefers-reduced-motion` (the global CSS already shortens animations).
