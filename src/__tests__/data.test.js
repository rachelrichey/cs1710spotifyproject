import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const load = (n) => JSON.parse(readFileSync(join(process.cwd(), 'public', 'data', `${n}.json`), 'utf8'));

// These numbers are quoted in our process book. If the pipeline changes and one of
// these fails, either the pipeline broke or the process book needs updating.
describe('pipeline output matches the process book', () => {
  it('sad share of hits: 18% (1960s) -> 45% (2010s) -> 40% (2020-22)', () => {
    const d = load('sad_share').decades;
    expect(d[0].sadShare).toBeCloseTo(0.18, 2);
    expect(d[5].sadShare).toBeCloseTo(0.45, 2);
    expect(d[6].sadShare).toBeCloseTo(0.4, 2);
  });
  it('average hit valence 0.62 -> 0.48, danceability 0.52 -> 0.63, energy 0.53 -> 0.62', () => {
    const p = load('decade_profile');
    expect(p[0].hits.valence).toBeCloseTo(0.62, 2);
    expect(Math.abs(p[6].hits.valence - 0.48)).toBeLessThan(0.006); // 0.475 rounds to 0.48
    expect(p[0].hits.danceability).toBeCloseTo(0.52, 2);
    expect(p[6].hits.danceability).toBeCloseTo(0.63, 2);
    expect(p[0].hits.energy).toBeCloseTo(0.53, 2);
    expect(p[6].hits.energy).toBeCloseTo(0.62, 2);
  });
  it('most genres got sadder, dub fell from 0.77 to 0.33', () => {
    const s = load('genre_shift');
    expect(s.shareSadder).toBeGreaterThan(0.8);
    expect(s.genres[0].genre).toBe('dub');
    expect(s.genres[0].pre).toBeCloseTo(0.77, 2);
    expect(s.genres[0].post).toBeCloseTo(0.33, 2);
  });
  it('hook songs and takeaways', () => {
    const h = load('hook');
    expect(h.then.valence).toBeCloseTo(0.94, 2);
    expect(h.now.valence).toBeCloseTo(0.24, 2);
    expect(h.nowIsMostPopular).toBe(true);
    const t = load('takeaways');
    expect(t.instrumentalAll).toBeCloseTo(0.185, 2);
    expect(t.instrumentalTop1).toBeCloseTo(0.018, 2);
    expect(t.genreExplains).toBeCloseTo(0.25, 2);
  });
});

describe('data integrity', () => {
  it('has 114 genres with valid 0-1 moods', () => {
    const g = load('genres');
    expect(g).toHaveLength(114);
    g.forEach((x) => {
      expect(x.valence).toBeGreaterThanOrEqual(0);
      expect(x.valence).toBeLessThanOrEqual(1);
      expect(x.energy).toBeGreaterThanOrEqual(0);
      expect(x.energy).toBeLessThanOrEqual(1);
    });
  });
  it('hits are all popular and inside the story window', () => {
    const { cols, rows } = load('hits');
    const iy = cols.indexOf('year'), ip = cols.indexOf('popularity');
    expect(rows.length).toBeGreaterThan(9000);
    rows.forEach((r) => {
      expect(r[ip]).toBeGreaterThanOrEqual(60);
      expect(r[iy]).toBeGreaterThanOrEqual(1960);
      expect(r[iy]).toBeLessThanOrEqual(2022);
    });
  });
  it('every burst has 28 sampled tracks and a valid nearest genre', () => {
    const b = load('bursts');
    const names = new Set(b.map((x) => x.genre));
    b.forEach((x) => {
      expect(x.tracks.length).toBe(28);
      expect(names.has(x.nearest)).toBe(true);
    });
  });
});
