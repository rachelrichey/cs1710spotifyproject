import { useMemo, useState } from 'react';
import { moodColor, prettyGenre } from '../lib/format.js';
import Scrolly from '../components/Scrolly.jsx';

/* ==========================================================================
   NOVEL VIEW (V3: boxed legend on folk, most-contrasting pair): the "genre burst" (sketch 11, Bahar).
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
const LAYER_OF = { all: null, one: 'rays', length: 'rays', angle: 'rays', colour: 'tips', size: 'tips', roots: 'roots', rings: 'ripples', wave: 'none' };

export function burstGeometry(size) {
  return { cx: size / 2, cy: size * 0.62, rayMin: size * 0.1, rayMax: size * 0.5 };
}

/** Where a track's ray ends, in a burst of the given size (shared with the annotated legend). */
export function rayEnd([tempo, energy], size) {
  const { cx, cy, rayMin, rayMax } = burstGeometry(size);
  const t = clamp01((tempo - TEMPO[0]) / (TEMPO[1] - TEMPO[0]));
  const a = (-64 + t * 128) * (Math.PI / 180);
  const len = rayMin + energy * (rayMax - rayMin);
  return [cx + Math.sin(a) * len, cy - Math.cos(a) * len];
}

export function Burst({ g, size = 200, active = false, id = '', focus = null, hiRay = -1, children = null, frame = null, zoom = false }) {
  const layer = focus ? LAYER_OF[focus] ?? null : null;
  const dim = (name) => (layer && layer !== name ? ' is-dim' : '');
  const { cx, cy } = burstGeometry(size);
  const rings = 1 + Math.round(g.danceability * 5);
  const roots = 3 + Math.round(g.acousticness * 8);
  const rootLen = size * (0.05 + 0.3 * g.acousticness);

  return (
    <svg viewBox={zoom ? `${size * 0.04} ${size * 0.09} ${size * 0.92} ${size * 0.91}` : `0 0 ${size} ${size}`} {...(frame ? { x: frame.x, y: frame.y, width: size, height: size } : { width: '100%' })}
      className={`burst ${active ? 'is-active' : ''}`} role="img"
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
          const [x2, y2] = rayEnd([tempo, energy], size);
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
const EXAMPLE = 'folk';
const KEY_SIZE = 300;

/* ---------------------------------------------------------------------------
   LEGEND (V3, after Milestone 10 feedback). A boxed, clearly titled legend that
   uses one example genre, folk, and labels every part of its burst at once.
   The step buttons below the chart highlight one layer at a time on the same
   chart, with folk's own numbers.
   --------------------------------------------------------------------------- */
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
    name,
    steps: [
      { id: 'all', label: 'Everything', means: 'at once',
        text: <>This is one {name} burst with every part labelled. Each label says what that part shows and gives {name}&rsquo;s own value. Keep scrolling to see each part on its own.</> },
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
        text: <>In the comparison panel further down, a <b>dashed wave</b> links the genre you pick to the genre it sounds most like. {name}&rsquo;s closest match is <b>{prettyGenre(g.nearest)}</b>.</> },
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

/* The annotated chart: the folk burst in the middle, a label with a leader line
   for every encoding around it, and small scales for colour, size and the wave. */
const W = 760;
const FX = 230; // where the burst sits inside the chart
const FY = 8;
const LABEL_GAP = 60;

function spread(list) {
  // keep labels near their anchor's height without overlapping
  const out = [...list].sort((a, b) => a.anchor[1] - b.anchor[1]);
  let prev = -Infinity;
  for (const c of out) {
    c.ly = Math.max(c.anchor[1], prev + LABEL_GAP, 34);
    prev = c.ly;
  }
  const over = prev - 300;
  if (over > 0) out.forEach((c) => { c.ly -= over; });
  return out;
}

function BurstDiagram({ g, focus, hi, name }) {
  const S = KEY_SIZE;
  const { cx, cy } = burstGeometry(S);
  const tr = g.tracks;
  // pick each labelled ray from the side its label sits on, so leader lines don't cross the burst
  const side = (i) => rayEnd(tr[i], S)[0] < cx;
  const idx = (f, keep = () => true) => {
    const ok = tr.map((_, i) => i).filter(keep);
    const list = ok.length ? ok : tr.map((_, i) => i);
    return list.reduce((b, i) => (f(tr[i]) < f(tr[b]) ? i : b), list[0]);
  };
  const at = (i) => { const [x, y] = rayEnd(tr[i], S); return [FX + x, FY + y]; };
  const longest = idx((t) => -t[1], (i) => !side(i));
  const slowest = idx((t) => t[0]);
  const fastest = idx((t) => -t[0]);
  const saddest = idx((t) => t[2], side);
  const biggest = idx((t) => -t[3], (i) => !side(i));
  const topRight = idx((t) => rayEnd(t, S)[1], (i) => !side(i) && i !== biggest && i !== longest);
  const [lx, ly] = rayEnd(tr[longest], S);
  const rootLen = S * (0.05 + 0.3 * g.acousticness);
  const rings = 1 + Math.round(g.danceability * 5);
  const blue = tr.filter((t) => t[2] < 0.4).length;

  const left = spread([
    { id: 'colour', anchor: at(saddest), title: 'Tip colour = happiness', sub: `${blue} of ${tr.length} folk tips are blue (sad)` },
    { id: 'angle', anchor: at(slowest), title: 'Leans left = slow tempo', sub: `slowest folk song: ${Math.round(tr[slowest][0])} BPM` },
    { id: 'rings', anchor: [FX + cx - 12 - S * 0.045, FY + cy], title: 'Ripple rings = danceability', sub: `folk ${g.danceability.toFixed(2)} → ${rings} of 6 rings` },
    { id: 'roots', anchor: [FX + cx - 6, FY + cy + rootLen * 0.55], title: 'Green roots = acousticness', sub: `folk ${g.acousticness.toFixed(2)}: more roots, more acoustic` },
  ]);
  const right = spread([
    { id: 'one', anchor: at(topRight), title: 'One ray = one song', sub: `${tr.length} folk songs, one ray each` },
    { id: 'length', anchor: [FX + (cx + lx) / 2, FY + (cy + ly) / 2], title: 'Ray length = energy', sub: `folk averages ${g.energy.toFixed(2)} (0 to 1)` },
    { id: 'size', anchor: at(biggest), title: 'Tip size = popularity', sub: `this tip: popularity ${tr[biggest][3]}` },
    { id: 'angle', anchor: at(fastest), title: 'Leans right = fast tempo', sub: `fastest folk song: ${Math.round(tr[fastest][0])} BPM` },
  ]);
  const on = (id) => focus === 'all' || focus === id;
  const cls = (id) => `bdia__note${on(id) ? '' : ' is-dim'}${focus === id ? ' is-focus' : ''}`;

  const note = (c, side) => {
    const tx = side === 'L' ? FX - 18 : FX + S + 18;
    const ex = side === 'L' ? FX - 8 : FX + S + 8;
    return (
      <g key={`${c.id}-${side}-${c.title}`} className={cls(c.id)}>
        <path d={`M${tx + (side === 'L' ? 4 : -4)} ${c.ly - 5} L${ex} ${c.ly - 5} L${c.anchor[0]} ${c.anchor[1]}`} className="bdia__leader" />
        <circle cx={c.anchor[0]} cy={c.anchor[1]} r="3.2" className="bdia__dot" />
        <text x={tx} y={c.ly - 9} textAnchor={side === 'L' ? 'end' : 'start'} className="bdia__title">{c.title}</text>
        <text x={tx} y={c.ly + 8} textAnchor={side === 'L' ? 'end' : 'start'} className="bdia__sub">{c.sub}</text>
      </g>
    );
  };

  const yS = 340; // scales strip
  return (
    <svg viewBox={`0 16 ${W} 384`} width="100%" className="bdia" role="img"
      aria-label={`Annotated ${name} burst: ray = one song, ray length = energy, angle = tempo, tip colour = happiness, tip size = popularity, roots = acousticness, rings = danceability`}>
      <Burst g={g} size={S} active focus={focus} hiRay={['one', 'length', 'angle', 'colour', 'size'].includes(focus) ? hi : -1}
        id={name} frame={{ x: FX, y: FY }}>
        <KeyOverlay focus={focus} />
      </Burst>
      {left.map((c) => note(c, 'L'))}
      {right.map((c) => note(c, 'R'))}

      <line x1="20" x2={W - 20} y1={yS - 26} y2={yS - 26} className="bdia__rule" />
      <g className={cls('colour')}>
        <text x="20" y={yS} className="bdia__title">Tip colour</text>
        {BINS.map((b, i) => <circle key={b} cx={30 + i * 34} cy={yS + 22} r="8" fill={moodColor(b)} />)}
        <text x="22" y={yS + 50} className="bdia__sub">sad</text>
        <text x={30 + 4 * 34 + 8} y={yS + 50} textAnchor="end" className="bdia__sub">happy</text>
      </g>
      <g className={cls('size')}>
        <text x="250" y={yS} className="bdia__title">Tip size</text>
        {[0, 50, 100].map((p, i) => <circle key={p} cx={262 + i * 44} cy={yS + 22} r={(1.4 + (p / 100) * 3.6) * 1.6} fill="#fff" />)}
        <text x="252" y={yS + 50} className="bdia__sub">less popular</text>
        <text x={262 + 88 + 10} y={yS + 50} textAnchor="end" className="bdia__sub">more</text>
      </g>
      <g className={cls('wave')}>
        <text x="460" y={yS} className="bdia__title">Dashed wave = most similar genre</text>
        <path d={`M462 ${yS + 22} q10 -12 20 0 t20 0 t20 0 t20 0`} fill="none" stroke="var(--green)" strokeWidth="3.5" strokeDasharray="7 6" strokeLinecap="round" />
        <text x="548" y={yS + 27} className="bdia__sub">{name} sounds most like {prettyGenre(g.nearest).replace(/\b\w/g, (c) => c.toUpperCase())}</text>
        <text x="462" y={yS + 50} className="bdia__sub">shown in the comparison panel below</text>
      </g>
    </svg>
  );
}

function BurstKey({ g }) {
  const { hi, name, steps } = useMemo(() => keySteps(g), [g]);
  // Scrollytelling: the annotated chart stays pinned while these cards scroll past;
  // whichever card reaches the middle of the screen highlights its part of the chart.
  const cards = steps.map((s, k) => (
    <div className="bkey__card">
      <span className="bkey__num">{k + 1} of {steps.length}</span>
      <h4>{s.label} <i>= {s.means}</i></h4>
      <p>{s.text}</p>
    </div>
  ));
  return (
    <section className="bkey" aria-labelledby="bkey-title">
      <span className="bkey__tag">Legend</span>
      <h3 id="bkey-title">Legend: how to read a burst</h3>
      <p className="bkey__sub">Our example is <b>{name}</b>. Every burst in this chapter is built the same way. Scroll to walk through it one part at a time.</p>
      <Scrolly steps={cards} side="right">
        {(i) => (
          <div className="bkey__visual">
            <div className="bdia__scroll"><BurstDiagram g={g} focus={steps[i].id} hi={hi} name={name} /></div>
            <p className="hint bkey__now">Showing: <b>{steps[i].label}</b> = {steps[i].means}</p>
          </div>
        )}
      </Scrolly>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   The two most different genres in the gallery, computed from the data:
   largest distance on energy, happiness, danceability, acousticness and tempo
   (tempo rescaled to 0-1 over 60-200 BPM so it counts the same as the others).
   --------------------------------------------------------------------------- */
const FEATURES = [
  { key: 'energy', label: 'Energy', part: 'ray length', fmt: (v) => v.toFixed(2), unit: (v) => v },
  { key: 'valence', label: 'Happiness', part: 'tip colour', fmt: (v) => v.toFixed(2), unit: (v) => v },
  { key: 'danceability', label: 'Danceability', part: 'ripple rings', fmt: (v) => v.toFixed(2), unit: (v) => v },
  { key: 'acousticness', label: 'Acousticness', part: 'roots', fmt: (v) => v.toFixed(2), unit: (v) => v },
  { key: 'tempo', label: 'Tempo', part: 'ray angle', fmt: (v) => `${Math.round(v)} BPM`, unit: (v) => clamp01((v - TEMPO[0]) / (TEMPO[1] - TEMPO[0])) },
];

export function mostContrasting(pool) {
  let best = null;
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const d = Math.hypot(...FEATURES.map((f) => f.unit(pool[i][f.key]) - f.unit(pool[j][f.key])));
      if (!best || d > best.d) best = { a: pool[i], b: pool[j], d };
    }
  }
  if (!best) return null;
  // calmer genre on the left
  return best.a.energy <= best.b.energy ? best : { a: best.b, b: best.a, d: best.d };
}

function ContrastPair({ pool }) {
  const pair = useMemo(() => mostContrasting(pool), [pool]);
  if (!pair) return null;
  const { a, b } = pair;
  const title = (g) => prettyGenre(g.genre).replace(/\b\w/g, (c) => c.toUpperCase());
  const A = title(a);
  const B = title(b);
  const blue = (g) => g.tracks.filter((t) => t[2] < 0.4).length;
  const rings = (g) => 1 + Math.round(g.danceability * 5);
  return (
    <section className="contrast card" aria-labelledby="contrast-title">
      <h3 id="contrast-title">The two most different genres: {A} vs. {B}</h3>
      <p className="contrast__lead">
        Of the {pool.length} genres in the gallery, these two are furthest apart on energy, happiness, danceability,
        acousticness and tempo. Side by side, you can see every part of the burst change.
      </p>
      <div className="contrast__grid">
        <figure className="contrast__glyph"><Burst g={a} size={260} active id={A} zoom /></figure>
        <div className="contrast__rows" role="table" aria-label={`${A} compared with ${B}`}>
          <div className="contrast__row contrast__row--head" role="row">
            <span role="columnheader">{A}</span><span role="columnheader">Score (part of burst)</span><span role="columnheader">{B}</span>
          </div>
          {FEATURES.map((f) => (
            <div key={f.key} className="contrast__row" role="row">
              <span role="cell" className="contrast__val is-a">
                <i style={{ width: `${f.unit(a[f.key]) * 100}%` }} /> <b>{f.fmt(a[f.key])}</b>
              </span>
              <span role="cell" className="contrast__label">{f.label}<em>{f.part}</em></span>
              <span role="cell" className="contrast__val is-b">
                <b>{f.fmt(b[f.key])}</b> <i style={{ width: `${f.unit(b[f.key]) * 100}%` }} />
              </span>
            </div>
          ))}
        </div>
        <figure className="contrast__glyph"><Burst g={b} size={260} active id={B} zoom /></figure>
      </div>
      <ul className="contrast__look">
        <li><b>Ray length:</b> {A}&rsquo;s rays are shorter (energy {a.energy.toFixed(2)}) and {B}&rsquo;s reach further toward the edge ({b.energy.toFixed(2)}).</li>
        <li><b>Roots:</b> {a.acousticness >= b.acousticness ? A : B} has more and longer green roots (acousticness {Math.max(a.acousticness, b.acousticness).toFixed(2)} vs. {Math.min(a.acousticness, b.acousticness).toFixed(2)}).</li>
        <li><b>Rings:</b> {rings(a) === rings(b)
          ? <>both get {rings(a)} ripple rings (danceability {a.danceability.toFixed(2)} vs. {b.danceability.toFixed(2)}). How danceable they are is one of the few things these two share.</>
          : <>{A} gets {rings(a)} ripple rings and {B} gets {rings(b)} (danceability {a.danceability.toFixed(2)} vs. {b.danceability.toFixed(2)}).</>}</li>
        <li><b>Tip colour:</b> {blue(a)} of {A}&rsquo;s {a.tracks.length} tips are blue, against {blue(b)} of {B}&rsquo;s {b.tracks.length}.</li>
      </ul>
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
    <ContrastPair pool={gallery} />
    <h3 className="bursts__title">Now compare all genres</h3>
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
            <span className="bursts__near-head">{prettyGenre(sel.genre).replace(/\b\w/g, (c) => c.toUpperCase())} sounds most like <b>{prettyGenre(near.genre)}</b></span>
            <div className="bursts__near-glyphs">
              <div><Burst g={sel} size={200} id={prettyGenre(sel.genre)} zoom /></div>
              <svg viewBox="0 0 80 24" className="bursts__wave" aria-hidden="true"><path d="M3 12 Q12 1 21 12 T39 12 T57 12 T77 12" fill="none" stroke="var(--green)" strokeWidth="3.5" strokeDasharray="7 6" strokeLinecap="round" /></svg>
              <div><Burst g={near} size={200} id={prettyGenre(near.genre)} zoom /></div>
            </div>
            <span>Click to jump to {prettyGenre(near.genre).replace(/\b\w/g, (c) => c.toUpperCase())}.</span>
          </button>
        )}
      </aside>
    </div>
    </>
  );
}
