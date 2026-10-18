from backend.utils import FormData

from backend.utils import Arkepzok
from backend.utils import currency_format
from backend.templates import Renderer

from backend.templates.feszitett_vasznas_tetore.datasheet import VerandaTens, VerandaVZIP


def main(form_data: FormData):

    #formsban megadott adatok
    name = form_data.name.split(" ")[-1]
    projection = form_data.projection
    width = form_data.width
    eur_huf_arfolyam = form_data.eur_huf_arfolyam
    szallitasi_dij = form_data.szallitasi_dij
    telepules = form_data.telepules

    arkepzok = Arkepzok()

    ######################################################################################################################
    # # # # # # # # # # # # # # # # # # # # # # # # # # #   ITEM 1   # # # # # # # # # # # # # # # # # # # # # # # # # # #
    # VERANDA TENS

    # projection_item1 = 600 #adatbázisból lekérdezés alapján megkapott adatok
    # width_item1 = 330 #adatbázisból lekérdezés alapján megkapott adatok
    # kedvezmenyes_ar_item1 = 4400 #adatbázisból lekérdezés alapján megkapott adatok
    # modulok_szama_item1 = 2

    datasheet_verandatens = VerandaTens(projection, width)
    if datasheet_verandatens.is_projection_above_max_size() or datasheet_verandatens.is_projection_below_min_size():
        projection_item1 = datasheet_verandatens.get_item_projection() * datasheet_verandatens.get_modul_num()
    else:
        projection_item1 = projection
    
    if datasheet_verandatens.is_width_above_max_size() or datasheet_verandatens.is_width_below_min_size():
        width_item1 = datasheet_verandatens.get_item_width()
    else:
        width_item1 = width

    kedvezmenyes_ar_item1 = arkepzok.VERANDA_TENS_FESZITETT_VASZNAS_TETORE(datasheet_verandatens.get_item_price())
    # print(f"PRICE FETCH: kedvezmenyes_ar_item1 fetched: {kedvezmenyes_ar_item1} | Original: {5600}")
    modulok_szama_item1 = datasheet_verandatens.get_modul_num()

############################################################  DATASHEET READ END ############################################################

    is_projection_below_min_size = datasheet_verandatens.is_projection_below_min_size()
    is_projection_above_max_size = datasheet_verandatens.is_projection_above_max_size()
    is_width_below_min_size = datasheet_verandatens.is_width_below_min_size()
    is_width_above_max_size = datasheet_verandatens.is_width_above_max_size()

    is_warning_neccessary = False
    if is_projection_below_min_size or is_width_below_min_size:
        min_max_item1 = "minimum"
        is_warning_neccessary = True
    if is_projection_above_max_size or is_width_above_max_size:
        min_max_item1 = "maximum"
        is_warning_neccessary = True
    
    if is_warning_neccessary:
        warning_msg_size_not_found_item1 = f"FONTOS: Nincsen a megadott méretben ({projection} * {width}), csak {min_max_item1} {projection_item1} * {width_item1}. Az ajánlatban ezzel a mérettel kalkuláltam. Ha mindenképpen az eredeti méret ({projection} * {width}) érdekli, kérem vegye fel velem a kapcsolatot."
    else:
        warning_msg_size_not_found_item1 = ""

    lista_ar_item1 = arkepzok.LISTA_AR(kedvezmenyes_ar_item1)
    motor_kedvezmenyes_ar_item1 = modulok_szama_item1 * 350 # statikus
    motor_lista_ar_item1 = arkepzok.LISTA_AR(motor_kedvezmenyes_ar_item1)
    taviranyito_kedvezmenyes_ar_item1 = 100 # statikus

    reszosszeg_item1 = sum([kedvezmenyes_ar_item1, motor_kedvezmenyes_ar_item1, taviranyito_kedvezmenyes_ar_item1])
    if modulok_szama_item1 > 1:
        szereles_ar_item1 = int(reszosszeg_item1 * 0.13)
    else:
        szereles_ar_item1 = int(reszosszeg_item1 * 0.15)

    osszesen_ar_item1 = sum([reszosszeg_item1, szereles_ar_item1])
    alapszerkezet_szerelessel_eur_item1 = currency_format(osszesen_ar_item1)
    alapszerkezet_szerelessel_huf_item1 = currency_format(round(osszesen_ar_item1 * eur_huf_arfolyam, -3))

    ######################################################################################################################
    # # # # # # # # # # # # # # # # # # # # # # # # # # #   ITEM 2   # # # # # # # # # # # # # # # # # # # # # # # # # # #
    # Veranda V ZIP

    # projection_item2 = 600 #adatbázisból lekérdezés alapján megkapott adatok
    # width_item2 = 330 #adatbázisból lekérdezés alapján megkapott adatok
    # kedvezmenyes_ar_item2 = 4400 #adatbázisból lekérdezés alapján megkapott adatok
    # modulok_szama_item2 = 2

    datasheet_verandavzip = VerandaVZIP(projection, width)
    if datasheet_verandavzip.is_projection_above_max_size() or datasheet_verandavzip.is_projection_below_min_size():
        projection_item2 = datasheet_verandavzip.get_item_projection() * datasheet_verandavzip.get_modul_num()
    else:
        projection_item2 = projection
    
    if datasheet_verandavzip.is_width_above_max_size() or datasheet_verandavzip.is_width_below_min_size():
        width_item2 = datasheet_verandavzip.get_item_width()
    else:
        width_item2 = width

    kedvezmenyes_ar_item2 = arkepzok.VERANDA_V_ZIP(datasheet_verandavzip.get_item_price())
    # print(f"PRICE FETCH: kedvezmenyes_ar_item2 fetched: {kedvezmenyes_ar_item2} | Original: {5600}")
    modulok_szama_item2 = datasheet_verandavzip.get_modul_num()

    if modulok_szama_item2 > 1:
        kedvezmenyes_ar_item2 += 500

############################################################  DATASHEET READ END ############################################################

    is_projection_below_min_size = datasheet_verandavzip.is_projection_below_min_size()
    is_projection_above_max_size = datasheet_verandavzip.is_projection_above_max_size()
    is_width_below_min_size = datasheet_verandavzip.is_width_below_min_size()
    is_width_above_max_size = datasheet_verandavzip.is_width_above_max_size()

    is_warning_neccessary = False
    if is_projection_below_min_size or is_width_below_min_size:
        min_max_item2 = "minimum"
        is_warning_neccessary = True
    if is_projection_above_max_size or is_width_above_max_size:
        min_max_item2 = "maximum"
        is_warning_neccessary = True
    
    if is_warning_neccessary:
        warning_msg_size_not_found_item2 = f"FONTOS: Nincsen a megadott méretben ({projection} * {width}), csak {min_max_item2} {projection_item2} * {width_item2}. Az ajánlatban ezzel a mérettel kalkuláltam. Ha mindenképpen az eredeti méret ({projection} * {width}) érdekli, kérem vegye fel velem a kapcsolatot."
    else:
        warning_msg_size_not_found_item2 = ""

    lista_ar_item2 = arkepzok.LISTA_AR(kedvezmenyes_ar_item2)
    taviranyito_kedvezmenyes_ar_item2 = 100 # statikus

    reszosszeg_item2 = sum([kedvezmenyes_ar_item2, taviranyito_kedvezmenyes_ar_item2])
    szereles_ar_item2 = int(reszosszeg_item2 * 0.12)
    
    osszesen_ar_item2 = sum([reszosszeg_item2, szereles_ar_item2])
    alapszerkezet_szerelessel_eur_item2 = currency_format(osszesen_ar_item2)
    alapszerkezet_szerelessel_huf_item2 = currency_format(round(osszesen_ar_item2 * eur_huf_arfolyam, -3))

    #####################################################################################################################
    # # # # # # # # # # # # # # # # # # # # # # # # # #   VARIABLES   # # # # # # # # # # # # # # # # # # # # # # # # # #
    html_variables = {
        "name": name,
        "projection": projection,
        "width": width,
        "eur_huf_arfolyam": eur_huf_arfolyam,

        # ITEM 1
        "projection_item1": projection_item1,
        "width_item1": width_item1,
        "modulok_szama_item1": modulok_szama_item1,
        "warning_msg_size_not_found_item1": warning_msg_size_not_found_item1,
        'kedvezmenyes_ar_item1': kedvezmenyes_ar_item1,
        'lista_ar_item1': lista_ar_item1,
        "motor_lista_ar_item1": motor_lista_ar_item1,
        "motor_kedvezmenyes_ar_item1": motor_kedvezmenyes_ar_item1,
        "szereles_ar_item1": szereles_ar_item1,
        "osszesen_ar_item1": osszesen_ar_item1,
        "alapszerkezet_szerelessel_eur_item1": alapszerkezet_szerelessel_eur_item1,
        "alapszerkezet_szerelessel_huf_item1": alapszerkezet_szerelessel_huf_item1,

        # # ITEM 2
        "projection_item2": projection_item2,
        "width_item2": width_item2,
        "modulok_szama_item2": modulok_szama_item2,
        "warning_msg_size_not_found_item2": warning_msg_size_not_found_item2,
        'kedvezmenyes_ar_item2': kedvezmenyes_ar_item2,
        'lista_ar_item2': lista_ar_item2,
        "szereles_ar_item2": szereles_ar_item2,
        "osszesen_ar_item2": osszesen_ar_item2,
        "alapszerkezet_szerelessel_eur_item2": alapszerkezet_szerelessel_eur_item2,
        "alapszerkezet_szerelessel_huf_item2": alapszerkezet_szerelessel_huf_item2,

        "szallitasi_dij": currency_format(szallitasi_dij),
        "telepules": telepules,
    }

    Renderer().render_template(form_data, html_variables)





