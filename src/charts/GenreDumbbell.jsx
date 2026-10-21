import { useMemo, useRef, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { useSize } from '../lib/hooks.js';
import { COLORS, prettyGenre, signed2 } from '../lib/format.js';
import { Tooltip, useTooltip } from '../components/Tooltip.jsx';

const ROW = 30;
const MODES = [
  { id: 'drops', label: 'Biggest drops' },
  { id: 'rises', label: 'Got happier' },
  { id: 'all', label: 'All genres' },
];

/**
 * Frame 4: one dumbbell per genre, average valence before 2000 (gold) vs since 2010 (blue).
 * Genres are sorted by change, so the eye can read the whole story from the line lengths.
 * The search box finds any genre; rows that got happier are drawn in green.
 */
export default function GenreDumbbell({ data }) {
  const [mode, setMode] = useState('drops');
  const [query, setQuery] = useState('');
  const wrap = useRef(null);
  const { width } = useSize(wrap);
  const { ref: tipRef, tip, show, hide } = useTooltip();

  const rows = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase().replace(/\s+/g, '-');
    if (q) return data.genres.filter((g) => g.genre.includes(q));
    if (mode === 'drops') return data.genres.slice(0, 10);
    if (mode === 'rises') return data.genres.filter((g) => g.delta > 0).reverse();
    return data.genres;
  }, [data, mode, query]);

  const W = Math.max(300, width || 620);
  const labelW = W < 460 ? 92 : 126;
  const x = useMemo(() => scaleLinear([0, 1], [labelW + 10, W - 58]), [W, labelW]);

  if (!data) return <div className="chart-loading">Loading genres&hellip;</div>;

  const body = (
    <svg width={W} height={Math.max(ROW, rows.length * ROW + 6)} role="img"
      aria-label={`Dumbbell chart of ${rows.length} genres: valence before 2000 versus since 2010`}>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} x1={x(t)} x2={x(t)} y1="0" y2={rows.length * ROW} className="grid" />
      ))}
      {rows.map((g, i) => {
        const sadder = g.delta < 0;
        const stroke = sadder ? '#6b6b6b' : COLORS.calm;
        return (
          <g key={g.genre} transform={`translate(0 ${i * ROW})`}>
          <g className="dumb-row"
            style={{ animationDelay: `${Math.min(i, 14) * 35}ms` }}
            onMouseMove={(e) => show(e, (
              <>
                <b>{prettyGenre(g.genre)}</b>
                <div>before 2000: <span style={{ color: COLORS.happy }}>{g.pre.toFixed(2)}</span> ({g.nPre} tracks)</div>
                <div>since 2010: <span style={{ color: COLORS.sad }}>{g.post.toFixed(2)}</span> ({g.nPost} tracks)</div>
              </>
            ))}
            onMouseLeave={hide}>
            <rect x="0" y="0" width={W} height={ROW} fill="transparent" />
            <text className="row-label" x={labelW} y={ROW / 2 + 4} textAnchor="end">{prettyGenre(g.genre)}</text>
            <line className="dumb-line" x1={x(g.pre)} x2={x(g.post)} y1={ROW / 2} y2={ROW / 2} stroke={stroke} strokeWidth="3" strokeLinecap="round"
              style={{ transformOrigin: `${x(g.pre)}px ${ROW / 2}px`, animationDelay: `${Math.min(i, 14) * 35 + 120}ms` }} />
            <circle cx={x(g.pre)} cy={ROW / 2} r="6" fill={COLORS.happy} />
            <circle cx={x(g.post)} cy={ROW / 2} r="6" fill={COLORS.sad} />
            <text className="row-delta" x={W - 4} y={ROW / 2 + 4} textAnchor="end" fill={sadder ? '#b3b3b3' : COLORS.calm}>{signed2(g.delta)}</text>
          </g>
          </g>
        );
      })}
    </svg>
  );

  return (
    <div ref={tipRef} className="chart dumbbell" style={{ position: 'relative' }}>
      <div className="dumbbell__controls">
        <div className="chips" role="group" aria-label="Which genres to show">
          {MODES.map((m) => (
            <button key={m.id} className={`chip ${!query && mode === m.id ? 'is-on' : ''}`} onClick={() => { setQuery(''); setMode(m.id); }}>
              {m.label}
            </button>
          ))}
        </div>
        <label className="search">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M7 1.75a5.25 5.25 0 1 0 3.2 9.4l3.5 3.5 1.06-1.06-3.5-3.5A5.25 5.25 0 0 0 7 1.75zm-3.75 5.25a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0z" /></svg>
          <span className="sr-only">Search genres</span>
          <input className="input" type="search" placeholder="Search a genre, try dub, samba or k-pop" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>
      <div className="dumbbell__legend">
        <span><i style={{ background: COLORS.happy }} /> before 2000</span>
        <span><i style={{ background: COLORS.sad }} /> since 2010</span>
        <span><i style={{ background: COLORS.calm }} /> got happier</span>
      </div>
      <div ref={wrap} className="dumbbell__axis">
        <svg width={W} height="22" aria-hidden="true">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <text key={t} className="axis-text" x={x(t)} y="14" textAnchor="middle">{t}</text>
          ))}
          <text className="axis-text" x={W - 4} y="14" textAnchor="end">change</text>
        </svg>
      </div>
      <div className={`dumbbell__body ${rows.length > 12 ? 'is-scroll' : ''}`}>
        {rows.length ? body : <p className="hint" style={{ padding: 16 }}>No genre matches &ldquo;{query}&rdquo;.</p>}
      </div>
      <p className="hint">Average valence of a genre&rsquo;s tracks. Only genres with at least {data.minTracks} tracks in both periods.</p>
      <Tooltip tip={tip} />
    </div>
  );
}
