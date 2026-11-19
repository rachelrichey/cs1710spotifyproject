import { useEffect, useRef, useState } from 'react';

/**
 * Width/height of an element, kept up to date with ResizeObserver.
 * Works even when the element mounts later than the component (e.g. a chart that
 * first renders a "loading" placeholder): we re-check ref.current after every render.
 */
export function useSize(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [el, setEl] = useState(null);
  useEffect(() => {
    if (ref.current !== el) setEl(ref.current);
  });
  useEffect(() => {
    if (!el) return undefined;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize((s) => (s.width === r.width && s.height === r.height ? s : { width: r.width, height: r.height }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return size;
}

/** [ref, inView]  Becomes true when the element scrolls into view. */
export function useInView({ threshold = 0.25, rootMargin = '0px', once = true } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    // An element taller than viewport/threshold (e.g. a stacked scrolly on a phone) can never
    // reach `threshold` of its own area, so it also counts once it fills half the viewport.
    // Finer thresholds below `threshold` make the observer report that moment.
    const steps = Array.from({ length: 20 }, (_, i) => (threshold * i) / 20);
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[entries.length - 1]; // several can queue up during a fast scroll; the last is current
        const fillsView = e.rootBounds && e.intersectionRect.height >= e.rootBounds.height * 0.5;
        if (e.isIntersecting && (e.intersectionRatio >= threshold || fillsView)) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once && !e.isIntersecting) setInView(false);
      },
      { threshold: [...steps, threshold], rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin, once]);
  return [ref, inView];
}

/** Animate a number from 0 to `target` once `start` is true. */
export function useCountUp(target, start, ms = 1200) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!start) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setV(target);
      return undefined;
    }
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, start, ms]);
  return v;
}

/** Page scroll progress 0..1. */
export function useScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setP(h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  return p;
}

/** Which of several section ids is closest to the middle of the viewport. */
export function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-40% 0px -55% 0px' },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [ids]);
  return active;
}
