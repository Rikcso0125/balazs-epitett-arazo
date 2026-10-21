import { ExtraGroupConfig, TemplateMaterialItem } from './types';

/** Az extrák gyűjteményei az árazóban, ebben a sorrendben */
export const EXTRA_GROUP_ORDER = [
  'Világítás',
  'Oldalzárás és árnyékolás',
  'Fűtés',
  'Érzékelők és vezérlés',
  'Szín',
  'Egyéb',
];

export interface ExtraPresentation {
  group: string;
  choiceGroup?: string;
  choiceLabel?: string;
  choiceMulti: boolean;
  title: string; // rövid cím (a név „ - ” előtti része)
  detail?: string; // a név többi része, kisebb betűvel
}

const SIDE_PATTERNS: [RegExp, string][] = [
  [/\s+a szélesség oldalára/i, 'Szélesség oldala'],
  [/\s+a kinyúlás oldalára/i, 'Kinyúlás oldala'],
];

// Automatikus besorolás az alap gyűjtemények azonosítójára (átnevezés után is követi)
const GUESS: [RegExp, string, string][] = [
  [/led|világítás|spot/, 'grp_light', 'Világítás'],
  [/zip|árnyékoló|üvegfal|veranda|háromszög|oldalfal|ponyva/, 'grp_shade', 'Oldalzárás és árnyékolás'],
  [/infra|fűtés|hősugárzó/, 'grp_heat', 'Fűtés'],
  [/érzékelő|okosotthon|vezérl|távirányító|tahoma/, 'grp_control', 'Érzékelők és vezérlés'],
  [/ral|szín/, 'grp_colour', 'Szín'],
];

function guessGroup(name: string, groups?: ExtraGroupConfig[]): string {
  const n = name.toLowerCase();
  const hit = GUESS.find(([re]) => re.test(n));
  const [id, fallback] = hit ? [hit[1], hit[2]] : ['grp_other', 'Egyéb'];
  return groups?.find((g) => g.id === id)?.name || fallback;
}

function splitTitle(name: string): { title: string; detail?: string } {
  const idx = name.indexOf(' - ');
  return idx > 0 ? { title: name.slice(0, idx), detail: name.slice(idx + 3) } : { title: name };
}

/** Hogyan jelenjen meg egy extra: gyűjtemény, opciócsoport és címke (megadott vagy a névből) */
export function presentExtra(
  m: Pick<TemplateMaterialItem, 'name' | 'group' | 'choiceGroup' | 'choiceLabel' | 'choiceMulti'>,
  groups?: ExtraGroupConfig[]
): ExtraPresentation {
  const group = m.group?.trim() || guessGroup(m.name, groups);
  if (m.choiceGroup?.trim()) {
    const { title, detail } = splitTitle(m.name);
    return {
      group,
      choiceGroup: m.choiceGroup.trim(),
      choiceLabel: m.choiceLabel?.trim() || title,
      choiceMulti: Boolean(m.choiceMulti),
      title,
      detail,
    };
  }
  for (const [re, label] of SIDE_PATTERNS) {
    if (re.test(m.name)) {
      const base = m.name.replace(re, '');
      const { title, detail } = splitTitle(base);
      return { group, choiceGroup: title, choiceLabel: label, choiceMulti: true, title, detail };
    }
  }
  return { group, choiceMulti: false, ...splitTitle(m.name) };
}

/** A gyűjtemények sorrendje: a Beállításokban megadott, utána az alapértelmezettek, végül a többi */
export function sortGroupNames(names: string[], configured?: ExtraGroupConfig[]): string[] {
  const order = [...(configured || []).map((g) => g.name), ...EXTRA_GROUP_ORDER];
  const rank = (n: string) => {
    const i = order.indexOf(n);
    return i === -1 ? 999 : i;
  };
  return [...names].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, 'hu'));
}
