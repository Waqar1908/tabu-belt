export interface Chapter {
  index: string;
  label: string;
  title: string;
  body: string;
  side: 'left' | 'right';
  height: number; // vh of scroll the chapter occupies
  specs: { k: string; v: string }[];
}

export const CHAPTERS: Chapter[] = [
  {
    index: '01',
    label: 'Craftsmanship',
    title: 'Cut by hand.\nStitched to outlast us.',
    body: 'Each strap is taken from a single full-grain calfskin hide, edge-burnished with beeswax and saddle-stitched with waxed linen thread — twenty-four stitches to every ten centimetres.',
    side: 'left',
    height: 140,
    specs: [
      { k: 'Hide', v: 'Full-grain Italian calfskin' },
      { k: 'Thread', v: 'Waxed linen, hand-saddled' },
    ],
  },
  {
    index: '02',
    label: 'Engineering',
    title: 'Precision, to\nthe tenth of a millimetre.',
    body: 'A 3.5 cm strap bonded around a vegetable-tanned core. The frame is machined rather than cast, then polished by hand until it holds a reflection.',
    side: 'right',
    height: 170,
    specs: [
      { k: 'Core', v: 'Bonded double layer, 4 mm' },
      { k: 'Frame', v: 'Solid brass, 24k gold finish' },
      { k: 'Pin', v: 'Spring-tempered, six positions' },
    ],
  },
  {
    index: '03',
    label: 'Details',
    title: 'Every detail\nis a decision.',
    body: 'Six hand-punched holes. A keeper that never slips. A tip finished by eye, not by machine. Nothing here is accidental, and nothing is left to chance.',
    side: 'left',
    height: 140,
    specs: [
      { k: 'Made in', v: 'Firenze, Italia' },
      { k: 'At the bench', v: '14 hours' },
      { k: 'Guarantee', v: 'For life' },
    ],
  },
];
