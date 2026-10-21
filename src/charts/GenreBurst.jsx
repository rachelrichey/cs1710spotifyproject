import { useMemo, useState } from 'react';
import { moodColor, prettyGenre } from '../lib/format.js';

/* ==========================================================================
   NOVEL VIEW (V1): the "genre burst" (sketch 11, Bahar).
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

export function Burst({ g, size = 200, active = false, id = '' }) {
  const cx = size / 2;
  const cy = size * 0.62;
  const rayMin = size * 0.1;
  const rayMax = size * 0.5;
  const rings = 1 + Math.round(g.danceability * 5);
  const roots = 3 + Math.round(g.acousticness * 8);
  const rootLen = size * (0.05 + 0.3 * g.acousticness);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" className={`burst ${active ? 'is-active' : ''}`} role="img"
      aria-label={`${prettyGenre(g.genre)}: energy ${g.energy.toFixed(2)}, valence ${g.valence.toFixed(2)}, danceability ${g.danceability.toFixed(2)}, acousticness ${g.acousticness.toFixed(2)}`}>
      <g className="burst__ripples">
        {Array.from({ length: rings }, (_, k) => (
          <path key={k} d={wavyRing(cx, cy, 12 + k * (size * 0.045), k * 1.7)} fill="none" stroke="#fff" strokeOpacity={0.36 - k * 0.04} strokeWidth="1.2"
            style={{ animationDelay: `${k * -0.5}s` }} />
        ))}
      </g>
      <g className="burst__roots">
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
            <g key={i} className="burst__ray" style={{ animationDelay: `${i * 14}ms` }}>
              <line x1={cx} y1={cy} x2={x2} y2={y2} stroke={col} strokeOpacity="0.55" strokeWidth="1.3" />
              <circle cx={x2} cy={y2} r={1.4 + (pop / 100) * 3.6} fill={col} />
            </g>
          );
        })}
      </g>
      <circle cx={cx} cy={cy} r="3.5" fill="#fff" />
      {id && <text x={cx} y={size - 6} className="burst__name" textAnchor="middle">{id}</text>}
    </svg>
  );
}

function Legend() {
  const rows = [
    ['Ray length', 'energy'],
    ['Ray angle', 'tempo, slow to fast'],
    ['Tip colour', 'valence, blue sad, gold happy'],
    ['Tip size', 'popularity'],
    ['Roots below', 'acousticness'],
    ['Ripple rings', 'danceability'],
    ['Dashed wave', 'most similar genre'],
  ];
  return (
    <dl className="burst-legend">
      {rows.map(([a, b]) => (
        <div key={a}><dt>{a}</dt><dd>{b}</dd></div>
      ))}
    </dl>
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
    <Legend />
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
