import { describe, expect, it } from 'vitest';
import { buildOgMeta, escapeAttr } from './seo';

describe('buildOgMeta', () => {
  it('points romhack at /romhacks/', () => {
    const m = buildOgMeta({
      origin: 'https://hexhive.example',
      listingType: 'romhack',
      slug: 'kaizo',
      title: 'Kaizo',
      description: 'hard',
    });
    expect(m.url).toBe('https://hexhive.example/romhacks/kaizo');
    expect(m.title).toBe('Kaizo — HexHive');
  });
  it('plurals asset-hives correctly', () => {
    expect(buildOgMeta({ origin: 'h', listingType: 'sprite', slug: 's', title: 't', description: '' }).url).toBe(
      'h/sprites/s',
    );
    expect(buildOgMeta({ origin: 'h', listingType: 'sound', slug: 's', title: 't', description: '' }).url).toBe(
      'h/sounds/s',
    );
    expect(buildOgMeta({ origin: 'h', listingType: 'script', slug: 's', title: 't', description: '' }).url).toBe(
      'h/scripts/s',
    );
  });
  it('truncates long descriptions', () => {
    const long = 'x'.repeat(500);
    const m = buildOgMeta({ origin: 'h', listingType: 'romhack', slug: 's', title: 't', description: long });
    expect(m.description.length).toBe(280);
  });
  it('uses fallback description when empty', () => {
    const m = buildOgMeta({ origin: 'h', listingType: 'romhack', slug: 's', title: 't', description: '' });
    expect(m.description).toContain('HexHive');
  });
});

describe('escapeAttr', () => {
  it('escapes ampersand, quotes, angle brackets', () => {
    expect(escapeAttr(`<a "x" & 'y'>`)).toBe('&lt;a &quot;x&quot; &amp; &#39;y&#39;&gt;');
  });
});
