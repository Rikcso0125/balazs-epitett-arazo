import { TemplateMaterialItem } from './types';

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
  title: string; // rövid cím (a név „ – ” előtti része)
  detail?: string; // a név többi része, kisebb betűvel
}

const SIDE_PATTERNS: [RegExp, string][] = [
  [/\s+a szélesség oldalára/i, 'Szélesség oldala'],
  [/\s+a kinyúlás oldalára/i, 'Kinyúlás oldala'],
];

function guessGroup(name: string): string {
  const n = name.toLowerCase();
  if (/led|világítás|spot/.test(n)) return 'Világítás';
  if (/zip|árnyékoló|üvegfal|veranda|háromszög|oldalfal|ponyva/.test(n)) return 'Oldalzárás és árnyékolás';
  if (/infra|fűtés|hősugárzó/.test(n)) return 'Fűtés';
  if (/érzékelő|okosotthon|vezérl|távirányító|tahoma/.test(n)) return 'Érzékelők és vezérlés';
  if (/ral|szín/.test(n)) return 'Szín';
  return 'Egyéb';
}

function splitTitle(name: string): { title: string; detail?: string } {
  const idx = name.indexOf(' – ');
  return idx > 0 ? { title: name.slice(0, idx), detail: name.slice(idx + 3) } : { title: name };
}

/** Hogyan jelenjen meg egy extra: gyűjtemény, opciócsoport és címke (megadott vagy a névből) */
export function presentExtra(m: Pick<TemplateMaterialItem, 'name' | 'group' | 'choiceGroup' | 'choiceLabel' | 'choiceMulti'>): ExtraPresentation {
  const group = m.group?.trim() || guessGroup(m.name);
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
