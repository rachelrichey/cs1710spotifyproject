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
    from: 'Spotify’s audio model estimates it from the sound itself:',
    points: ['Key', 'Harmony', 'Brightness'],
    note: 'It does not read the lyrics.',
    accent: 'var(--gold)',
  },
  {
    key: 'energy',
    name: 'Energy',
    ends: ['calm, soft', 'fast, loud, noisy'],
    what: 'How intense and active a track feels, from 0 to 1.',
    from: 'Built from:',
    points: ['Loudness', 'Dynamic range', 'Timbre', 'How often new sounds start', 'Overall noisiness'],
    accent: 'var(--purple)',
  },
  {
    key: 'danceability',
    name: 'Danceability',
    ends: ['hard to dance to', 'easy to dance to'],
    what: 'How well a track suits dancing, from 0 to 1.',
    from: 'Built from:',
    points: ['Tempo', 'How steady the rhythm is', 'How strong the beat is', 'How regular the song is overall'],
    accent: 'var(--green)',
  },
];

function Scale({ m, a, b }) {
  const pos = (v) => `${Math.min(100, Math.max(0, v * 100))}%`;
  return (
    <div className="mkey__scale" role="img"
      aria-label={`${m.name}: ${a.name} ${a[m.key].toFixed(2)}, ${b.name} ${b[m.key].toFixed(2)}`}>
      <div className="mkey__track">
        {[a, b].map((s, i) => (
          // labels near either end hang inward so they never spill past the scale
          <span key={s.name} className={`mkey__pin ${i ? 'is-low' : ''} ${s[m.key] > 0.7 ? 'is-right' : s[m.key] < 0.3 ? 'is-left' : ''}`} style={{ left: pos(s[m.key]), '--c': s.color }}>
            <i />
            <em><span>{s.short}</span> <b>{s[m.key].toFixed(2)}</b></em>
          </span>
        ))}
      </div>
      <div className="mkey__ends"><span>0 &middot; {m.ends[0]}</span><span>{m.ends[1]} &middot; 1</span></div>
    </div>
  );
}

// Each song keeps one dot colour on every scale: then = gold, now = purple.
export default function MeasureKey({ hook }) {
  if (!hook) return null;
  const a = { ...hook.then, short: `${hook.then.name} (${hook.then.year})`, color: 'var(--gold)' };
  const b = { ...hook.now, short: `${hook.now.name.split(' (')[0]} (${hook.now.year})`, color: 'var(--purple)' };
  return (
    <section className="mkey card" aria-labelledby="mkey-title">
      <h3 id="mkey-title">How a song gets its scores</h3>
      <p className="mkey__lead">
        Spotify measures every track from its audio and gives it a score from 0 to 1 on each of these.
        Our two songs from chapter 1 are marked so you can see what a score looks like.
      </p>
      <div className="mkey__grid">
        {MEASURES.map((m) => (
          <div key={m.key} className="mkey__item" style={{ '--accent': m.accent }}>
            <h4>{m.name}</h4>
            <p><b>{m.what}</b> {m.from}</p>
            <ul className="mkey__points">
              {m.points.map((pt) => <li key={pt}>{pt}</li>)}
            </ul>
            {m.note && <p className="mkey__note">{m.note}</p>}
            <Scale m={m} a={a} b={b} />
          </div>
        ))}
      </div>
      <p className="hint">These are a model&rsquo;s estimates, not how a listener feels. More in <a href="#data">Behind the data</a>.</p>
    </section>
  );
}
