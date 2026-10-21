import { format } from 'd3-format';
import { scaleLinear } from 'd3-scale';
import { interpolateRgb } from 'd3-interpolate';

export const pct = (x, digits = 0) => `${(x * 100).toFixed(digits)}%`;
export const dec2 = format('.2f');
export const signed2 = (x) => `${x >= 0 ? '+' : '\u2212'}${Math.abs(x).toFixed(2)}`;
export const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const prettyGenre = (g) => g.replace(/-/g, ' ');

// One colour language across the whole site (same as our sketches):
// blue = sad, gold = happy, green = calm / Spotify accent, purple = intense.
export const COLORS = {
  sad: '#509bf5',
  happy: '#ffc864',
  calm: '#1ed760',
  intense: '#a56eff',
  pink: '#f573a0',
  neutral: '#b3b3b3',
};

/** valence 0..1 -> blue (sad) -> light grey -> gold (happy). */
export const moodColor = scaleLinear()
  .domain([0, 0.5, 1])
  .range([COLORS.sad, '#d9dce6', COLORS.happy])
  .interpolate(interpolateRgb)
  .clamp(true);

/** Decade colours for the radar: warm (old) to cool (new). */
export const DECADE_COLORS = {
  '1960s': '#ffb454',
  '1970s': '#f7945d',
  '1980s': '#f573a0',
  '1990s': '#c77dff',
  '2000s': '#8f8bff',
  '2010s': '#6aa8ff',
  '2020-22': '#2ee6a6',
};
