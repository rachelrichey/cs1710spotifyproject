import { useEffect, useMemo, useRef, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { useSize } from '../lib/hooks.js';
import { COLORS, moodColor, pct } from '../lib/format.js';
import { Tooltip, useTooltip } from '../components/Tooltip.jsx';

const M = { t: 18, r: 18, b: 46, l: 50 };
const Y0 = 1960;
const Y1 = 2022;
const HALF = 2; // each frame shows hits from year-2 .. year+2

const QUADS = [
  { id: 'he', label: 'Happy + energetic', color: COLORS.happy, test: (v, e) => v >= 0.5 && e >= 0.5, pos: 'tr' },
  { id: 'se', label: 'Sad + intense', color: COLORS.intense, test: (v, e) => v < 0.5 && e >= 0.5, pos: 'tl' },
  { id: 'sc', label: 'Sad + calm', color: COLORS.sad, test: (v, e) => v < 0.5 && e < 0.5, pos: 'bl' },
  { id: 'hc', label: 'Happy + calm', color: COLORS.calm, test: (v, e) => v >= 0.5 && e < 0.5, pos: 'br' },
];

/** Group hits by year and precompute centroid + quadrant shares for every five-year window. */
export function buildFrames(hits) {
  if (!hits) return { byYear: {}, frames: {} };
  const by = {};
  hits.forEach((h) => (by[h.year] ||= []).push(h));
  const f = {};
  for (let c = Y0; c <= Y1; c++) {
    let n = 0, sv = 0, se = 0;
    const q = { he: 0, se: 0, sc: 0, hc: 0 };
    for (let k = Math.max(Y0, c - HALF); k <= Math.min(Y1, c + HALF); k++) {
      (by[k] || []).forEach((h) => {
        n += 1; sv += h.valence; se += h.energy;
        QUADS.forEach((qd) => { if (qd.test(h.valence, h.energy)) q[qd.id] += 1; });
      });
    }
    f[c] = { n, valence: sv / n, energy: se / n, share: Object.fromEntries(Object.entries(q).map(([k, v]) => [k, v / n])) };
  }
  return { byYear: by, frames: f };
}

/**
 * Frame 5 / "the happy corner is emptying out".
 * Every dot is a hit (popularity >= 60) from a five-year window around the chosen year.
 * A green marker tracks the average hit and leaves a trail from 1960 to now.
 * Dots are drawn on a canvas (thousands of points), everything else is SVG.
 */
export default function MoodTimeMap({ hits, year, setYear, step }) {
  const wrap = useRef(null);
  const canvas = useRef(null);
  const { width } = useSize(wrap);
  const { ref: tipRef, tip, show, hide } = useTooltip();
  const [playing, setPlaying] = useState(false);

  const W = Math.max(320, width || 680);
  const H = Math.max(340, Math.min(W * 0.8, 540));
  const x = useMemo(() => scaleLinear([0, 1], [M.l, W - M.r]), [W]);
  const y = useMemo(() => scaleLinear([0, 1], [H - M.b, M.t]), [H]);

  // hits grouped by year, plus the centroid + quadrant shares of every window (precomputed once)
  const { byYear, frames } = useMemo(() => buildFrames(hits), [hits]);

  const visible = useMemo(() => {
    const out = [];
    for (let k = Math.max(Y0, year - HALF); k <= Math.min(Y1, year + HALF); k++) out.push(...(byYear[k] || []));
    return out.sort((a, b) => a.popularity - b.popularity);
  }, [byYear, year]);

  // draw the dots
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = W * dpr;
    c.height = H * dpr;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    visible.forEach((h) => {
      ctx.globalAlpha = visible.length > 1500 ? 0.34 : 0.55;
      ctx.fillStyle = moodColor(h.valence);
      ctx.beginPath();
      ctx.arc(x(h.valence), y(h.energy), 1.8 + ((h.popularity - 60) / 40) * 3.2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }, [visible, W, H, x, y]);

  // play button
  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => {
      setYear((v) => {
        if (v >= Y1) { setPlaying(false); return Y1; }
        return v + 1;
      });
    }, 420);
    return () => clearInterval(id);
  }, [playing, setYear]);

  if (!hits) return <div className="chart-loading">Loading hits&hellip;</div>;

  const frame = frames[year];
  const trail = [];
  for (let c = Y0 + 2; c <= year; c += 1) trail.push(frames[c]);
  const trailPath = trail.map((f, i) => `${i ? 'L' : 'M'}${x(f.valence).toFixed(1)} ${y(f.energy).toFixed(1)}`).join('');

  const onMove = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const py = ((e.clientY - box.top) / box.height) * H;
    let best = null, bd = 12;
    for (let i = visible.length - 1; i >= 0; i--) {
      const d = Math.hypot(x(visible[i].valence) - px, y(visible[i].energy) - py);
      if (d < bd) { bd = d; best = visible[i]; }
    }
    if (best) show(e, (
      <>
        <b>{best.name}</b>
        <div>{best.artist}, {best.year}</div>
        <div className="tooltip__sub">valence {best.valence.toFixed(2)}, energy {best.energy.toFixed(2)}</div>
      </>
    ));
    else hide();
  };

  const corner = (pos) => ({
    x: pos.endsWith('r') ? W - M.r - 10 : M.l + 10,
    y: pos.startsWith('t') ? M.t + 58 : H - M.b - 36,
    anchor: pos.endsWith('r') ? 'end' : 'start',
    lab: pos.startsWith('t') ? M.t + 18 : H - M.b - 10,
  });

  return (
    <div ref={tipRef} className="chart" style={{ position: 'relative' }}>
      <div className="timemap__year" aria-live="polite">
        <b>{year}</b>
        <span>hits from {Math.max(Y0, year - HALF)}&ndash;{Math.min(Y1, year + HALF)} &middot; {frame.n.toLocaleString()} songs</span>
      </div>
      <div ref={wrap} style={{ position: 'relative', width: '100%', height: H }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
          <rect x={M.l} y={M.t} width={x(0.5) - M.l} height={y(0.5) - M.t} fill={COLORS.intense} opacity="0.07" />
          <rect x={x(0.5)} y={y(0.5)} width={W - M.r - x(0.5)} height={H - M.b - y(0.5)} fill={COLORS.calm} opacity="0.07" />
          <rect x={x(0.5)} y={M.t} width={W - M.r - x(0.5)} height={y(0.5) - M.t} fill={COLORS.happy} opacity={0.03 + 0.12 * frame.share.he} />
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t} className="axis">
              <line x1={x(t)} x2={x(t)} y1={M.t} y2={H - M.b} className="grid" />
              <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} className="grid" />
              <text x={x(t)} y={H - M.b + 18} textAnchor="middle">{t}</text>
              <text x={M.l - 8} y={y(t) + 4} textAnchor="end">{t}</text>
            </g>
          ))}
          <line x1={x(0.5)} x2={x(0.5)} y1={M.t} y2={H - M.b} className="midline" />
          <line x1={M.l} x2={W - M.r} y1={y(0.5)} y2={y(0.5)} className="midline" />
          <text className="axis-title" x={(M.l + W - M.r) / 2} y={H - 8} textAnchor="middle">Valence: sad to happy</text>
          <text className="axis-title" transform={`translate(12 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle">Energy: calm to intense</text>
        </svg>

        <canvas ref={canvas} style={{ position: 'absolute', inset: 0, width: '100%', height: H }}
          onMouseMove={onMove} onMouseLeave={hide} aria-label={`Scatter of ${visible.length} hit songs near ${year}`} role="img" />

        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden="true">
          {QUADS.map((q) => {
            const c = corner(q.pos);
            return (
              <g key={q.id}>
                <text className="quad-label" x={c.x} y={c.lab} textAnchor={c.anchor} fill={q.color}>{q.label}</text>
                <text className="quad-share" x={c.x} y={c.y} textAnchor={c.anchor} fill={q.color}>{pct(frame.share[q.id])}</text>
              </g>
            );
          })}
          <path d={trailPath} fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="2" strokeDasharray="1 5" strokeLinecap="round" />
          <g className="centroid" style={{ transform: `translate(${x(frame.valence)}px, ${y(frame.energy)}px)` }}>
            <circle r="13" fill="none" stroke={COLORS.calm} strokeWidth="3" />
            <circle r="4" fill={COLORS.calm} />
          </g>
          <text className="callout" x={x(frame.valence) + 18} y={y(frame.energy) - 14} fill="#fff">average hit</text>
        </svg>
      </div>

      <div className="timemap__controls">
        <button className="play-btn play-btn--lg" onClick={() => { if (!playing && year >= Y1) setYear(Y0); setPlaying((p) => !p); }}
          aria-label={playing ? 'Pause' : 'Play through the years'}>
          {playing ? (
            <svg viewBox="0 0 16 16"><path d="M2.7 1a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7H2.7zm8 0a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-2.6z" /></svg>
          ) : (
            <svg viewBox="0 0 16 16"><path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.287V1.713z" /></svg>
          )}
        </button>
        <label className="slider">
          <span className="sr-only">Release year</span>
          <input type="range" min={Y0} max={Y1} value={year} onChange={(e) => { setPlaying(false); setYear(Number(e.target.value)); }} />
          <div className="slider__ticks"><span>{Y0}</span><span>1980</span><span>2000</span><span>{Y1}</span></div>
        </label>
        {step >= 5 && <span className="timemap__nudge">Your turn: drag the slider.</span>}
      </div>
      <p className="hint">Dot size = popularity. Hover a dot to see the song. White dotted line = the path the average hit has taken since 1962.</p>
      <Tooltip tip={tip} />
    </div>
  );
}
