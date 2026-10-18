from backend.utils import FormData

from backend.utils import Arkepzok
from backend.utils import currency_format
from backend.utils import get_uvegfal_tablak_szama
from backend.templates import Renderer

from backend.templates.uvegfalas.datasheet import OldalfalZaras_uvegfalrendszer_lengyel as LengyelUvegfal
from backend.templates.uvegfalas.datasheet import OldalfalZaras_uvegfalrendszer_spanyol as SpanyolUvegfal


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
    # Üvegfal rendszer spanyol

    projection_item1 = projection
    width_item1 = width
    height_item1 = height

    warning_msg_size_not_found_item1 = ""

    kedvezmenyes_ar_width_item1 = arkepzok.UVEGFAL_RENDSZER(SpanyolUvegfal().get_price(width_item1, height_item1))
    lista_ar_width_item1 = arkepzok.LISTA_AR(kedvezmenyes_ar_width_item1)
    
    kedvezmenyes_ar_projection_item1 = arkepzok.UVEGFAL_RENDSZER(SpanyolUvegfal().get_price(projection_item1, height_item1))
    lista_ar_projection_item1 = arkepzok.LISTA_AR(kedvezmenyes_ar_projection_item1)

    width_tablak_szama_item1 = get_uvegfal_tablak_szama(width_item1)
    projection_tablak_szama_item1 = get_uvegfal_tablak_szama(projection_item1)
    szereles_ar_item1 = int(sum([kedvezmenyes_ar_width_item1, kedvezmenyes_ar_projection_item1]) * 0.11)
    osszesen_ar_item1 = int(sum([kedvezmenyes_ar_width_item1, kedvezmenyes_ar_projection_item1, szereles_ar_item1]))
    alapszerkezet_szerelessel_eur_item1 = currency_format(osszesen_ar_item1)
    alapszerkezet_szerelessel_huf_item1 = currency_format(round(osszesen_ar_item1 * eur_huf_arfolyam, -3))

    ######################################################################################################################
    # # # # # # # # # # # # # # # # # # # # # # # # # # #   ITEM 2   # # # # # # # # # # # # # # # # # # # # # # # # # # #
    # Üvegfal rendszer lengyel

    projection_item2 = projection
    width_item2 = width
    height_item2 = height

    warning_msg_size_not_found_item2 = ""

    kedvezmenyes_ar_width_item2 = arkepzok.UVEGFAL_RENDSZER(LengyelUvegfal().get_price(width_item2, height_item2))
    lista_ar_width_item2 = arkepzok.LISTA_AR(kedvezmenyes_ar_width_item2)
    
    kedvezmenyes_ar_projection_item2 = arkepzok.UVEGFAL_RENDSZER(LengyelUvegfal().get_price(projection_item2, height_item2))
    lista_ar_projection_item2 = arkepzok.LISTA_AR(kedvezmenyes_ar_projection_item2)

    width_tablak_szama_item2 = get_uvegfal_tablak_szama(width_item2)
    projection_tablak_szama_item2 = get_uvegfal_tablak_szama(projection_item2)
    szereles_ar_item2 = int(sum([kedvezmenyes_ar_width_item2, kedvezmenyes_ar_projection_item2]) * 0.12)
    osszesen_ar_item2 = int(sum([kedvezmenyes_ar_width_item2, kedvezmenyes_ar_projection_item2, szereles_ar_item2]))
    alapszerkezet_szerelessel_eur_item2 = currency_format(osszesen_ar_item2)
    alapszerkezet_szerelessel_huf_item2 = currency_format(round(osszesen_ar_item2 * eur_huf_arfolyam, -3))

    #####################################################################################################################
    # # # # # # # # # # # # # # # # # # # # # # # # # #   VARIABLES   # # # # # # # # # # # # # # # # # # # # # # # # # #
    html_variables = {
        "name": name,
        "projection": projection,
        "width": width,
        "height": height,
        "eur_huf_arfolyam": eur_huf_arfolyam,

        # ITEM 1
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
        "projection_tablak_szama_item1": projection_tablak_szama_item1,
        "width_tablak_szama_item1": width_tablak_szama_item1,

        # ITEM 2
        "projection_item2": projection_item2,
        "width_item2": width_item2,
        "height_item2": height_item2,
        "warning_msg_size_not_found_item2": warning_msg_size_not_found_item2,
        'kedvezmenyes_ar_projection_item2': kedvezmenyes_ar_projection_item2,
        'lista_ar_projection_item2': lista_ar_projection_item2,
        'kedvezmenyes_ar_width_item2': kedvezmenyes_ar_width_item2,
        'lista_ar_width_item2': lista_ar_width_item2,
        "szereles_ar_item2": szereles_ar_item2,
        "osszesen_ar_item2": osszesen_ar_item2,
        "alapszerkezet_szerelessel_eur_item2": alapszerkezet_szerelessel_eur_item2,
        "alapszerkezet_szerelessel_huf_item2": alapszerkezet_szerelessel_huf_item2,
        "projection_tablak_szama_item2": projection_tablak_szama_item2,
        "width_tablak_szama_item2": width_tablak_szama_item2,

        "szallitasi_dij": currency_format(szallitasi_dij),
        "telepules": telepules,
    }

    Renderer().render_template(form_data, html_variables)





