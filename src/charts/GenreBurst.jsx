import { useMemo, useState } from 'react';
import { moodColor, prettyGenre } from '../lib/format.js';

/* ==========================================================================
   NOVEL VIEW (V2, after think-aloud testing): the "genre burst" (sketch 11, Bahar).
   One glyph per genre, built from 28 sampled tracks, small-multiple friendly:
     ray length          = energy               (quantitative)
     ray angle in fan    = tempo, slow left -> fast right
     tip colour          = valence, 5 bins from very sad (blue) to very happy (gold)
     tip size            = popularity
     roots (below)       = acousticness (more + longer roots = more acoustic)
     ripple rings        = danceability (more rings = more danceable)
     dashed wave         = nearest genre by danceability, energy, valence, acousticness
     position in gallery = calmer genres on top, louder below
   ========================================================================== */

const TEMPO = [60, 200];
const CURATED = [
  'sleep', 'ambient', 'classical', 'opera', 'jazz', 'acoustic', 'folk', 'blues', 'country', 'reggae', 'soul', 'pop',
  'k-pop', 'indie-pop', 'salsa', 'hip-hop', 'disco', 'dance', 'house', 'rock', 'punk', 'techno', 'heavy-metal', 'death-metal',
];
const BINS = [0.1, 0.3, 0.5, 0.7, 0.9];
const binColor = (v) => moodColor(BINS[Math.min(4, Math.floor(v * 5))]);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** Deterministic pseudo-random so a glyph never changes between renders. */
const rand = (seed) => {
  const s = Math.sin(seed * 9301 + 49297) * 233280;
  return s - Math.floor(s);
};

function wavyRing(cx, cy, r, seed) {
  const pts = [];
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const rr = r + 1.8 * Math.sin(a * 7 + seed);
    pts.push(`${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return pts.join('');
}

/** Layer names used by the "how to read a burst" key. focus = null shows everything at full strength. */
const LAYER_OF = { one: 'rays', length: 'rays', angle: 'rays', colour: 'tips', size: 'tips', roots: 'roots', rings: 'ripples', wave: 'none' };

export function burstGeometry(size) {
  return { cx: size / 2, cy: size * 0.62, rayMin: size * 0.1, rayMax: size * 0.5 };
}

export function Burst({ g, size = 200, active = false, id = '', focus = null, hiRay = -1, children = null }) {
  const layer = focus ? LAYER_OF[focus] : null;
  const dim = (name) => (layer && layer !== name ? ' is-dim' : '');
  const { cx, cy, rayMin, rayMax } = burstGeometry(size);
  const rings = 1 + Math.round(g.danceability * 5);
  const roots = 3 + Math.round(g.acousticness * 8);
  const rootLen = size * (0.05 + 0.3 * g.acousticness);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" className={`burst ${active ? 'is-active' : ''}`} role="img"
      aria-label={`${prettyGenre(g.genre)}: energy ${g.energy.toFixed(2)}, valence ${g.valence.toFixed(2)}, danceability ${g.danceability.toFixed(2)}, acousticness ${g.acousticness.toFixed(2)}`}>
      <g className={`burst__ripples${dim('ripples')}`}>
        {Array.from({ length: rings }, (_, k) => (
          <path key={k} d={wavyRing(cx, cy, 12 + k * (size * 0.045), k * 1.7)} fill="none" stroke="#fff" strokeOpacity={0.36 - k * 0.04} strokeWidth="1.2"
            style={{ animationDelay: `${k * -0.5}s` }} />
        ))}
      </g>
      <g className={`burst__roots${dim('roots')}`}>
        {Array.from({ length: roots }, (_, i) => {
          const t = roots === 1 ? 0.5 : i / (roots - 1);
          const a = (-58 + t * 116) * (Math.PI / 180);
          const len = rootLen * (0.65 + rand(i + g.energy * 100) * 0.5);
          const x2 = cx + Math.sin(a) * len;
          const y2 = cy + Math.cos(a) * len;
          const wob = (rand(i * 3.1) - 0.5) * size * 0.07;
          return <path key={i} d={`M${cx} ${cy} Q${(cx + x2) / 2 + wob} ${(cy + y2) / 2} ${x2} ${y2}`} fill="none" stroke="#1ed760" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" />;
        })}
      </g>
      <g className="burst__rays">
        {g.tracks.map(([tempo, energy, valence, pop], i) => {
          const t = clamp01((tempo - TEMPO[0]) / (TEMPO[1] - TEMPO[0]));
          const a = (-64 + t * 128) * (Math.PI / 180);
          const len = rayMin + energy * (rayMax - rayMin);
          const x2 = cx + Math.sin(a) * len;
          const y2 = cy - Math.cos(a) * len;
          const col = binColor(valence);
          return (
            <g key={i} className={`burst__ray${hiRay >= 0 && hiRay !== i ? ' is-dim' : ''}${hiRay === i ? ' is-hi' : ''}`} style={{ animationDelay: `${i * 14}ms` }}>
              <line className={`burst__stem${dim('rays')}`} x1={cx} y1={cy} x2={x2} y2={y2} stroke={col} strokeOpacity="0.55" strokeWidth={hiRay === i ? 3 : 1.3} />
              <circle className={`burst__tip${dim('tips')}`} cx={x2} cy={y2} r={(1.4 + (pop / 100) * 3.6) * (hiRay === i ? 1.6 : 1)} fill={col} />
            </g>
          );
        })}
      </g>
      <circle cx={cx} cy={cy} r="3.5" fill="#fff" />
      {children}
      {id && <text x={cx} y={size - 6} className="burst__name" textAnchor="middle">{id}</text>}
    </svg>
  );
}

/* ---------------------------------------------------------------------------
   "How to read a burst" (Milestone 10 think-aloud fix). Testers found the burst
   beautiful but hard to read at first glance, because it encodes seven things at
   once. Instead of a legend of seven pills, we take one genre and walk through it
   one layer at a time, with that genre's own numbers.
   --------------------------------------------------------------------------- */
const EXAMPLE = 'pop';
const KEY_SIZE = 300;

function keySteps(g) {
  const tr = g.tracks;
  const hi = tr.reduce((b, t, i) => (t[3] > tr[b][3] ? i : b), 0);
  const [hTempo, hEnergy, hVal, hPop] = tr[hi];
  const fastest = Math.max(...tr.map((t) => t[0]));
  const slowest = Math.min(...tr.map((t) => t[0]));
  const sadTips = tr.filter((t) => t[2] < 0.4).length;
  const raw = prettyGenre(g.genre);
  const name = raw.charAt(0).toUpperCase() + raw.slice(1);
  return {
    hi,
    steps: [
      { id: 'one', label: 'One ray', means: 'one song',
        text: <>Every burst is made of {tr.length} rays, and <b>each ray is one song</b> from the genre. The highlighted ray is the most popular {name} track in our sample (popularity {hPop}).</> },
      { id: 'length', label: 'Ray length', means: 'energy',
        text: <>Longer rays are more <b>energetic</b> songs. The inner ring is energy 0, the outer ring is energy 1. The highlighted song reaches {hEnergy.toFixed(2)}; {name} averages {g.energy.toFixed(2)}.</> },
      { id: 'angle', label: 'Ray angle', means: 'tempo',
        text: <>Rays fan out by <b>tempo</b>: slow songs lean left, fast songs lean right. {name} runs from {Math.round(slowest)} to {Math.round(fastest)} BPM; the highlighted song is {Math.round(hTempo)} BPM.</> },
      { id: 'colour', label: 'Tip colour', means: 'happiness',
        text: <>The dot on each tip is coloured by <b>happiness (valence)</b>, blue for sad and gold for happy, the same colours as the rest of the story. {sadTips} of {name}&rsquo;s {tr.length} tips are blue (valence under 0.40). The highlighted song scores {hVal.toFixed(2)}.</> },
      { id: 'size', label: 'Tip size', means: 'popularity',
        text: <>Bigger tips are more <b>popular</b> songs. {name}&rsquo;s average popularity is {g.popularity.toFixed(0)} out of 100.</> },
      { id: 'roots', label: 'Roots', means: 'acousticness',
        text: <>The green roots below show <b>acousticness</b>: more and longer roots mean more acoustic instruments, fewer mean more electronic sound. {name} scores {g.acousticness.toFixed(2)}.</> },
      { id: 'rings', label: 'Ripple rings', means: 'danceability',
        text: <>The rings around the centre show <b>danceability</b>: more rings, more danceable. {name} scores {g.danceability.toFixed(2)}, so it gets {1 + Math.round(g.danceability * 5)} rings (up to 6).</> },
      { id: 'wave', label: 'Dashed wave', means: 'most similar genre',
        text: <>Pick any genre and the panel on the right links it with a <b>dashed wave</b> to the genre it sounds most like. {name}&rsquo;s closest match is <b>{prettyGenre(g.nearest)}</b>.</> },
    ],
  };
}

function KeyOverlay({ focus }) {
  const { cx, cy, rayMin, rayMax } = burstGeometry(KEY_SIZE);
  if (focus === 'length') {
    return (
      <g className="bkey__guide">
        <circle cx={cx} cy={cy} r={rayMin} />
        <circle cx={cx} cy={cy} r={rayMax} />
        <text x={cx} y={cy - rayMin - 6} textAnchor="middle">energy 0</text>
        <text x={cx} y={cy - rayMax - 6} textAnchor="middle">energy 1</text>
      </g>
    );
  }
  if (focus === 'angle') {
    const r = rayMax + 6;
    const pt = (deg) => [cx + Math.sin((deg * Math.PI) / 180) * r, cy - Math.cos((deg * Math.PI) / 180) * r];
    const [x0, y0] = pt(-64);
    const [x1, y1] = pt(64);
    return (
      <g className="bkey__guide">
        <defs>
          <marker id="bkey-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#fff" /></marker>
        </defs>
        <path d={`M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}`} markerEnd="url(#bkey-arrow)" />
        <text x={x0} y={y0 + 18} textAnchor="middle">slow</text>
        <text x={x1} y={y1 + 18} textAnchor="middle">fast</text>
      </g>
    );
  }
  return null;
}

function BurstKey({ g }) {
  const [i, setI] = useState(0);
  const { hi, steps } = useMemo(() => keySteps(g), [g]);
  const step = steps[i];
  const showOne = ['one', 'length', 'angle', 'colour'].includes(step.id);
  return (
    <section className="bkey card" aria-labelledby="bkey-title">
      <div className="bkey__glyph">
        <Burst g={g} size={KEY_SIZE} active focus={step.id} hiRay={showOne ? hi : -1} id={prettyGenre(g.genre)}>
          <KeyOverlay focus={step.id} />
        </Burst>
      </div>
      <div className="bkey__text">
        <h3 id="bkey-title">How to read a burst</h3>
        <p className="bkey__sub">One genre, {prettyGenre(g.genre)}, taken apart one layer at a time.</p>
        <ol className="bkey__list">
          {steps.map((s, k) => (
            <li key={s.id}>
              <button type="button" className={k === i ? 'is-on' : ''} aria-pressed={k === i} onClick={() => setI(k)}>
                <span>{s.label}</span><i>{s.means}</i>
              </button>
            </li>
          ))}
        </ol>
        <p className="bkey__explain" aria-live="polite">{step.text}</p>
        <div className="bkey__nav">
          <button type="button" className="pill" disabled={i === 0} onClick={() => setI(i - 1)}>Back</button>
          <span>{i + 1} of {steps.length}</span>
          <button type="button" className="pill" disabled={i === steps.length - 1} onClick={() => setI(i + 1)}>Next</button>
        </div>
      </div>
    </section>
  );
}

export default function GenreBurst({ bursts }) {
  const [selected, setSelected] = useState('pop');
  const byGenre = useMemo(() => new Map((bursts || []).map((b) => [b.genre, b])), [bursts]);
  const gallery = useMemo(() => {
    if (!bursts) return [];
    const list = CURATED.map((g) => byGenre.get(g)).filter(Boolean);
    return list.sort((a, b) => a.energy - b.energy);
  }, [bursts, byGenre]);

  if (!bursts) return <div className="chart-loading">Loading bursts&hellip;</div>;

  const sel = byGenre.get(selected) || gallery[0];
  const near = byGenre.get(sel.nearest);
  const all = [...bursts].sort((a, b) => a.genre.localeCompare(b.genre));

  return (
    <>
    {byGenre.get(EXAMPLE) && <BurstKey g={byGenre.get(EXAMPLE)} />}
    <h3 className="bursts__title">Now compare genres</h3>
    <div className="bursts">
      <div className="bursts__gallery" role="list" aria-label="Genre bursts, calmer genres first">
        {gallery.map((g) => (
          <button key={g.genre} role="listitem" className={`bursts__cell ${g.genre === sel.genre ? 'is-sel' : ''}`} onClick={() => setSelected(g.genre)}
            aria-pressed={g.genre === sel.genre}>
            <Burst g={g} id={prettyGenre(g.genre)} active={g.genre === sel.genre} />
          </button>
        ))}
        <p className="hint bursts__order">Sorted by energy: the calmest genres come first, the loudest last.</p>
      </div>

      <aside className="bursts__detail">
        <div className="bursts__pick">
          <label htmlFor="burst-select">Pick any of the {bursts.length} genres</label>
          <select id="burst-select" className="select" value={sel.genre} onChange={(e) => setSelected(e.target.value)}>
            {all.map((g) => <option key={g.genre} value={g.genre}>{prettyGenre(g.genre)}</option>)}
          </select>
        </div>
        <div className="bursts__big"><Burst g={sel} size={320} active id={prettyGenre(sel.genre)} /></div>
        <ul className="bursts__stats">
          <li><span>Energy</span><b>{sel.energy.toFixed(2)}</b></li>
          <li><span>Happiness</span><b>{sel.valence.toFixed(2)}</b></li>
          <li><span>Danceability</span><b>{sel.danceability.toFixed(2)}</b></li>
          <li><span>Acousticness</span><b>{sel.acousticness.toFixed(2)}</b></li>
          <li><span>Tempo</span><b>{Math.round(sel.tempo)} BPM</b></li>
          <li><span>Avg popularity</span><b>{sel.popularity.toFixed(0)}</b></li>
        </ul>
        {near && (
          <button className="bursts__near" onClick={() => setSelected(near.genre)}>
            <div className="bursts__near-glyphs">
              <div><Burst g={sel} size={120} /></div>
              <svg viewBox="0 0 80 24" className="bursts__wave" aria-hidden="true"><path d="M2 12 Q12 0 22 12 T42 12 T62 12 T78 12" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="4 5" strokeLinecap="round" /></svg>
              <div><Burst g={near} size={120} /></div>
            </div>
            <span>Sounds most like <b>{prettyGenre(near.genre)}</b>. Click to jump there.</span>
          </button>
        )}
      </aside>
    </div>
    </>
  );
}
