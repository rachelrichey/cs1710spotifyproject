// Spotify's iFrame embed API (https://developer.spotify.com/documentation/embeds).
// No account or API key needed: logged-out listeners hear a 30-second preview,
// logged-in listeners hear the full track. The script is only loaded the first
// time someone presses play, so the page stays light.

const SRC = 'https://open.spotify.com/embed/iframe-api/v1';
let apiPromise = null;

export function loadSpotifyApi() {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') { reject(new Error('no window')); return; }
    const prev = window.onSpotifyIframeApiReady;
    window.onSpotifyIframeApiReady = (api) => {
      if (typeof prev === 'function') prev(api);
      resolve(api);
    };
    const s = document.createElement('script');
    s.src = SRC;
    s.async = true;
    s.onerror = () => { apiPromise = null; reject(new Error('Spotify player could not load')); };
    document.head.appendChild(s);
  });
  return apiPromise;
}

export const trackUrl = (id) => `https://open.spotify.com/track/${id}`;
export const searchUrl = (song) => `https://open.spotify.com/search/${encodeURIComponent(`${song.name.split(' (')[0]} ${song.artist.split(',')[0]}`)}`;
