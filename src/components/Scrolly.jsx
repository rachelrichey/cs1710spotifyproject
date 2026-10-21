import { useEffect, useRef, useState } from 'react';

/**
 * Scrollytelling layout.
 *   <Scrolly steps={[<>...</>, <>...</>]}>{(step) => <Chart step={step} />}</Scrolly>
 * The chart stays pinned (position: sticky) while the step cards scroll past.
 * Whichever card crosses the middle of the viewport becomes the active `step`.
 */
export default function Scrolly({ steps, children, side = 'right', onStep }) {
  const [active, setActive] = useState(0);
  const refs = useRef([]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number(e.target.dataset.step));
        }),
      { rootMargin: '-45% 0px -45% 0px' },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [steps.length]);

  useEffect(() => {
    onStep?.(active);
  }, [active, onStep]);

  return (
    <div className={`scrolly scrolly--${side === 'left' ? 'left' : 'right'}`}>
      <div className="scrolly__steps">
        {steps.map((content, i) => (
          <div
            key={i}
            data-step={i}
            ref={(el) => (refs.current[i] = el)}
            className={`scrolly__step ${i === active ? 'is-active' : ''}`}
          >
            <div className="step-card">{content}</div>
          </div>
        ))}
      </div>
      <div className="scrolly__visual">
        <div className="scrolly__sticky">{typeof children === 'function' ? children(active) : children}</div>
      </div>
    </div>
  );
}
