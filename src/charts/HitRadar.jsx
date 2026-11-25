import { useMemo, useRef, useState } from 'react';
import { lineRadial, curveLinearClosed } from 'd3-shape';
import { scaleLinear } from 'd3-scale';
import { useSize } from '../lib/hooks.js';
import { DECADE_COLORS, dec2, pct, signed2 } from '../lib/format.js';
import { Tooltip, useTooltip } from '../components/Tooltip.jsx';

export const AXES = [
  { key: 'valence', label: 'Happiness' },
  { key: 'energy', label: 'Energy' },
  { key: 'danceability', label: 'Danceable' },
  { key: 'acousticness', label: 'Acoustic' },
  { key: 'speechiness', label: 'Speech' },
];

/** Per-axis maximum across every decade, so the scale stays put when chips are toggled. */
export const axisMax = (profile) =>
  Object.fromEntries(AXES.map((a) => [a.key, Math.max(...profile.map((p) => p.hits[a.key]))]));

/**
 * Frame 6 / Sketch 7: the average hit of each decade as a polygon.
 * Default "relative" scale (Milestone 8 feedback): each axis is divided by its highest decade,
 * so that decade sits at 100% and the rest show their share of it. The axis still starts at 0
 * (not min-max, which exaggerated small differences in Milestone 6). "Absolute" shows raw 0-1 scores.
 * Chips toggle decades; hover an axis for exact values.
 */
export default function HitRadar({ profile, selected, onToggle }) {
  const wrap = useRef(null);
  const { width } = useSize(wrap);
  const { ref: tipRef, tip, show, hide } = useTooltip();
  const [relative, setRelative] = useState(true);
  const max = useMemo(() => (profile ? axisMax(profile) : null), [profile]);

  const S = Math.max(300, Math.min(width || 480, 520));
  const R = S / 2 - 88; // leave room around the plot for the axis labels
  const cx = S / 2;
  const cy = S / 2;
  const r = useMemo(() => scaleLinear([0, 1], [0, R]), [R]);
  const angle = (i) => (i / AXES.length) * Math.PI * 2;
  const pt = (i, v) => [cx + Math.sin(angle(i)) * r(v), cy - Math.cos(angle(i)) * r(v)];
  const gen = lineRadial().angle((_, i) => angle(i)).radius((d) => r(d)).curve(curveLinearClosed);

  if (!profile) return <div className="chart-loading">Loading profile&hellip;</div>;

  const val = (p, key) => (relative ? p.hits[key] / max[key] : p.hits[key]);
  const chosen = profile.filter((p) => selected.includes(p.label));
  const first = chosen[0];
  const last = chosen[chosen.length - 1];
  const showDelta = chosen.length >= 2;

  return (
    <div ref={tipRef} className="chart" style={{ position: 'relative' }}>
      <div className="chips radar__chips" role="group" aria-label="Decades to compare">
        {profile.map((p) => (
          <button key={p.label} className={`chip ${selected.includes(p.label) ? 'is-on' : ''}`} onClick={() => onToggle(p.label)} aria-pressed={selected.includes(p.label)}>
            <i style={{ background: DECADE_COLORS[p.label] }} />
            {p.label}
          </button>
        ))}
      </div>
      <div className="chips radar__scale" role="group" aria-label="Axis scale">
        <button className={`chip ${relative ? 'is-on' : ''}`} onClick={() => setRelative(true)} aria-pressed={relative}>Relative to max</button>
        <button className={`chip ${!relative ? 'is-on' : ''}`} onClick={() => setRelative(false)} aria-pressed={!relative}>Absolute 0&ndash;1</button>
      </div>

      <div ref={wrap} style={{ width: '100%', maxWidth: 520, margin: '0 auto' }}>
        <svg viewBox={`0 0 ${S} ${S}`} width="100%" role="img"
          aria-label={`Radar chart comparing the average hit of ${selected.join(', ')} on happiness, energy, danceability, acousticness and speechiness, ${relative ? 'each axis shown as a percentage of its highest decade' : 'on a 0 to 1 scale'}`}>
          {/* rings */}
          {[0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <path d={gen(AXES.map(() => t)) } transform={`translate(${cx} ${cy})`} fill="none" className="radar-ring" />
              <text className="axis-text" x={cx + 4} y={cy - r(t) - 3}>{relative ? pct(t) : t}</text>
            </g>
          ))}
          {AXES.map((a, i) => {
            const [ex, ey] = pt(i, 1);
            return <line key={a.key} x1={cx} y1={cy} x2={ex} y2={ey} className="radar-axis" />;
          })}

          {/* decade polygons */}
          {chosen.map((p) => (
            <g key={p.label} className="radar-poly">
              <path d={gen(AXES.map((a) => val(p, a.key)))} transform={`translate(${cx} ${cy})`}
                fill={DECADE_COLORS[p.label]} fillOpacity="0.2" stroke={DECADE_COLORS[p.label]} strokeWidth="3" strokeLinejoin="round" />
              {AXES.map((a, i) => {
                const [px, py] = pt(i, val(p, a.key));
                return <circle key={a.key} cx={px} cy={py} r="5" fill={DECADE_COLORS[p.label]} stroke="#121212" strokeWidth="2" />;
              })}
            </g>
          ))}

          {/* labels (+ change between the first and last selected decade) */}
          {AXES.map((a, i) => {
            const [lx, ly] = pt(i, 1.17);
            const anchor = Math.abs(Math.sin(angle(i))) < 0.2 ? 'middle' : Math.sin(angle(i)) > 0 ? 'start' : 'end';
            const d = showDelta ? val(last, a.key) - val(first, a.key) : null;
            return (
              <g key={a.key}>
                <text className="radar-label" x={lx} y={ly} textAnchor={anchor}>{a.label}</text>
                {d !== null && (
                  <text className="radar-delta" x={lx} y={ly + 17} textAnchor={anchor} fill={d >= 0 ? '#1ed760' : '#509bf5'}>{relative ? `${d >= 0 ? '+' : '\u2212'}${Math.abs(d * 100).toFixed(0)} pts` : signed2(d)}</text>
                )}
              </g>
            );
          })}

          {/* hover sectors */}
          {AXES.map((a, i) => {
            const [ex, ey] = pt(i, 1.05);
            return (
              <line key={a.key} x1={cx} y1={cy} x2={ex} y2={ey} stroke="transparent" strokeWidth="46" style={{ cursor: 'crosshair' }}
                onMouseMove={(e) => show(e, (
                  <>
                    <b>{a.label}</b>{relative && <div className="tooltip__row">100% = {dec2(max[a.key])}</div>}
                    {chosen.map((p) => (
                      <div key={p.label} className="tooltip__row"><i style={{ background: DECADE_COLORS[p.label] }} />{p.label}<span>{dec2(p.hits[a.key])}{relative && ` \u00b7 ${pct(val(p, a.key))}`}</span></div>
                    ))}
                  </>
                ))}
                onMouseLeave={hide} />
            );
          })}
        </svg>
      </div>
      <p className="hint">
        Average hit (popularity 60+) of each decade.{' '}
        {relative
          ? 'Each axis is scaled to its own highest decade (= 100%), so small shifts are easier to see.'
          : 'Raw scores on a true 0\u20131 scale.'}{' '}
        Hover an axis for exact values.
      </p>
      <Tooltip tip={tip} />
    </div>
  );
}
