import Chapter, { Reveal } from '../components/Chapter.jsx';
import { CHAPTERS } from '../chapters.js';

const fmt = (n) => n.toLocaleString();

function Step({ n, title, children, code }) {
  return (
    <div className="pipe__step card">
      <div className="pipe__n">{n}</div>
      <h3>{title}</h3>
      <div className="pipe__body">{children}</div>
      {code && <code>{code}</code>}
    </div>
  );
}

/** Chapter 10: the data pipeline, the definitions, and the honest caveats. */
export default function DataSection({ meta }) {
  const ch = CHAPTERS.find((c) => c.id === 'data');
  const ys = meta?.yearSources || {};
  return (
    <Chapter chapter={ch} tint="e" dek="Everything on this page is computed from the files in this repository. Here is how raw tracks become charts.">
      <Reveal>
        <div className="pipe">
          <Step n="1" title="Collect" code="data/raw/*.csv">
            <p>The Kaggle Spotify tracks dataset: 114,000 rows ({meta ? fmt(meta.rawRows) : '113,999'} after dropping one track with no title), {meta?.genres ?? 114} genres with 1,000 tracks each. We added release dates and artist gender (mostly from Wikidata) to every track.</p>
          </Step>
          <Step n="2" title="Clean" code="pipeline/clean_data.py">
            <p>Release dates arrive in four formats and two-digit years are ambiguous. We resolve the century from dates cited in our notes first ({fmt(ys['notes-match'] || 83386)} tracks), fall back to a pivot guess ({fmt(ys['pivot-guess'] || 2827)}), and keep {fmt(ys.missing || 13707)} undated tracks for genre-only charts.</p>
          </Step>
          <Step n="3" title="Aggregate" code="pipeline/build_story_data.py">
            <p>One row per track for time charts ({meta ? fmt(meta.tracksWithYear) : '76,275'} songs from 1960&ndash;2022), one row per track and genre for genre charts. Output: eleven small JSON files in <i>public/data</i>.</p>
          </Step>
          <Step n="4" title="Draw" code="src/charts/*.jsx">
            <p>React renders the page, D3 supplies the scales, shapes and geometry. Each chart is one component that takes data and a scroll step as props.</p>
          </Step>
        </div>
      </Reveal>

      <div className="data-grid">
        <Reveal className="card">
          <h3>Definitions we use everywhere</h3>
          <dl className="defs">
            <div><dt>Hit</dt><dd>Spotify popularity score of {meta?.hitThreshold ?? 60} or higher ({meta ? fmt(meta.hits) : '9,263'} tracks, 1960&ndash;2022)</dd></div>
            <div><dt>Sounds sad</dt><dd>Valence below {meta?.sadThreshold ?? 0.4}. Valence is Spotify&rsquo;s 0&ndash;1 &ldquo;musical positivity&rdquo; score.</dd></div>
            <div><dt>Decade</dt><dd>By release year. The last bucket is 2020&ndash;22 because the data ends in 2022.</dd></div>
            <div><dt>Streaming era</dt><dd>2015 onward. Our weekday data shows releases jump from about 20% to 60% on Fridays in 2015&ndash;16.</dd></div>
          </dl>
        </Reveal>
        <Reveal className="card" delay={80}>
          <h3>Read these charts carefully</h3>
          <ul className="caveats">
            <li><b>Popularity is about now.</b> The score weights recent streams, so a 1960s hit only shows up if people still play it. Older decades are survivors.</li>
            <li><b>Valence is a model, not a mood.</b> It is Spotify&rsquo;s estimate of positivity from the audio, not how a listener feels.</li>
            <li><b>Gender labels are incomplete.</b> Many artists have none, so we keep gender findings out of the main story.</li>
            <li><b>Genres are a sample.</b> Each genre has 1,000 tracks, so genre averages describe the sample, not all of music.</li>
          </ul>
        </Reveal>
        <Reveal className="card" delay={160}>
          <h3>Sources and credits</h3>
          <ul className="caveats">
            <li>Data: <a href="https://www.kaggle.com/datasets/maharshipandya/-spotify-tracks-dataset" target="_blank" rel="noreferrer">Spotify Tracks Dataset on Kaggle</a>, extended with release dates and gender.</li>
            <li>Story structure: Brent Dykes&rsquo;s data storytelling arc, laid out in our <a href="https://www.figma.com/board/PQLkrdc1ZrrwmeRjMGMRwC" target="_blank" rel="noreferrer">storyboard</a>.</li>
            <li>Team: Bahar Moradi, Cate Buchan, Rachel Richey, Miles Schwab. Harvard CS 1710.</li>
          </ul>
        </Reveal>
      </div>
    </Chapter>
  );
}
