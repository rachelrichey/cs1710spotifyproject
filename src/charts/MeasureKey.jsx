import { moodColor } from '../lib/format.js';

/*
 * Chapter 2 key (Milestone 10 think-aloud fix): both testers asked how a song's
 * happiness, energy and danceability are measured. The answer used to live only
 * in "Behind the data" at the very end. This puts it where the scores first appear,
 * anchored on the two hook songs so 0.24 vs 0.94 means something.
 * Definitions follow Spotify's audio-features documentation.
 */
const MEASURES = [
  {
    key: 'valence',
    name: 'Happiness (valence)',
    ends: ['sad, tense, angry', 'happy, cheerful'],
    what: 'How positive a track sounds, from 0 to 1.',
    how: 'Spotify’s audio model estimates it from the sound itself, things like key, harmony and brightness. It does not read the lyrics.',
    color: (v) => moodColor(v),
  },
  {
    key: 'energy',
    name: 'Energy',
    ends: ['calm, soft', 'fast, loud, noisy'],
    what: 'How intense and active a track feels, from 0 to 1.',
    how: 'Built from loudness, dynamic range, timbre, how often new sounds start, and overall noisiness.',
    color: () => 'var(--purple)',
  },
  {
    key: 'danceability',
    name: 'Danceability',
    ends: ['hard to dance to', 'easy to dance to'],
    what: 'How well a track suits dancing, from 0 to 1.',
    how: 'Built from tempo, how steady the rhythm is, how strong the beat is, and how regular the song is overall.',
    color: () => 'var(--green)',
  },
];

function Scale({ m, a, b }) {
  const pos = (v) => `${Math.min(100, Math.max(0, v * 100))}%`;
  return (
    <div className="mkey__scale" role="img"
      aria-label={`${m.name}: ${a.name} ${a[m.key].toFixed(2)}, ${b.name} ${b[m.key].toFixed(2)}`}>
      <div className="mkey__track">
        {[a, b].map((s, i) => (
          <span key={s.name} className={`mkey__pin ${i ? 'is-low' : ''}`} style={{ left: pos(s[m.key]), '--c': m.color(s[m.key]) }}>
            <i />
            <em>{s.short} <b>{s[m.key].toFixed(2)}</b></em>
          </span>
        ))}
      </div>
      <div className="mkey__ends"><span>0 &middot; {m.ends[0]}</span><span>{m.ends[1]} &middot; 1</span></div>
    </div>
  );
}

export default function MeasureKey({ hook }) {
  if (!hook) return null;
  const a = { ...hook.then, short: `${hook.then.name} (${hook.then.year})` };
  const b = { ...hook.now, short: `${hook.now.name.split(' (')[0]} (${hook.now.year})` };
  return (
    <section className="mkey card" aria-labelledby="mkey-title">
      <h3 id="mkey-title">How a song gets its scores</h3>
      <p className="mkey__lead">
        Spotify measures every track from its audio and gives it a score from 0 to 1 on each of these.
        Our two songs from chapter 1 are marked so you can see what a score looks like.
      </p>
      <div className="mkey__grid">
        {MEASURES.map((m) => (
          <div key={m.key} className="mkey__item">
            <h4>{m.name}</h4>
            <p><b>{m.what}</b> {m.how}</p>
            <Scale m={m} a={a} b={b} />
          </div>
        ))}
      </div>
      <p className="hint">These are a model&rsquo;s estimates, not how a listener feels. More in <a href="#data">Behind the data</a>.</p>
    </section>
  );
}
