import { useMemo } from 'react';
import { CHAPTERS } from './chapters.js';
import { unpack, useData } from './lib/data.js';
import { useActiveSection, useScrollProgress } from './lib/hooks.js';
import Nav from './components/Nav.jsx';
import PlayerBar from './components/PlayerBar.jsx';
import Hero from './sections/Hero.jsx';
import DataSection from './sections/DataSection.jsx';
import {
  BurstChapter, CornerChapter, FinderChapter, GenreChapter, HookChapter,
  MainChapter, MeaningChapter, MoodMapChapter, SadderChapter,
} from './sections/StorySections.jsx';

const IDS = ['top', ...CHAPTERS.map((c) => c.id)]; // 'top' = hero, so no nav pill is lit there

export default function App() {
  const progress = useScrollProgress();
  const active = useActiveSection(IDS);

  // All of the site's data. Each file is small and produced by the Python pipeline.
  const { data: meta } = useData('meta');
  const { data: hook } = useData('hook');
  const { data: genres } = useData('genres');
  const { data: sad } = useData('sad_share');
  const { data: shift } = useData('genre_shift');
  const { data: hitsRaw } = useData('hits');
  const { data: profile } = useData('decade_profile');
  const { data: takeaways } = useData('takeaways');
  const { data: bursts } = useData('bursts');
  const hits = useMemo(() => (hitsRaw ? unpack(hitsRaw) : null), [hitsRaw]);

  return (
    <>
      <Nav active={active} />
      <main>
        <Hero meta={meta} />
        <HookChapter hook={hook} />
        <MoodMapChapter genres={genres} profile={profile} hook={hook} />
        <SadderChapter sad={sad} />
        <GenreChapter shift={shift} />
        <CornerChapter hits={hits} profile={profile} />
        <MainChapter profile={profile} />
        <MeaningChapter takeaways={takeaways} />
        <FinderChapter profile={profile} />
        <BurstChapter bursts={bursts} />
        <DataSection meta={meta} />
      </main>
      <footer className="footer">
        <div className="footer__inner">
          <div>
            <h4>Sadder, Not Slower</h4>
            <p>CS 1710 final project, Prototype V1.</p>
            <p>Bahar Moradi, Cate Buchan, Rachel Richey, Miles Schwab.</p>
          </div>
          <div>
            <h4>What&rsquo;s in V1</h4>
            <p>Complete data pipeline, eight story charts, and a first version of our novel genre-burst view.</p>
          </div>
          <div>
            <h4>Changed after user testing</h4>
            <p>Playable song cards, a key for how Spotify scores a song, a clearer hook, and a step-by-step guide to the genre bursts.</p>
          </div>
        </div>
      </footer>
      <PlayerBar progress={progress} activeId={active} />
    </>
  );
}
