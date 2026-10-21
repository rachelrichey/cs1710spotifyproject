import { useCallback, useMemo, useState } from 'react';
import Chapter, { Reveal } from '../components/Chapter.jsx';
import Scrolly from '../components/Scrolly.jsx';
import { CHAPTERS } from '../chapters.js';
import { pct, prettyGenre, signed2 } from '../lib/format.js';
import SongCards from '../charts/SongCards.jsx';
import MoodMap, { moodExtremes } from '../charts/MoodMap.jsx';
import SadShareLine from '../charts/SadShareLine.jsx';
import GenreDumbbell from '../charts/GenreDumbbell.jsx';
import MoodTimeMap, { buildFrames } from '../charts/MoodTimeMap.jsx';
import HitRadar from '../charts/HitRadar.jsx';
import TakeawayCards from '../charts/TakeawayCards.jsx';
import SongFinder from '../charts/SongFinder.jsx';
import GenreBurst from '../charts/GenreBurst.jsx';

const chapter = (id) => CHAPTERS.find((c) => c.id === id);
const names = (set) => [...set].map(prettyGenre).join(', ');

/* ------------------------------------------------------------------ 1 */
export function HookChapter({ hook }) {
  return (
    <Chapter
      chapter={chapter('hook')}
      tint="a"
      dek={hook ? `\u201C${hook.then.name}\u201D (${hook.then.year}) scores ${hook.then.valence.toFixed(2)} out of 1 on Spotify\u2019s happiness score. \u201C${hook.now.name.split(' (')[0]}\u201D (${hook.now.year}), the most popular song in our data, scores ${hook.now.valence.toFixed(2)}.` : undefined}
    >
      <Reveal>
        <SongCards hook={hook} />
      </Reveal>
      {hook && (
        <Reveal>
          <p className="chapter__dek" style={{ marginTop: 40 }}>
            The newer song is the sadder one, and it is far more danceable ({hook.now.danceability.toFixed(2)} vs. {hook.then.danceability.toFixed(2)}).
            In the 1960s, fewer than 1 in 5 popular songs sounded sad. Now it&rsquo;s almost half. <b style={{ color: '#fff' }}>Is that a coincidence, or a pattern?</b>
          </p>
        </Reveal>
      )}
    </Chapter>
  );
}

/* ------------------------------------------------------------------ 2 */
export function MoodMapChapter({ genres, profile }) {
  const ex = useMemo(() => moodExtremes(genres), [genres]);
  const steps = [
    <>
      <h3>Meet the mood map</h3>
      <p>We describe how a song feels with two numbers Spotify measures for every track.</p>
      <p><strong>Valence</strong> runs from sad (0) to happy (1). <strong>Energy</strong> runs from calm (0) to intense (1). Together they split music into four moods.</p>
    </>,
    <>
      <h3>114 genres, 114 dots</h3>
      <p>Each dot is a genre, averaged over 1,000 of its tracks. Gold dots are happier, blue dots are sadder.</p>
      <p><strong>Hover over the map</strong> to see which genre is which.</p>
    </>,
    <>
      <h3>Opposite corners</h3>
      <p>The calmest, happiest genres: <strong>{names(ex.calm)}</strong>.</p>
      <p>The saddest, most intense: <strong>{names(ex.intense)}</strong>.</p>
      <p>Genres have very different moods. So what about the songs everybody actually listens to?</p>
    </>,
    <>
      <h3>Here is the question</h3>
      <p>Hit songs live somewhere on this map too. We drew the average hit of the 1960s and the average hit of 2020&ndash;22.</p>
      <p><strong>Has the mood of popular music changed, and how?</strong></p>
    </>,
  ];
  return (
    <Chapter chapter={chapter('mood-map')} tint="c" dek="Before we can say music got sadder, we need a way to measure a song&rsquo;s mood.">
      <Scrolly steps={steps} side="right">{(step) => <MoodMap genres={genres} profile={profile} step={step} />}</Scrolly>
    </Chapter>
  );
}

/* ------------------------------------------------------------------ 3 */
export function SadderChapter({ sad }) {
  const d = sad?.decades;
  const steps = d
    ? [
        <>
          <h3>The 1960s and 70s</h3>
          <span className="big">{pct(d[0].sadShare)}</span>
          <p>Only {pct(d[0].sadShare)} of 1960s hits sounded sad (valence under 0.40), and {pct(d[1].sadShare)} of 1970s hits.</p>
        </>,
        <>
          <h3>By the 1990s</h3>
          <span className="big">{pct(d[3].sadShare)}</span>
          <p>More than one in three hits now sounds sad, up from {pct(d[0].sadShare)} in the 1960s. After a plateau, the line climbs again.</p>
        </>,
        <>
          <h3>The 2010s</h3>
          <span className="big">{pct(d[5].sadShare)}</span>
          <p>Almost half of 2010s hits sound sad, and the average hit&rsquo;s valence falls from {d[0].valence.toFixed(2)} to {d[5].valence.toFixed(2)}.</p>
        </>,
        <>
          <h3>The streaming era</h3>
          <p>We mark 2015, when the industry moved to one global release day, as context, not a cause.</p>
          <p>2020&ndash;22 bounces back a little, to {pct(d[6].sadShare)}.</p>
        </>,
        <>
          <h3>Meet the songs</h3>
          <p><strong>Hover or tap a decade</strong> to see its saddest and happiest hits. Is the line just a few songs, or really a whole decade?</p>
        </>,
      ]
    : [<p key="l">Loading&hellip;</p>];
  return (
    <Chapter chapter={chapter('sadder')} tint="b" dek="The share of hit songs that sound sad, decade by decade.">
      <Scrolly steps={steps} side="left">{(step) => <SadShareLine data={sad} step={step} />}</Scrolly>
      <p className="caveat"><b>A caution:</b> Spotify&rsquo;s popularity score is about recent streams, so older decades only include songs people still play today.</p>
    </Chapter>
  );
}

/* ------------------------------------------------------------------ 4 */
export function GenreChapter({ shift }) {
  const worst = shift?.genres[0];
  const happier = shift ? shift.genres.filter((g) => g.delta > 0) : [];
  return (
    <Chapter chapter={chapter('genres')} tint="d" dek="Maybe sad genres simply got bigger. If that were true, each genre would stay put. It didn&rsquo;t.">
      <div className="split">
        <Reveal className="split__text">
          {shift ? (
            <>
              <span className="bignum">{pct(shift.shareSadder)}</span>
              <p className="bigcap">of {shift.nGenres} genres sound sadder since 2010 than they did before 2000.</p>
              <p>
                The biggest fall is <b>{prettyGenre(worst.genre)}</b>, from {worst.pre.toFixed(2)} to {worst.post.toFixed(2)} on the happiness scale.
                Only {happier.length} genres moved the other way, including <b>{prettyGenre(happier[happier.length - 1].genre)}</b> and <b>{prettyGenre(happier[happier.length - 2].genre)}</b>.
              </p>
              <p><b>Try it:</b> search your favourite genre, or switch to <i>Got happier</i> to meet the exceptions.</p>
            </>
          ) : <p>Loading&hellip;</p>}
        </Reveal>
        <Reveal className="split__chart card" delay={100}>
          <GenreDumbbell data={shift} />
        </Reveal>
      </div>
    </Chapter>
  );
}

/* ------------------------------------------------------------------ 5 */
const YEAR_STEPS = [1965, 1985, 2000, 2012, 2016, 2022];

export function CornerChapter({ hits, profile }) {
  const [year, setYear] = useState(1965);
  const { frames } = useMemo(() => buildFrames(hits), [hits]);
  const onStep = useCallback((s) => setYear(YEAR_STEPS[Math.min(s, YEAR_STEPS.length - 1)]), []);
  const f = (y) => frames[y];
  const ready = hits && hits.length > 0 && f(1965);
  const steps = ready
    ? [
        <>
          <h3>The mid-1960s</h3>
          <p>Each dot is a hit. In the mid-1960s, <strong>{pct(f(1965).share.he)}</strong> of them are happy <em>and</em> energetic. Only {pct(f(1965).share.se)} are sad and intense.</p>
        </>,
        <>
          <h3>The 1980s peak</h3>
          <p>The happy, energetic corner is at its fullest: <strong>{pct(f(1985).share.he)}</strong> of hits. But the sad, intense corner is already growing, to {pct(f(1985).share.se)}.</p>
        </>,
        <>
          <h3>2000</h3>
          <p>Energy is near its peak, yet the average hit keeps sliding toward sad. Follow the green marker: it is the average hit, and its trail shows where it has been.</p>
        </>,
        <>
          <h3>2012</h3>
          <p>The happy corner is down to <strong>{pct(f(2012).share.he)}</strong>, and the sad, intense corner ({pct(f(2012).share.se)}) has overtaken it as the busiest place on the map.</p>
        </>,
        <>
          <h3>2016</h3>
          <p>Sad and intense hits are now <strong>{pct(f(2016).share.se)}</strong> of all hits, up from {pct(f(1965).share.se)}. Danceability climbs from {profile?.[4]?.hits.danceability.toFixed(2)} (2000s) to {profile?.[6]?.hits.danceability.toFixed(2)} (2020&ndash;22).</p>
        </>,
        <>
          <h3>Your turn</h3>
          <p><strong>Press play or drag the slider</strong> to watch the average hit travel across the map. In 2022 it&rsquo;s back to {pct(f(2022).share.he)} happy and energetic, a small bounce.</p>
        </>,
      ]
    : [<p key="l">Loading&hellip;</p>];

  return (
    <Chapter chapter={chapter('corner')} tint="e" dek="The mood map is back, and this time it has a clock.">
      <Scrolly steps={steps} side="right" onStep={onStep}>
        {(step) => <MoodTimeMap hits={hits} year={year} setYear={setYear} step={step} />}
      </Scrolly>
      <p className="caveat"><b>Remember:</b> many more songs are released each year now, so dots get denser even as the shares shift. Percentages show the share of hits, not the number.</p>
    </Chapter>
  );
}

/* ------------------------------------------------------------------ 6 */
const ALL = ['1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020-22'];
const PRESETS = [['1960s'], ['1960s', '2020-22'], ALL];

export function MainChapter({ profile }) {
  const [selected, setSelected] = useState(['1960s']);
  const onStep = useCallback((s) => setSelected(PRESETS[Math.min(s, PRESETS.length - 1)]), []);
  const toggle = (label) =>
    setSelected((cur) => {
      const next = cur.includes(label) ? cur.filter((l) => l !== label) : [...cur, label];
      return ALL.filter((l) => next.includes(l));
    });
  const a = profile?.[0]?.hits;
  const b = profile?.[6]?.hits;
  const steps = a && b
    ? [
        <>
          <h3>The average 1960s hit</h3>
          <p>Happiness {a.valence.toFixed(2)}, danceability {a.danceability.toFixed(2)}, energy {a.energy.toFixed(2)}. Sunny, but not built for the dance floor.</p>
        </>,
        <>
          <h3>Now lay 2020&ndash;22 on top</h3>
          <p>Happiness <strong>{signed2(b.valence - a.valence)}</strong>, danceability <strong>{signed2(b.danceability - a.danceability)}</strong>, energy <strong>{signed2(b.energy - a.energy)}</strong>.</p>
          <p>Today&rsquo;s typical hit is a sad song you can dance to.</p>
        </>,
        <>
          <h3>Every decade in between</h3>
          <p>Energy rose until the 2000s, then eased. Happiness slid and bottomed out in the 2010s. Danceability only started climbing recently.</p>
          <p><strong>Use the chips</strong> to compare any decades you like.</p>
        </>,
      ]
    : [<p key="l">Loading&hellip;</p>];
  return (
    <Chapter chapter={chapter('main')} tint="c" dek="Put the average hit of two eras side by side and the shift is hard to miss.">
      <Scrolly steps={steps} side="left" onStep={onStep}>
        {() => <HitRadar profile={profile} selected={selected} onToggle={toggle} />}
      </Scrolly>
    </Chapter>
  );
}

/* ------------------------------------------------------------------ 7 */
export function MeaningChapter({ takeaways }) {
  return (
    <Chapter chapter={chapter('meaning')} tint="d" dek="Three things to take away, whether you listen, write or produce.">
      <Reveal><TakeawayCards t={takeaways} /></Reveal>
      <p className="caveat"><b>Keep in mind:</b> popularity reflects what people stream now, so older decades show the songs that lasted.</p>
    </Chapter>
  );
}

/* ------------------------------------------------------------------ 8 */
export function FinderChapter({ profile }) {
  return (
    <Chapter chapter={chapter('finder')} tint="c" dek="Search a song, an artist or a genre and see where it sits next to the average hit of every decade. Then try to find a happy song that&rsquo;s a hit today.">
      <Reveal><SongFinder profile={profile} /></Reveal>
    </Chapter>
  );
}

/* ------------------------------------------------------------------ 9 */
export function BurstChapter({ bursts }) {
  const ch = chapter('bursts');
  return (
    <Chapter chapter={{ ...ch, title: ch.title }} tint="a"
      dek="Every genre has a shape. We drew one burst per genre from 28 of its tracks, so you can compare sounds at a glance.">
      <Reveal><GenreBurst bursts={bursts} /></Reveal>
      <p className="caveat"><b>Novel view, V1.</b> This is our first implementation of sketch 11. Next: linking bursts to the mood map and the year slider.</p>
    </Chapter>
  );
}
