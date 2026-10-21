import { useEffect, useRef, useState } from 'react';
import { CHAPTERS } from '../chapters.js';
import { mmss } from '../lib/format.js';

const TOTAL_SECONDS = 4 * 60 + 20; // purely decorative "track length"

const Icon = {
  prev: <svg viewBox="0 0 16 16"><path d="M3.3 1a.7.7 0 0 1 .7.7v5.15l9.95-5.744a.7.7 0 0 1 1.05.606v12.575a.7.7 0 0 1-1.05.607L4 9.149V14.3a.7.7 0 0 1-.7.7H1.7a.7.7 0 0 1-.7-.7V1.7a.7.7 0 0 1 .7-.7h1.6z" /></svg>,
  next: <svg viewBox="0 0 16 16"><path d="M12.7 1a.7.7 0 0 0-.7.7v5.15L2.05 1.107A.7.7 0 0 0 1 1.712v12.575a.7.7 0 0 0 1.05.607L12 9.149V14.3a.7.7 0 0 0 .7.7h1.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-1.6z" /></svg>,
  play: <svg viewBox="0 0 16 16"><path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.287V1.713z" /></svg>,
  pause: <svg viewBox="0 0 16 16"><path d="M2.7 1a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7H2.7zm8 0a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-2.6z" /></svg>,
};

/**
 * Spotify-style "now playing" bar. The scroll position is the playhead:
 * chapter title on the left, progress in the middle, prev/next/play controls.
 * "Play" gently auto-scrolls the story; any wheel/touch/key input pauses it.
 */
export default function PlayerBar({ progress, activeId }) {
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);
  const idx = Math.max(0, CHAPTERS.findIndex((c) => c.id === activeId));
  const chapter = CHAPTERS[idx];

  const go = (i) => {
    const c = CHAPTERS[Math.min(CHAPTERS.length - 1, Math.max(0, i))];
    document.getElementById(c.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    if (!playing) return undefined;
    const stop = () => setPlaying(false);
    const tick = () => {
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atEnd) return stop();
      window.scrollBy(0, 1.4);
      raf.current = requestAnimationFrame(tick);
      return undefined;
    };
    raf.current = requestAnimationFrame(tick);
    ['wheel', 'touchstart', 'keydown'].forEach((e) => window.addEventListener(e, stop, { passive: true }));
    return () => {
      cancelAnimationFrame(raf.current);
      ['wheel', 'touchstart', 'keydown'].forEach((e) => window.removeEventListener(e, stop));
    };
  }, [playing]);

  return (
    <footer className="player" aria-label="Story player">
      <div className="player__now">
        <div className="player__art" style={{ background: chapter.color }} aria-hidden="true">{chapter.n}</div>
        <div style={{ minWidth: 0 }}>
          <div className="player__title">{chapter.title}</div>
          <div className="player__sub">{chapter.arc} · chapter {chapter.n} of {CHAPTERS.length}</div>
        </div>
      </div>
      <div className="player__center">
        <div className="player__buttons">
          <button className="icon-btn" onClick={() => go(idx - 1)} aria-label="Previous chapter">{Icon.prev}</button>
          <button className="play-btn" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause auto-scroll' : 'Auto-play the story'}>
            {playing ? Icon.pause : Icon.play}
          </button>
          <button className="icon-btn" onClick={() => go(idx + 1)} aria-label="Next chapter">{Icon.next}</button>
        </div>
        <div className="player__bar">
          <span>{mmss(progress * TOTAL_SECONDS)}</span>
          <div className="progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin="0" aria-valuemax="100" aria-label="Story progress">
            <i style={{ width: `${progress * 100}%` }} />
          </div>
          <span>{mmss(TOTAL_SECONDS)}</span>
        </div>
      </div>
      <div className="player__right">
        <a className="pill" href="#data">About the data</a>
      </div>
    </footer>
  );
}
