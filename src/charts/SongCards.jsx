import { useState } from 'react';
import { useCountUp, useInView } from '../lib/hooks.js';
import { moodColor, pct } from '../lib/format.js';

/** Thin horizontal meter (value 0..1) that fills once the card is in view. */
function Meter({ label, value, color, on }) {
  return (
    <div className="meter">
      <div className="meter__top">
        <span>{label}</span>
        <b>{value.toFixed(2)}</b>
      </div>
      <div className="meter__track">
        <i style={{ width: on ? `${value * 100}%` : '0%', background: color }} />
      </div>
    </div>
  );
}

/** One Spotify-style track card. "Play" animates an equalizer whose speed follows the song's tempo. */
function TrackCard({ song, role, on }) {
  const [playing, setPlaying] = useState(false);
  const mood = moodColor(song.valence);
  const dur = Math.max(0.3, 120 / song.tempo);
  return (
    <article className={`track ${playing ? 'is-playing' : ''}`} style={{ '--mood': mood }}>
      <div className="track__cover">
        <span className="track__role">{role}</span>
        <span className="track__year">{song.year}</span>
        <div className="eq" style={{ '--dur': `${dur}s`, '--amp': 0.4 + song.energy * 0.6 }} aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <i key={i} style={{ animationDelay: `${i * -0.19}s` }} />
          ))}
        </div>
        <button className="track__play" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}
          aria-label={`${playing ? 'Pause' : 'Preview'} the mood of ${song.name}`}>
          {playing ? (
            <svg viewBox="0 0 16 16"><path d="M2.7 1a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7H2.7zm8 0a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-2.6z" /></svg>
          ) : (
            <svg viewBox="0 0 16 16"><path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.287V1.713z" /></svg>
          )}
        </button>
      </div>
      <h3 className="track__name">{song.name}</h3>
      <p className="track__artist">{song.artist}</p>
      <Meter label="Happiness (valence)" value={song.valence} color={mood} on={on} />
      <Meter label="Danceability" value={song.danceability} color="var(--green)" on={on} />
      <p className="track__hint">{playing ? `Bars bounce at ${Math.round(song.tempo)} BPM` : 'Press play to feel the tempo'}</p>
    </article>
  );
}

/** Frame 1: two song cards and the headline statistic. */
export default function SongCards({ hook }) {
  const [ref, inView] = useInView({ threshold: 0.3 });
  const a = useCountUp((hook?.sad1960s ?? 0.18) * 100, inView, 1400);
  const b = useCountUp((hook?.sad2010s ?? 0.45) * 100, inView, 1700);
  if (!hook) return <div className="chart-loading">Loading songs&hellip;</div>;
  return (
    <div ref={ref}>
      <div className="duel">
        <TrackCard song={hook.then} role="Then" on={inView} />
        <div className="duel__vs" aria-hidden="true">vs</div>
        <TrackCard song={hook.now} role="Now" on={inView} />
      </div>
      <div className="statband">
        <div className="statband__item">
          <b style={{ color: 'var(--gold)' }}>{Math.round(a)}%</b>
          <span>of 1960s hits sounded sad</span>
        </div>
        <div className="statband__arrow" aria-hidden="true">
          <svg viewBox="0 0 48 16"><path d="M0 8h44m0 0l-7-6m7 6l-7 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div className="statband__item">
          <b style={{ color: 'var(--blue)' }}>{Math.round(b)}%</b>
          <span>of 2010s hits sounded sad</span>
        </div>
      </div>
      <p className="caveat">
        <b>How we count:</b> a hit has a Spotify popularity score of {60} or higher; &ldquo;sad&rdquo; means valence below 0.40.
        Valence is Spotify&rsquo;s 0&ndash;1 happiness score. {pct(hook.sad1960s)} in the 1960s, {pct(hook.sad2010s)} in the 2010s.
      </p>
    </div>
  );
}
