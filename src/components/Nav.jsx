import { CHAPTERS } from '../chapters.js';

export function Logo() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="48" fill="#1ed760" />
      <path d="M26 38c16-5 33-3 48 4M30 52c13-4 27-2 39 4M34 65c10-3 20-1 29 3" stroke="#121212" strokeWidth="7" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default function Nav({ active }) {
  return (
    <header className="nav">
      <a className="brand" href="#top" aria-label="Sadder, Not Slower: back to top">
        <Logo />
        <span>Sadder, Not Slower</span>
      </a>
      <nav className="nav__links" aria-label="Chapters">
        {CHAPTERS.filter((c) => c.n <= 8 || c.id === 'bursts').map((c) => (
          <a key={c.id} href={`#${c.id}`} className={`pill ${active === c.id ? 'is-active' : ''}`}>
            {c.nav}
          </a>
        ))}
      </nav>
    </header>
  );
}
