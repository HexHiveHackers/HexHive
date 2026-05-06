// Curated suggestion lists ported from hexhivemind/HexHive's `types/listing.d.ts`.
// Most of these are "open" enums — the underlying columns accept any string,
// but the lists power dropdowns / chip suggestions in the upload forms.
// HUMAN_MOVEMENT is the only one the original treated as fully closed.

export const ROMHACK_STATE = [
  'Abandoned',
  'Actively Updated',
  'Alpha',
  'Beta',
  'Buggy',
  'Concept',
  'Demo',
  'Finished',
  'Playable (Completable)',
  'Playable (WIP)',
  'Under Development',
] as const;

export const ROMHACK_CATEGORY = [
  'Balanced',
  'Battle Overhaul',
  'Bugfix',
  'Competitive',
  'Completeable Dex',
  'Custom Types',
  'Demake',
  'Demo',
  'Difficulty',
  'Expanded Dex',
  'Fakemons',
  'Game Jam',
  'Gen 1 mechanics',
  'Gen 2 mechanics',
  'Gen 3 mechanics',
  'Gen 4 mechanics',
  'Gen 5 mechanics',
  'Gen 6 mechanics',
  'Gen 7 mechanics',
  'Gen 8 mechanics',
  'Gen 9 mechanics',
  'Graphics',
  'Humor',
  'MAGM',
  'Modernization',
  'Nuzlocke Mode',
  'Puzzle',
  'Region Conversion',
  'QoL',
  'Story',
  'Type Changes',
  'Typechart Changes',
  'Unbalanced',
  'Unique Mechanics',
  'Unofficial Continuation',
  'Vanilla+',
] as const;

export const SCRIPT_CATEGORY = ['Data Scraping', 'Engine Upgrade', 'Feature', 'Rombase'] as const;

export const SCRIPT_FEATURE = [
  'Ability',
  'Attack',
  'Cutscene',
  'Engine',
  'Gift',
  'Map Event',
  'Miscellaneous',
  'NPC',
  'Shop',
  'Trainer',
  'Tutor',
] as const;

export const SCRIPT_PREREQUISITE = [
  '32MB',
  'CFRU',
  'DPE',
  'HUBOL',
  'JPAN',
  'Leon',
  'Physical/Special Split (PSS)',
  'SCADE',
  'Shinyzer',
] as const;

export const SCRIPT_TOOL = ['AdvanceMap', 'C-Injection', 'HexManiacAdvance', 'HMA Script', 'ModExe', 'Python'] as const;

// Sprite tree leaf vocabularies.
// EnvironmentVariant is open (used by Battle.Background, Environment.Preview/Tiles).
export const ENVIRONMENT_VARIANT = [
  'Building',
  'Cave',
  'Forest',
  'Grass',
  'Gym/League',
  'Indoors',
  'Jungle',
  'Lab',
  'Link Room',
  'Sky',
  'Tundra',
  'Underwater',
  'Volcanic',
  'Water (Surface)',
] as const;

// HumanMovement is CLOSED in the original (used by Overworld.NPC/Player).
export const HUMAN_MOVEMENT = [
  'Biking',
  'Dive',
  'Fishing',
  'Fishing (Surfing)',
  'Running',
  'Surfing',
  'Swimming',
  'Vs Seeker',
  'Vs Seeker (Biking)',
  'Walking',
] as const;
