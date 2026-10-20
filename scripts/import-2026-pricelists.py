#!/usr/bin/env python3
"""
2026-os gyártói árlisták + „Árajánlat készítő szoftver_menű rendszer.docx” betöltése a data/db.json-ba.

Források (data/pricelists-2026/):
  ke_bioclimatica.json – KE Price book 10 Bioclimatic (Kedry Skylife, Kedry Neos)
  ke_gennius.json      – KE Price book Gennius (Isola 2/3, Keplan, A100 LUX, Xtesa, Hydra)
  aluprof.json         – Aluprof árlista 2026/27 (SB 400 = SOLARE 400, karos napellenzők …)
  images.json          – katalógusképek (ha már elkészült)

Mit csinál:
  - A docx szerinti kategóriák, beépítési módok, modulszabályok, méretkorlátok, extrák (fix EUR árak)
  - Új gyári mérettáblák ott, ahol a régi tábla ugyanarra az alapra épült (az arány ellenőrizve:
    SOLARE 400 ~+13%, Skylife/Hydra/Keplan/Isola 2 ~+2,5%). Ahol a régi tábla más alapú volt
    (A100 LUX, Pergola V ZIIP, Veranda Tens, Veranda V ZIIP, Refleksol ZIP), a régi tábla marad.
  - Új termékek: Kedry Neos, Isola 3, Xtesa, Madeira, Corsica, Jamaica, Australia, Thermo Glass,
    Guillotine Vertica (az utóbbi kettőnek nincs ára: inaktív, „hiányzik: ár” jelzéssel)
  - A meglévő fotók, szövegek, ajándékok, szerelési tételek megmaradnak.
Többször futtatható: a „x_” kezdetű (docx) extrákat és az import által létrehozott tételeket újraépíti.
Futtatás: python3 scripts/import-2026-pricelists.py
"""
import copy
import json
import os
import re
from datetime import datetime, timezone

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
DB = os.path.join(ROOT, 'data', 'db.json')
SRC = os.path.join(ROOT, 'data', 'pricelists-2026')
NOW = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

W, F, N = 'Épülethez rögzített', 'Szabadon álló', 'Lábak nélkül'
MT = {'wall': W, 'freestanding': F, 'no_legs': N}

db = json.load(open(DB))
src = {k: json.load(open(os.path.join(SRC, f'{k}.json'))) for k in ('ke_bioclimatica', 'ke_gennius', 'aluprof')}
images = {}
if os.path.exists(os.path.join(SRC, 'images.json')):
    images = json.load(open(os.path.join(SRC, 'images.json')))

VARIANTS = {
    v['key']: dict(v, _file=s['source'].get('file', k), _product=p['product'])
    for k, s in src.items()
    for p in s['products']
    for v in p['variants']
}
report = []


def num(x):
    x = float(x)
    return int(x) if x == int(x) else round(x, 1)


def key(x):
    return str(num(x))


# ---------------------------------------------------------------- mérettáblák
AXIS_LABEL = {'width': 'Szélesség (cm)', 'projection': 'Kinyúlás (cm)', 'height': 'Magasság (cm)'}
SWAP = {'width': 'projection', 'projection': 'width', 'height': 'height'}


def table(vkeys, swap=False, minus=0):
    """Egy vagy több gyártói tábla (összefésülve) az ügyfél tájolásában.
    swap: a gyártó „szélessége” nálunk kinyúlás (és fordítva); minus: fali kivitel levonása."""
    vs = [VARIANTS[k] for k in ([vkeys] if isinstance(vkeys, str) else vkeys)]
    first = vs[0]
    row_axis, col_axis = first['rowAxis'], first['colAxis']
    mw, mp = first.get('modulesWidth', 1), first.get('modulesProjection', 1)
    if swap:
        row_axis, col_axis, mw, mp = SWAP[row_axis], SWAP[col_axis], mp, mw
    values = {}
    for v in vs:
        for r, row in v['values'].items():
            for c, price in row.items():
                if price is None:
                    continue
                values.setdefault(key(r), {}).setdefault(key(c), num(price) - minus)
    rows = sorted({num(r) for r in values})
    cols = sorted({num(c) for row in values.values() for c in row})
    return {
        'matrixTable': {
            'rowLabel': AXIS_LABEL[row_axis],
            'colLabel': AXIS_LABEL[col_axis],
            'rows': rows,
            'cols': cols,
            'values': values,
        },
        'matrixRowAxis': row_axis,
        'matrixColAxis': col_axis,
        '_mw': mw,
        '_mp': mp,
        '_source': ', '.join(f"{v.get('page', '')}. o. ({v['config']})" for v in vs),
        '_files': sorted({v['_file'] for v in vs}),
    }


def material(**kw):
    base = {
        'description': '',
        'itemRole': 'base',
        'defaultSelected': True,
        'pricingMode': 'fixed',
        'currency': 'EUR',
        'dimensionSource': 'roof',
        'basePrice': 1,
        'unitPrice': 1,
        'defaultQuantity': 1,
        'unitLabel': 'db',
        'm2Tiers': [],
        'percentageRate': 0,
        'minPrice': 1,
        'multiplier': 1,
        'extraDiscountPct': 0,
        'fixedSurcharge': 0,
        'listPriceMultiplier': 1.25,
        'defaultNote': '',
    }
    base.update(kw)
    return base


# A régi árazó a szélességet a legközelebbi táblaértékre kerekítette (SB400, Skylife), a kinyúlást felfelé
NEAREST_WIDTH = {'width': 'nearest'}


def matrix_item(mid, name, tbl, mount, mult, surcharge, description='', modules=True, split=False, snap=None, disc=0):
    t = copy.deepcopy(tbl)
    item = material(
        id=mid,
        name=name,
        description=description,
        pricingMode='matrix_cm',
        multiplier=mult,
        extraDiscountPct=disc,
        fixedSurcharge=surcharge,
        matrixTable=t['matrixTable'],
        matrixRowAxis=t['matrixRowAxis'],
        matrixColAxis=t['matrixColAxis'],
        mountTypes=[mount] if mount else [],
        defaultNote='',
    )
    if modules:
        item['modulesWidth'] = t['_mw']
        item['modulesProjection'] = t['_mp']
    if split:
        item['splitByModule'] = True
    for axis, mode in (snap or {}).items():
        if t['matrixRowAxis'] == axis:
            item['matrixRowSnap'] = mode
        if t['matrixColAxis'] == axis:
            item['matrixColSnap'] = mode
    item['_source'] = t['_source']
    item['_files'] = t['_files']
    return item


def fixed_extra(mid, name, price, description='', **kw):
    return material(
        id=mid,
        name=name,
        description=description,
        itemRole='optional',
        defaultSelected=False,
        basePrice=price,
        unitPrice=price,
        excludeFromPercentBase=True,
        defaultNote='Opció',
        **kw,
    )


def ral_extra(prefix):
    return material(
        id=f'x_{prefix}_ral',
        name='Egyedi RAL szín (+20% felár)',
        description='A szerkezet árának 20%-a',
        itemRole='optional',
        defaultSelected=False,
        pricingMode='percentage',
        percentageRate=20,
        listPriceMultiplier=1.25,
        defaultNote='Opció',
    )


# ---------------------------------------------------------------- docx extrák
def common_extras(prefix, sensors=True, infra=True, smart=True, sun=True):
    out = []
    if infra:
        out.append(fixed_extra(f'x_{prefix}_infra', 'Infrafűtés (2000 W, távirányítóval, szabályozható teljesítmény)', 200, group='Fűtés'))
    if sensors:
        out.append(fixed_extra(f'x_{prefix}_rain', 'Esőérzékelő', 250, group='Érzékelők és vezérlés', choiceGroup='Érzékelők', choiceMulti=True, choiceLabel='Eső'))
        out.append(fixed_extra(f'x_{prefix}_wind', 'Szélérzékelő', 200, group='Érzékelők és vezérlés', choiceGroup='Érzékelők', choiceMulti=True, choiceLabel='Szél'))
    if sun:
        out.append(fixed_extra(f'x_{prefix}_sun', 'Napfényérzékelő', 200, group='Érzékelők és vezérlés', choiceGroup='Érzékelők', choiceMulti=True, choiceLabel='Napfény'))
    if smart:
        out.append(fixed_extra(f'x_{prefix}_smart', 'Okosotthon vezérlő', 300, 'Somfy TaHoma vagy BleBox applikációval', group='Érzékelők és vezérlés'))
    return out


LED_BEAM = 'LED világítás a gerendák belső felén (szabályozható, COB LED-szalag, meleg fehér)'
LED_CROSS = 'LED világítás a vásznat tartó keresztgerendák belső felén (szabályozható, COB LED-szalag, meleg fehér'


CROSS = {'group': 'Világítás', 'choiceGroup': 'LED a vásznat tartó keresztgerendákban (szabályozható, meleg fehér)'}
BEAM = {'group': 'Világítás', 'choiceGroup': 'LED a gerendák belső felén (szabályozható, COB LED-szalag)'}
BLADE = {'group': 'Világítás', 'choiceGroup': 'Világítás a lamellákban (szabályozható fényerejű)'}


def cat2_led(prefix):
    return [
        fixed_extra(f'x_{prefix}_led_cross2', f'{LED_CROSS}, 1–2 db)', 800, **CROSS, choiceLabel='1–2 db'),
        fixed_extra(f'x_{prefix}_led_cross3', f'{LED_CROSS}, 3 db)', 1200, **CROSS, choiceLabel='3 db'),
        fixed_extra(f'x_{prefix}_led_cross4', f'{LED_CROSS}, 4 db)', 1500, **CROSS, choiceLabel='4 db'),
    ]


def isola_beam_led(prefix):
    return [
        fixed_extra(f'x_{prefix}_led_beam27', f'{LED_BEAM} – 27,5 m²-ig', 900, **BEAM, choiceLabel='27,5 m²-ig'),
        fixed_extra(f'x_{prefix}_led_beam55', f'{LED_BEAM} – 55 m²-ig', 1700, **BEAM, choiceLabel='55 m²-ig'),
    ]


# ---------------------------------------------------------------- segédek
cats = {c['id']: c for c in db['categories']}
tpls = {t['id']: t for t in db['templates']}


def set_category(cid, name, menu_id, order, description=None):
    c = cats.get(cid)
    if not c:
        c = {'id': cid, 'categoryType': 'main_structure', 'createdAt': NOW}
        db['categories'].append(c)
        cats[cid] = c
    c.update({'name': name, 'menuId': menu_id, 'order': order})
    if description is not None:
        c['description'] = description


def template(tid, **fields):
    t = tpls.get(tid)
    if not t:
        t = {
            'id': tid,
            'subtitle': '',
            'enabled': True,
            'status': 'active',
            'introText': '',
            'closingText': '',
            'textBlocks': [],
            'photos': [],
            'materials': [],
            'createdAt': NOW,
        }
        db['templates'].append(t)
        tpls[tid] = t
        report.append(f'ÚJ sablon: {fields.get("name", tid)}')
    # a régi egytengelyes modulszabály megmarad, ha az import nem ad újat
    if 'moduleSplits' not in fields and t.get('moduleSplit') and not t.get('moduleSplits'):
        t['moduleSplits'] = [t['moduleSplit']]
    t.update(fields)
    t['enabled'] = t.get('status') != 'inactive'
    t['updatedAt'] = NOW
    t.pop('moduleSplit', None)
    return t


def items(tid):
    return {m['id']: m for m in tpls[tid]['materials']}


def drop(tid, ids_or_pred):
    t = tpls[tid]
    pred = ids_or_pred if callable(ids_or_pred) else (lambda m: m['id'] in ids_or_pred)
    t['materials'] = [m for m in t['materials'] if not pred(m)]


def is_ours(m):
    return m['id'].startswith('x_') or m.get('_import2026')


def put(tid, new_base, extras, ral=True, prefix=None):
    """Szerkezeti tételek előre, RAL a százalékos (szerelés) tételek elé, docx extrák a végére."""
    t = tpls[tid]
    prefix = prefix or tid.replace('tpl_legacy_', '').replace('tpl_', '')
    for m in new_base:
        m['_import2026'] = True
    rest = [m for m in t['materials'] if not is_ours(m) and m['id'] not in {b['id'] for b in new_base}]
    first_pct = next((i for i, m in enumerate(rest) if m['pricingMode'] == 'percentage'), len(rest))
    ral_items = [ral_extra(prefix)] if ral else []
    t['materials'] = new_base + rest[:first_pct] + ral_items + rest[first_pct:] + extras
    # forrás megjegyzés a sablonon
    sources = [m.pop('_source') for m in new_base if '_source' in m]
    files = sorted({f for m in new_base for f in m.pop('_files', [])})
    if sources:
        ref = t.setdefault('catalogRef', {})
        ref['pdfFile'] = ' + '.join(files)
        ref['pages'] = '; '.join(dict.fromkeys(sources))[:400]


def copy_items(from_tid, ids, new_prefix):
    out = []
    for m in tpls[from_tid]['materials']:
        if m['id'] in ids:
            c = copy.deepcopy(m)
            c['id'] = m['id'].replace(m['id'].split('_')[1], new_prefix, 1)
            for k in ('minModules', 'maxModules', 'modulesWidth', 'modulesProjection'):
                c.pop(k, None)
            out.append(c)
    return out


def add_note(tid, text):
    ref = tpls[tid].setdefault('catalogRef', {})
    note = ref.get('note', '')
    if text not in note:
        ref['note'] = f'{note} | {text}'.strip(' |')


# ================================================================ KATEGÓRIÁK (docx)
C1, C2, C3 = 'cat_1792391983811_seed', 'cat_legacy_elhuzhato', 'cat_legacy_feszitett'
C4, C5A, C5B = 'cat_legacy_tetore', 'cat_1792391983812_seed', 'cat_1792391983813_seed'
C6, C7, C8, C9 = 'cat_legacy_polikarbonat', 'cat_legacy_uvegteto', 'cat_1792346155886_2odc', 'cat_legacy_zip'
set_category(C1, 'Bioklimatikus pergola', 'menu_pergola', 1, 'Mozgatható lamellás tetővel')
set_category(C2, 'Elhúzható ponyvás pergola', 'menu_pergola', 2, 'Elhúzható PVC vásznas tetővel')
set_category(C3, 'Elhúzható feszített ponyvás pergola', 'menu_pergola', 3, 'Elhúzható, feszített vásznas tetővel')
set_category(C6, 'Polikarbonát tetős pergola', 'menu_pergola', 4)
set_category(C7, 'Üvegtetős pergola', 'menu_pergola', 5)
set_category(C4, 'Meglévő szerkezetre építhető árnyékoló', 'menu_arnyekolo', 1, 'Meglévő pergola vagy szerkezet tetejére')
set_category(C9, 'Vertikális ZIP árnyékoló', 'menu_arnyekolo', 2, 'Meglévő terasz beépítése motoros, vertikális árnyékolóval')
set_category(C8, 'Eltolható üvegfal', 'menu_arnyekolo', 3, 'Meglévő terasz beépítése eltolható üvegfalrendszerrel')
set_category(C5A, 'Kazettás karos napellenző', 'menu_napellenzo', 1)
set_category(C5B, 'Kazetta nélküli karos napellenző', 'menu_napellenzo', 2)

KE_TPLS_ALL = {'tpl_legacy_kedry_skylife', 'tpl_kedry_neos', 'tpl_legacy_hydra', 'tpl_xtesa', 'tpl_legacy_keplan',
               'tpl_legacy_a100_lux', 'tpl_legacy_isola_2a', 'tpl_isola_3'}
KE_NOTE = 'Árképző: KE gyári listaár × 0,65 + fix felár (a régi árképző szerint).'
AL_NOTE = 'Árképző: Aluprof gyári listaár × 0,66 + fix felár (a régi árképző szerint).'
LIST_NOTE = 'Árképző: gyári listaár × 1,0 (nincs megadott árképző – ellenőrizd, és állítsd be a szorzót / felárat).'

# ================================================================ 1. BIOKLIMATIKUS
# SOLARE 400 = Aluprof SB 400. A gyártó „kinyúlása” (340–700) nálunk a szélesség.
tid = 'tpl_legacy_sb400'
template(tid, categoryId=C1, alsoInCategoryIds=[C4], mountTypes=[W, F, N],
         moduleSplits=[{'axis': 'width', 'maxCm': 700, 'maxModules': 2}, {'axis': 'projection', 'maxCm': 400, 'maxModules': 2}],
         sizeLimits={'minWidthCm': 340, 'maxWidthCm': 1400, 'minProjectionCm': 150, 'maxProjectionCm': 800, 'maxHeightCm': 300},
         sizeRules=[])
old = items(tid)
drop(tid, ['mat_sb400_wall', 'mat_sb400_free', 'mat_sb400_led', 'mat_sb400_spot', 'mat_sb400_smarthome', 'mat_sb400_ral_wall', 'mat_sb400_ral_free'])
put(tid, [
    matrix_item('mat_sb400_wall', old['mat_sb400_wall']['name'], table('sb400_wall', swap=True), W, 0.66, 2500, old['mat_sb400_wall']['description'], modules=False, split=True, snap=NEAREST_WIDTH),
    matrix_item('mat_sb400_free', old['mat_sb400_free']['name'], table('sb400_freestanding', swap=True), F, 0.66, 2500, old['mat_sb400_free']['description'], modules=False, split=True, snap=NEAREST_WIDTH),
    matrix_item('mat_sb400_nolegs', 'SOLARE 400 – elforgatható lamellákkal, lábak nélkül (falak közé / meglévő szerkezetre)', table('sb400r', swap=True), N, 0.66, 2500, old['mat_sb400_wall']['description'], modules=False, split=True, snap=NEAREST_WIDTH),
], [
    fixed_extra('x_sb400_led_beam', LED_BEAM, 700, **BEAM, choiceLabel='Meleg fehér'),
    fixed_extra('x_sb400_led_rgb', 'LED világítás a gerendák belső felén (szabályozható, COB LED-szalag, RGB)', 800, **BEAM, choiceLabel='RGB'),
    fixed_extra('x_sb400_led_spot', 'LED spot világítás a lamellákban (szabályozható fényerejű), 9 db', 800, **BLADE, choiceLabel='LED spot, 9 db'),
    fixed_extra('x_sb400_led_blade', 'LED-szalag világítás a lamellákban (szabályozható fényerejű, akár RGB), 3 db', 800, **BLADE, choiceLabel='LED-szalag, 3 db'),
    *common_extras('sb400'),
])
tpls[tid]['catalogRef']['note'] = AL_NOTE + ' Több modulnál modulonkénti ár × modulszám (a gyártónak nincs külön 2 modulos táblája).'

# SEESKY BIO: jelenleg nem használt (docx), de a sablon megmarad
tid = 'tpl_legacy_seesky_bio'
template(tid, categoryId=C1, status='inactive', mountTypes=[W, F],
         moduleSplits=[{'axis': 'width', 'maxCm': 645, 'maxModules': 2}, {'axis': 'projection', 'maxCm': 470, 'maxModules': 2}],
         sizeLimits={**tpls[tid].get('sizeLimits', {}), 'maxWidthCm': 1290, 'maxProjectionCm': 940, 'maxHeightCm': 300})
drop(tid, ['mat_seesky_led', 'mat_seesky_rgb', 'mat_seesky_lamella_led', 'mat_seesky_smarthome', 'mat_seesky_ral_wall', 'mat_seesky_ral_free'])
put(tid, [], [
    fixed_extra('x_seesky_led_beam', LED_BEAM, 800, **BEAM, choiceLabel='Meleg fehér'),
    fixed_extra('x_seesky_led_rgb', 'LED világítás a gerendák belső felén (szabályozható, COB LED-szalag, RGB)', 800, **BEAM, choiceLabel='RGB'),
    fixed_extra('x_seesky_led_blade', 'LED-szalag világítás a lamellákban (szabályozható fényerejű, akár RGB), 3 db', 800, group='Világítás'),
    *common_extras('seesky'),
])

# KEDRY SKYLIFE: a gyártó SP (611) oldala nálunk a szélesség (fal az SP oldalon)
tid = 'tpl_legacy_kedry_skylife'
template(tid, categoryId=C1, mountTypes=[W, F],
         moduleSplits=[{'axis': 'width', 'maxCm': 611, 'maxModules': 2}, {'axis': 'projection', 'maxCm': 450, 'maxModules': 2}],
         sizeLimits={'minWidthCm': 211, 'maxWidthCm': 1222, 'minProjectionCm': 200, 'maxProjectionCm': 900, 'maxHeightCm': 300},
         sizeRules=[])
old = items(tid)
drop(tid, ['mat_kedry_wall', 'mat_kedry_free', 'mat_kedry_led', 'mat_kedry_rgb', 'mat_kedry_smarthome', 'mat_kedry_ral_wall', 'mat_kedry_ral_free'])
nm_w, nm_f = old['mat_kedry_wall']['name'].replace('1L', '').replace('  ', ' '), old['mat_kedry_free']['name'].replace('1L', '').replace('  ', ' ')
desc = old['mat_kedry_wall']['description']
base = []
for code, wall_key, free_key in [('1', 'skylife_1L_wall_SP', 'skylife_1L_freestanding'), ('2w', 'skylife_2P_wall_SP', 'skylife_2P_freestanding'),
                                 ('2p', 'skylife_2L_wall_SP', 'skylife_2L_freestanding'), ('4', 'skylife_4_wall_SP', 'skylife_4_freestanding')]:
    base.append(matrix_item(f'mat_kedry_wall_{code}' if code != '1' else 'mat_kedry_wall', nm_w, table(wall_key), W, 0.65, 3500, desc, snap=NEAREST_WIDTH, disc=10))
    base.append(matrix_item(f'mat_kedry_free_{code}' if code != '1' else 'mat_kedry_free', nm_f, table(free_key, swap=True), F, 0.65, 3500, desc, snap=NEAREST_WIDTH, disc=10))
tpls[tid]['materials'] = [m for m in tpls[tid]['materials'] if not m['id'].startswith(('mat_kedry_wall_', 'mat_kedry_free_'))]
for m in tpls[tid]['materials']:
    if m['id'] == 'mat_kedry_motor':
        m['perModule'] = True
        m['name'] = 'Motor – automatizált, Somfy IO (modulonként 1 db)'
put(tid, base, [
    fixed_extra('x_kedry_skylife_led_beam', LED_BEAM, 900),
    fixed_extra('x_kedry_skylife_led_rgb', 'RGB színes LED világítás körben a felső gerendákban, kívülről és belülről', 1000),
    *common_extras('kedry_skylife'),
], prefix='kedry_skylife')
tpls[tid]['catalogRef']['note'] = KE_NOTE + ' Fali kivitel: a gyári ár mínusz a fali levonás (KE táblázat alatt).'

# KEDRY NEOS (új)
tid = 'tpl_kedry_neos'
sky = tpls['tpl_legacy_kedry_skylife']
template(tid, categoryId=C1, name='KEDRY NEOS bioklimatikus pergola', order=3,
         subtitle='Forgatható lamellás tető, Somfy motorral – minimalista, letisztult profilokkal',
         mountTypes=[W, F, N],
         moduleSplits=[{'axis': 'width', 'maxCm': 600, 'maxModules': 2}, {'axis': 'projection', 'maxCm': 450, 'maxModules': 2}],
         sizeLimits={'minWidthCm': 211, 'maxWidthCm': 1200, 'minProjectionCm': 200, 'maxProjectionCm': 900, 'maxHeightCm': 270},
         sizeRules=[{'id': 'rule_neos_wall', 'label': 'falhoz rögzítve csak 1 modul kinyúlásban', 'mountType': W, 'maxProjectionCm': 450},
                    {'id': 'rule_neos_nolegs', 'label': 'lábak nélkül csak 1 modul', 'mountType': N, 'maxWidthCm': 600, 'maxProjectionCm': 450}],
         introText='A KEDRY NEOS ({{meret}}, {{beepites}}) letisztult, minimalista bioklimatikus pergola forgatható alumínium lamellákkal. '
                   'A lamellák dőlésszögével a bejutó fény és a szellőzés szabályozható, zárt állásban a tető vízzáró, az esővíz a rejtett ereszcsatornán és az oszlopokon át távozik. '
                   'Később üvegfallal és oldalsó árnyékolóval télikertté bővíthető.',
         closingText=re.sub(r'\s*\([^)]*SKYLIFE[^)]*\)', '', sky.get('closingText', '')),
         catalogRef={'productAlias': 'KE Kedry Neos', 'note': KE_NOTE + ' Motor: Somfy Sunea Screen IO gyári listaáron. A gyártó szerint a max. magasság 270 cm (a docx 300 cm-t írt).'})
neos_desc = 'Alumínium váz, 0–135° között forgatható lamellák, rejtett esővíz-elvezetés. Az ár a motort nem tartalmazza (külön tétel).'
nw, nf, nn = ('KEDRY NEOS – forgatható lamellákkal, falhoz rögzítve', 'KEDRY NEOS – forgatható lamellákkal, szabadon álló',
              'KEDRY NEOS – forgatható lamellákkal, lábak nélkül (konzolos, falak közé)')
tpls[tid]['materials'] = [m for m in tpls[tid]['materials'] if not m.get('_import2026')]
neos_base = [
    matrix_item('mat_neos_wall_1', nw, table('neos_1L_wall_SP'), W, 0.65, 3500, neos_desc, snap=NEAREST_WIDTH, disc=10),
    matrix_item('mat_neos_wall_2w', nw, table('neos_2P_wall_SP'), W, 0.65, 3500, neos_desc, snap=NEAREST_WIDTH, disc=10),
    matrix_item('mat_neos_free_1', nf, table('neos_1L_freestanding', swap=True), F, 0.65, 3500, neos_desc, snap=NEAREST_WIDTH, disc=10),
    matrix_item('mat_neos_free_2w', nf, table('neos_2P_freestanding', swap=True), F, 0.65, 3500, neos_desc, snap=NEAREST_WIDTH, disc=10),
    matrix_item('mat_neos_free_2p', nf, table('neos_2L_freestanding', swap=True), F, 0.65, 3500, neos_desc, snap=NEAREST_WIDTH, disc=10),
    matrix_item('mat_neos_nolegs_1', nn, table('neos_1T_loft', swap=True), N, 0.65, 3500, neos_desc, snap=NEAREST_WIDTH, disc=10),
]
if not any(m['id'] == 'mat_neos_motor' for m in tpls[tid]['materials']):
    tpls[tid]['materials'] = [
        material(id='mat_neos_motor', name='Motor – Somfy Sunea Screen IO (modulonként 1 db)', basePrice=531, unitPrice=531, perModule=True),
        *copy_items('tpl_legacy_kedry_skylife', {'mat_kedry_remote', 'mat_kedry_gift_sensor', 'mat_kedry_gift_infra', 'mat_kedry_install',
                                                 'mat_kedry_zip_a', 'mat_kedry_zip_b_wall', 'mat_kedry_zip_b_free',
                                                 'mat_kedry_glass_a', 'mat_kedry_glass_b_wall', 'mat_kedry_glass_b_free'}, 'neos'),
    ]
put(tid, neos_base, [fixed_extra('x_neos_led_beam', LED_BEAM, 900), *common_extras('neos')], prefix='neos')

# ================================================================ 2. ELHÚZHATÓ PVC PONYVÁS
# A100 LUX: régi tábla marad (más alapú volt), docx modulok: 500-ig 1, 900-ig 2, 1300-ig 3 modul
tid = 'tpl_legacy_a100_lux'
template(tid, categoryId=C2, mountTypes=[W],
         moduleSplits=[{'axis': 'width', 'maxCm': 500, 'breakpointsCm': [500, 900, 1300]}],
         sizeLimits={'minWidthCm': 250, 'maxWidthCm': 1300, 'minProjectionCm': 250, 'maxProjectionCm': 600, 'maxHeightCm': 260},
         sizeRules=[{'id': 'rule_a100_multi', 'label': '2–3 modulnál', 'ifWidthOverCm': 500, 'maxProjectionCm': 550}])
drop(tid, ['mat_a100_led', 'mat_a100_smarthome'])
put(tid, [], [*cat2_led('a100'), *common_extras('a100')])
add_note(tid, '2026: a régi mérettábla maradt – az új KE árlista (78–79. o.) más alapú, ellenőrizd. A gyártó szerint az oszlop max. 260 cm.')

# KEPLAN
tid = 'tpl_legacy_keplan'
template(tid, categoryId=C2, mountTypes=[W, F], moduleSplits=[],
         sizeLimits={'minWidthCm': 250, 'maxWidthCm': 550, 'minProjectionCm': 250, 'maxProjectionCm': 600, 'maxHeightCm': 300},
         sizeRules=[{'id': 'rule_keplan_free', 'label': 'különálló szerkezetként', 'mountType': F, 'maxWidthCm': 450, 'maxProjectionCm': 500},
                    {'id': 'rule_keplan_wall', 'label': 'falhoz rögzítve', 'mountType': W, 'maxWidthCm': 550, 'maxProjectionCm': 600}])
old = items(tid)
drop(tid, ['mat_keplan_wall', 'mat_keplan_free', 'mat_keplan_led', 'mat_keplan_smarthome'])
put(tid, [
    matrix_item('mat_keplan_wall', old['mat_keplan_wall']['name'], table('keplan_a_wall_1'), W, 0.65, 2470, old['mat_keplan_wall']['description']),
    matrix_item('mat_keplan_free', old['mat_keplan_free']['name'], table('keplan_free_1'), F, 0.65, 2470, old['mat_keplan_free']['description']),
], [*cat2_led('keplan'), *common_extras('keplan')])
tpls[tid]['catalogRef']['note'] = KE_NOTE

# ISOLA 2 (régen ISOLA 2A): docx szerint 550 széles × 1000 kinyúlás
ISOLA_DESC = 'Alumínium szerkezet, motorral elhúzható PVC vászon, rejtett esővíz-elvezetés.'
tid = 'tpl_legacy_isola_2a'
template(tid, categoryId=C2, alsoInCategoryIds=[C4], name='ISOLA 2 elhúzható PVC ponyvás pergola', mountTypes=[W, F, N], moduleSplits=[],
         sizeLimits={'minWidthCm': 250, 'maxWidthCm': 550, 'minProjectionCm': 250, 'maxProjectionCm': 1000, 'maxHeightCm': 300},
         sizeRules=[])
old = items(tid)
drop(tid, ['mat_isola_wall', 'mat_isola_free', 'mat_isola_wall_2m', 'mat_isola_free_2m', 'mat_isola_motor_2m', 'mat_isola_install_2m',
           'mat_isola_led', 'mat_isola_led_2m', 'mat_isola_zip_a_2m', 'mat_isola_glass_a_2m', 'mat_isola_smarthome'])
for m in tpls[tid]['materials']:
    for k in ('minModules', 'maxModules'):
        m.pop(k, None)
put(tid, [
    matrix_item('mat_isola_wall', 'ISOLA 2A – elhúzható PVC ponyvával, falhoz rögzítve', table(['isola2a_wall_2p_par', 'isola2a_wall_4p_par']), W, 0.65, 2870,
                ISOLA_DESC + ' 700 cm kinyúlás felett 4 lábbal.', modules=False, disc=10),
    matrix_item('mat_isola_free', 'ISOLA 2 – elhúzható PVC ponyvával, szabadon álló', table(['isola2_free_4p', 'isola2_free_6p']), F, 0.65, 2870,
                ISOLA_DESC + ' 700 cm kinyúlás felett 6 lábbal.', modules=False, disc=10),
    matrix_item('mat_isola_nolegs', 'ISOLA 2T – elhúzható PVC ponyvával, lábak nélkül (falak közé / meglévő szerkezetre)', table('isola2t_nolegs'), N, 0.65, 2870,
                ISOLA_DESC, modules=False, disc=10),
], [*cat2_led('isola'), *isola_beam_led('isola'), *common_extras('isola')], prefix='isola')
tpls[tid]['catalogRef'].update({'productAlias': 'KE Isola 2 / 2A / 2T', 'note': KE_NOTE + ' A régi „2 modulos” (+650 EUR) felár megszűnt: a 700 cm feletti kinyúlás többletlábai a gyári táblában vannak.'})

# ISOLA 3 (új, jelenleg nem használt – docx)
tid = 'tpl_isola_3'
isola2 = tpls['tpl_legacy_isola_2a']
template(tid, categoryId=C2, name='ISOLA 3 elhúzható PVC ponyvás pergola', status='inactive', order=5,
         subtitle='Elhúzható PVC vásznas tető, nagy fesztávokra, rejtett ereszcsatornával',
         mountTypes=[W, F],
         moduleSplits=[{'axis': 'width', 'maxCm': 550, 'maxModules': 2}, {'axis': 'projection', 'maxCm': 1000, 'maxModules': 2}],
         sizeLimits={'minWidthCm': 250, 'maxWidthCm': 1084, 'minProjectionCm': 250, 'maxProjectionCm': 2000, 'maxHeightCm': 300},
         sizeRules=[],
         introText='Az ISOLA 3 ({{meret}}, {{beepites}}) elhúzható, PVC vásznas tetejű prémium pergola nagy, akár több modulos lefedésekhez. '
                   'A vászon motorral nyitható és zárható, az esővíz a rejtett ereszcsatornán és az oszlopokon át távozik.',
         closingText=isola2.get('closingText', ''),
         catalogRef={'productAlias': 'KE Isola 3', 'note': KE_NOTE + ' Fali kivitel: a gyári ár mínusz a fali levonás. Motor: Sunilus IO 30/17 gyári listaáron.'})
w_desc = 'Alumínium szerkezet, motorral elhúzható PVC vászon, rejtett esővíz-elvezetés. Az ár a motort nem tartalmazza (külön tétel).'
iw, iff = 'ISOLA 3 – elhúzható PVC ponyvával, falhoz rögzítve', 'ISOLA 3 – elhúzható PVC ponyvával, szabadon álló'
i3 = []
for code, vk, dec in [('1', 'isola3_free_1l', 1791), ('2w', 'isola3_free_2l', 2429), ('2p', 'isola3_free_2p', 1791), ('4', 'isola3_free_4', 2429)]:
    i3.append(matrix_item(f'mat_isola3_free_{code}', iff, table(vk), F, 0.65, 2870, w_desc, disc=10))
    i3.append(matrix_item(f'mat_isola3_wall_{code}', iw, table(vk, minus=dec), W, 0.65, 2870, w_desc, disc=10))
if not any(m['id'] == 'mat_isola3_motor' for m in tpls[tid]['materials']):
    tpls[tid]['materials'] = [
        material(id='mat_isola3_motor', name='Motor – Somfy Sunilus IO (modulonként 1 db)', basePrice=462, unitPrice=462, perModule=True),
        *copy_items('tpl_legacy_isola_2a', {'mat_isola_remote', 'mat_isola_gift_sensor', 'mat_isola_gift_infra', 'mat_isola_install',
                                            'mat_isola_zip_a', 'mat_isola_zip_b_wall', 'mat_isola_zip_b_free',
                                            'mat_isola_glass_a', 'mat_isola_glass_b_wall', 'mat_isola_glass_b_free'}, 'isola3'),
    ]
put(tid, i3, [*cat2_led('isola3'), *isola_beam_led('isola3'),
              fixed_extra('x_isola3_led_rgb', 'RGB színes LED világítás körben a felső gerendákban, kívülről és belülről', 1000),
              *common_extras('isola3')], prefix='isola3')

# ================================================================ 3. ELHÚZHATÓ FESZÍTETT PONYVÁS
ZIP_FROM_KEPLAN = {'mat_keplan_zip_a', 'mat_keplan_zip_b_wall'}

tid = 'tpl_legacy_pergola_v_ziip'
template(tid, categoryId=C3, mountTypes=[W],
         moduleSplits=[{'axis': 'width', 'maxCm': 500, 'maxModules': 2}],
         sizeLimits={'minWidthCm': 200, 'maxWidthCm': 1000, 'minProjectionCm': 200, 'maxProjectionCm': 600, 'maxHeightCm': 300}, sizeRules=[])
drop(tid, ['mat_pvziip_smarthome'])
if not any('_zip_' in m['id'] for m in tpls[tid]['materials']):
    tpls[tid]['materials'] += copy_items('tpl_legacy_keplan', ZIP_FROM_KEPLAN, 'pvziip')
put(tid, [], common_extras('pvziip'))
add_note(tid, '2026: a régi mérettábla maradt – az új Aluprof táblával (18. o.) nem egyezik az alapja, ellenőrizd.')

tid = 'tpl_legacy_hydra'
template(tid, categoryId=C3, alsoInCategoryIds=[C4], mountTypes=[W, N],
         moduleSplits=[{'axis': 'width', 'maxCm': 600, 'maxModules': 2}],
         sizeLimits={'minWidthCm': 200, 'maxWidthCm': 1200, 'minProjectionCm': 200, 'maxProjectionCm': 500, 'maxHeightCm': 300}, sizeRules=[])
old = items(tid)
drop(tid, ['mat_hydra_base', 'mat_hydra_base_2m', 'mat_hydra_led', 'mat_hydra_smarthome'])
hd = old['mat_hydra_base']['description']
if not any('_zip_' in m['id'] for m in tpls[tid]['materials']):
    tpls[tid]['materials'] += copy_items('tpl_legacy_keplan', ZIP_FROM_KEPLAN, 'hydra')
put(tid, [
    matrix_item('mat_hydra_base', old['mat_hydra_base']['name'], table('hydra_wall_1'), W, 0.65, 2345, hd, disc=10),
    matrix_item('mat_hydra_base_2m', old['mat_hydra_base_2m']['name'], table('hydra_wall_2m_3col'), W, 0.65, 2870, hd, disc=10),
    matrix_item('mat_hydra_t_1', 'HYDRA T – elhúzható, feszített ponyvával, lábak nélkül (falak közé / meglévő szerkezetre)', table('hydra_t_nolegs_1'), N, 0.65, 2345, hd, disc=10),
    matrix_item('mat_hydra_t_2m', 'HYDRA T – elhúzható, feszített ponyvával, lábak nélkül, 2 modul', table('hydra_t_nolegs_2m'), N, 0.65, 2870, hd, disc=10),
], [fixed_extra('x_hydra_led', 'LED világítás a vásznat vezető szélső gerendák belső felén (szabályozható, COB LED-szalag, meleg fehér, 2 db)', 800),
    *common_extras('hydra')])
tpls[tid]['catalogRef']['note'] = KE_NOTE + ' A 2 modulos ár a gyártó 2 modulos táblájából jön (nem modulonként × 2).'

tid = 'tpl_xtesa'
hydra = tpls['tpl_legacy_hydra']
template(tid, categoryId=C3, name='XTESA elhúzható feszített ponyvás pergola', order=3,
         subtitle='Elhúzható, feszített vásznas tető – falhoz rögzítve, nagy kinyúlással',
         mountTypes=[W],
         moduleSplits=[{'axis': 'width', 'maxCm': 500, 'breakpointsCm': [500, 1000]}],
         sizeLimits={'minWidthCm': 200, 'maxWidthCm': 1000, 'minProjectionCm': 250, 'maxProjectionCm': 700, 'maxHeightCm': 300},
         sizeRules=[{'id': 'rule_xtesa_wide', 'label': '800 cm szélesség felett', 'ifWidthOverCm': 800, 'maxProjectionCm': 400}],
         introText='Az XTESA ({{meret}}, {{beepites}}) falhoz rögzített, elhúzható, feszített vásznas tetejű pergola. '
                   'A vászon motorral nyitható és zárható, feszítve stabil és esztétikus, az esővíz az elülső ereszcsatornán át távozik.',
         closingText=hydra.get('closingText', ''),
         catalogRef={'productAlias': 'KE Xtesa', 'note': KE_NOTE + ' Motor: Somfy PERGOLA IO 30/17 motoros doboz gyári listaáron. A gyári tábla 1 modulnál 450 cm kinyúlás felett csak 400 cm szélességig áraz.'})
xd = 'Alumínium szerkezet, motorral elhúzható, feszített vászon. Az ár a motort nem tartalmazza (külön tétel).'
if not any(m['id'] == 'mat_xtesa_motor' for m in tpls[tid]['materials']):
    tpls[tid]['materials'] = [
        material(id='mat_xtesa_motor', name='Motor – Somfy PERGOLA IO motoros doboz (modulonként 1 db)', basePrice=975, unitPrice=975, perModule=True),
        *copy_items('tpl_legacy_hydra', {'mat_hydra_remote', 'mat_hydra_gift_sensor', 'mat_hydra_install', 'mat_hydra_zip_a', 'mat_hydra_zip_b_wall'}, 'xtesa'),
    ]
put(tid, [
    matrix_item('mat_xtesa_1', 'XTESA – elhúzható, feszített ponyvával, falhoz rögzítve', table('xtesa_wall_1'), W, 0.65, 2345, xd, disc=10),
    matrix_item('mat_xtesa_2m', 'XTESA – elhúzható, feszített ponyvával, falhoz rögzítve, 2 modul (3 oszlop)', table('xtesa_wall_2m_3col'), W, 0.65, 2870, xd, disc=10),
], common_extras('xtesa'), prefix='xtesa')

# ================================================================ 4. MEGLÉVŐ SZERKEZETRE (lábak nélkül)
tid = 'tpl_legacy_veranda_tens'
template(tid, categoryId=C4, alsoInCategoryIds=[C3], mountTypes=[N],
         moduleSplits=[{'axis': 'width', 'maxCm': 450, 'maxModules': 2}],
         sizeLimits={'minWidthCm': 125, 'maxWidthCm': 900, 'minProjectionCm': 150, 'maxProjectionCm': 500, 'maxHeightCm': 300}, sizeRules=[])
put(tid, [], common_extras('veranda_tens'))
add_note(tid, '2026: a régi mérettábla maradt – az új Aluprof táblával (89. o.) nem egyezik az alapja, ellenőrizd.')

tid = 'tpl_legacy_veranda_v_zip'
template(tid, categoryId=C4, alsoInCategoryIds=[C3], mountTypes=[N],
         moduleSplits=[{'axis': 'width', 'maxCm': 500, 'maxModules': 2}],
         sizeLimits={'minWidthCm': 200, 'maxWidthCm': 1000, 'minProjectionCm': 200, 'maxProjectionCm': 600, 'maxHeightCm': 300}, sizeRules=[])
put(tid, [], common_extras('veranda_vzip'))
add_note(tid, '2026: a régi mérettábla maradt – az új Aluprof táblával (90. o.) nem egyezik az alapja, ellenőrizd.')

# ================================================================ 5. KAROS NAPELLENZŐK (új)
AW = {
    'madeira': ('MADEIRA kazettás karos napellenző', C5A, 'madeira_wall_motor_excl', 600, 'Motor – Somfy NEMO-H IO (SUNEA CSI io) 40 Nm', 456, True),
    'corsica': ('CORSICA kazettás karos napellenző', C5A, 'corsica_wall_motor_excl', 700, 'Motor – Somfy NEMO IO (SUNEA IO) 40 Nm', 411, True),
    'jamaica': ('JAMAICA kazetta nélküli karos napellenző', C5B, 'jamaica_wall_manual', 700, 'Motor – Somfy NEMO IO (SUNEA IO) 40 Nm', 411, False),
    'australia': ('AUSTRALIA kazetta nélküli karos napellenző', C5B, 'australia_wall_manual', 700, 'Motor – Somfy NEMO IO (SUNEA IO) 40 Nm', 411, False),
}
zip_install = next(m for m in tpls['tpl_legacy_refleksol_zip']['materials'] if m['id'] == 'mat_zip_install')
for slug, (name, cid, vk, maxw, motor, motor_price, cassette) in AW.items():
    tid = f'tpl_{slug}'
    template(tid, categoryId=cid, name=name, order=list(AW).index(slug) % 2 + 1,
             subtitle=('Kazettás' if cassette else 'Kazetta nélküli') + ' karos napellenző, Somfy IO motorral',
             mountTypes=[W],
             moduleSplits=[{'axis': 'width', 'maxCm': maxw, 'maxModules': 2}],
             sizeLimits={'minWidthCm': 200, 'maxWidthCm': maxw * 2, 'minProjectionCm': 150, 'maxProjectionCm': 360}, sizeRules=[],
             introText=f'A {name.split(" ")[0]} ({{{{meret}}}}) ' + ('teljesen zárt kazettás' if cassette else 'kazetta nélküli') +
                       ' karos napellenző motoros működtetéssel. Behúzott állapotban a vászon és a karok ' +
                       ('a kazettában védve vannak az időjárástól.' if cassette else 'a falon kompaktan helyezkednek el.'),
             closingText=tpls['tpl_legacy_refleksol_zip'].get('closingText', ''),
             catalogRef={'productAlias': f'Aluprof {name.split(" ")[0].title()}', 'note': LIST_NOTE + (' A gyári ár kézi (hajtókaros) kivitel, a motor külön tétel.' if not cassette else ' A gyári ár a motort nem tartalmazza.')})
    if not any(m['id'] == f'mat_{slug}_motor' for m in tpls[tid]['materials']):
        inst = copy.deepcopy(zip_install)
        inst['id'] = f'mat_{slug}_install'
        inst['name'] = 'Szerelés, programozás'
        tpls[tid]['materials'] = [
            material(id=f'mat_{slug}_motor', name=f'{motor} (modulonként 1 db)', basePrice=motor_price, unitPrice=motor_price, perModule=True),
            material(id=f'mat_{slug}_remote', name='Távirányító – Somfy Situo 1 io', basePrice=61, unitPrice=61, excludeFromPercentBase=True),
            inst,
        ]
    aw_extras = []
    if cassette:
        aw_extras.append(fixed_extra(f'x_{slug}_led_cassette', 'LED világítás a kazetta alsó felén (szabályozható, COB LED-szalag, meleg fehér)', 100))
    aw_extras.append(fixed_extra(f'x_{slug}_led_arms', 'LED világítás a vásznat mozgató karokban (szabályozható, COB LED-szalag, meleg fehér)', 500))
    aw_extras += common_extras(slug, infra=False)
    put(tid, [matrix_item(f'mat_{slug}_base', f'{name} – {"kazettás" if cassette else "kazetta nélküli"}, falra szerelve', table(vk), W, 1.0, 0,
                          'Alumínium szerkezet, összecsukható karok. Több modulnál modulonkénti ár × modulszám.', modules=False, split=True)],
        aw_extras, ral=False, prefix=slug)

# ================================================================ 6–7. POLIKARBONÁT / ÜVEGTETŐ
veranda_roof = next(m for m in tpls['tpl_legacy_glassfix']['materials'] if m['id'] == 'mat_glassfix_veranda')
for tid, prefix, wall_proj in [('tpl_legacy_polifix', 'polifix', 600), ('tpl_legacy_glassfix', 'glassfix', 450)]:
    t = template(tid, mountTypes=[W, F],
                 sizeLimits={**tpls[tid].get('sizeLimits', {}), 'maxWidthCm': 1700, 'maxProjectionCm': wall_proj, 'maxHeightCm': 300},
                 sizeRules=[{'id': f'rule_{prefix}_free', 'label': 'különálló szerkezetként', 'mountType': F,
                             'maxWidthCm': 1580, 'maxProjectionCm': 400, 'maxHeightCm': 250}])
    drop(tid, lambda m: '_ral_' in m['id'] or m['id'] == f'mat_{prefix}_spot')
    if prefix == 'polifix' and not any(m['id'] == 'mat_polifix_veranda' for m in t['materials']):
        v = copy.deepcopy(veranda_roof)
        v['id'] = 'mat_polifix_veranda'
        t['materials'].append(v)
    put(tid, [], [
        fixed_extra(f'x_{prefix}_led_strip', 'LED-szalag világítás a tetőtartó gerendák belső felén (szabályozható, COB LED-szalag, meleg fehér)', 50,
                    pricingMode='per_lm', dimensionSource='perimeter_lm', unitLabel='fm'),
        fixed_extra(f'x_{prefix}_led_spot', 'LED spot világítás a tetőtartó gerendák belső felén (szabályozható, COB LED spot, meleg fehér) – db', 50,
                    defaultQuantity=6),
        *common_extras(prefix, sensors=False, smart=False, sun=False),
    ], prefix=prefix)

# ================================================================ 8. ÜVEGFAL
for tid in ('tpl_legacy_uvegfal_spanyol', 'tpl_legacy_uvegfal_lengyel'):
    t = template(tid, categoryId=C8, sizeLimits={k: v for k, v in tpls[tid].get('sizeLimits', {}).items() if 'Width' not in k} | {'maxHeightCm': 300})
    put(tid, [], [])
for tid, name, sub in [('tpl_thermo_glass', 'THERMO GLASS hőszigetelt, eltolható üvegfal', 'Hőszigetelt üvegezésű, eltolható üvegfalrendszer'),
                       ('tpl_guillotine_vertica', 'GUILLOTINE Vertica motoros üvegfal', 'Motoros mozgatású, függőlegesen nyíló (guillotine) üvegfalrendszer')]:
    template(tid, categoryId=C8, name=name, subtitle=sub, status='inactive', order=3, mountTypes=[],
             sizeLimits={'maxHeightCm': 300}, sizeRules=[],
             catalogRef={'note': 'Nincs ár a kapott anyagokban – add meg a m² árat (sávosan), majd állítsd aktívra.'})
    if not tpls[tid]['materials']:
        tpls[tid]['materials'] = [material(id=f'mat_{tid[4:]}_base', name=name, pricingMode='tiered_m2', dimensionSource='front_wall', unitLabel='m²', m2Tiers=[])]
    put(tid, [], [], prefix=tid[4:])

# ================================================================ 9. ZIP
tid = 'tpl_legacy_refleksol_zip'
template(tid, categoryId=C9, mountTypes=[],
         moduleSplits=[{'axis': 'width', 'maxCm': 700, 'maxModules': 2}],
         sizeLimits={**tpls[tid].get('sizeLimits', {}), 'maxWidthCm': 1400, 'maxHeightCm': 400}, sizeRules=[])
for m in tpls[tid]['materials']:
    if m['id'] == 'mat_zip_a':
        m['splitByModule'] = True
drop(tid, ['mat_zip_smarthome'])
put(tid, [], [*common_extras('zip', infra=False, sensors=False),
              fixed_extra('x_zip_wind', 'Szélérzékelő', 200)], prefix='zip')
add_note(tid, '2026: a régi mérettábla maradt – az új Aluprof R ZIIIP 120 tábla (69. o.) motor nélküli, más alapú, ellenőrizd. Egyedi szövet katalógusból: ár nincs megadva.')

# ================================================================ TELJES EGYEZÉS A 2026-OS LISTÁKKAL
# A korábban megtartott régi táblák is a gyári táblára cserélődnek (a régi árképzővel), a motorok és
# távirányítók gyári listaáron, a ZIP árnyékolók táblájába a szükséges motor be van építve.

# A100 LUX: 2 / 3 / 4 vezetősín = 1 / 2 / 3 modul
tid = 'tpl_legacy_a100_lux'
old = items(tid)
a100_desc = old['mat_a100_base']['description'] if 'mat_a100_base' in old else ''
drop(tid, ['mat_a100_base', 'mat_a100_base_2', 'mat_a100_base_3', 'mat_a100_motor'])
if not any(m['id'] == 'mat_a100_motor_box' for m in tpls[tid]['materials']):
    tpls[tid]['materials'].insert(0, material(id='mat_a100_motor_box', name='Motor – Somfy Sunilus IO 30/17 motoros doboz (modulonként 1 db)',
                                              basePrice=910, unitPrice=910, perModule=True))
put(tid, [
    matrix_item('mat_a100_base', 'GENIUS A100 LUX elhúzható PVC ponyvás pergola – 1 modul (2 vezetősín)', table('a100lux_wall_1'), W, 0.65, 2470, a100_desc, disc=10),
    matrix_item('mat_a100_base_2', 'GENIUS A100 LUX elhúzható PVC ponyvás pergola – 2 modul (3 vezetősín)', table('a100lux_wall_2'), W, 0.65, 2470, a100_desc, disc=10),
    matrix_item('mat_a100_base_3', 'GENIUS A100 LUX elhúzható PVC ponyvás pergola – 3 modul (4 vezetősín)', table('a100lux_wall_3'), W, 0.65, 2470, a100_desc, disc=10),
], [m for m in tpls[tid]['materials'] if m['id'].startswith('x_') and not m['id'].endswith('_ral')], prefix='a100')
tpls[tid]['catalogRef']['note'] = KE_NOTE + ' Motor: Sunilus IO 30/17 motoros doboz gyári listaáron, modulonként.'

# Pergola V ZIIIP (motorral)
tid = 'tpl_legacy_pergola_v_ziip'
old = items(tid)
drop(tid, ['mat_pvziip_base'])
put(tid, [matrix_item('mat_pvziip_base', old['mat_pvziip_base']['name'], table('vziip_wall'), W, 0.66, 2100,
                      old['mat_pvziip_base']['description'], modules=False, split=True)],
    [m for m in tpls[tid]['materials'] if m['id'].startswith('x_') and not m['id'].endswith('_ral')], prefix='pvziip')
tpls[tid]['catalogRef']['note'] = AL_NOTE + ' A gyári ár a motort tartalmazza (Somfy Pergola io).'

# Veranda (Tens): a gyári táblában a „magasság” a kinyúlás; a motor külön, kötelező
VARIANTS['veranda_motor_excl']['rowAxis'] = 'projection'
tid = 'tpl_legacy_veranda_tens'
old = items(tid)
drop(tid, ['mat_veranda_tens_base'])
put(tid, [matrix_item('mat_veranda_tens_base', old['mat_veranda_tens_base']['name'], table('veranda_motor_excl'), None, 1, 125,
                      old['mat_veranda_tens_base']['description'], modules=False, split=True)],
    [m for m in tpls[tid]['materials'] if m['id'].startswith('x_') and not m['id'].endswith('_ral')], prefix='veranda_tens')
tpls[tid]['catalogRef']['note'] = 'Árképző: Aluprof gyári listaár × 1 + fix felár (a régi árképző szerint). Motor: Somfy Sunilus 50 IO 40/17 gyári listaáron.'

# Veranda V ZIIIP (motorral)
tid = 'tpl_legacy_veranda_v_zip'
old = items(tid)
drop(tid, ['mat_veranda_vzip_base', 'mat_veranda_vzip_base_multi'])
vb = matrix_item('mat_veranda_vzip_base', old['mat_veranda_vzip_base']['name'], table('veranda_vziip'), None, 0.66, 1125,
                 old['mat_veranda_vzip_base']['description'], modules=False, split=True)
vb['maxModules'] = 1
vm = matrix_item('mat_veranda_vzip_base_multi', old['mat_veranda_vzip_base_multi']['name'], table('veranda_vziip'), None, 0.66, 1625,
                 old['mat_veranda_vzip_base_multi']['description'], modules=False, split=True)
vm['minModules'] = 2
put(tid, [vb, vm], [m for m in tpls[tid]['materials'] if m['id'].startswith('x_') and not m['id'].endswith('_ral')], prefix='veranda_vzip')
tpls[tid]['catalogRef']['note'] = AL_NOTE + ' A gyári ár a motort tartalmazza (Somfy Pergola io).'

# R ZIIIP 120 (Refleksol 120 ZIP): gyári tábla + Somfy io motor (262 EUR, nagy méretnél 25 Nm: 332 EUR)
zip_t = table('rziip120_motor_excl')
zt = zip_t['matrixTable']
w_axis_rows = zip_t['matrixRowAxis'] == 'width'
for r, row in zt['values'].items():
    for c, price in list(row.items()):
        width = float(r) if w_axis_rows else float(c)
        height = float(c) if w_axis_rows else float(r)
        big = width >= 525 or (width >= 425 and height >= 325)
        row[c] = price + (332 if big else 262)
ZIP_NOTE = 'Aluprof R ZIIIP 120 gyári ár + Somfy Sunilus SCR IO 10/17 motor (nagy méretnél Maestria+ io 25/17).'
for t in db['templates']:
    for m in t['materials']:
        if m['pricingMode'] == 'matrix_cm' and 'Refleksol 120' in m['name'] + m.get('description', ''):
            # az árnyékoló szélessége az eredeti tétel szerinti oldal (szélesség vagy kinyúlás)
            side = m.get('_zipSide') or next(
                (ax for ax in (m.get('matrixRowAxis') or 'projection', m.get('matrixColAxis') or 'width') if ax != 'height'), 'width')
            m['_zipSide'] = side
            m['matrixTable'] = copy.deepcopy(zt)
            m['matrixRowAxis'] = zip_t['matrixRowAxis'] if zip_t['matrixRowAxis'] == 'height' else side
            m['matrixColAxis'] = zip_t['matrixColAxis'] if zip_t['matrixColAxis'] == 'height' else side
            m.pop('matrixRowSnap', None)
            m.pop('matrixColSnap', None)
            if 'motor' not in m.get('description', '').lower():
                m['description'] = (m.get('description', '') + ' Az ár a Somfy IO motort tartalmazza.').strip()
add_note('tpl_legacy_refleksol_zip', ZIP_NOTE)

# Motorok és távirányítók gyári listaáron
MOTORS = {
    'mat_kedry_motor': ('Motor – Somfy Sunilus IO 55/17 (modulonként 1 db)', 588),
    'mat_hydra_motor': ('Motor – Somfy Sunilus IO 55/17 (modulonként 1 db)', 588),
    'mat_keplan_motor': ('Motor – Somfy Sunilus IO 30/17 motoros doboz', 910),
    'mat_isola_motor': ('Motor – Somfy Sunilus IO 30/17 motoros doboz', 910),
    'mat_veranda_tens_motor': ('Motor – Somfy Sunilus 50 IO 40/17 (modulonként 1 db)', 383),
}
KE_REMOTE = ('Távirányító – Somfy Situo 1 Pure II io', 79)
AL_REMOTE = ('Távirányító – Somfy Situo 1 io Pure', 61)
for t in db['templates']:
    for m in t['materials']:
        if m['id'] in MOTORS:
            m['name'], price = MOTORS[m['id']]
            m['basePrice'] = m['unitPrice'] = price
        elif m['id'].endswith('_remote') and m['pricingMode'] == 'fixed' and t['id'] != 'tpl_legacy_seesky_bio':
            m['name'], price = KE_REMOTE if t['id'] in KE_TPLS_ALL else AL_REMOTE
            m['basePrice'] = m['unitPrice'] = price

# Méretkorlátok a gyári táblák szerint (ahol szigorúbb, mint a docx)
tpls['tpl_legacy_kedry_skylife']['sizeLimits'].update({'maxWidthCm': 1206, 'maxProjectionCm': 884})
tpls['tpl_legacy_veranda_tens']['sizeLimits'].update({'maxProjectionCm': 500})

# ---------------------------------------------------------------- színek a gyári színkártyákból
RAL_HEX = {
    '1013': '#e3d9c6', '1015': '#e6d2b5', '1019': '#a48f7a', '1023': '#f7b500', '3002': '#9b2423', '3007': '#412227',
    '5000': '#3b5068', '5002': '#00387b', '6003': '#424632', '6007': '#343b29', '6025': '#53753c', '7001': '#8c969d',
    '7006': '#75695e', '7012': '#4e5754', '7015': '#51565c', '7016': '#383e42', '7021': '#2e3234', '7022': '#4b4d46',
    '7024': '#474a50', '7030': '#8f8f8c', '7035': '#cbd0cc', '7037': '#7a7b7a', '7038': '#b4b8b0', '7039': '#6c6960',
    '7042': '#8f9695', '7043': '#4e5451', '7044': '#bdbdb2', '7048': '#7e7b70', '8003': '#80542f', '8014': '#4a3526',
    '8016': '#4c2b20', '8017': '#44322d', '8019': '#3f3a3a', '9001': '#efebdc', '9002': '#dddedd', '9003': '#f4f8f4',
    '9005': '#0a0a0d', '9006': '#a5a8a6', '9007': '#8f8f8c', '9010': '#f7f9ef', '9016': '#f7fbf5',
}
OTHER_HEX = {
    'CARBON': '#2b2b2b', 'CORTEN': '#8a4b2a', 'S1515-R80B': '#a9c2d9', '1050-B30G': '#4fa9b8', 'VSR 240': '#d8c7a6',
    'VSR 780': '#5a4636', 'FSM 71319': '#3c3f42', 'DB 703': '#5f6264', 'Wood 26': '#6b2e1f', 'Wood 27': '#7b3a2a',
    'Wood 28': '#5a3a26', 'Wood 30': '#a86b32', 'Wood 49': '#8c6a47', 'Wood 52': '#7a5536',
}


def colour_hex(code):
    for k, v in OTHER_HEX.items():
        if k.lower() in code.lower():
            return v
    digits = ''.join(ch for ch in code if ch.isdigit())[:4]
    return RAL_HEX.get(digits)


def colour_option(c, i, prefix):
    code = c['code'].replace(' MAT', '').replace(' STR', '').replace(' ROUGH', '').strip()
    finish = 'struktúrált' if ' STR' in c['code'] else ''
    return {'id': f'col_{prefix}_{i}', 'code': code.title() if code.isupper() and not code.startswith(('RAL', 'NCS', 'VSR', 'FSM', 'DB')) else code,
            'name': (c.get('name', '').title() + (f', {finish}' if finish else '')).strip(', '), 'hex': colour_hex(c['code'])}


def colour_lists(source, product_key=None):
    std, extra, seen = [], [], set()
    for c in src[source]['colors']:
        hexv = colour_hex(c['code'])
        if not hexv or (c['code'] + c.get('name', '')) in seen:
            continue
        seen.add(c['code'] + c.get('name', ''))
        note = c.get('surchargeNote', '')
        if product_key:
            seg = next((x for x in note.split(';') if x.strip().lower().startswith(product_key.lower())), '')
            free = 'included' in seg or 'no surcharge' in seg
        else:
            free = 'no surcharge' in note.lower()
        (std if free else extra).append(c)
    return std, extra


COLOURS = {
    'tpl_legacy_kedry_skylife': ('ke_bioclimatica', None), 'tpl_kedry_neos': ('ke_bioclimatica', None),
    'tpl_legacy_hydra': ('ke_gennius', None), 'tpl_xtesa': ('ke_gennius', None), 'tpl_legacy_keplan': ('ke_gennius', None),
    'tpl_legacy_a100_lux': ('ke_gennius', None), 'tpl_legacy_isola_2a': ('ke_gennius', None), 'tpl_isola_3': ('ke_gennius', None),
    'tpl_legacy_sb400': ('aluprof', 'SB400'), 'tpl_legacy_pergola_v_ziip': ('aluprof', 'Pergola V ZIIIP'),
    'tpl_legacy_veranda_tens': ('aluprof', 'R ZIIIP 120 & VERANDA'), 'tpl_legacy_refleksol_zip': ('aluprof', 'R ZIIIP 120 & VERANDA'),
    'tpl_legacy_veranda_v_zip': ('aluprof', 'VERANDA V ZIIIP'),
    'tpl_madeira': ('aluprof', 'Australia/Jamaica/Madeira'), 'tpl_jamaica': ('aluprof', 'Australia/Jamaica/Madeira'),
    'tpl_australia': ('aluprof', 'Australia/Jamaica/Madeira'), 'tpl_corsica': ('aluprof', 'Corsica'),
}
for tid, (source, key_) in COLOURS.items():
    t = tpls[tid]
    std, extra = colour_lists(source, key_)
    prefix = tid.replace('tpl_legacy_', '').replace('tpl_', '')
    if prefix in AW and not any(m['id'].endswith('_ral') for m in t['materials']):
        r = ral_extra(prefix)
        r['name'] = 'Egyedi szín a gyári színkártyáról (+20% felár)'
        first_pct = next((i for i, m in enumerate(t['materials']) if m['pricingMode'] == 'percentage'), len(t['materials']))
        t['materials'].insert(first_pct, r)
    struct = [m for m in t['materials'] if m['itemRole'] == 'base' and m['pricingMode'] == 'matrix_cm'
              and 'Szerelés' not in m['name'] and not (tid == 'tpl_legacy_refleksol_zip' and m['id'] != 'mat_zip_a')]
    for m in struct:
        m['colorOptions'] = [colour_option(c, i, f'{prefix}_std') for i, c in enumerate(std)]
        m['colorTitle'] = 'Alapszínek (felár nélkül)'
    for m in t['materials']:
        if m['id'].endswith('_ral') and extra:
            m['colorOptions'] = [colour_option(c, i, f'{prefix}_x') for i, c in enumerate(extra)]
            m['colorTitle'] = 'Felárral választható színek'

# ================================================================ KÉPEK
# Új termékek: katalógusfotók + a 2 legfontosabb kiosztásrajz a sablon fotói közé.
# Meglévő termékek: a saját (valódi) fotóik maradnak. Extrák: illő kép, ami csak akkor kerül
# a PDF-be, ha az extra az ajánlatban van. Minden katalóguskép a képtárba is bekerül.
def img(slug, n=0, kind=None):
    lst = [x for x in images.get(slug, []) if not kind or x['kind'] == kind]
    return lst[n] if len(lst) > n else None


def as_photo(im, pid):
    return {'id': pid, 'imageUrl': im['url'], 'titleAbove': '', 'captionBelow': im.get('caption', ''), 'widthPct': 75, 'align': 'center'}


for t in db['templates']:
    t['photos'] = [p for p in t.get('photos', []) if not str(p.get('id', '')).startswith('ph_cat2026_')]
    for m in t['materials']:
        if m.get('photos'):
            m['photos'] = [p for p in m['photos'] if not str(p.get('id', '')).startswith('ph_cat2026_')]

for tid, slug in [('tpl_kedry_neos', 'kedry-neos'), ('tpl_isola_3', 'isola-3'), ('tpl_xtesa', 'xtesa')]:
    chosen = [x for x in images.get(slug, []) if x['kind'] == 'photo'] + [x for x in images.get(slug, []) if x['kind'] == 'drawing'][:2]
    tpls[tid]['photos'] = [as_photo(im, f'ph_cat2026_{slug}_{i}') for i, im in enumerate(chosen)] + tpls[tid]['photos']


def extra_photo(pred, im):
    if not im:
        return
    for t in db['templates']:
        for m in t['materials']:
            if pred(t, m):
                m.setdefault('photos', [])
                m['photos'].append(as_photo(im, f'ph_cat2026_{m["id"]}'))


KE_TPLS = {'tpl_legacy_kedry_skylife', 'tpl_kedry_neos', 'tpl_legacy_hydra', 'tpl_xtesa', 'tpl_legacy_keplan',
           'tpl_legacy_a100_lux', 'tpl_legacy_isola_2a', 'tpl_isola_3'}
extra_photo(lambda t, m: m['id'].endswith('_infra') and m['id'].startswith('x_'), img('heaters', 0))
extra_photo(lambda t, m: m['id'].endswith('_wind') and m['id'].startswith('x_'), img('automation', 4))
extra_photo(lambda t, m: m['id'].endswith('_ral') and t['id'] in KE_TPLS, img('colours-ke', 0))
extra_photo(lambda t, m: m['id'].endswith('_ral') and t['id'] not in KE_TPLS, img('colours-aluprof', 0))
extra_photo(lambda t, m: m['id'] in ('x_kedry_skylife_led_beam', 'x_neos_led_beam'), img('led', 0, 'drawing'))
extra_photo(lambda t, m: '_led_cross' in m['id'], img('led', 1))
extra_photo(lambda t, m: m['id'] == 'x_hydra_led', img('led', 3, 'drawing'))
extra_photo(lambda t, m: m['id'].endswith('_led_arms'), img('led', 0))
extra_photo(lambda t, m: m['id'] == 'mat_xtesa_motor', img('automation', 0))
extra_photo(lambda t, m: m['id'] in {f'mat_{a}_motor' for a in AW}, img('automation', 7))
extra_photo(lambda t, m: m['id'] in {f'mat_{a}_remote' for a in AW}, img('automation', 3))

media = db.setdefault('mediaLibrary', [])
have = {m['url'] for m in media}
for slug, lst in images.items():
    for im in lst:
        if im['url'] in have:
            continue
        media.append({
            'id': 'media_cat2026_' + im['url'].split('catalog-2026/')[1].replace('/', '_').replace('.jpg', ''),
            'filename': im['url'].split('/')[-1],
            'originalName': f"{slug}/{im['url'].split('/')[-1]} – {im.get('caption', '')}",
            'url': im['url'],
            'uploadedAt': NOW,
        })

# a belső jelölők ne kerüljenek az adatbázisba
for t in db['templates']:
    for m in t['materials']:
        m.pop('_import2026', None)
        m.pop('_source', None)
        m.pop('_files', None)
        m.pop('_zipSide', None)

json.dump(db, open(DB, 'w'), ensure_ascii=False, indent=2)
print('\n'.join(report))
print(f'Kész: {len(db["templates"])} sablon, {len(db["categories"])} kategória.')
