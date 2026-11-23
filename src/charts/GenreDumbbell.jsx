import { useMemo, useRef, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { useSize } from '../lib/hooks.js';
import { CHANGE_COLORS as C, prettyGenre } from '../lib/format.js';
import { Tooltip, useTooltip } from '../components/Tooltip.jsx';

const ROW = 30;
const MODES = [
  { id: 'drops', label: 'Biggest drops' },
  { id: 'rises', label: 'Got happier' },
  { id: 'all', label: 'All genres' },
];

/** Signed change with a true minus sign, always the same number of decimals (2 in the chart, 3 in tooltips). */
export function signedChange(d, digits = 2) {
  return `${d < 0 ? '−' : '+'}${Math.abs(d).toFixed(digits)}`;
}

/** Endpoint marks, shared by the chart and its legend. Shape = period; arrow colour = direction. */
function StartMark({ cx, cy, r = 6 }) {
  return <circle cx={cx} cy={cy} r={r} fill="#1f1f1f" stroke={C.start} strokeWidth="2" />;
}
function EndMark({ tip, cy, dir, col, size = 14 }) {
  const pts = `${tip},${cy} ${tip - dir * size},${cy - size * 0.55} ${tip - dir * size},${cy + size * 0.55}`;
  return <polygon points={pts} fill={col} stroke="#121212" strokeWidth="1.2" strokeLinejoin="round" />;
}

/**
 * Frame 4: one arrow per genre on a fixed 0-1 valence axis, from the genre's average valence
 * before 2000 (hollow circle) to since 2010 (arrowhead). The arrow is red when valence fell and
 * green when it rose (gold and blue keep their site-wide happy/sad meaning). Shape, arrow direction
 * and the signed change carry the comparison too, so nothing depends on colour alone.
 * Population: ALL dated tracks in each genre (not only hits), genres with >= minTracks per period.
 */
export default function GenreDumbbell({ data, years }) {
  const [mode, setMode] = useState('drops');
  const [query, setQuery] = useState('');
  const [focusIdx, setFocusIdx] = useState(0); // roving tab stop among the rows
  const rowRefs = useRef([]);
  const focusedAt = useRef(0);
  const wrap = useRef(null);
  const { width } = useSize(wrap);
  const { ref: tipRef, tip, show, hide } = useTooltip();
  const [pinned, setPinned] = useState(null); // genre whose tooltip was opened by tap / focus

  const rows = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase().replace(/\s+/g, '-');
    if (q) return data.genres.filter((g) => g.genre.includes(q));
    if (mode === 'drops') return data.genres.slice(0, 10);
    if (mode === 'rises') return data.genres.filter((g) => g.delta > 0).reverse();
    return data.genres;
  }, [data, mode, query]);

  const W = Math.max(300, width || 620);
  const narrow = W < 520;
  const labelW = narrow ? 92 : 126;
  const deltaW = narrow ? 50 : 118; // right-hand "Change in valence" column
  const x = useMemo(() => scaleLinear([0, 1], [labelW + 12, W - deltaW - 10]), [W, labelW, deltaW]);

  if (!data) return <div className="chart-loading">Loading genres&hellip;</div>;

  const n = data.nGenres;
  const nLower = data.genres.filter((g) => g.delta < 0).length;
  const nHigher = data.genres.filter((g) => g.delta > 0).length;
  const biggestDrop = data.genres[0];
  const biggestRise = data.genres[data.genres.length - 1];

  // how many genres this view shows, in words
  const q = query.trim();
  let showing;
  if (q) showing = rows.length ? <>Showing <b>{rows.length}</b> of {n} genres matching &ldquo;{q}&rdquo;.</> : <>No genre matches &ldquo;{q}&rdquo;.</>;
  else if (mode === 'drops') showing = <>Showing the <b>{rows.length}</b> largest decreases, of {n} genres.</>;
  else if (mode === 'rises') showing = <>Showing all <b>{rows.length}</b> genres whose average valence rose. The largest rise is {signedChange(biggestRise.delta)}; the largest drop is {signedChange(biggestDrop.delta)}.</>;
  else showing = <>Showing all <b>{rows.length}</b> genres, largest decrease first.</>;

  const tipContent = (g) => (
    <>
      <b>{prettyGenre(g.genre)}</b>
      <div>Before 2000: <strong>{g.pre.toFixed(2)}</strong>{g.nPre != null && <> &middot; {g.nPre.toLocaleString()} tracks</>}</div>
      <div>Since 2010: <strong>{g.post.toFixed(2)}</strong>{g.nPost != null && <> &middot; {g.nPost.toLocaleString()} tracks</>}</div>
      <div className="tooltip__sub">Change in valence: {signedChange(g.delta, 3)} ({g.delta < 0 ? 'lower' : 'higher'})</div>
    </>
  );
  // place the tooltip at the middle of a row's arrow (used for keyboard focus and taps)
  const showAt = (el, g) => {
    const r = el.getBoundingClientRect();
    // beside the arrow if the tooltip (max 260px) fits there, otherwise from the chart's left edge
    let px = (x(g.pre) + x(g.post)) / 2;
    const fits = px > W * 0.55 ? px > 280 : W - px > 280;
    if (!fits) px = 2;
    show({ clientX: r.left + px, clientY: r.top + ROW / 2 }, tipContent(g));
    setPinned(g.genre);
  };
  const clearTip = () => { hide(); setPinned(null); };
  const onRowKey = (e, i) => {
    const next = e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowUp' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? rows.length - 1 : null;
    if (e.key === 'Escape') { clearTip(); return; }
    if (next == null || next < 0 || next >= rows.length) return;
    e.preventDefault();
    setFocusIdx(next);
    rowRefs.current[next]?.focus();
  };
  const tabStop = Math.min(focusIdx, Math.max(0, rows.length - 1));

  // axis: endpoint words at the two ends; tick numbers only where they do not collide with them
  const plotW = x(1) - x(0);
  const endW = 104; // approx. width of "0 · Less positive"
  const stacked = plotW < 2 * endW + 24; // phones: put the two end labels on separate lines
  const ticks = [0.25, 0.5, 0.75].filter((t) => !stacked && t * plotW > endW + 18 && (1 - t) * plotW > endW + 18);
  const axisH = stacked ? 50 : 36;

  const body = (
    <svg width={W} height={rows.length * ROW + 6} role="img"
      aria-label={`Arrow chart of ${rows.length} genres: average valence before 2000 (circle) and since 2010 (arrowhead). Full values are in the table below.`}>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} x1={x(t)} x2={x(t)} y1="0" y2={rows.length * ROW} className="grid" />
      ))}
      {rows.map((g, i) => {
        const dir = g.delta < 0 ? -1 : 1;
        const col = g.delta < 0 ? C.sadder : C.happier;
        const tip = x(g.post);
        const y0 = ROW / 2;
        const lineEnd = Math.abs(tip - x(g.pre)) > 14 ? tip - dir * 12 : tip;
        return (
          <g key={g.genre} transform={`translate(0 ${i * ROW})`}>
            <g className={`dumb-row ${pinned === g.genre ? 'is-pinned' : ''}`}
              ref={(el) => (rowRefs.current[i] = el)}
              tabIndex={i === tabStop ? 0 : -1}
              aria-label={`${prettyGenre(g.genre)}: ${g.pre.toFixed(2)} before 2000, ${g.post.toFixed(2)} since 2010, change ${signedChange(g.delta)}`}
              style={{ animationDelay: `${Math.min(i, 14) * 35}ms` }}
              onMouseMove={(e) => show(e, tipContent(g))}
              onMouseLeave={() => { if (pinned !== g.genre) hide(); }}
              onFocus={(e) => { focusedAt.current = Date.now(); setFocusIdx(i); showAt(e.currentTarget, g); }}
              onBlur={clearTip}
              onClick={(e) => {
                if (Date.now() - focusedAt.current < 400) return; // the focus from this same tap already opened it
                if (pinned === g.genre) clearTip(); else showAt(e.currentTarget, g);
              }}
              onKeyDown={(e) => onRowKey(e, i)}>
              <rect className="dumb-hit" x="0" y="1" width={W} height={ROW - 2} rx="6" fill="transparent" />
              <text className="row-label" x={labelW} y={y0 + 4} textAnchor="end">{prettyGenre(g.genre)}</text>
              <line className="dumb-line" x1={x(g.pre)} x2={lineEnd} y1={y0} y2={y0}
                style={{ stroke: col, transformOrigin: `${x(g.pre)}px ${y0}px`, animationDelay: `${Math.min(i, 14) * 35 + 120}ms` }} />
              <StartMark cx={x(g.pre)} cy={y0} />
              <g className="dumb-head"><EndMark tip={tip} cy={y0} dir={dir} col={col} /></g>
              <text className="row-delta" x={W - 4} y={y0 + 4} textAnchor="end" style={{ fill: col }}>{signedChange(g.delta)}</text>
            </g>
          </g>
        );
      })}
    </svg>
  );

  return (
    <div ref={tipRef} className="chart dumbbell" style={{ position: 'relative' }}>
      {/* overview: stays visible whatever the filter */}
      <div className="gshift">
        <div className="gshift__nums">
          <span className="gshift__num"><b>{nLower}</b> <span aria-hidden="true" style={{ color: C.sadder }}>&#9660;</span> lower</span>
          <span className="gshift__num"><b>{nHigher}</b> <span aria-hidden="true" style={{ color: C.happier }}>&#9650;</span> higher</span>
        </div>
        <div className="gshift__bar" role="img" aria-label={`${nLower} of ${n} genres lower, ${nHigher} higher`}>
          <i style={{ width: `${(nLower / n) * 100}%`, background: C.sadder }} />
          <i style={{ width: `${(nHigher / n) * 100}%`, background: C.happier }} />
        </div>
        <p className="gshift__cap">of {n} eligible genres: average valence since 2010 compared with before 2000.</p>
      </div>

      <div className="dumbbell__controls">
        <div className="chips" role="group" aria-label="Which genres to show">
          {MODES.map((m) => (
            <button key={m.id} className={`chip ${!query && mode === m.id ? 'is-on' : ''}`} aria-pressed={!query && mode === m.id}
              onClick={() => { setQuery(''); setMode(m.id); setFocusIdx(0); clearTip(); }}>
              {m.label}
            </button>
          ))}
        </div>
        <label className="search">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M7 1.75a5.25 5.25 0 1 0 3.2 9.4l3.5 3.5 1.06-1.06-3.5-3.5A5.25 5.25 0 0 0 7 1.75zm-3.75 5.25a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0z" /></svg>
          <span className="sr-only">Search genres</span>
          <input className="input" type="search" placeholder="Search a genre, try dub, samba or k-pop" value={query}
            onChange={(e) => { setQuery(e.target.value); setFocusIdx(0); clearTip(); }} />
        </label>
      </div>
      <p className="dumbbell__count" aria-live="polite">{showing}</p>

      {/* permanent legend: shape = period, arrow = direction, colour = valence */}
      <div className="dumbbell__legend" aria-hidden="true">
        <span>
          <svg viewBox="0 0 14 14" width="14" height="14"><StartMark cx={7} cy={7} r={5} /></svg>
          Before 2000{years && <> ({years[0]}&ndash;1999)</>}
        </span>
        <span>
          <svg viewBox="0 0 40 14" width="40" height="14"><line x1="4" x2="28" y1="7" y2="7" className="dumb-line dumb-line--static" /><EndMark tip={38} cy={7} dir={1} col="#d9d9d9" size={11} /></svg>
          Since 2010{years && <> (2010&ndash;{years[1]})</>}
        </span>
        <span>
          <b style={{ color: C.sadder }}>&#9664; red</b> = lower
        </span>
        <span>
          <b style={{ color: C.happier }}>green &#9654;</b> = higher
        </span>
      </div>

      <div ref={wrap} className="dumbbell__axis">
        <svg width={W} height={axisH} aria-hidden="true">
          <text className="axis-title" x={(x(0) + x(1)) / 2} y="13" textAnchor="middle">Average valence</text>
          {ticks.map((t) => (
            <text key={t} className="axis-text" x={x(t)} y="30" textAnchor="middle">{t}</text>
          ))}
          <text className="axis-text axis-text--cue" x={x(0)} y="30" textAnchor="start">0 &middot; Less positive</text>
          <text className="axis-text axis-text--cue" x={x(1)} y={stacked ? 45 : 30} textAnchor="end">1 &middot; More positive</text>
          {narrow ? (
            <>
              <text className="axis-title axis-title--sm" x={W - 2} y="13" textAnchor="end">Change</text>
              <text className="axis-title axis-title--sm" x={W - 2} y="27" textAnchor="end">in valence</text>
            </>
          ) : <text className="axis-title" x={W - 4} y="13" textAnchor="end">Change in valence</text>}
        </svg>
      </div>
      <div className={`dumbbell__body ${rows.length > 12 ? 'is-scroll' : ''}`} onScroll={clearTip}>
        {rows.length ? body : <p className="hint" style={{ padding: 16 }}>No genre matches &ldquo;{q}&rdquo;.</p>}
      </div>
      <p className="hint">Hover, tap or tab to a row for both averages, the change and track counts. Arrow keys move between rows.</p>

      {/* the same numbers as a table, for screen readers */}
      <div className="sr-only"><table>
        <caption>Average valence by genre, before 2000 and since 2010</caption>
        <thead><tr><th scope="col">Genre</th><th scope="col">Before 2000</th><th scope="col">Since 2010</th><th scope="col">Change</th><th scope="col">Tracks before / since</th></tr></thead>
        <tbody>
          {rows.map((g) => (
            <tr key={g.genre}><th scope="row">{prettyGenre(g.genre)}</th><td>{g.pre.toFixed(2)}</td><td>{g.post.toFixed(2)}</td><td>{signedChange(g.delta)}</td><td>{g.nPre} / {g.nPost}</td></tr>
          ))}
        </tbody>
      </table></div>
      <Tooltip tip={tip} />
    </div>
  );
}
