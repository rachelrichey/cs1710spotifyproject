import { useInView } from '../lib/hooks.js';

/** Fade-up wrapper: content appears the first time it scrolls into view. */
export function Reveal({ children, className = '', delay = 0 }) {
  const [ref, inView] = useInView({ threshold: 0.12 });
  return (
    <div ref={ref} className={`reveal ${inView ? 'is-in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/** Standard chapter wrapper: anchor id, numbered kicker, big title, optional dek. */
export default function Chapter({ chapter, tint = 'a', dek, children }) {
  return (
    <section id={chapter.id} className={`chapter chapter--tint-${tint}`} aria-labelledby={`${chapter.id}-title`}>
      <div className="chapter__inner">
        <Reveal className="chapter__head">
          <div className="chapter__num">
            <b>{chapter.n}</b>
            <span>{chapter.arc}</span>
          </div>
          <h2 id={`${chapter.id}-title`}>{chapter.title}</h2>
          {dek && <p className="chapter__dek">{dek}</p>}
        </Reveal>
        {children}
      </div>
    </section>
  );
}
