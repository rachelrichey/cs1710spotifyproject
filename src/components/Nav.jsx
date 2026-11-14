import { useEffect, useRef, useState } from 'react';
import { CHAPTERS } from '../chapters.js';

export function Logo() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="48" fill="#1ed760" />
      <path d="M26 38c16-5 33-3 48 4M30 52c13-4 27-2 39 4M34 65c10-3 20-1 29 3" stroke="#121212" strokeWidth="7" strokeLinecap="round" fill="none" />
    </svg>
  );
}

const fmt = (n) => n.toLocaleString();

/**
 * Side-drawer navigation. A floating menu button (top left) opens a panel that slides
 * in from the left with every chapter, the current one highlighted.
 * Closes on a link click, the X, the backdrop, or Escape, and hands focus back to the button.
 */
export default function Nav({ active, meta }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef(null);
  const close = useRef(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open) {
      close.current?.focus();
      const onKey = (e) => e.key === 'Escape' && setOpen(false);
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
    if (wasOpen.current) toggle.current?.focus();
    return undefined;
  }, [open]);
  useEffect(() => { wasOpen.current = open; }, [open]);

  return (
    <header className={`nav ${open ? 'is-open' : ''}`}>
      <button ref={toggle} className="nav__toggle" onClick={() => setOpen(true)}
        aria-expanded={open} aria-controls="nav-drawer" aria-label="Open chapter menu">
        <Logo />
        <span className="nav__burger" aria-hidden="true"><i /><i /><i /></span>
      </button>

      <div className="nav__backdrop" onClick={() => setOpen(false)} aria-hidden="true" />

      <aside id="nav-drawer" className="nav__drawer" role="dialog" aria-modal="true" aria-label="Chapters" aria-hidden={!open}>
        <div className="nav__head">
          <a className="brand" href="#top" onClick={() => setOpen(false)} aria-label="Sadder, Not Slower: back to top">
            <Logo />
            <span>Sadder, Not Slower</span>
          </a>
          <button ref={close} className="nav__close" onClick={() => setOpen(false)} aria-label="Close chapter menu">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" /></svg>
          </button>
        </div>
        <p className="nav__tag">A data story &middot; CS 1710</p>

        <nav className="nav__links" aria-label="Chapters">
          {CHAPTERS.map((c) => (
            <a key={c.id} href={`#${c.id}`} onClick={() => setOpen(false)}
              className={active === c.id ? 'is-active' : ''} aria-current={active === c.id ? 'location' : undefined}>
              <span className="nav__n" style={{ color: c.color }}>{String(c.n).padStart(2, '0')}</span>
              {c.nav}
            </a>
          ))}
        </nav>

        <div className="nav__foot">
          <div>
            <h4>[ The team ]</h4>
            <p>Bahar Moradi, Cate Buchan,<br />Rachel Richey, Miles Schwab</p>
          </div>
          {meta && (
            <div>
              <h4>[ The data ]</h4>
              <p>{fmt(meta.uniqueTracks)} Spotify tracks &middot; {meta.genres} genres<br />Hits from {meta.yearRange[0]}&ndash;{meta.yearRange[1]}</p>
            </div>
          )}
          <p className="nav__copy">Harvard CS 1710</p>
        </div>
      </aside>
    </header>
  );
}
