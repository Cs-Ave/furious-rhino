// Cartoon character art as inline SVG strings, rasterized by Phaser's SVG
// loader in BootScene.preload(). No external asset files.

// Shared rhino palette — light tones on purpose: the fury tint multiplies
// (white -> red), so light grays show the red flush without going dark.
const R = {
  body: '#c9c9cd',
  belly: '#e0e0e4',
  shade: '#a8a8ae',
  outline: '#4a4a50',
  horn: '#eae4d3',
  hornShade: '#cfc7ae',
  hoof: '#6b6b71',
};

// One SVG per run frame; only the legs (and a 2px body bob on frame 1)
// change so the origin and physics body never shift between frames.
function rhinoFrame(legs, bob = 0) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 64" width="96" height="64">
  <g transform="translate(0 ${bob})">
    <!-- tail -->
    <path d="M14 26 Q4 22 6 34" fill="none" stroke="${R.outline}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="6" cy="35" r="3" fill="${R.shade}" stroke="${R.outline}" stroke-width="1.5"/>
    ${legs}
    <!-- body -->
    <ellipse cx="44" cy="32" rx="32" ry="19" fill="${R.body}" stroke="${R.outline}" stroke-width="3"/>
    <ellipse cx="42" cy="40" rx="24" ry="10" fill="${R.belly}"/>
    <!-- skin folds -->
    <path d="M30 22 Q34 28 30 36" fill="none" stroke="${R.shade}" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M40 20 Q44 27 40 38" fill="none" stroke="${R.shade}" stroke-width="2.5" stroke-linecap="round"/>
    <!-- head lowered forward (charging) -->
    <path d="M62 16 Q78 12 88 28 Q94 38 92 46 Q86 52 74 50 Q62 46 60 34 Z"
          fill="${R.body}" stroke="${R.outline}" stroke-width="3" stroke-linejoin="round"/>
    <!-- main horn -->
    <path d="M82 30 Q88 22 95 12 Q94 26 88 34 Z" fill="${R.horn}" stroke="${R.outline}" stroke-width="2.5" stroke-linejoin="round"/>
    <!-- rear horn bump -->
    <path d="M74 24 Q77 18 80 22 Q79 27 74 28 Z" fill="${R.hornShade}" stroke="${R.outline}" stroke-width="2"/>
    <!-- ear -->
    <path d="M64 16 Q62 6 70 10 Q72 15 67 18 Z" fill="${R.shade}" stroke="${R.outline}" stroke-width="2.5"/>
    <!-- eye + angry brow -->
    <circle cx="74" cy="27" r="4.5" fill="#ffffff" stroke="${R.outline}" stroke-width="1.5"/>
    <circle cx="76" cy="28" r="2" fill="#1c1c20"/>
    <path d="M68 21 L80 24" stroke="${R.outline}" stroke-width="3.5" stroke-linecap="round"/>
    <!-- nostril (smoke anchor ~x89 y42) -->
    <ellipse cx="89" cy="42" rx="3" ry="2" fill="#3a3a40"/>
    <!-- mouth -->
    <path d="M84 47 Q80 49 76 48" fill="none" stroke="${R.outline}" stroke-width="2" stroke-linecap="round"/>
  </g>
</svg>`;
}

function leg(x, y1, y2, lean = 0) {
  return `<path d="M${x} ${y1} L${x + lean} ${y2}" stroke="${R.body}" stroke-width="10" stroke-linecap="round"/>
  <path d="M${x} ${y1} L${x + lean} ${y2}" stroke="${R.outline}" stroke-width="10" stroke-linecap="round" fill="none" opacity="0.25"/>
  <rect x="${x + lean - 5}" y="${y2 - 3}" width="10" height="7" rx="2" fill="${R.hoof}"/>`;
}

const LEGS_REACH = leg(64, 40, 58, 8) + leg(52, 42, 56, -8) + leg(30, 40, 58, 6) + leg(18, 42, 56, -6);
const LEGS_PASS = leg(62, 42, 58, 0) + leg(52, 43, 57, 1) + leg(28, 42, 58, 0) + leg(20, 43, 57, -1);
const LEGS_REACH2 = leg(64, 42, 56, -8) + leg(52, 40, 58, 8) + leg(30, 42, 56, -6) + leg(18, 40, 58, 6);

// Front-facing face for the dash cooldown icon; one template, two palettes.
function faceSvg(p) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
  <g opacity="${p.alpha}">
    <!-- ears -->
    <ellipse cx="11" cy="11" rx="8" ry="9" fill="${p.shade}" stroke="${p.outline}" stroke-width="2.5"/>
    <ellipse cx="49" cy="11" rx="8" ry="9" fill="${p.shade}" stroke="${p.outline}" stroke-width="2.5"/>
    <ellipse cx="11" cy="12" rx="3.5" ry="4.5" fill="${p.inner}"/>
    <ellipse cx="49" cy="12" rx="3.5" ry="4.5" fill="${p.inner}"/>
    <!-- head -->
    <path d="M8 22 Q8 8 30 8 Q52 8 52 22 L52 36 Q52 44 44 46 L16 46 Q8 44 8 36 Z"
          fill="${p.body}" stroke="${p.outline}" stroke-width="3" stroke-linejoin="round"/>
    <!-- muzzle -->
    <path d="M14 38 Q14 30 30 30 Q46 30 46 38 L46 50 Q46 57 30 57 Q14 57 14 50 Z"
          fill="${p.muzzle}" stroke="${p.outline}" stroke-width="3" stroke-linejoin="round"/>
    <!-- horn over the muzzle -->
    <path d="M25 36 L30 16 L35 36 Q30 40 25 36 Z" fill="${p.horn}" stroke="${p.outline}" stroke-width="2.5" stroke-linejoin="round"/>
    <!-- nostrils -->
    <ellipse cx="22" cy="49" rx="4" ry="3" fill="${p.dark}"/>
    <ellipse cx="38" cy="49" rx="4" ry="3" fill="${p.dark}"/>
    <!-- angry V brows + eyes -->
    <path d="M10 22 L24 27" stroke="${p.outline}" stroke-width="4" stroke-linecap="round"/>
    <path d="M50 22 L36 27" stroke="${p.outline}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="19" cy="28" r="3.5" fill="#ffffff" stroke="${p.outline}" stroke-width="1.5"/>
    <circle cx="41" cy="28" r="3.5" fill="#ffffff" stroke="${p.outline}" stroke-width="1.5"/>
    <circle cx="20" cy="29" r="1.8" fill="${p.pupil}"/>
    <circle cx="40" cy="29" r="1.8" fill="${p.pupil}"/>
  </g>
</svg>`;
}

const FACE_FULL = faceSvg({
  alpha: 1, body: R.body, shade: R.shade, muzzle: R.belly, horn: R.horn,
  inner: '#9a9aa0', outline: R.outline, dark: '#3a3a40', pupil: '#cc2222',
});
const FACE_EMPTY = faceSvg({
  alpha: 0.45, body: '#777777', shade: '#5f5f5f', muzzle: '#8a8a8a', horn: '#909090',
  inner: '#555555', outline: '#3d3d3d', dark: '#2c2c2c', pupil: '#555555',
});

const LION = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 56" width="70" height="56">
  <!-- tail -->
  <path d="M10 30 Q2 26 4 18" fill="none" stroke="#e8a33d" stroke-width="4" stroke-linecap="round"/>
  <circle cx="4" cy="16" r="4" fill="#a35c1f"/>
  <!-- legs -->
  <rect x="14" y="38" width="7" height="16" rx="3" fill="#e8a33d" stroke="#5a3a10" stroke-width="2"/>
  <rect x="30" y="38" width="7" height="16" rx="3" fill="#e8a33d" stroke="#5a3a10" stroke-width="2"/>
  <!-- body -->
  <ellipse cx="27" cy="32" rx="20" ry="13" fill="#e8a33d" stroke="#5a3a10" stroke-width="2.5"/>
  <!-- scalloped mane -->
  <path d="M50 8 Q58 6 58 14 Q66 14 62 22 Q70 26 62 31 Q66 40 57 40 Q57 48 49 45 Q44 52 39 45 Q31 48 32 39 Q24 38 28 30 Q22 25 30 21 Q28 12 36 14 Q38 5 45 9 Q47 5 50 8 Z"
        fill="#a35c1f" stroke="#5a3a10" stroke-width="2.5" stroke-linejoin="round"/>
  <!-- face -->
  <circle cx="46" cy="27" r="12" fill="#f0b95a" stroke="#5a3a10" stroke-width="2.5"/>
  <ellipse cx="46" cy="33" rx="6" ry="4.5" fill="#f7d9a4"/>
  <path d="M46 30 L44 33 L48 33 Z" fill="#5a3a10"/>
  <path d="M46 33 L46 35 M46 35 Q43 38 41 36 M46 35 Q49 38 51 36" fill="none" stroke="#5a3a10" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="41" cy="24" r="2" fill="#2e1d08"/>
  <circle cx="51" cy="24" r="2" fill="#2e1d08"/>
</svg>`;

const ZEBRA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 76 50" width="76" height="50">
  <!-- tail -->
  <path d="M8 22 Q3 26 5 33" fill="none" stroke="#1c1c1c" stroke-width="3" stroke-linecap="round"/>
  <!-- legs -->
  <rect x="14" y="32" width="6" height="17" rx="2" fill="#ffffff" stroke="#1c1c1c" stroke-width="2"/>
  <rect x="26" y="33" width="6" height="16" rx="2" fill="#ffffff" stroke="#1c1c1c" stroke-width="2"/>
  <rect x="42" y="33" width="6" height="16" rx="2" fill="#ffffff" stroke="#1c1c1c" stroke-width="2"/>
  <rect x="52" y="32" width="6" height="17" rx="2" fill="#ffffff" stroke="#1c1c1c" stroke-width="2"/>
  <!-- body -->
  <ellipse cx="36" cy="24" rx="26" ry="13" fill="#ffffff" stroke="#1c1c1c" stroke-width="2.5"/>
  <!-- neck + head -->
  <path d="M56 18 Q62 8 70 8 Q76 10 74 16 Q72 22 64 24 Q58 24 56 18 Z" fill="#ffffff" stroke="#1c1c1c" stroke-width="2.5"/>
  <path d="M70 14 L75 17 L71 19 Z" fill="#4a4a4a"/>
  <circle cx="68" cy="13" r="1.8" fill="#1c1c1c"/>
  <path d="M63 7 L61 2 L66 5 Z" fill="#1c1c1c"/>
  <!-- mane -->
  <path d="M56 17 Q58 10 62 7 L64 10 Q60 13 59 19 Z" fill="#1c1c1c"/>
  <!-- stripes -->
  <path d="M18 13 Q16 24 19 35" fill="none" stroke="#1c1c1c" stroke-width="4" stroke-linecap="round"/>
  <path d="M27 11 Q25 24 28 36" fill="none" stroke="#1c1c1c" stroke-width="4" stroke-linecap="round"/>
  <path d="M36 11 Q34 24 37 36" fill="none" stroke="#1c1c1c" stroke-width="4" stroke-linecap="round"/>
  <path d="M45 12 Q43 23 46 34" fill="none" stroke="#1c1c1c" stroke-width="4" stroke-linecap="round"/>
  <path d="M53 14 Q51 22 54 30" fill="none" stroke="#1c1c1c" stroke-width="4" stroke-linecap="round"/>
</svg>`;

const MONKEY = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 56" width="48" height="56">
  <!-- S-curled tail -->
  <path d="M34 40 Q46 36 42 26 Q39 19 44 14" fill="none" stroke="#8a5a2b" stroke-width="4" stroke-linecap="round"/>
  <!-- body (sitting) -->
  <ellipse cx="22" cy="42" rx="14" ry="12" fill="#8a5a2b" stroke="#4c2e10" stroke-width="2.5"/>
  <ellipse cx="22" cy="46" rx="8" ry="6" fill="#d9b98c"/>
  <!-- arms -->
  <path d="M12 38 Q8 46 14 50" fill="none" stroke="#8a5a2b" stroke-width="5" stroke-linecap="round"/>
  <path d="M32 38 Q36 46 30 50" fill="none" stroke="#8a5a2b" stroke-width="5" stroke-linecap="round"/>
  <!-- ears -->
  <circle cx="8" cy="16" r="6" fill="#8a5a2b" stroke="#4c2e10" stroke-width="2.5"/>
  <circle cx="36" cy="16" r="6" fill="#8a5a2b" stroke="#4c2e10" stroke-width="2.5"/>
  <circle cx="8" cy="16" r="2.5" fill="#d9b98c"/>
  <circle cx="36" cy="16" r="2.5" fill="#d9b98c"/>
  <!-- head -->
  <circle cx="22" cy="17" r="12" fill="#8a5a2b" stroke="#4c2e10" stroke-width="2.5"/>
  <!-- tan face patch -->
  <path d="M13 20 Q13 11 22 11 Q31 11 31 20 Q31 27 22 27 Q13 27 13 20 Z" fill="#d9b98c"/>
  <circle cx="18" cy="17" r="2" fill="#2e1d08"/>
  <circle cx="26" cy="17" r="2" fill="#2e1d08"/>
  <ellipse cx="22" cy="22" rx="2" ry="1.3" fill="#4c2e10"/>
  <path d="M19 25 Q22 27 25 25" fill="none" stroke="#4c2e10" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

const GIRAFFE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 90" width="60" height="90">
  <!-- tail -->
  <path d="M12 56 Q6 62 8 70" fill="none" stroke="#b97a2f" stroke-width="3" stroke-linecap="round"/>
  <!-- legs -->
  <rect x="16" y="66" width="6" height="23" rx="2" fill="#f2c869" stroke="#7a4c14" stroke-width="2"/>
  <rect x="27" y="67" width="6" height="22" rx="2" fill="#f2c869" stroke="#7a4c14" stroke-width="2"/>
  <rect x="38" y="66" width="6" height="23" rx="2" fill="#f2c869" stroke="#7a4c14" stroke-width="2"/>
  <!-- body -->
  <ellipse cx="30" cy="58" rx="19" ry="13" fill="#f2c869" stroke="#7a4c14" stroke-width="2.5"/>
  <!-- long neck -->
  <path d="M40 50 Q46 30 44 14 L36 12 Q34 32 26 48 Z" fill="#f2c869" stroke="#7a4c14" stroke-width="2.5" stroke-linejoin="round"/>
  <!-- head -->
  <path d="M34 12 Q34 4 42 4 Q52 4 52 11 Q52 17 44 17 Q36 17 34 12 Z" fill="#f2c869" stroke="#7a4c14" stroke-width="2.5"/>
  <!-- ossicones + ear -->
  <path d="M38 6 L37 3" stroke="#7a4c14" stroke-width="2" stroke-linecap="round"/>
  <path d="M44 5 L44 2" stroke="#7a4c14" stroke-width="2" stroke-linecap="round"/>
  <circle cx="37" cy="3" r="2" fill="#b97a2f"/>
  <circle cx="44" cy="2" r="2" fill="#b97a2f"/>
  <path d="M34 8 Q29 6 30 11 Z" fill="#f2c869" stroke="#7a4c14" stroke-width="2"/>
  <circle cx="46" cy="9" r="2" fill="#2e1d08"/>
  <ellipse cx="51" cy="13" rx="2" ry="1.5" fill="#7a4c14"/>
  <!-- patch spots -->
  <path d="M22 52 q6 -3 8 3 q-2 6 -8 4 q-4 -3 0 -7 Z" fill="#b97a2f"/>
  <path d="M34 60 q6 -2 7 3 q-1 5 -7 4 q-4 -3 0 -7 Z" fill="#b97a2f"/>
  <path d="M38 38 q5 -2 6 2 q-1 5 -6 4 q-3 -3 0 -6 Z" fill="#b97a2f"/>
  <path d="M40 24 q4 -2 5 2 q-1 4 -5 3 q-3 -2 0 -5 Z" fill="#b97a2f"/>
</svg>`;

function birdSvg(wing) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 32" width="44" height="32">
  <!-- tail feathers -->
  <path d="M8 16 L0 10 L4 16 L0 20 Z" fill="#3a6fc0" stroke="#26518f" stroke-width="1.5"/>
  <!-- body -->
  <ellipse cx="22" cy="18" rx="14" ry="10" fill="#4f8fe8" stroke="#26518f" stroke-width="2.5"/>
  <ellipse cx="24" cy="22" rx="8" ry="5" fill="#ffffff"/>
  ${wing}
  <!-- head -->
  <circle cx="34" cy="12" r="7" fill="#4f8fe8" stroke="#26518f" stroke-width="2.5"/>
  <path d="M40 11 L44 13 L40 15 Z" fill="#f5a623" stroke="#c47f10" stroke-width="1"/>
  <circle cx="35" cy="10" r="1.8" fill="#101820"/>
</svg>`;
}

const BIRD_UP = birdSvg(
  `<path d="M18 14 Q12 2 26 4 Q30 8 24 15 Z" fill="#3a6fc0" stroke="#26518f" stroke-width="2" stroke-linejoin="round"/>`
);
const BIRD_DOWN = birdSvg(
  `<path d="M18 20 Q12 30 26 29 Q30 25 24 18 Z" fill="#3a6fc0" stroke="#26518f" stroke-width="2" stroke-linejoin="round"/>`
);

// Fury flame icon — same stroke weight / style as the face icon.
function fireSvg(p) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
  <g opacity="${p.alpha}">
    <!-- outer flame -->
    <path d="M30 4 Q34 14 42 20 Q52 28 50 40 Q48 54 30 56 Q12 54 10 40 Q8 28 18 20 Q26 14 26 8 Q28 5 30 4 Z"
          fill="${p.outer}" stroke="${p.outline}" stroke-width="3" stroke-linejoin="round"/>
    <!-- side lick -->
    <path d="M44 18 Q48 14 47 9 Q52 15 50 22 Q48 26 44 24 Z" fill="${p.outer}" stroke="${p.outline}" stroke-width="2.5" stroke-linejoin="round"/>
    <!-- mid flame -->
    <path d="M30 18 Q33 26 39 31 Q45 37 42 45 Q39 52 30 53 Q21 52 18 45 Q15 37 21 31 Q27 26 30 18 Z"
          fill="${p.mid}"/>
    <!-- hot core -->
    <path d="M30 32 Q35 38 34 44 Q33 50 30 50 Q27 50 26 44 Q25 38 30 32 Z" fill="${p.core}"/>
  </g>
</svg>`;
}

const FIRE_FULL = fireSvg({
  alpha: 1, outer: '#e8442a', mid: '#f5851f', core: '#ffd94a', outline: '#7a1c0c',
});
const FIRE_EMPTY = fireSvg({
  alpha: 0.45, outer: '#6e6e6e', mid: '#8a8a8a', core: '#a8a8a8', outline: '#3d3d3d',
});

export const SVG_TEXTURES = {
  'rhino-run-0': { w: 96, h: 64, svg: rhinoFrame(LEGS_REACH) },
  'rhino-run-1': { w: 96, h: 64, svg: rhinoFrame(LEGS_PASS, 2) },
  'rhino-run-2': { w: 96, h: 64, svg: rhinoFrame(LEGS_REACH2) },
  'rhino-face-full': { w: 60, h: 60, svg: FACE_FULL },
  'rhino-face-empty': { w: 60, h: 60, svg: FACE_EMPTY },
  'fury-fire-full': { w: 60, h: 60, svg: FIRE_FULL },
  'fury-fire-empty': { w: 60, h: 60, svg: FIRE_EMPTY },
  'animal-lion': { w: 70, h: 56, svg: LION },
  'animal-zebra': { w: 76, h: 50, svg: ZEBRA },
  'animal-monkey': { w: 48, h: 56, svg: MONKEY },
  'animal-giraffe': { w: 60, h: 90, svg: GIRAFFE },
  'animal-bird': { w: 44, h: 32, svg: BIRD_UP },
  'animal-bird-flap': { w: 44, h: 32, svg: BIRD_DOWN },
};
