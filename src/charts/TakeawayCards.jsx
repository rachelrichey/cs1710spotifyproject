import { useInView } from '../lib/hooks.js';
import { COLORS, pct } from '../lib/format.js';

function Bar({ label, value, max, color, on, text }) {
  return (
    <div className="mini">
      <span className="mini__label">{label}</span>
      <div className="mini__track"><i style={{ width: on ? `${Math.max(1.5, (value / max) * 100)}%` : 0, background: color }} /></div>
      <b>{text}</b>
    </div>
  );
}

/** Frame 7: three takeaway cards, one statistic each (all numbers come from takeaways.json). */
export default function TakeawayCards({ t }) {
  const [ref, on] = useInView({ threshold: 0.3 });
  if (!t) return <div className="chart-loading">Loading numbers&hellip;</div>;
  return (
    <div ref={ref} className="takeaways">
      <article className="card takeaway">
        <div className="takeaway__num" style={{ color: COLORS.calm }}>{t.energyToday.toFixed(2)}</div>
        <div className="takeaway__sub">energy of today&rsquo;s hits</div>
        <h3>Sad doesn&rsquo;t mean slow</h3>
        <Bar label="1960s hits" value={t.energy1960s} max={1} color="#ffb454" on={on} text={t.energy1960s.toFixed(2)} />
        <Bar label="2020&ndash;22 hits" value={t.energyToday} max={1} color="#2ee6a6" on={on} text={t.energyToday.toFixed(2)} />
        <p>A sad song can still have a beat. Today&rsquo;s hits are more energetic than the 1960s&rsquo;, not less.</p>
      </article>
      <article className="card takeaway">
        <div className="takeaway__num" style={{ color: COLORS.pink }}>{pct(t.instrumentalTop1, 1)}</div>
        <div className="takeaway__sub">of the top 1% are instrumental</div>
        <h3>Voices win</h3>
        <Bar label="All tracks" value={t.instrumentalAll} max={0.25} color="#6b6b6b" on={on} text={pct(t.instrumentalAll, 1)} />
        <Bar label="Top 1%" value={t.instrumentalTop1} max={0.25} color={COLORS.pink} on={on} text={pct(t.instrumentalTop1, 1)} />
        <p>Mostly instrumental songs are {pct(t.instrumentalAll, 1)} of tracks but only {pct(t.instrumentalTop1, 1)} of the most popular. {pct(t.vocalHitRate, 1)} of songs with vocals are hits, versus {pct(t.instrumentalHitRate, 1)} without.</p>
      </article>
      <article className="card takeaway">
        <div className="takeaway__num" style={{ color: COLORS.sad }}>{pct(t.genreExplains)}</div>
        <div className="takeaway__sub">of popularity explained by genre</div>
        <h3>Genre beats mood</h3>
        <Bar label="Genre" value={t.genreExplains} max={0.3} color={COLORS.sad} on={on} text={pct(t.genreExplains, 1)} />
        <Bar label="Mood (valence)" value={t.valenceExplains} max={0.3} color={COLORS.happy} on={on} text={pct(t.valenceExplains, 2)} />
        <p>Knowing a song&rsquo;s genre tells you a lot about how popular it is. Knowing how happy it sounds tells you almost nothing.</p>
      </article>
    </div>
  );
}
