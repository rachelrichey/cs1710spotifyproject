import { useMemo, useRef, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { area, curveMonotoneX, line } from 'd3-shape';
import { useSize } from '../lib/hooks.js';
import { COLORS, pct } from '../lib/format.js';

const M = { t: 30, r: 28, b: 44, l: 52 };
// How far the line has "drawn" at each scroll step.
const REVEAL = [1979, 1999, 2019, 2022, 2022];

const midYear = (d) => (d.label === '2020-22' ? 2021 : d.start + 4.5);

function SongList({ title, color, songs }) {
  return (
    <div className="songlist">
      <h4 style={{ color }}>{title}</h4>
      {songs.length === 0 && <p className="songlist__empty">None in this decade&rsquo;s data.</p>}
      <ul>
        {songs.slice(0, 3).map((s) => (
          <li key={`${s.name}${s.artist}`}>
            <b>{s.name}</b>
            <span>{s.artist} &middot; {s.year}</span>
            <i>{s.valence.toFixed(2)}</i>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Frame 3: share of hits that sound sad (valence < 0.4), by decade.
 * The thin line is a 5-year rolling share; the dots are the decade values.
 * Scroll reveals it decade by decade; hover or tap a decade to meet its songs.
 */
export default function SadShareLine({ data, step = 0 }) {
  const wrap = useRef(null);
  const { width } = useSize(wrap);
  const [hoverLabel, setHoverLabel] = useState(null);
  const [pinned, setPinned] = useState(null);

  const W = Math.max(320, width || 680);
  const H = Math.max(260, Math.min(W * 0.52, 360));
  const x = useMemo(() => scaleLinear([1960, 2022], [M.l, W - M.r]), [W]);
  const y = useMemo(() => scaleLinear([0, 0.6], [H - M.b, M.t]), [H]);

  const paths = useMemo(() => {
    if (!data) return null;
    const pts = data.annual5yr;
    return {
      line: line().x((d) => x(d.year)).y((d) => y(d.sadShare)).curve(curveMonotoneX)(pts),
      area: area().x((d) => x(d.year)).y0(H - M.b).y1((d) => y(d.sadShare)).curve(curveMonotoneX)(pts),
    };
  }, [data, x, y, H]);

  if (!data) return <div className="chart-loading">Loading hits&hellip;</div>;

  const reveal = REVEAL[Math.min(step, REVEAL.length - 1)];
  const decades = data.decades;
  const lastVisible = [...decades].reverse().find((d) => midYear(d) <= reveal) || decades[0];
  const focus = decades.find((d) => d.label === (hoverLabel || pinned)) || lastVisible;

  return (
    <div className="chart">
      <div ref={wrap}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
          aria-label="Line chart: the share of hit songs that sound sad rises from 18 percent in the 1960s to 45 percent in the 2010s">
          <defs>
            <linearGradient id="sad-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={COLORS.sad} stopOpacity="0.45" />
              <stop offset="1" stopColor={COLORS.sad} stopOpacity="0" />
            </linearGradient>
            <clipPath id="sad-clip">
              <rect x={M.l - 4} y="0" height={H} width={Math.max(0, x(reveal) - M.l + 8)} style={{ transition: 'width 1.1s cubic-bezier(.3,.7,.2,1)' }} />
            </clipPath>
          </defs>

          {[0, 0.2, 0.4, 0.6].map((t) => (
            <g key={t} className="axis">
              <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} className="grid" />
              <text x={M.l - 10} y={y(t) + 4} textAnchor="end">{pct(t)}</text>
            </g>
          ))}
          {[1960, 1970, 1980, 1990, 2000, 2010, 2020].map((t) => (
            <text key={t} className="axis-text" x={x(t)} y={H - M.b + 22} textAnchor="middle">{t}s</text>
          ))}
          <text className="axis-title" x={M.l} y={14}>Share of hits that sound sad</text>

          {/* decade hover bands */}
          {decades.map((d) => (
            <rect
              key={d.label}
              x={x(d.start - 0.5)} width={x(d.end + 0.5) - x(d.start - 0.5)} y={M.t} height={H - M.b - M.t}
              fill={focus.label === d.label && midYear(d) <= reveal ? 'rgba(255,255,255,.05)' : 'transparent'}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoverLabel(d.label)} onMouseLeave={() => setHoverLabel(null)} onClick={() => setPinned(d.label)}
            />
          ))}

          <g clipPath="url(#sad-clip)" style={{ pointerEvents: 'none' }}>
            <path d={paths.area} fill="url(#sad-fill)" />
            <path d={paths.line} fill="none" stroke={COLORS.sad} strokeWidth="2" opacity="0.55" />
          </g>

          {/* streaming era marker */}
          <g style={{ opacity: step >= 3 ? 1 : 0, transition: 'opacity .7s ease .4s', pointerEvents: 'none' }}>
            <line x1={x(2015)} x2={x(2015)} y1={M.t - 4} y2={H - M.b} stroke="#fff" strokeDasharray="4 5" opacity="0.7" />
            <text className="callout" x={x(2015) - 8} y={M.t + 6} textAnchor="end" fill="#fff">Streaming era, 2015</text>
          </g>

          {/* decade dots */}
          {decades.map((d) => {
            const vis = midYear(d) <= reveal;
            const on = focus.label === d.label;
            return (
              <g key={d.label} transform={`translate(${x(midYear(d))} ${y(d.sadShare)})`}
                style={{ opacity: vis ? 1 : 0, transition: 'opacity .5s ease .35s', pointerEvents: 'none' }}>
                <circle r={on ? 9 : 6.5} fill={on ? '#fff' : COLORS.sad} stroke="#121212" strokeWidth="3" style={{ transition: 'r .15s' }} />
                <text className="value-label" y="-16" textAnchor="middle">{pct(d.sadShare)}</text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="decade-panel">
        <div className="decade-panel__head">
          <h3>The {focus.label}</h3>
          <p>
            <b>{pct(focus.sadShare)}</b> of {focus.nHits.toLocaleString()} hits sound sad
            <span> &middot; average valence {focus.valence.toFixed(2)}</span>
          </p>
        </div>
        <div className="decade-panel__lists">
          <SongList title="Sad hits" color={COLORS.sad} songs={focus.exampleSad} />
          <SongList title="Happy hits" color={COLORS.happy} songs={focus.exampleHappy} />
        </div>
        <p className="hint">Hover or tap a decade to see its songs.</p>
      </div>
    </div>
  );
}
