# Process book, Prototype V1 section (draft to paste into the Google Doc)

> Written from the implemented code. Everything below is true of the current site.
> **Still for the team to do:** (a) hand-draw or Figma-sketch the three "draft" visualizations in section 4, and
> (b) paste in screenshots from `docs/screenshots/` (the live site link goes here once hosted).

## 1. What Prototype V1 contains

A scroll-driven website (React + Vite + D3) that tells the story in our storyboard, frame by frame.
Run locally with `npm install && npm run dev`. All 10 chapters load real data from `public/data/*.json`, which the Python pipeline builds from our 114,000-track dataset.

| Storyboard frame | Visualization | Sketch | Status |
|---|---|---|---|
| 1 Hook | Two Spotify-style song cards + headline stat | storyboard | Implemented |
| 2 Background and problem | Mood map: 114 genres, valence x energy | Sketch 10 | Implemented (functional D3 #1) |
| 3 Rising insight | Line chart: share of hits that sound sad, by decade | storyboard | Implemented (functional D3 #2) |
| 4 Rising insight | Dumbbell chart: valence per genre before 2000 vs since 2010 | storyboard | Implemented |
| 5 Opportunity | Animated mood map with year slider, trail of the average hit | Sketch 10 + storyboard | Implemented |
| 6 Main message | Radar: average hit of 1960s vs 2020-22 | Sketch 7 | Implemented |
| 7 Recommendations | Three takeaway cards | storyboard | Implemented |
| 8 Call to action | Song search + playlist mood map | storyboard | Implemented |
| (novel view) | Genre burst | Sketch 11 | First version implemented |

Sketch 8 (happiest genres bar chart), sketch 3 (flower) and sketch 18 (speaker) are **not** implemented as standalone charts in V1. Chapter 2's tooltips and highlighted genres cover part of sketch 8's purpose.

## 2. Website structure and storytelling

Following Dykes's data storytelling arc: **Setting** (chapters 1-2) -> **Rising insights** (3-5) -> **Main message** (6) -> **Solution and next steps** (7-8). Two extra chapters sit after the arc: the novel view (9) and the data documentation (10).

Design: dark Spotify-inspired theme. A fixed "now playing" bar at the bottom uses scroll position as the playhead (chapter title, progress, previous/next, and an auto-scroll play button).
In chapters 2, 3, 5 and 6 the chart stays pinned while step cards scroll past; the active step changes what the chart shows.
On phones the chart pins to the top and the cards scroll underneath.

## 3. Interaction designs (as implemented)

| Chapter | Interaction | Intent (Yi et al.) | What it lets the reader find out |
|---|---|---|---|
| 1 | Press play on a song card: equalizer bounces at that song's tempo | Encode | Same "sad" song can be fast |
| 2 | Scroll steps reveal axes, dots, extremes; hover a dot | Explore, Elaborate | Where each genre sits; which are opposite |
| 3 | Scroll draws the line; hover or tap a decade | Explore, Abstract/Elaborate | Which actual songs sit behind each point |
| 4 | Mode chips (biggest drops, got happier, all); search a genre | Filter, Select | Is the shift just a few genres? (no) |
| 5 | Year slider + play button; hover a dot | Explore, Filter | The happy corner empties from 58% (1985) to 31% (2016) |
| 6 | Toggle decade chips; hover an axis | Select, Reconfigure | Compare any decades on a true 0-1 scale |
| 8 | Search 60,000 songs, build a playlist, "find a happy hit" | Select, Connect | Which decade your taste sounds like |
| 9 | Click a burst or pick from 114 genres; jump to the nearest genre | Select, Connect | What a genre sounds like and what it resembles |

Changes from our Milestone 6 feedback: the radar now uses a true 0-1 scale (we found the lowest-to-highest scale exaggerated differences); the radar has hover values; the mood map keeps its quadrant labels because axes are fixed; the release-year slider we planned is chapter 5.

## 4. Novel view: the genre burst (sketch 11)

First implementation in `src/charts/GenreBurst.jsx`. One glyph per genre, built from 28 sampled tracks.

| Mark | Channel | Data | Type |
|---|---|---|---|
| Ray (line) | Length | energy | quantitative |
| Ray | Angle within fan | tempo (60-200 BPM, slow left, fast right) | quantitative |
| Dot at ray tip | Hue (5 bins, blue to gold) | valence | ordinal |
| Dot at ray tip | Area | popularity | quantitative |
| Wavy roots below | Count and length | acousticness | quantitative |
| Wavy rings | Count | danceability | quantitative |
| Dashed wave between two glyphs | Connection | nearest genre (danceability, energy, valence, acousticness) | categorical |
| Gallery position | Vertical order | calmer genres first, louder last | ordinal |

Why it is novel: no standard chart encodes seven attributes of a genre in one compact, repeatable shape, and the identical encoding makes the glyphs work as small multiples. In V1, techno is a narrow, blue, tightly packed fan and salsa is wide and gold, readable at a glance.

Known limits to test next: the roots and ripples are decorative-looking and need user testing to see whether people read them as data; glyphs for 114 genres are not shown at once; no link yet to the mood map or year slider.

## 5. Three visualization drafts not implemented yet

The data for all three is already computed in `public/data/extras.json`, so they are cheap to build. They are the "streaming era" findings we agreed to keep as optional views.

**Draft A: The Friday switch (Cate's insight 1).**
Question: when did music move to Friday releases? Marks: bar per year (1995-2022). Channels: height = share of releases on Friday (7% in 1995, 22% in 2014, 40% in 2015, 61% in 2016), hue = Friday highlighted vs other days. Annotation at 2015: "global Friday release day, July 10, 2015". Interaction: hover a year for the weekday breakdown. Role in story: gives the 2015 marker on chapter 3 a concrete cause.

**Draft B: Shorter hits, more collaborations (Cate's insights 2 and 3).**
Question: how did streaming change the shape of a hit? Marks: two small-multiple line charts sharing a decade x-axis. Channels: position = median hit length (4:16 in the 1990s to 3:07 in 2020-22) and share of hits with more than one artist (12% to 37%). Interaction: hover a decade to link both panels and list example songs. Role: explains what else changed after 2015.

**Draft C: Women's share of hits (Bahar's and Miles's insights).**
Question: are women more represented among hits than among all songs? Marks: dumbbell per decade. Channels: position = share of tracks with a woman credited, hue = all songs vs hits (2010s: 17% of all songs vs 24% of hits). Interaction: toggle "female solo", "mixed", "group". Role: optional; gender labels are incomplete, so it needs a visible data-quality note.

## 6. Data pipeline summary

See `docs/DATA_PIPELINE.md`. In short: raw CSV -> `clean_data.py` (resolve two-digit years, flag bad dates, split gender) -> `build_story_data.py` (aggregate to 11 JSON files) -> charts. `npm test` re-checks the headline numbers against this process book.

Honest differences: the genre chart now reports **71 of 84 genres (85%) got sadder** (earlier: 84% of 83); 1960s valence 0.624 and 2020-22 valence 0.475 round to the process book's 0.62 and 0.48.

## 7. How we used Claude on this milestone (for the team to edit)

Claude wrote the first version of the code from the storyboard and process book, built the data pipeline, and tested it (unit tests and headless-browser screenshots on desktop and phone).
What the team should verify and own: the story text (every number is computed from data, but the interpretation is ours), the choice of the 60+ hit threshold, the genre-threshold difference above, and the visual design.
Problems Claude's first pass had and fixed: charts disappearing when pinned, dumbbell rows stacked on each other, canvas dots misaligned with the axes, labels overlapping on clustered genres, horizontal scrolling on phones, and one wrong sentence (it said 40% of 1990s hits sounded sad; the data says 37%).
