#!/usr/bin/env node
/**
 * A régi színkártya-képeket (levágott feliratú színminták) valódi színválasztékra cseréli:
 * kód + felület + mintaszín (TemplateMaterialItem.colorOptions). A színek a kártyákról vannak mintavételezve.
 * Futtatás: node scripts/apply-color-charts.mjs   (a seed-legacy-catalog.mjs is meghívja)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PALETTES = {
  "ral25": [
    {
      "code": "RAL 9016",
      "name": "matt",
      "hex": "#f9f9f7"
    },
    {
      "code": "RAL 9010",
      "name": "matt",
      "hex": "#f4f2eb"
    },
    {
      "code": "RAL 9001",
      "name": "matt",
      "hex": "#ece7dc"
    },
    {
      "code": "RAL 1013",
      "name": "matt",
      "hex": "#e5dfcf"
    },
    {
      "code": "RAL 1015",
      "name": "matt",
      "hex": "#e7dac1"
    },
    {
      "code": "VSR 240",
      "name": "szatén",
      "hex": "#d8c7ad"
    },
    {
      "code": "RAL 7035",
      "name": "matt",
      "hex": "#cccecd"
    },
    {
      "code": "RAL 9006",
      "name": "matt",
      "hex": "#aeafb1"
    },
    {
      "code": "RAL 9007",
      "name": "matt",
      "hex": "#8f8f91"
    },
    {
      "code": "RAL 7037",
      "name": "matt",
      "hex": "#8a8b8e"
    },
    {
      "code": "RAL 7001",
      "name": "matt",
      "hex": "#98a1ac"
    },
    {
      "code": "RAL 7012",
      "name": "matt",
      "hex": "#6e757a"
    },
    {
      "code": "DB 703",
      "name": "matt",
      "hex": "#6c6a70"
    },
    {
      "code": "RAL 7015",
      "name": "matt",
      "hex": "#646772"
    },
    {
      "code": "RAL 7024",
      "name": "matt",
      "hex": "#5b5d68"
    },
    {
      "code": "RAL 7016",
      "name": "matt",
      "hex": "#464e5a"
    },
    {
      "code": "RAL 7043",
      "name": "matt",
      "hex": "#434e58"
    },
    {
      "code": "RAL 7021",
      "name": "matt",
      "hex": "#444851"
    },
    {
      "code": "FSM 71319",
      "name": "matt",
      "hex": "#404042"
    },
    {
      "code": "RAL 7022",
      "name": "matt",
      "hex": "#323630"
    },
    {
      "code": "RAL 8014",
      "name": "matt",
      "hex": "#643d25"
    },
    {
      "code": "RAL 8003",
      "name": "matt",
      "hex": "#7c3f18"
    },
    {
      "code": "RAL 8016",
      "name": "matt",
      "hex": "#672b21"
    },
    {
      "code": "RAL 7039",
      "name": "matt",
      "hex": "#60625b"
    },
    {
      "code": "VSR 780",
      "name": "matt",
      "hex": "#4a4538"
    }
  ],
  "gibus": [
    {
      "code": "Corten",
      "name": "rozsdabarna, durva",
      "hex": "#713d16"
    },
    {
      "code": "RAL 7016 Iron",
      "name": "antracit, matt",
      "hex": "#373e41"
    },
    {
      "code": "Carbon",
      "name": "fekete, durva",
      "hex": "#0b0b0e"
    },
    {
      "code": "RAL 9010",
      "name": "fehér, matt",
      "hex": "#f7f6f2"
    },
    {
      "code": "RAL 9010",
      "name": "fehér, fényes",
      "hex": "#ffffff"
    }
  ],
  "selt": [
    {
      "code": "RAL 9010",
      "name": "matt",
      "hex": "#f2f0eb"
    },
    {
      "code": "RAL 9006",
      "name": "matt",
      "hex": "#a9abad"
    },
    {
      "code": "RAL 9005",
      "name": "matt",
      "hex": "#23232b"
    },
    {
      "code": "RAL 7016",
      "name": "matt",
      "hex": "#454b57"
    },
    {
      "code": "FSM 71319",
      "name": "struktúrált",
      "hex": "#454545"
    }
  ],
  "glass": [
    {
      "code": "RAL 7016",
      "name": "antracit",
      "hex": "#233039"
    },
    {
      "code": "RAL 9016",
      "name": "fehér",
      "hex": "#fdfdf8"
    }
  ]
};

// Melyik színkártya-kép melyik palettát ábrázolja
const CHART_IMAGES = {
  'bioklimatikus/image_04.png': 'ral25',
  'bioklimatikus/image_05.png': 'ral25',
  'bioklimatikus/image_06.png': 'ral25',
  'bioklimatikus/image_07.png': 'ral25',
  'bioklimatikus/image_08.png': 'ral25',
  'bioklimatikus/image_11.png': 'gibus',
  'bioklimatikus/image_16.png': 'gibus',
  '_cache/_ral_5.png': 'gibus',
  '_cache/_ral_25.png': 'gibus',
  'elhuzhato_ponyvas/image_04.png': 'gibus',
  'feszitett_vasznas/image_08.png': 'gibus',
  'uvegtetos/image_09.png': 'glass',
  'polikarbonatos/image_05.png': 'glass',
  'feszitett_vasznas/image_04.png': 'selt',
  'feszitett_vasznas_tetore/image_04.png': 'selt',
  'feszitett_vasznas_tetore/image_07.png': 'selt',
};

const chartOf = (url) => CHART_IMAGES[String(url || '').split('/uploads/legacy/')[1]];

export function applyColorCharts(db) {
  let changed = 0;
  for (const tpl of db.templates || []) {
    for (const m of tpl.materials || []) {
      const charts = (m.photos || []).map((p) => chartOf(p.imageUrl)).filter(Boolean);
      if (!charts.length) continue;
      // A RAL 25-ös kártya a teljes választék; különben az első kártya palettája
      const paletteId = charts.includes('ral25') ? 'ral25' : charts[0];
      const caption = (m.photos || []).find((p) => chartOf(p.imageUrl))?.captionBelow || '';
      m.colorOptions = PALETTES[paletteId].map((c, i) => ({ id: `col_${m.id}_${i}`, ...c }));
      m.colorTitle =
        m.itemRole === 'base'
          ? 'Alapszínek'
          : /választható|ral/i.test(caption + m.name)
          ? 'Választható színek'
          : caption || 'Színek';
      m.photos = (m.photos || []).filter((p) => !chartOf(p.imageUrl));
      changed += 1;
    }
  }
  return changed;
}

// Közvetlen futtatás: data/db.json frissítése
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const dbPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'db.json');
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  const n = applyColorCharts(db);
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
  console.log(`Színválaszték beállítva ${n} tételnél.`);
}
