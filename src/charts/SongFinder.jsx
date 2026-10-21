import { useMemo, useRef, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { useData, unpack } from '../lib/data.js';
import { useInView, useSize } from '../lib/hooks.js';
import { COLORS, DECADE_COLORS, moodColor } from '../lib/format.js';

const M = { t: 20, r: 24, b: 48, l: 52 };
const MAX_SONGS = 12;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const keyOf = (s) => `${s.name}|${s.artist}`;

/** Frame 8: search a song, artist or genre, then see where it lands next to the average hit of each decade. */
export default function SongFinder({ profile }) {
  const [ref, inView] = useInView({ threshold: 0.05, rootMargin: '500px' });
  const { data } = useData('search', inView); // 3.5 MB, only fetched when this section is near the viewport
  const wrap = useRef(null);
  const { width } = useSize(wrap);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState([]);
  const [ideas, setIdeas] = useState(null);

  const songs = useMemo(() => (data ? unpack(data).map((s) => ({ ...s, hay: `${s.name} ${s.artist} ${s.genre}`.toLowerCase() })) : []), [data]);
  const starters = useMemo(() => {
    const names = new Set();
    const out = [];
    songs.forEach((s) => { if (out.length < 4 && s.popularity >= 85 && !names.has(s.name)) { names.add(s.name); out.push(s.name); } });
    return out;
  }, [songs]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    return songs.filter((s) => s.hay.includes(term)).slice(0, 7);
  }, [q, songs]);

  const add = (s) => setPicked((p) => (p.length >= MAX_SONGS || p.some((x) => keyOf(x) === keyOf(s)) ? p : [...p, s]));
  const remove = (s) => setPicked((p) => p.filter((x) => keyOf(x) !== keyOf(s)));

  const findHappy = () => {
    const pool = songs.filter((s) => s.year && s.year >= 2020 && s.popularity >= 70 && s.valence >= 0.7);
    setIdeas(pool.slice(0, 6));
  };

  const decades = (profile || []).map((p) => ({ label: p.label, v: p.hits.valence, e: p.hits.energy }));
  const avg = picked.length
    ? { v: picked.reduce((s, x) => s + x.valence, 0) / picked.length, e: picked.reduce((s, x) => s + x.energy, 0) / picked.length }
    : null;
  const nearest = avg && decades.length
    ? decades.reduce((b, d) => (Math.hypot(d.v - avg.v, d.e - avg.e) < Math.hypot(b.v - avg.v, b.e - avg.e) ? d : b))
    : null;
  const today = decades[decades.length - 1];

  // auto-fit the map to everything on it
  const W = Math.max(320, width || 640);
  const H = Math.max(320, Math.min(W * 0.78, 480));
  const pts = [...decades.map((d) => [d.v, d.e]), ...picked.map((s) => [s.valence, s.energy])];
  const pad = 0.07;
  const ext = (i) => {
    const vals = pts.map((p) => p[i]);
    let lo = Math.min(...vals) - pad, hi = Math.max(...vals) + pad;
    if (hi - lo < 0.5) { const mid = (hi + lo) / 2; lo = mid - 0.25; hi = mid + 0.25; }
    return [clamp(lo, 0, 1), clamp(hi, 0, 1)];
  };
  const [vx0, vx1] = pts.length ? ext(0) : [0, 1];
  const [ey0, ey1] = pts.length ? ext(1) : [0, 1];
  const x = scaleLinear([vx0, vx1], [M.l, W - M.r]);
  const y = scaleLinear([ey0, ey1], [H - M.b, M.t]);
  const ticks = (s) => s.ticks(5);

  const trail = decades.map((d, i) => `${i ? 'L' : 'M'}${x(d.v).toFixed(1)} ${y(d.e).toFixed(1)}`).join('');

  return (
    <div ref={ref} className="finder">
      <div className="finder__left">
        <label className="search">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M7 1.75a5.25 5.25 0 1 0 3.2 9.4l3.5 3.5 1.06-1.06-3.5-3.5A5.25 5.25 0 0 0 7 1.75zm-3.75 5.25a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0z" /></svg>
          <span className="sr-only">Search a song, artist or genre</span>
          <input className="input" type="search" placeholder={data ? 'Search a song, artist or genre' : 'Loading 60,000 songs…'} disabled={!data} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>

        {!q && starters.length > 0 && (
          <div className="finder__try">
            <span>Try</span>
            <div className="chips">{starters.map((n) => <button key={n} className="chip" onClick={() => setQ(n)}>{n}</button>)}</div>
          </div>
        )}

        {results.length > 0 && (
          <ul className="results" aria-label="Search results">
            {results.map((s) => {
              const on = picked.some((x) => keyOf(x) === keyOf(s));
              return (
                <li key={keyOf(s)}>
                  <button onClick={() => add(s)} disabled={on} aria-label={`Add ${s.name} by ${s.artist}`}>
                    <span className="dot" style={{ background: moodColor(s.valence) }} />
                    <span className="results__text"><b>{s.name}</b><i>{s.artist}{s.year ? `, ${s.year}` : ''}</i></span>
                    <span className="results__add">{on ? 'Added' : '+ Add'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {q.trim().length >= 2 && data && results.length === 0 && <p className="hint">No songs match &ldquo;{q}&rdquo;. Songs with popularity under 30 are not in this search.</p>}

        <div className="finder__playlist">
          <h3>Your playlist {picked.length > 0 && <small>{picked.length}/{MAX_SONGS}</small>}</h3>
          {picked.length === 0 && <p className="hint">Add a few songs you love and see the mood of your playlist.</p>}
          <div className="chips">
            {picked.map((s) => (
              <button key={keyOf(s)} className="chip is-on" onClick={() => remove(s)} aria-label={`Remove ${s.name}`}>
                <i style={{ background: moodColor(s.valence) }} />{s.name} <span aria-hidden="true">&times;</span>
              </button>
            ))}
          </div>
          {avg && nearest && today && (
            <p className="verdict">
              Your playlist sounds most like the average <b style={{ color: DECADE_COLORS[nearest.label] }}>{nearest.label}</b> hit.
              Its happiness is <b>{avg.v.toFixed(2)}</b>, {avg.v < today.v ? 'sadder' : 'happier'} than the average 2020&ndash;22 hit ({today.v.toFixed(2)}).
            </p>
          )}
        </div>

        <div className="finder__ideas">
          <button className="pill pill--green" onClick={findHappy} disabled={!data}>Find me a happy hit from today</button>
          {ideas && (
            <ul className="results">
              {ideas.length === 0 && <li className="hint">None found.</li>}
              {ideas.map((s) => (
                <li key={keyOf(s)}>
                  <button onClick={() => add(s)} disabled={picked.some((x) => keyOf(x) === keyOf(s))}>
                    <span className="dot" style={{ background: moodColor(s.valence) }} />
                    <span className="results__text"><b>{s.name}</b><i>{s.artist}, {s.year}, popularity {s.popularity}</i></span>
                    <span className="results__add">+ Add</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="finder__map chart" ref={wrap}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Mood map comparing your songs with the average hit of each decade">
          {ticks(x).map((t) => <line key={`x${t}`} x1={x(t)} x2={x(t)} y1={M.t} y2={H - M.b} className="grid" />)}
          {ticks(y).map((t) => <line key={`y${t}`} x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} className="grid" />)}
          {ticks(x).map((t) => <text key={`xt${t}`} className="axis-text" x={x(t)} y={H - M.b + 18} textAnchor="middle">{t.toFixed(2).replace(/0$/, '')}</text>)}
          {ticks(y).map((t) => <text key={`yt${t}`} className="axis-text" x={M.l - 8} y={y(t) + 4} textAnchor="end">{t.toFixed(2).replace(/0$/, '')}</text>)}
          {vx0 < 0.5 && vx1 > 0.5 && <line x1={x(0.5)} x2={x(0.5)} y1={M.t} y2={H - M.b} className="midline" />}
          {ey0 < 0.5 && ey1 > 0.5 && <line x1={M.l} x2={W - M.r} y1={y(0.5)} y2={y(0.5)} className="midline" />}
          <text className="axis-title" x={(M.l + W - M.r) / 2} y={H - 8} textAnchor="middle">Valence: sad to happy</text>
          <text className="axis-title" transform={`translate(12 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle">Energy: calm to intense</text>

          {decades.length > 0 && <path d={trail} fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="2" strokeDasharray="1 6" strokeLinecap="round" />}
          {decades.map((d) => (
            <g key={d.label} className="mover" style={{ transform: `translate(${x(d.v)}px, ${y(d.e)}px)` }}>
              <circle r="9" fill={DECADE_COLORS[d.label]} stroke="#121212" strokeWidth="2.5" />
              <text className="decade-tag" y="-15" textAnchor="middle">{d.label}</text>
            </g>
          ))}
          {picked.map((s) => (
            <g key={keyOf(s)} className="mover" style={{ transform: `translate(${x(s.valence)}px, ${y(s.energy)}px)` }}>
              <circle r="7" fill={moodColor(s.valence)} stroke="#fff" strokeWidth="2" />
              <text className="song-tag" x="11" y="4">{s.name.length > 22 ? `${s.name.slice(0, 21)}…` : s.name}</text>
            </g>
          ))}
          {avg && (
            <g className="mover" style={{ transform: `translate(${x(avg.v)}px, ${y(avg.e)}px)` }}>
              <circle r="15" fill="none" stroke={COLORS.calm} strokeWidth="3" />
              <circle r="3.5" fill={COLORS.calm} />
              <text className="callout" y="32" textAnchor="middle" fill={COLORS.calm}>your playlist</text>
            </g>
          )}
        </svg>
        <p className="hint">Coloured discs are the average hit of each decade. Your songs appear as dots; the green ring is the average of your playlist.</p>
      </div>
    </div>
  );
}
