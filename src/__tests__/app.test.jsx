import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import App from '../App.jsx';
import { CHAPTERS } from '../chapters.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  // serve /data/*.json straight from public/data
  globalThis.fetch = vi.fn(async (url) => {
    const name = String(url).split('/data/')[1];
    const body = readFileSync(join(process.cwd(), 'public', 'data', name), 'utf8');
    return { ok: true, status: 200, json: async () => JSON.parse(body) };
  });
  window.scrollBy = () => {};
  // jsdom has no canvas; the chart skips drawing when getContext returns null
  window.HTMLCanvasElement.prototype.getContext = () => null;
  window.HTMLElement.prototype.scrollIntoView = () => {};
});

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 60)); });

describe('whole site renders', () => {
  it('renders every chapter with real data and no console errors', async () => {
    const errors = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...a) => errors.push(a.join(' ')));
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => root.render(<App />));
    await flush();
    await flush();

    // every chapter exists and is in the nav
    CHAPTERS.forEach((c) => expect(host.querySelector(`#${c.id}`), c.id).not.toBeNull());
    expect(host.querySelectorAll('.nav__links a').length).toBeGreaterThanOrEqual(8);

    // chapter 1: both song cards + headline numbers
    expect(host.textContent).toContain('Bad Moon Rising');
    expect(host.textContent).toContain('Unholy');
    // chapter 2: 114 genre dots
    expect(host.querySelectorAll('#mood-map svg circle').length).toBeGreaterThanOrEqual(114);
    // chapter 3: line chart + decade dots
    expect(host.querySelector('#sadder path[stroke]')).not.toBeNull();
    expect(host.textContent).toContain('Meet the songs');
    // chapter 4: dumbbell rows
    expect(host.querySelectorAll('#genres .dumb-row').length).toBe(10);
    // chapter 5: time map has a slider and corner shares
    expect(host.querySelector('#corner input[type=range]')).not.toBeNull();
    expect(host.querySelectorAll('#corner .quad-share').length).toBe(4);
    // chapter 6: radar chips for 7 decades and a polygon
    expect(host.querySelectorAll('#main .radar__chips .chip').length).toBe(7);
    expect(host.querySelectorAll('#main .radar-poly').length).toBeGreaterThanOrEqual(1);
    // chapter 7: three takeaways
    expect(host.querySelectorAll('#meaning .takeaway').length).toBe(3);
    // chapter 9: novel view gallery
    expect(host.querySelectorAll('#bursts .bursts__cell').length).toBeGreaterThanOrEqual(20);
    expect(host.querySelectorAll('#bursts .burst__ray').length).toBeGreaterThan(500);
    // chapter 10: pipeline
    expect(host.querySelectorAll('#data .pipe__step').length).toBe(4);
    // hero equalizer is data-driven: one bar per year 1960-2022
    expect(host.querySelectorAll('.hero .eq-bar').length).toBe(63);

    expect(errors).toEqual([]);
    spy.mockRestore();
    await act(async () => root.unmount());
  });
});

describe('interactions', () => {
  async function mount() {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => root.render(<App />));
    await flush();
    await flush();
    return { host, root };
  }

  it('dumbbell: search filters, modes switch', async () => {
    const { host, root } = await mount();
    const input = host.querySelector('#genres input[type=search]');
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'dub');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const labels = [...host.querySelectorAll('#genres .row-label')].map((n) => n.textContent);
    expect(labels).toContain('dub');
    expect(labels.every((l) => l.includes('dub'))).toBe(true);
    await act(async () => root.unmount());
  });

  it('radar: clicking a decade chip toggles its polygon', async () => {
    const { host, root } = await mount();
    const before = host.querySelectorAll('#main .radar-poly').length;
    const chip = [...host.querySelectorAll('#main .radar__chips .chip')].find((c) => c.textContent.includes('1990s'));
    await act(async () => chip.click());
    expect(host.querySelectorAll('#main .radar-poly').length).toBe(before + 1);
    await act(async () => chip.click());
    expect(host.querySelectorAll('#main .radar-poly').length).toBe(before);
    await act(async () => root.unmount());
  });

  it('time map: moving the slider changes the year and the shares', async () => {
    const { host, root } = await mount();
    const slider = host.querySelector('#corner input[type=range]');
    const yearBefore = host.querySelector('#corner .timemap__year b').textContent;
    const sharesBefore = [...host.querySelectorAll('#corner .quad-share')].map((n) => n.textContent).join();
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(slider, '2016');
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(host.querySelector('#corner .timemap__year b').textContent).toBe('2016');
    expect(host.querySelector('#corner .timemap__year b').textContent).not.toBe(yearBefore);
    expect([...host.querySelectorAll('#corner .quad-share')].map((n) => n.textContent).join()).not.toBe(sharesBefore);
    await act(async () => root.unmount());
  });

  it('bursts: picking a genre updates the detail panel', async () => {
    const { host, root } = await mount();
    const cell = [...host.querySelectorAll('#bursts .bursts__cell')][0];
    const name = cell.textContent.trim();
    await act(async () => cell.click());
    expect(host.querySelector('#bursts .bursts__big text').textContent.toLowerCase()).toBe(name.toLowerCase());
    await act(async () => root.unmount());
  });

  it('finder: lazily loads the search index and builds a playlist', async () => {
    const { host, root } = await mount();
    // IntersectionObserver is absent in jsdom, so the section counts as "in view" and loads the index
    await flush();
    const input = host.querySelector('#finder input[type=search]');
    expect(input.disabled).toBe(false);
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'unholy');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const add = host.querySelector('#finder .results button');
    expect(add).not.toBeNull();
    await act(async () => add.click());
    expect(host.querySelector('#finder .verdict').textContent).toMatch(/sounds most like the average/);
    await act(async () => root.unmount());
  });
});
