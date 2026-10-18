from backend.utils import FormData

from backend.utils import Arkepzok
from backend.utils import currency_format
from backend.templates import Renderer

from backend.templates.ZIPes.datasheet import Refleksol_120_ZIP


def main(form_data: FormData):

    #formsban megadott adatok
    name = form_data.name.split(" ")[-1]
    projection = form_data.projection
    width = form_data.width
    height = form_data.height
    eur_huf_arfolyam = form_data.eur_huf_arfolyam
    szallitasi_dij = form_data.szallitasi_dij
    telepules = form_data.telepules

    arkepzok = Arkepzok()

    ######################################################################################################################
    # # # # # # # # # # # # # # # # # # # # # # # # # # #   ITEM 1   # # # # # # # # # # # # # # # # # # # # # # # # # # #
    # Refleksol_120_ZIP

    # projection_item1 = 500 #adatbázisból lekérdezés alapján megkapott adatok
    # width_item1 = 300 #adatbázisból lekérdezés alapján megkapott adatok
    # height_item1 = 270 #adatbázisból lekérdezés alapján megkapott adatok
    # kedvezmenyes_ar_item1 = 3200 #adatbázisból lekérdezés alapján megkapott adatok

    datasheet_zip = Refleksol_120_ZIP(projection, width, height)
    projection_item1 = datasheet_zip.get_item_projection()
    width_item1 = datasheet_zip.get_item_width()
    height_item1 = datasheet_zip.get_item_height()

############################################################  DATASHEET READ END ############################################################

    is_projection_below_min_size = datasheet_zip.is_projection_below_min_size()
    is_projection_above_max_size = datasheet_zip.is_projection_above_max_size()
    is_width_below_min_size = datasheet_zip.is_width_below_min_size()
    is_width_above_max_size = datasheet_zip.is_width_above_max_size()
    is_height_below_min_size = datasheet_zip.is_height_below_min_size()
    is_height_above_max_size = datasheet_zip.is_height_above_max_size()

    is_warning_neccessary = False
    if is_projection_below_min_size or is_width_below_min_size or is_height_below_min_size:
        min_max_item1 = "minimum"
        is_warning_neccessary = True
    if is_projection_above_max_size or is_width_above_max_size or is_height_above_max_size:
        min_max_item1 = "maximum"
        is_warning_neccessary = True
    
    if is_warning_neccessary:
        warning_msg_size_not_found_item1 = f"FONTOS: Nincsen a megadott méretben ({projection} * {width} * {height}), csak {min_max_item1} {projection_item1} * {width_item1} * {height_item1}. Az ajánlatban ezzel a mérettel kalkuláltam. Ha mindenképpen az eredeti méret ({projection} * {width} * {height}) érdekli, kérem vegye fel velem a kapcsolatot."
    else:
        warning_msg_size_not_found_item1 = ""

    kedvezmenyes_ar_width_item1 = arkepzok.REFLEKSOL_120_ZIP(datasheet_zip.get_zip_price(width_item1, height_item1))
    lista_ar_width_item1 = arkepzok.LISTA_AR(kedvezmenyes_ar_width_item1)

    kedvezmenyes_ar_projection_item1 = arkepzok.REFLEKSOL_120_ZIP(datasheet_zip.get_zip_price(projection_item1, height_item1))
    lista_ar_projection_item1 = arkepzok.LISTA_AR(kedvezmenyes_ar_projection_item1)

    szereles_ar_item1 = int(sum([kedvezmenyes_ar_width_item1, kedvezmenyes_ar_projection_item1]) * 0.12)
    osszesen_ar_item1 = int(sum([kedvezmenyes_ar_width_item1, kedvezmenyes_ar_projection_item1, szereles_ar_item1]))
    alapszerkezet_szerelessel_eur_item1 = currency_format(osszesen_ar_item1)
    alapszerkezet_szerelessel_huf_item1 = currency_format(round(osszesen_ar_item1 * eur_huf_arfolyam, -3))

    #####################################################################################################################
    # # # # # # # # # # # # # # # # # # # # # # # # # #   VARIABLES   # # # # # # # # # # # # # # # # # # # # # # # # # #
    html_variables = {
        "name": name,
        "projection": projection,
        "width": width,
        "height": height,
        "eur_huf_arfolyam": eur_huf_arfolyam,

        # # ITEM 1
        "projection_item1": projection_item1,
        "width_item1": width_item1,
        "height_item1": height_item1,
        "warning_msg_size_not_found_item1": warning_msg_size_not_found_item1,
        'kedvezmenyes_ar_projection_item1': kedvezmenyes_ar_projection_item1,
        'lista_ar_projection_item1': lista_ar_projection_item1,
        'kedvezmenyes_ar_width_item1': kedvezmenyes_ar_width_item1,
        'lista_ar_width_item1': lista_ar_width_item1,
        "szereles_ar_item1": szereles_ar_item1,
        "osszesen_ar_item1": osszesen_ar_item1,
        "alapszerkezet_szerelessel_eur_item1": alapszerkezet_szerelessel_eur_item1,
        "alapszerkezet_szerelessel_huf_item1": alapszerkezet_szerelessel_huf_item1,

        "szallitasi_dij": currency_format(szallitasi_dij),
        "telepules": telepules,
    }

    Renderer().render_template(form_data, html_variables)





