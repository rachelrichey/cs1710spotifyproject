import { useEffect, useState } from 'react';

// Every dataset is a small JSON file in /public/data, produced by the Python
// pipeline (see pipeline/ and docs/DATA_PIPELINE.md).  We cache the promise so
// several components can ask for the same file and it is only fetched once.
const cache = new Map();

export function loadJSON(name) {
  if (!cache.has(name)) {
    const base = import.meta.env.BASE_URL || './';
    cache.set(
      name,
      fetch(`${base}data/${name}.json`).then((r) => {
        if (!r.ok) throw new Error(`Could not load data/${name}.json (${r.status})`);
        return r.json();
      }),
    );
  }
  return cache.get(name);
}

/** useData('genres') -> { data, error }   (data is null until loaded) */
export function useData(name, enabled = true) {
  const [state, setState] = useState({ data: null, error: null });
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    loadJSON(name).then(
      (data) => alive && setState({ data, error: null }),
      (error) => alive && setState({ data: null, error }),
    );
    return () => {
      alive = false;
    };
  }, [name, enabled]);
  return state;
}

/** Turn {cols, rows} (compact columnar JSON) into an array of objects. */
export function unpack({ cols, rows }) {
  return rows.map((r) => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
}
