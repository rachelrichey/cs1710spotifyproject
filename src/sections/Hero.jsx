import { useMemo } from 'react';
import { useData } from '../lib/data.js';
import { moodColor } from '../lib/format.js';

/**
 * The hero equalizer is the data: one bar per year of hits (1960-2022).
 * Colour = average happiness that year (gold -> blue), height = average energy.
 * The bars keep "bouncing" so the page feels like a track that is already playing.
 */
function Equalizer({ annual }) {
  const bars = useMemo(() => {
    if (!annual) return [];
    const e = annual.map((d) => d.energy);
    const lo = Math.min(...e);
    const hi = Math.max(...e);
    // stretch the happiness range so the happiest year is full gold and the saddest full blue
    const vals = annual.map((d) => d.valence);
    const vlo = Math.min(...vals);
    const vhi = Math.max(...vals);
    return annual.map((d, i) => ({
      year: d.year,
      color: moodColor(0.04 + 0.92 * ((d.valence - vlo) / (vhi - vlo || 1))),
      h: 0.38 + 0.62 * ((d.energy - lo) / (hi - lo || 1)),
      dur: 1.1 + ((i * 37) % 11) / 9,
      delay: -((i * 53) % 17) / 6,
    }));
  }, [annual]);

  return (
    <svg className="hero__eq" viewBox="0 0 630 300" preserveAspectRatio="xMaxYMax meet" role="img"
      aria-label="One bar for each year from 1960 to 2022. Bars start gold for happy years and turn blue for sadder years.">
      {bars.map((b, i) => (
        <rect
          key={b.year}
          className="eq-bar"
          x={i * 10}
          width="7"
          rx="3.5"
          y={300 - b.h * 290}
          height={b.h * 290}
          fill={b.color}
          style={{ animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }}
        />
      ))}
    </svg>
  );
}

export default function Hero({ meta }) {
  const { data: sad } = useData('sad_share');
  return (
    <section className="hero" id="top">
      <Equalizer annual={sad?.annual5yr} />
      <div style={{ position: 'relative' }}>
        <div className="hero__kicker">A data story in {meta ? meta.genres : 114} genres</div>
        <h1>
          Sadder, <em>not</em> slower.
        </h1>
        <p className="hero__lede">
          Since the 1960s, popular music has gotten steadily sadder.
          <br />
          <span>Today&rsquo;s typical hit is a sad song you can dance to.</span>
        </p>
        <div className="hero__meta">
          <span>
            Built from {meta ? meta.uniqueTracks.toLocaleString() : '89,740'} Spotify tracks
          </span>
          <span aria-hidden="true">&bull;</span>
          <span>CS 1710 &middot; Bahar, Cate, Rachel &amp; Miles</span>
        </div>
        <a className="hero__cue" href="#hook" aria-label="Scroll to the story">
          <i />
          Scroll to press play
        </a>
      </div>
      <p className="sr-only">
        Each bar in the background is one year of hit songs. Colour shows how happy the year&rsquo;s hits sounded.
      </p>
    </section>
  );
}
