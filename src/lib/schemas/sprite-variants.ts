// Port of the original HexHive SpriteVariant tree as runtime constants.
// Shape: { [type]: { [subtype]: { variant: undefined | 'string' | string[] } } }
//   - variant === undefined  → no variant allowed
//   - variant === 'string'   → free-form string
//   - variant is an array    → must be one of the listed values

import { HUMAN_MOVEMENT } from './asset-vocab';

export type VariantSpec = { variant?: undefined } | { variant: 'string' } | { variant: readonly string[] };

export const SPRITE_VARIANTS = {
  Battle: {
    Attack: { variant: undefined },
    Background: { variant: 'string' },
    Other: { variant: 'string' },
    Pokeball: { variant: 'string' },
    Pokemon: { variant: ['Back', 'Front'] as const },
    Trainer: { variant: ['Back', 'Front'] as const },
  },
  Environment: {
    Object: { variant: ['HM', 'Item'] as const },
    Other: { variant: 'string' },
    Preview: { variant: 'string' },
    Tiles: { variant: 'string' },
  },
  GameIntro: {
    Background: { variant: 'string' },
    Particles: { variant: 'string' },
    'Publisher Splash Screens': { variant: 'string' },
    Sprite: { variant: 'string' },
    Text: { variant: 'string' },
  },
  Menu: {
    Item: { variant: undefined },
    Mugshots: { variant: ['Battle', 'Dialogue'] as const },
    Other: { variant: 'string' },
    Player: { variant: ['New Game', 'Trainer Card'] as const },
    Pokemon: { variant: ['Animated', 'Static'] as const },
  },
  Overworld: {
    NPC: { variant: HUMAN_MOVEMENT },
    Other: { variant: 'string' },
    Player: { variant: HUMAN_MOVEMENT },
    Pokemon: { variant: ['Follower', 'Land', 'Surfing'] as const },
  },
  UI: {
    Bag: { variant: ['Female', 'Male'] as const },
    Box: { variant: 'string' },
    Case: { variant: 'string' },
    Custom: { variant: 'string' },
    Menu: { variant: 'string' },
    Pokedex: { variant: 'string' },
    PokeNav: { variant: 'string' },
    'Town Map': { variant: 'string' },
  },
} as const satisfies Record<string, Record<string, VariantSpec>>;

export const SPRITE_MAP_CATEGORY = ['animated', 'animatedShiny', 'default', 'shiny'] as const;
export type SpriteMapCategory = (typeof SPRITE_MAP_CATEGORY)[number];

export type SpriteType = keyof typeof SPRITE_VARIANTS;
export type SpriteSubtype<T extends SpriteType> = keyof (typeof SPRITE_VARIANTS)[T];

export function validateTriple(
  type: string,
  subtype: string,
  variant: unknown,
): { ok: true } | { ok: false; error: string; path: 'type' | 'subtype' | 'variant' } {
  const types = SPRITE_VARIANTS as unknown as Record<string, Record<string, VariantSpec>>;
  if (!(type in types)) return { ok: false, error: `Invalid sprite type: "${type}"`, path: 'type' };
  if (!(subtype in types[type])) {
    return { ok: false, error: `Invalid subtype "${subtype}" for type "${type}"`, path: 'subtype' };
  }
  const spec = types[type][subtype];

  if (spec.variant === undefined) {
    if (variant !== undefined && variant !== null && variant !== '' && !(Array.isArray(variant) && !variant.length)) {
      return { ok: false, error: `No variant expected for ${type}/${subtype}`, path: 'variant' };
    }
    return { ok: true };
  }

  const empty =
    variant === undefined ||
    variant === null ||
    (typeof variant === 'string' && variant.trim() === '') ||
    (Array.isArray(variant) && variant.length === 0);
  if (empty) return { ok: false, error: `Variant required for ${type}/${subtype}`, path: 'variant' };

  if (spec.variant === 'string') return { ok: true };

  const allowed = spec.variant as readonly string[];
  const check = (v: unknown): boolean => typeof v === 'string' && allowed.includes(v);

  if (typeof variant === 'string')
    return check(variant)
      ? { ok: true }
      : { ok: false, error: `Invalid variant "${variant}" for ${type}/${subtype}`, path: 'variant' };
  if (Array.isArray(variant)) {
    for (const v of variant)
      if (!check(v)) return { ok: false, error: `Invalid variant "${v}" for ${type}/${subtype}`, path: 'variant' };
    return { ok: true };
  }
  if (typeof variant === 'object' && variant !== null) {
    for (const arr of Object.values(variant as Record<string, unknown>)) {
      const list = Array.isArray(arr) ? arr : [arr];
      for (const v of list)
        if (!check(v))
          return { ok: false, error: `Invalid variant "${String(v)}" for ${type}/${subtype}`, path: 'variant' };
    }
    return { ok: true };
  }
  return { ok: false, error: `Variant must be a string, array, or object`, path: 'variant' };
}
