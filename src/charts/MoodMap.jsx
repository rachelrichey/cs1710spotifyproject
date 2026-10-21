import { useMemo, useRef, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { Delaunay } from 'd3-delaunay';
import { useSize } from '../lib/hooks.js';
import { COLORS, moodColor, pct, prettyGenre } from '../lib/format.js';
import { Tooltip, useTooltip } from '../components/Tooltip.jsx';

const M = { t: 24, r: 20, b: 54, l: 58 };

/** "Happiest + calmest" and "saddest + most intense" genres: rank by z(valence) - z(energy). */
export function moodExtremes(genres, k = 4) {
  if (!genres) return { calm: new Set(), intense: new Set() };
  const mean = (key) => genres.reduce((s, g) => s + g[key], 0) / genres.length;
  const sd = (key) => Math.sqrt(genres.reduce((s, g) => s + (g[key] - mean(key)) ** 2, 0) / genres.length);
  const mv = mean('valence'), me = mean('energy'), sv = sd('valence'), se = sd('energy');
  const ranked = genres
    .map((g) => ({ g: g.genre, s: (g.valence - mv) / sv - (g.energy - me) / se }))
    .sort((a, b) => b.s - a.s);
  return { calm: new Set(ranked.slice(0, k).map((d) => d.g)), intense: new Set(ranked.slice(-k).map((d) => d.g)) };
}

/** Place labels so they overlap neither each other nor any other highlighted dot. */
function layoutLabels(items, x, y, W) {
  const dots = items.map((g) => ({ g, px: x(g.valence), py: y(g.energy) }));
  const sorted = [...dots].sort((a, b) => a.py - b.py);
  const placed = [];
  const out = {};
  sorted.forEach((it) => {
    const right = it.px < W - 160;
    const lx = right ? it.px + 12 : it.px - 12;
    const w = it.g.genre.length * 7.6 + 10;
    const x0 = right ? lx : lx - w;
    const x1 = x0 + w;
    let ly = it.py + 4;
    for (let k = 0; k < 10; k += 1) {
      const top = ly - 13;
      const bot = ly + 5;
      const hitLabel = placed.some((p) => x0 < p.x1 && x1 > p.x0 && top < p.bot && bot > p.top);
      const hitDot = dots.some((d) => d !== it && d.px + 11 > x0 && d.px - 11 < x1 && d.py + 11 > top && d.py - 11 < bot);
      if (!hitLabel && !hitDot) break;
      ly += 15;
    }
    placed.push({ x0, x1, top: ly - 13, bot: ly + 5 });
    out[it.g.genre] = { lx, ly, px: it.px, py: it.py, anchor: right ? 'start' : 'end' };
  });
  return out;
}

/**
 * Frame 2 / Sketch 10: one dot per genre, x = valence (sad -> happy), y = energy (calm -> intense).
 *   step 0  empty axes + the four moods
 *   step 1  all 114 genres appear
 *   step 2  highlight the happiest-and-calmest vs the saddest-and-most-intense genres
 *   step 3  preview the question: where do the *hits* of 1960s and 2020-22 sit?
 */
export default function MoodMap({ genres, profile, step = 1 }) {
  const wrap = useRef(null);
  const { width } = useSize(wrap);
  const { ref: tipRef, tip, show, hide } = useTooltip();
  const [hover, setHover] = useState(null);

  const W = Math.max(320, width || 680);
  const H = Math.max(380, Math.min(W * 0.92, 620));
  const x = useMemo(() => scaleLinear([0, 1], [M.l, W - M.r]), [W]);
  const y = useMemo(() => scaleLinear([0, 1], [H - M.b, M.t]), [H]);

  const { calm, intense } = useMemo(() => moodExtremes(genres), [genres]);

  const labelled = useMemo(
    () => (genres && step === 2 ? layoutLabels(genres.filter((g) => calm.has(g.genre) || intense.has(g.genre)), x, y, W) : {}),
    [genres, step, calm, intense, x, y, W],
  );

  const del = useMemo(
    () => (genres ? Delaunay.from(genres, (g) => x(g.valence), (g) => y(g.energy)) : null),
    [genres, x, y],
  );

  if (!genres) return <div className="chart-loading">Loading genres&hellip;</div>;

  const onMove = (e) => {
    if (step < 1) return;
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const py = ((e.clientY - box.top) / box.height) * H;
    const i = del.find(px, py);
    const g = genres[i];
    if (Math.hypot(x(g.valence) - px, y(g.energy) - py) < 18) {
      setHover(g.genre);
      show(
        e,
        <>
          <b>{prettyGenre(g.genre)}</b>
          <div>valence {g.valence.toFixed(2)}, energy {g.energy.toFixed(2)}</div>
          <div className="tooltip__sub">{pct(g.hitRate)} of its tracks are hits</div>
        </>,
      );
    } else {
      setHover(null);
      hide();
    }
  };

  const xm = x(0.5);
  const ym = y(0.5);
  const first = profile?.[0]?.hits;
  const last = profile?.[profile.length - 1]?.hits;

  return (
    <div ref={tipRef} className="chart" style={{ position: 'relative' }}>
      <div ref={wrap} style={{ width: '100%' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          role="img"
          aria-label="Scatter plot of 114 music genres by average valence (sad to happy) and energy (calm to intense)"
          onMouseMove={onMove}
          onMouseLeave={() => { setHover(null); hide(); }}
        >
          {/* quadrant tints, same hues as sketch 10 */}
          <rect x={M.l} y={M.t} width={xm - M.l} height={ym - M.t} fill={COLORS.intense} opacity="0.08" />
          <rect x={xm} y={ym} width={W - M.r - xm} height={H - M.b - ym} fill={COLORS.calm} opacity="0.08" />
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t} className="axis">
              <line x1={x(t)} x2={x(t)} y1={M.t} y2={H - M.b} className="grid" />
              <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} className="grid" />
              <text x={x(t)} y={H - M.b + 20} textAnchor="middle">{t}</text>
              <text x={M.l - 10} y={y(t) + 4} textAnchor="end">{t}</text>
            </g>
          ))}
          <line x1={xm} x2={xm} y1={M.t} y2={H - M.b} className="midline" />
          <line x1={M.l} x2={W - M.r} y1={ym} y2={ym} className="midline" />
          <text className="axis-title" x={(M.l + W - M.r) / 2} y={H - 10} textAnchor="middle">Valence: sad to happy</text>
          <text className="axis-title" transform={`translate(14 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle">Energy: calm to intense</text>

          {/* mood names */}
          <g className="mood-names">
            <text x={M.l + 10} y={M.t + 20} fill={COLORS.intense}>Intense + sad</text>
            <text x={W - M.r - 10} y={M.t + 20} textAnchor="end" fill={COLORS.happy}>Intense + happy</text>
            <text x={M.l + 10} y={H - M.b - 12} fill={COLORS.sad}>Calm + sad</text>
            <text x={W - M.r - 10} y={H - M.b - 12} textAnchor="end" fill={COLORS.calm}>Calm + happy</text>
          </g>

          {/* genres */}
          {genres.map((g, i) => {
            const focus = step === 2 && (calm.has(g.genre) || intense.has(g.genre));
            let op = 0.95; // step 1
            if (step < 1) op = 0;
            else if (step === 2) op = focus ? 1 : 0.16;
            else if (step >= 3) op = 0.4;
            return (
              <g key={g.genre} transform={`translate(${x(g.valence)} ${y(g.energy)})`}>
                <circle
                  r={focus ? 8 : hover === g.genre ? 8 : 5.5}
                  fill={moodColor(g.valence)}
                  stroke={focus ? (calm.has(g.genre) ? COLORS.calm : COLORS.intense) : hover === g.genre ? '#fff' : 'none'}
                  strokeWidth="2.5"
                  style={{ opacity: op, transition: `opacity .6s ease ${step === 1 ? i * 6 : 0}ms, r .2s` }}
                />
                {hover === g.genre && !labelled[g.genre] && (
                  <text className="dot-label" x={g.valence > 0.6 ? -12 : 12} y="4" textAnchor={g.valence > 0.6 ? 'end' : 'start'}>
                    {prettyGenre(g.genre)}
                  </text>
                )}
              </g>
            );
          })}

          {/* highlighted labels, nudged apart, with a leader line when displaced */}
          {Object.entries(labelled).map(([name, l]) => (
            <g key={name} className="dot-label-group">
              {Math.abs(l.ly - 4 - l.py) > 6 && <line x1={l.px} y1={l.py} x2={l.lx} y2={l.ly - 4} stroke="#fff" strokeOpacity="0.4" />}
              <text className="dot-label" x={l.lx} y={l.ly} textAnchor={l.anchor}>{prettyGenre(name)}</text>
            </g>
          ))}

          {/* step 3: teaser, where do hits live? */}
          {first && last && (
            <g style={{ opacity: step >= 3 ? 1 : 0, transition: 'opacity .8s ease .2s' }}>
              <defs>
                <marker id="mm-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0 0L10 5L0 10z" fill="#fff" />
                </marker>
              </defs>
              <line x1={x(first.valence)} y1={y(first.energy)} x2={x(last.valence) + 6} y2={y(last.energy) - 3} stroke="#fff" strokeWidth="2.5" strokeDasharray="1 7" strokeLinecap="round" markerEnd="url(#mm-arrow)" />
              <circle cx={x(first.valence)} cy={y(first.energy)} r="10" fill="none" stroke={COLORS.happy} strokeWidth="3" />
              <circle cx={x(last.valence)} cy={y(last.energy)} r="10" fill="none" stroke={COLORS.calm} strokeWidth="3" />
              <text className="callout" x={x(first.valence)} y={y(first.energy) + 28} textAnchor="middle" fill={COLORS.happy}>average 1960s hit</text>
              <text className="callout" x={x(last.valence)} y={y(last.energy) - 20} textAnchor="middle" fill={COLORS.calm}>average 2020&ndash;22 hit</text>
            </g>
          )}
        </svg>
      </div>
      <Tooltip tip={tip} />
    </div>
  );
}
