from enum import Enum

class TermekTipus(Enum):
    Bioklimatikus = "bioklimatikus"
    ElhuzhatoPonyvas = "elhuzhato_ponyvas"
    FeszitettVasznas = "feszitett_vasznas"
    FeszitettVasznasTetore = "feszitett_vasznas_tetore"
    HivdFel = "hivd_fel"
    KarosNapellenzos = "karos_napellenzos"
    Polikarbonatos = "polikarbonatos"
    Uvegfalas = "uvegfalas"
    Uvegtetos = "uvegtetos"
    Zipes = "ZIPes"

class TermekNevRoviden(Enum):
    Bioklimatikus = "bioklimatikus"                     # megbeszélve # lefejlesztve # ellenőrizve ✅
    ElhuzhatoPonyvas = "elhúzható_ponyvás"              # megbeszélve # lefejlesztve # ellenőrizve ✅
    FeszitettVasznas = "feszített_vásznas"              # megbeszélve # lefejlesztve # ellenőrizve ✅
    FeszitettVasznasTetore = "feszített_vásznas_tetőre" # megbeszélve # lefejlesztve # ellenőrizve ✅
    HivdFel = "hívd_fel"                                # hibaüzenet => Balázs: Te Barom! Ne kattints ide. Hívd fel! ✅
    KarosNapellenzos = "karos_napellenzős"              # megbeszélve # ELVETVE # Hibaüzenettel lekezelni => Ez a termék nem elérhető ✅
    Polikarbonatos = "polikarbonátos"                   # megbeszélve # lefejlesztve # ellenőrizve ✅
    Uvegfalas = "üvegfalas"                             # megbeszélve # lefejlesztve # ellenőrizve ✅
    Uvegtetos = "üvegtetős"                             # megbeszélve # lefejlesztve # ellenőrizve ✅
    Zipes = "ZIPes"                                     # megbeszélve # lefejlesztve # ellenőrizve ✅

def TermekTipus_to_TermekNevRoviden(termek_tipus: TermekTipus) -> TermekNevRoviden:
    return TermekNevRoviden[termek_tipus.name]


class BeepitesTipus(Enum):
    EpulethezRogzitett = "Épülethez rögzített"
    SzabadonAllo = "Szabadon álló"