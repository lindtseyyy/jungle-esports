// Run once to author the initial SVG library. The build only reads these editable sources.
import { mkdir, writeFile } from 'node:fs/promises';
import { ANIMALS } from '../src/engine/config';
const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const save = async (path: string, w: number, h: number, body: string) => {
  await mkdir(`assets-src/${path.substring(0, path.lastIndexOf('/'))}`, { recursive: true });
  await writeFile(`assets-src/${path}.svg`, svg(w, h, body));
};
for (const a of ANIMALS) {
  const c = a.color,
    dark = ['#AF501D', '#982F38', '#BA8C37', '#695398', '#766956'][a.id],
    pale = ['#FFE1A1', '#F9A58A', '#FFF0BD', '#E0D2FF', '#E4D6B4'][a.id];
  const outline =
    'stroke="#25261D" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"';
  let spots = '';
  if (a.id === 2 || a.id === 4)
    for (let i = 0; i < 8; i++)
      spots += `<ellipse cx="${22 + (i % 4) * 25}" cy="${27 + Math.floor(i / 4) * 20}" rx="5" ry="4" fill="${dark}"/>`;
  await save(
    `animals/${a.id}/body`,
    140,
    88,
    `<g ${outline}><ellipse cx="71" cy="44" rx="62" ry="34" fill="${c}"/><path d="M17 55 Q65 88 125 51 Q113 79 70 81 Q33 79 17 55" fill="${dark}" stroke="none"/>${spots}<path d="M31 24 Q65 14 91 23" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="7"/></g>`,
  );
  const mane =
    a.id === 0
      ? `<path d="M45 4 59 13 77 9 81 24 96 35 85 48 94 67 76 73 68 89 47 82 33 89 23 74 7 68 14 51 5 35 20 26 23 9Z" fill="${dark}" ${outline}/>`
      : '';
  const ears =
    a.id === 3
      ? `<path d="M36 29 31 3 Q47 0 50 29 M62 25 68 3 Q81 3 77 36" fill="${c}" ${outline}/>`
      : `<circle cx="38" cy="20" r="13" fill="${c}" ${outline}/><circle cx="69" cy="20" r="12" fill="${c}" ${outline}/><circle cx="38" cy="20" r="6" fill="${pale}"/>`;
  const snout =
    a.id === 1
      ? `<ellipse cx="20" cy="57" rx="18" ry="14" fill="${pale}" ${outline}/><circle cx="12" cy="55" r="3" fill="#4A2228"/><circle cx="23" cy="55" r="3" fill="#4A2228"/><path d="M28 65 Q19 39 38 54" fill="#fff5d6" ${outline}/>`
      : `<path d="M37 48 Q2 46 7 65 Q18 80 42 67" fill="${pale}" ${outline}/><path d="M6 52 19 52 12 62Z" fill="#25261D"/>`;
  await save(
    `animals/${a.id}/head`,
    104,
    96,
    `${mane}${ears}<ellipse cx="52" cy="49" rx="35" ry="30" fill="${c}" ${outline}/><ellipse cx="56" cy="61" rx="25" ry="16" fill="${pale}"/>${snout}<ellipse cx="37" cy="41" rx="10" ry="12" fill="#fff7db" ${outline}/><ellipse cx="34" cy="43" rx="4" ry="7" fill="#25261D"/><circle cx="33" cy="40" r="2" fill="#fff"/><path d="M26 25 43 28 M22 68 Q35 76 44 64" fill="none" ${outline}/>${a.id === 2 || a.id === 4 ? `<circle cx="67" cy="43" r="4" fill="${dark}"/><circle cx="76" cy="52" r="3" fill="${dark}"/>` : ''}`,
  );
  await save(
    `animals/${a.id}/ear`,
    30,
    35,
    `<path d="M4 28 Q-2 0 15 4 Q32 5 26 31Z" fill="${c}" ${outline}/><path d="M9 23 13 10 21 25Z" fill="${pale}"/>`,
  );
  await save(
    `animals/${a.id}/jaw`,
    52,
    30,
    `<path d="M4 6 Q29 2 47 7 Q44 28 23 26 Q5 24 4 6Z" fill="${pale}" ${outline}/>`,
  );
  await save(
    `animals/${a.id}/eyes`,
    28,
    26,
    `<ellipse cx="14" cy="13" rx="11" ry="11" fill="#fff7db" ${outline}/><ellipse cx="10" cy="14" rx="4" ry="7" fill="#25261D"/><circle cx="9" cy="11" r="2" fill="#fff"/>`,
  );
  await save(
    `animals/${a.id}/upperleg`,
    30,
    44,
    `<path d="M5 4 Q16 -1 26 7 L22 36 Q14 45 7 35Z" fill="${c}" ${outline}/>`,
  );
  await save(
    `animals/${a.id}/lowerleg`,
    34,
    45,
    `<path d="M10 4 23 4 23 29 Q34 28 30 40 L4 40 Q1 30 9 27Z" fill="${c}" ${outline}/><path d="M5 34 29 34 29 39 5 39Z" fill="${dark}" stroke="none"/>`,
  );
  await save(
    `animals/${a.id}/tail`,
    82,
    104,
    a.id === 3
      ? `<path d="M9 85 Q74 98 74 40 Q74 1 41 5 Q14 8 24 37 Q58 19 52 54 Q47 74 8 68Z" fill="${c}" ${outline}/><path d="M33 26 Q66 10 61 52" fill="none" stroke="${pale}" stroke-width="9" stroke-linecap="round"/>`
      : `<path d="M7 78 Q72 75 52 22" fill="none" stroke="${dark}" stroke-width="9" stroke-linecap="round"/><ellipse cx="51" cy="21" rx="10" ry="14" fill="${a.id === 0 ? dark : c}" ${outline}/>`,
  );
}
await save(
  'env/sky',
  800,
  440,
  '<defs><linearGradient id="s" x2="0" y2="1"><stop stop-color="#112f37"/><stop offset="1" stop-color="#57885b"/></linearGradient></defs><path fill="url(#s)" d="M0 0h800v440H0z"/><circle cx="650" cy="85" r="35" fill="#D9E9A9" opacity=".8"/><circle cx="636" cy="74" r="32" fill="#16353B"/><g fill="#E3EDC1" opacity=".55"><circle cx="120" cy="35" r="2"/><circle cx="310" cy="92" r="2"/><circle cx="493" cy="40" r="1.5"/><circle cx="735" cy="145" r="2"/></g>',
);
for (const [name, color, shift] of [
  ['far', '#163C35', 0],
  ['mid', '#224B35', 34],
] as const) {
  let body = '';
  for (let i = 0; i < 9; i++) {
    const x = i * 100;
    body += `<path d="M${x - 20} 300 ${x + 15} ${110 + ((i * 31) % 90) + shift} ${x + 50} 300Z" fill="${color}"/><ellipse cx="${x + 20}" cy="${130 + ((i * 31) % 90) + shift}" rx="80" ry="60" fill="${color}"/><ellipse cx="${x + 35}" cy="${100 + ((i * 31) % 70) + shift}" rx="56" ry="57" fill="${color}"/>`;
  }
  await save(`env/${name}`, 800, 300, body);
}
await save(
  'env/tree',
  230,
  360,
  '<g stroke="#132E27" stroke-width="5"><path d="M80 360 Q119 190 65 62 L123 57 Q109 177 149 360Z" fill="#48533B"/><path d="M103 240 79 99 M126 298 119 160" fill="none" stroke="#667249"/><path d="M95 126 Q52 90 8 95 M104 88 Q178 42 224 70" fill="none" stroke="#48533B" stroke-width="20"/><g fill="#31663F"><ellipse cx="55" cy="72" rx="78" ry="49"/><ellipse cx="156" cy="48" rx="70" ry="47"/><ellipse cx="115" cy="30" rx="70" ry="47"/></g></g><path d="M163 56 Q122 132 154 196" stroke="#87A457" stroke-width="5" fill="none"/>',
);
await save(
  'env/track',
  800,
  260,
  '<path d="M0 0h800v260H0z" fill="#577345"/><path d="M0 30h800v210H0z" fill="#9C8A59"/><path d="M0 32h800" stroke="#ABC574" stroke-width="9"/><g stroke="#746E48" stroke-width="1" opacity=".6"><path d="M0 70h800 M0 112h800 M0 154h800 M0 196h800 M0 238h800"/></g><g fill="#C6AC71" opacity=".5"><ellipse cx="80" cy="98" rx="15" ry="3"/><ellipse cx="310" cy="162" rx="24" ry="3"/><ellipse cx="560" cy="65" rx="18" ry="2"/><ellipse cx="740" cy="220" rx="20" ry="4"/></g>',
);
await save(
  'env/leaf',
  80,
  96,
  '<path d="M7 89 Q-8 24 69 5 Q87 70 7 89Z" fill="#5A9448" stroke="#203E2B" stroke-width="4"/><path d="M7 89 63 15 M24 64 22 37 M42 46 62 46" stroke="#93BB59" stroke-width="3" fill="none"/>',
);
await save(
  'env/monkey',
  80,
  90,
  '<path d="M58 64 Q88 99 67 25" fill="none" stroke="#765C3D" stroke-width="7"/><ellipse cx="41" cy="68" rx="20" ry="21" fill="#765C3D"/><g fill="#91734C" stroke="#2A3525" stroke-width="3"><circle cx="14" cy="28" r="12"/><circle cx="63" cy="28" r="12"/><circle cx="40" cy="30" r="27"/></g><path d="M19 33 Q18 14 39 25 Q61 14 61 33 Q68 59 39 61 Q12 58 19 33" fill="#D5BA7F"/><g fill="#252D23"><circle cx="29" cy="31" r="3"/><circle cx="50" cy="31" r="3"/></g><path d="M28 43 Q40 56 51 43" fill="none" stroke="#513F2D" stroke-width="3"/>',
);
await save(
  'env/parrot',
  70,
  85,
  '<ellipse cx="33" cy="48" rx="19" ry="29" fill="#D95A41" stroke="#203E2B" stroke-width="3"/><path d="M30 28 Q65 24 47 65Z" fill="#6FAC51"/><circle cx="30" cy="20" r="17" fill="#D95A41"/><path d="M14 15 0 24 16 31Z" fill="#E5CA6D"/><circle cx="23" cy="17" r="4" fill="#FFF3C8"/><circle cx="22" cy="17" r="2" fill="#223B2D"/><path d="M30 73 40 83 47 68" fill="#368F97"/>',
);
await save(
  'env/mud',
  256,
  100,
  '<ellipse cx="128" cy="55" rx="126" ry="39" fill="#593F30" stroke="#2E3427" stroke-width="4"/><ellipse cx="126" cy="55" rx="107" ry="27" fill="#78533A"/><g fill="none" stroke="#AC7750" stroke-width="3"><ellipse cx="56" cy="48" rx="13" ry="4"/><ellipse cx="174" cy="62" rx="18" ry="5"/><path d="M94 70q30-13 52 0"/></g>',
);
await save(
  'env/rock',
  160,
  120,
  '<path d="M4 90 23 32 70 9 128 30 155 90 124 113 35 110Z" fill="#87938A" stroke="#293D30" stroke-width="5"/><path d="M23 32 74 52 128 30 93 93 35 110 57 66Z" fill="#A6B1A0"/><path d="M74 52 93 93 124 113" fill="none" stroke="#536A59" stroke-width="4"/>',
);
await save(
  'env/grass',
  200,
  100,
  '<g fill="#608840" stroke="#3A5D30" stroke-width="2"><path d="M0 100 12 19 26 100 38 0 54 100 70 22 87 100 103 8 120 100 140 25 159 100 185 0 195 100Z"/></g><path d="M44 100 48 16 M109 100 113 29 M165 100 180 26" stroke="#ADC56A" stroke-width="3"/>',
);
await save(
  'env/log',
  240,
  140,
  '<path d="M10 40 Q8 9 207 12 L222 122 Q111 156 14 121Z" fill="#775137" stroke="#293D30" stroke-width="5"/><ellipse cx="208" cy="69" rx="28" ry="58" fill="#C39960" stroke="#293D30" stroke-width="5"/><ellipse cx="208" cy="69" rx="18" ry="44" fill="none" stroke="#88633E" stroke-width="4"/><ellipse cx="208" cy="69" rx="9" ry="29" fill="none" stroke="#88633E" stroke-width="3"/><path d="M14 42 171 29 M22 76 177 64 M29 106 178 108" stroke="#4E3E2C" stroke-width="5"/><path d="M27 28 Q98 5 165 22" stroke="#6D974F" stroke-width="14" fill="none"/>',
);
await save(
  'env/cave',
  320,
  260,
  '<path d="M0 256 24 91 74 42 128 8 218 25 286 93 320 256Z" fill="#354E43" stroke="#20372F" stroke-width="5"/><path d="M57 256 77 116 Q159 47 245 114 L277 256Z" fill="#101F23"/><path d="M81 110 107 146 114 91 157 126 176 79 214 139 242 110" fill="#243A35"/><path d="M36 94 71 69 84 91 M224 54 265 91 246 125" fill="none" stroke="#567055" stroke-width="9"/>',
);
await save(
  'podium/stump',
  210,
  170,
  '<path d="M10 32 197 32 184 155 Q100 185 21 155Z" fill="#765137" stroke="#293D30" stroke-width="5"/><ellipse cx="104" cy="35" rx="94" ry="29" fill="#BF9964" stroke="#293D30" stroke-width="5"/><ellipse cx="104" cy="35" rx="71" ry="18" fill="none" stroke="#957148" stroke-width="3"/><path d="M40 68 36 142 M84 73 90 157 M133 67 128 154 M168 66 165 144" stroke="#4F3C2B" stroke-width="5"/>',
);
await save(
  'podium/trophy',
  90,
  112,
  '<g fill="#EFD36B" stroke="#815B24" stroke-width="4"><path d="M18 9h54v33Q65 67 45 67 21 60 18 42Z"/><path d="M18 17H4Q0 49 23 49 M72 17h14Q89 49 67 49" fill="none" stroke="#EFD36B" stroke-width="9"/><path d="M40 65h10v23h18v17H23V88h17Z"/></g><path d="M33 17 29 36" stroke="#FFF3A0" stroke-width="5" stroke-linecap="round"/>',
);
await save(
  'podium/medal',
  52,
  72,
  '<path d="M4 0 22 40 37 4" fill="#C2DE72" stroke="#526F36" stroke-width="8"/><circle cx="26" cy="47" r="21" fill="#EBC95D" stroke="#886326" stroke-width="3"/><path d="M26 34v25 M22 39l4-5" stroke="#886326" stroke-width="4" fill="none"/>',
);
await save(
  'podium/banner',
  520,
  110,
  '<path d="M5 24 505 8 517 81 12 102Z" fill="#7B5336" stroke="#2D3627" stroke-width="6"/><path d="M21 36 492 21 M30 86 491 68" stroke="#A67D4A" stroke-width="3"/><path d="M15 0Q47 34 22 105 M485 0Q456 54 505 109" fill="none" stroke="#6F9850" stroke-width="9"/>',
);
await save(
  'ui/coin',
  64,
  64,
  '<circle cx="32" cy="32" r="28" fill="#EBCB65" stroke="#9D7835" stroke-width="4"/><circle cx="32" cy="32" r="21" fill="none" stroke="#FFF0A1" stroke-width="3"/><path d="M38 19Q18 14 20 27q1 8 20 8 5 18-18 10 M31 13v38" fill="none" stroke="#9D7835" stroke-width="4"/>',
);
for (const [name, body] of [
  [
    'tired',
    '<path d="M13 32q9 8 18 0 M39 32q8 8 16 0" stroke="#AAB2A3" stroke-width="4" fill="none"/><path d="M25 14h17L25 25h17" stroke="#AAB2A3" stroke-width="3" fill="none"/>',
  ],
  ['normal', '<path d="M17 31h30" stroke="#B9C9A8" stroke-width="5" stroke-linecap="round"/>'],
  [
    'hyped',
    '<path d="M33 5Q44 24 39 27 55 17 53 41 48 65 24 56 9 49 19 31L27 20Q23 34 31 35 41 31 33 5Z" fill="#F3AC58"/>',
  ],
] as const)
  await save(`ui/${name}`, 64, 64, body);
for (const value of [10, 50, 100, 500, 1000])
  await save(
    `ui/chip-${value}`,
    64,
    64,
    `<circle cx="32" cy="32" r="27" fill="#344D32" stroke="#B9DE75" stroke-width="4"/><circle cx="32" cy="32" r="20" fill="none" stroke="#B9DE75" stroke-width="2" stroke-dasharray="8 6"/>`,
  );
