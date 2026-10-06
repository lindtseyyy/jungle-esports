import { mkdir, writeFile } from 'node:fs/promises';
import { SPECIES } from '../src/render/species';
import { ANIMALS } from '../src/engine/config';
const save = async (path: string, w: number, h: number, content: string) => {
  await mkdir(`assets-src/${path.slice(0, path.lastIndexOf('/'))}`, { recursive: true });
  await writeFile(
    `assets-src/${path}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${content}</svg>`,
  );
};
const bodies = [
  'M8 32C12 4 45 8 70 14C101 4 139 12 143 36C145 53 127 68 104 62L47 64C20 63 4 53 8 32Z',
  'M7 27C12 3 47 6 81 7C116 4 140 16 138 38C139 59 119 65 80 63C45 64 17 62 9 47Z',
  'M7 19C24 11 52 18 80 17C117 7 150 12 161 27C157 39 142 44 122 38L87 36C65 47 40 64 20 56C9 48 4 29 7 19Z',
  'M6 25C15 13 44 10 67 14C95 13 100 26 96 41C85 52 53 48 34 45C11 43 1 35 6 25Z',
  'M7 22C17 2 45 6 61 14L122 33C141 32 143 53 131 61C115 72 87 61 70 51L33 62C9 58 3 40 7 22Z',
];
const heads = [
  'M13 48C8 18 29 5 56 9C84 12 94 31 87 53C87 75 67 93 42 88C23 85 8 71 13 48Z',
  'M13 39L4 52L7 72C26 82 55 79 77 69C98 59 93 25 77 19C52 12 32 24 13 39Z',
  'M16 31C24 9 57 7 72 21C83 32 80 52 68 62L33 68L5 56L7 43Z',
  'M26 25L28 6L39 5L46 21C66 13 80 29 75 48C66 65 44 69 26 53L6 43L10 32Z',
  'M15 33C25 17 51 13 73 22C91 40 85 65 64 76L28 67L2 58L5 44Z',
];
for (let id = 0; id < 5; id++) {
  const a = SPECIES[id];
  const defs = `<defs><linearGradient id="coat" x1="0" y1="0" x2=".3" y2="1"><stop stop-color="${a.coat}"/><stop offset=".46" stop-color="${a.coat}"/><stop offset=".72" stop-color="${a.belly}"/><stop offset="1" stop-color="${a.shadow}"/></linearGradient><radialGradient id="mane"><stop stop-color="#987147"/><stop offset=".65" stop-color="#66452C"/><stop offset="1" stop-color="#352B24"/></radialGradient><filter id="fur" x="-8%" y="-8%" width="116%" height="116%"><feTurbulence baseFrequency=".25" numOctaves="2" seed="${id + 11}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale=".65"/><feColorMatrix in="n" type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".09"/></feComponentTransfer><feComposite in2="SourceGraphic" operator="in"/><feBlend in2="SourceGraphic" mode="soft-light"/></filter></defs>`;
  const paint = (d: string, fill = 'url(#coat)') =>
    `<path d="${d}" fill="${fill}" stroke="${a.shadow}" stroke-width=".7" filter="url(#fur)"/>`;
  let spots = '';
  if (id === 2 || id === 4)
    for (let n = 0; n < (id === 2 ? 48 : 24); n++) {
      const x = 17 + ((n * 31) % (a.length - 30)),
        y = 19 + ((n * 17) % 26);
      spots +=
        id === 2
          ? `<circle cx="${x}" cy="${y}" r="${1.5 + (n % 3) * 0.45}" fill="#302820"/>`
          : `<path d="M${x} ${y}q-5-3-6 2q1 5 6 4q5-3 0-6" fill="#534433"/>`;
    }
  const bristles =
    id === 1 || id === 4
      ? Array.from(
          { length: 26 },
          (_, n) =>
            `<path d="M${20 + n * 3.8} ${id === 4 ? 12 + n * 0.23 : 12}l-4-${6 + (n % 4)}" stroke="${a.shadow}" stroke-width="1.1"/>`,
        ).join('')
      : '';
  await save(
    `animals/${id}/body`,
    a.length,
    78,
    `${defs}<defs><clipPath id="body">${paint(bodies[id])}</clipPath></defs>${paint(bodies[id])}<g clip-path="url(#body)">${spots}</g>${bristles}<path d="M26 20Q50 10 72 21" stroke="${a.belly}" opacity=".3" stroke-width="2" fill="none"/>`,
  );
  const mane =
    id === 0
      ? paint(heads[0], 'url(#mane)') +
        Array.from({ length: 40 }, (_, n) => {
          const t = (n / 40) * Math.PI * 2,
            x = 51 + Math.cos(t) * 31,
            y = 49 + Math.sin(t) * 35;
          return `<path d="M${x} ${y}l${Math.cos(t) * 12} ${Math.sin(t) * 13}" stroke="${n % 2 ? '#B18C59' : '#49362A'}" stroke-width="1.1" opacity=".6"/>`;
        }).join('')
      : '';
  const face = id === 0 ? 'M26 39C26 21 59 23 64 37L58 68C49 77 29 72 20 60L6 56L7 46Z' : heads[id];
  const details =
    id === 1
      ? '<path d="M23 67Q9 47 27 51Q18 40 22 31Q36 53 32 66" fill="#F4E9CF"/><ellipse cx="50" cy="53" rx="8" ry="6" fill="#615549"/><ellipse cx="9" cy="58" rx="4" ry="7" fill="#403B34"/>'
      : id === 2
        ? '<path d="M29 32Q20 47 20 54" stroke="#25241D" stroke-width="4" fill="none"/><g fill="#29251F"><circle cx="50" cy="22" r="2"/><circle cx="64" cy="36" r="2"/><circle cx="52" cy="47" r="1.8"/></g>'
        : id === 4
          ? '<path d="M4 45L27 45L38 65L17 64L2 57Z" fill="#3A352F"/><circle cx="65" cy="32" r="4" fill="#5C4C37"/>'
          : '';
  await save(
    `animals/${id}/head`,
    104,
    100,
    `${defs}${mane}${paint(face)}<path d="M8 50Q26 48 32 62L23 66L7 59Z" fill="${id === 4 ? '#4E4438' : a.belly}"/><path d="M6 47l9 1-5 7Z" fill="#2E2A24"/>${details}<ellipse cx="30" cy="36" rx="4.2" ry="2.8" fill="#D4BB76"/><ellipse cx="29" cy="36" rx="1.2" ry="2.7" fill="#191F1A"/><circle cx="28" cy="35" r=".8" fill="#FFF8D9"/><path d="M14 62Q23 65 31 61" stroke="#44382B" stroke-width=".8" fill="none"/>`,
  );
  await save(
    `animals/${id}/ear`,
    30,
    35,
    `${defs}${paint(id === 4 ? 'M4 29C-5 3 25-3 28 12L23 33Z' : id === 1 ? 'M7 29L3 2L26 15L20 33Z' : 'M5 30C1 11 11 0 24 8L25 31Z')}<path d="M10 26L11 10L20 15L21 28Z" fill="#A77E72" opacity=".7"/>`,
  );
  await save(
    `animals/${id}/jaw`,
    40,
    18,
    `${defs}${paint('M3 3Q21 0 37 5L31 13Q13 20 3 10Z', a.belly)}`,
  );
  await save(
    `animals/${id}/eyes`,
    14,
    9,
    '<ellipse cx="7" cy="5" rx="4" ry="2.3" fill="#D9C491"/><ellipse cx="6" cy="5" rx="1" ry="2.3" fill="#16221C"/><circle cx="5" cy="4" r=".7" fill="#fff"/>',
  );
  for (const [part, len, width] of [
    ['upperleg', a.upper, a.legWidth],
    ['lowerleg', a.lower, a.legWidth * 0.65],
    ['paw', a.paw, a.legWidth * 1.2],
  ] as const) {
    await save(
      `animals/${id}/${part}`,
      32,
      len + 8,
      `${defs}${paint(part === 'paw' ? `M9 2L23 2L27 ${len}Q14 ${len + 6}3 ${len}L5 ${len - 5}Z` : `M${16 - width / 2} 3Q16 -1 ${16 + width / 2} 4L${16 + width * 0.3} ${len + 3}Q16 ${len + 6} ${16 - width * 0.3} ${len + 3}Z`)}${id === 2 ? `<circle cx="17" cy="${len * 0.45}" r="2" fill="#2D2920"/>` : ''}`,
    );
  }
  await save(
    `animals/${id}/tail`,
    140,
    130,
    `${defs}${id === 3 ? paint('M5 102C12 83 37 77 45 58C48 36 38 3 69 6C99 1 131 32 126 61C119 107 70 121 5 112Z') + '<path d="M21 103Q117 93 96 32" fill="none" stroke="#A97462" stroke-width="5" opacity=".5"/>' : `<path d="${id === 1 ? 'M8 114Q25 53 15 7' : id === 4 ? 'M6 100Q44 94 59 64' : 'M7 98C42 122 116 91 123 30'}" fill="none" stroke="${a.coat}" stroke-width="${id === 4 ? 15 : 5}" stroke-linecap="round"/>${id === 0 ? '<path d="M122 17Q138 33 121 46Q112 32 122 17Z" fill="#49382B"/>' : id === 2 ? '<path d="M119 47l8 3M114 62l9 5M108 77l8 7" stroke="#3A3023" stroke-width="5"/>' : ''}`}`,
  );
  const torsoWidth = [45, 52, 28, 35, 42][id];
  await save(
    `animals/${id}/ceremonybody`,
    120,
    190,
    `${defs}${paint(`M${60 - torsoWidth} 31C${60 - torsoWidth - 4} 3 ${60 + torsoWidth + 4} 3 ${60 + torsoWidth} 31L${60 + torsoWidth * 0.75} 134Q87 184 60 182Q30 184 ${60 - torsoWidth * 0.75} 134Z`)}<path d="M44 47Q60 31 77 48L79 145Q61 175 41 148Z" fill="${a.belly}" opacity=".42"/>${id === 2 || id === 4 ? Array.from({ length: 22 }, (_, n) => `<ellipse cx="${34 + ((n * 17) % 53)}" cy="${32 + ((n * 23) % 123)}" rx="${id === 2 ? 2 : 4}" ry="${id === 2 ? 2 : 3}" fill="${id === 2 ? '#302820' : '#534433'}"/>`).join('') : ''}`,
  );
  await save(
    `animals/${id}/bib`,
    48,
    37,
    `<path d="M2 2H46L43 35H5Z" fill="${ANIMALS[id].color}" stroke="#F4E6C5" stroke-width="1.5"/><text x="24" y="27" font-family="sans-serif" font-weight="bold" font-size="25" text-anchor="middle" fill="#17251A">${id + 1}</text>`,
  );
}
await save(
  'env/tree',
  230,
  360,
  '<defs><linearGradient id="bark"><stop stop-color="#333F32"/><stop offset=".45" stop-color="#686953"/><stop offset="1" stop-color="#293D31"/></linearGradient><radialGradient id="c"><stop stop-color="#5B8057"/><stop offset="1" stop-color="#234C3B"/></radialGradient></defs><path d="M83 360Q116 248 102 123L68 67L95 56L124 119L125 62L142 55L142 150Q129 249 157 360Z" fill="url(#bark)"/><path d="M109 169L30 100M135 100L210 64" stroke="#535C43" stroke-width="12" fill="none"/><path d="M1 99Q-20 55 30 43Q37 7 71 16Q94-9 123 12Q178-12 194 24Q245 27 226 68Q211 98 169 90Q136 119 99 94Q44 119 1 99Z" fill="url(#c)"/><path d="M22 52Q42 26 77 36M117 28Q169 10 201 41M31 84Q68 65 96 82" fill="none" stroke="#98A777" stroke-width="2" opacity=".2"/><path d="M103 193L91 332M131 180L142 333" stroke="#A29F70" stroke-width="1" opacity=".2"/>',
);
await save(
  'env/leaf',
  80,
  96,
  '<defs><linearGradient id="l"><stop stop-color="#7C9958"/><stop offset="1" stop-color="#2A5039"/></linearGradient></defs><path d="M7 89Q-8 24 69 5Q87 70 7 89Z" fill="url(#l)"/><path d="M7 89L63 15M24 64L22 37M42 46L62 46M31 56L51 60" stroke="#B0BC80" stroke-width="1" opacity=".5" fill="none"/>',
);
await save(
  'env/monkey',
  80,
  90,
  '<defs><radialGradient id="fur"><stop stop-color="#8B7960"/><stop offset="1" stop-color="#514A39"/></radialGradient></defs><path d="M58 68Q88 89 67 22" stroke="#6C624D" stroke-width="6" fill="none"/><path d="M21 85L29 51L49 46L61 86Z" fill="url(#fur)"/><path d="M29 53L10 79M49 53L72 75" stroke="#72654D" stroke-width="8"/><path d="M18 35Q12 11 35 8Q63 3 65 31L57 54L28 57Z" fill="url(#fur)"/><path d="M25 31Q25 17 37 25Q53 17 57 32L53 48Q38 58 25 45Z" fill="#C1AA83"/><ellipse cx="33" cy="31" rx="3" ry="2" fill="#292F27"/><ellipse cx="48" cy="31" rx="3" ry="2" fill="#292F27"/><path d="M35 41L41 38L45 41M35 46Q41 48 46 45" stroke="#554839" stroke-width="1" fill="none"/>',
);
await save(
  'env/parrot',
  70,
  85,
  '<defs><linearGradient id="feathers"><stop stop-color="#D28A63"/><stop offset=".35" stop-color="#A24833"/><stop offset="1" stop-color="#5B332B"/></linearGradient></defs><path d="M29 72L43 84L44 60Z" fill="#507482"/><path d="M19 57Q12 29 27 12Q45 7 49 36L46 69L27 75Z" fill="url(#feathers)"/><path d="M30 31Q49 25 49 51L39 66L29 43Z" fill="#527E4B"/><path d="M19 19Q0 18 7 36L20 28Z" fill="#C0AF79"/><circle cx="25" cy="19" r="4" fill="#D6C9A7"/><circle cx="24" cy="19" r="2" fill="#26392D"/><path d="M32 41L40 55M29 43L36 58" stroke="#B0B67B" stroke-width="1" opacity=".5"/>',
);
const groundDefs =
  '<defs><linearGradient id="soil" x2="0" y2="1"><stop stop-color="#796B48"/><stop offset=".5" stop-color="#AD9670"/><stop offset="1" stop-color="#796449"/></linearGradient></defs>';
let pebbles = '';
for (let i = 0; i < 180; i++)
  pebbles += `<ellipse cx="${(i * 73) % 800}" cy="${(i * 31) % 250}" rx="${1 + (i % 3)}" ry="1" fill="${i % 2 ? '#DDD0A0' : '#514E3B'}" opacity=".28"/>`;
await save(
  'env/track',
  800,
  260,
  `${groundDefs}<path d="M0 0h800v260H0Z" fill="url(#soil)"/>${pebbles}`,
);
await save(
  'env/sky',
  800,
  440,
  '<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#1B333A"/><stop offset=".65" stop-color="#829E91"/><stop offset="1" stop-color="#CED0A7"/></linearGradient></defs><path d="M0 0h800v440H0Z" fill="url(#sky)"/><circle cx="640" cy="95" r="42" fill="#EDE6B4" opacity=".7"/><path d="M240 0L340 420H450L310 0Z M550 0L680 430H750L605 0Z" fill="#F4EAC5" opacity=".06"/>',
);
for (const [name, color, light] of [
  ['far', '#537A78', '#88A69A'],
  ['mid', '#305D4C', '#618462'],
] as const) {
  let trees = '';
  for (let i = 0; i < 11; i++) {
    const x = i * 77,
      y = 80 + ((i * 29) % 95);
    trees += `<path d="M${x} 300Q${x + 20} ${y} ${x - 10} ${y - 30}L${x + 17} ${y - 30}L${x + 32} 300Z" fill="${color}"/><path d="M${x - 60} ${y + 55}Q${x - 85} ${y + 4} ${x - 27} ${y - 18}Q${x - 13} ${y - 72} ${x + 26} ${y - 48}Q${x + 90} ${y - 47} ${x + 90} ${y + 27}Q${x + 43} ${y + 80} ${x - 60} ${y + 55}Z" fill="${color}"/><path d="M${x - 48} ${y}Q${x} ${y - 50} ${x + 61} ${y - 13}" stroke="${light}" stroke-width="7" opacity=".2" fill="none"/>`;
  }
  await save(`env/${name}`, 800, 300, trees);
}
await save(
  'podium/stump',
  210,
  170,
  '<defs><linearGradient id="b"><stop stop-color="#483A2D"/><stop offset=".4" stop-color="#8D6D46"/><stop offset="1" stop-color="#594432"/></linearGradient><radialGradient id="r"><stop stop-color="#C7AA74"/><stop offset="1" stop-color="#8F744F"/></radialGradient></defs><path d="M10 32H197L184 155Q100 185 21 155Z" fill="url(#b)" stroke="#3C3C2A" stroke-width="1.5"/><ellipse cx="104" cy="35" rx="94" ry="29" fill="url(#r)" stroke="#665236" stroke-width="2"/><ellipse cx="104" cy="35" rx="71" ry="18" fill="none" stroke="#87683F" stroke-width="1"/><ellipse cx="104" cy="35" rx="45" ry="10" fill="none" stroke="#A38959" stroke-width="1"/><path d="M40 68L36 142M84 73L90 157M133 67L128 154M168 66L165 144" stroke="#49392A" stroke-width="2"/>',
);
await save(
  'podium/trophy',
  90,
  112,
  '<defs><linearGradient id="g"><stop stop-color="#846028"/><stop offset=".25" stop-color="#E8C663"/><stop offset=".42" stop-color="#FFF4BE"/><stop offset=".68" stop-color="#D4AF37"/><stop offset="1" stop-color="#87642B"/></linearGradient></defs><path d="M18 9H72V42Q65 67 45 67Q21 60 18 42Z M40 65H50V88H68V105H23V88H40Z" fill="url(#g)" stroke="#9D772E" stroke-width="1"/><path d="M18 17H4Q0 49 23 49M72 17H86Q89 49 67 49" fill="none" stroke="#D4AF37" stroke-width="7"/><path d="M33 17L29 36" stroke="#FFF5B7" stroke-width="2" stroke-linecap="round"/>',
);
for (let rank = 0; rank < 3; rank++) {
  const metal = ['#D4AF37', '#C0C0C0', '#CD7F32'][rank],
    ribbon = ['#547E3B', '#456A92', '#903F3E'][rank];
  await save(
    `podium/medal-${rank + 1}`,
    52,
    72,
    `<defs><linearGradient id="m"><stop stop-color="${metal}"/><stop offset=".38" stop-color="#F8ECD7"/><stop offset=".65" stop-color="${metal}"/><stop offset="1" stop-color="#6C5A43"/></linearGradient></defs><path d="M8 0L23 37L40 0" fill="none" stroke="${ribbon}" stroke-width="10"/><circle cx="26" cy="47" r="21" fill="url(#m)" stroke="${metal}" stroke-width="2"/><circle cx="26" cy="47" r="16" fill="none" stroke="#6D5A40" opacity=".5"/><text x="26" y="55" fill="#65513A" font-size="24" font-family="serif" text-anchor="middle">${rank + 1}</text>`,
  );
}
// Each round downloads just this small extra sheet, while ground/depth geometry is procedural.
for (const [id, key, color] of [
  [0, 'rock', '#8D9485'],
  [1, 'mud', '#674937'],
  [2, 'grass', '#80934F'],
  [3, 'log', '#846044'],
  [4, 'cave', '#55645E'],
] as const) {
  await save(
    `challenges/${id}/detail`,
    160,
    120,
    `<defs><linearGradient id="p"><stop stop-color="${color}"/><stop offset="1" stop-color="#303C31"/></linearGradient></defs>${key === 'rock' ? '<path d="M3 87L24 25L74 7L129 29L155 85L118 114L28 108Z" fill="url(#p)"/><path d="M24 25L78 53L129 29L110 82L28 108Z" fill="#BAC0AB" opacity=".4"/>' : key === 'grass' ? '<path d="M0 120Q12 42 27 14L22 120Q38 27 54 4L46 120Q77 32 81 13L82 120Q112 15 131 3L118 120Q144 66 157 39L153 120Z" fill="url(#p)"/>' : key === 'log' ? '<path d="M14 4H125L153 117H4Z" fill="url(#p)"/><path d="M31 8L20 109M66 7L63 114M104 4L129 113" stroke="#362E25" stroke-width="4"/><path d="M13 13L125 13" stroke="#8F9C62" stroke-width="8"/>' : key === 'mud' ? '<ellipse cx="80" cy="70" rx="76" ry="35" fill="url(#p)"/><ellipse cx="58" cy="54" rx="34" ry="5" fill="#D8B18D" opacity=".3"/>' : '<path d="M0 0H160L127 99L98 32L80 114L56 45L22 81Z" fill="url(#p)"/>'}`,
  );
}
for (let lane = 0; lane < 5; lane++) {
  const grain = Array.from(
    { length: 8 },
    (_, n) =>
      `<path d="M${9 + n * 15} 0Q${6 + n * 15 + (lane % 2 ? 3 : -3)} 45 ${9 + n * 15} 90" stroke="${n % 2 ? '#3F3228' : '#B08C58'}" stroke-width="${n % 3 ? 1 : 2}" opacity=".55"/>`,
  ).join('');
  await save(
    `challenges/3/slice-${lane}`,
    128,
    90,
    `<defs><linearGradient id="wood"><stop stop-color="#4C3A2D"/><stop offset=".3" stop-color="#A88755"/><stop offset=".55" stop-color="#916E45"/><stop offset="1" stop-color="#48372C"/></linearGradient></defs><path d="M0 0H128V90H0Z" fill="url(#wood)"/>${grain}${lane === 4 ? '<ellipse cx="64" cy="73" rx="63" ry="16" fill="#BBA06D"/><ellipse cx="64" cy="73" rx="44" ry="10" fill="none" stroke="#8A6A43" stroke-width="1.5"/><ellipse cx="64" cy="73" rx="22" ry="5" fill="none" stroke="#967A4C"/>' : ''}`,
  );
}
await save(
  'env/light',
  256,
  256,
  '<defs><radialGradient id="light"><stop stop-color="#FFFFFF"/><stop offset=".3" stop-color="#FFFFFF" stop-opacity=".8"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient></defs><circle cx="128" cy="128" r="128" fill="url(#light)"/>',
);
console.log('Authored V2 species, painted environment and challenge sources.');
