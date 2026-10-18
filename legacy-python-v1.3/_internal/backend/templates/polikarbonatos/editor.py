from backend.utils import FormData

from backend.utils import Arkepzok
from backend.utils import currency_format
from backend.utils import get_uvegfal_tablak_szama
from backend.templates import Renderer

from backend.templates.polikarbonatos.datasheet import Polifix


def main(form_data: FormData):

    #formsban megadott adatok
    name = form_data.name.split(" ")[-1]
    projection = form_data.projection
    width = form_data.width
    height = form_data.height
    is_oldalso_arnyekolo_enabled = form_data.is_oldalso_arnyekolo_enabled
    is_uvegfal_rendszer_enabled = form_data.is_uvegfal_rendszer_enabled
    is_opcio_led_vilagitas_enabled = form_data.is_opcio_led_vilagitas_enabled
    beepites_tipusa = form_data.beepites_tipusa
    eur_huf_arfolyam = form_data.eur_huf_arfolyam
    szallitasi_dij = form_data.szallitasi_dij
    telepules = form_data.telepules

    arkepzok = Arkepzok()

    ######################################################################################################################
    # # # # # # # # # # # # # # # # # # # # # # # # # #   BEVEZETŐ   # # # # # # # # # # # # # # # # # # # # # # # # # # #

    if is_opcio_led_vilagitas_enabled:
        opcionalisan_feltuntetni_led_opcio = ", opcionálisan LED világítással a szerkezet felső, tetőtartó gerendáiban"
    else:
        opcionalisan_feltuntetni_led_opcio = ""
        
    if (is_oldalso_arnyekolo_enabled and is_uvegfal_rendszer_enabled):
        opcionalisan_feltuntetni_oldalfal_zaras = f"Opcionálisan feltüntettem a szerkezet {projection} cm illetve {width} cm oldalára a motoros-oldalsó árnyékolókat és a keret nélküli, elcsúsztatható üvegfalrendszert is." 
    elif (is_oldalso_arnyekolo_enabled and not is_uvegfal_rendszer_enabled):
        opcionalisan_feltuntetni_oldalfal_zaras = f"Opcionálisan feltüntettem a szerkezet {projection} cm illetve {width} cm oldalára a motoros-oldalsó árnyékolókat is." 
    elif (not is_oldalso_arnyekolo_enabled and is_uvegfal_rendszer_enabled):
        opcionalisan_feltuntetni_oldalfal_zaras = f"Opcionálisan feltüntettem a szerkezet {projection} cm illetve {width} cm oldalára a keret nélküli, elcsúsztatható üvegfalrendszert is."
    else:
        opcionalisan_feltuntetni_oldalfal_zaras = ""

    ######################################################################################################################
    # # # # # # # # # # # # # # # # # # # # # # # # # # #   ITEM 1   # # # # # # # # # # # # # # # # # # # # # # # # # # #
    # Polifix

    # projection_item1 = 500 #adatbázisból lekérdezés alapján megkapott adatok
    # width_item1 = 300 #adatbázisból lekérdezés alapján megkapott adatok
    # height_item1 = 270 #adatbázisból lekérdezés alapján megkapott adatok
    # kedvezmenyes_ar_item1 = 3200 #adatbázisból lekérdezés alapján megkapott adatok
    # labak_szama_item1 = 2

    datasheet_polifix = Polifix(projection, width, height)
    projection_item1 = datasheet_polifix.get_item_projection()
    width_item1 = datasheet_polifix.get_item_width()
    height_item1 = datasheet_polifix.get_item_height()
    kedvezmenyes_ar_item1 = arkepzok.POLIFIX(datasheet_polifix.get_item_price())
    # print(f"PRICE FETCH: kedvezmenyes_ar_item1 fetched: {kedvezmenyes_ar_item1} | Original: {3200}")
    labak_szama_item1 = datasheet_polifix.get_labak_szama()
    szereles_ar_item1 = datasheet_polifix.get_szereles_ar()

############################################################  DATASHEET READ END ############################################################

    is_projection_below_min_size = datasheet_polifix.is_projection_below_min_size()
    is_projection_above_max_size = datasheet_polifix.is_projection_above_max_size()
    is_width_below_min_size = datasheet_polifix.is_width_below_min_size()
    is_width_above_max_size = datasheet_polifix.is_width_above_max_size()
    is_height_below_min_size = datasheet_polifix.is_height_below_min_size()
    is_height_above_max_size = datasheet_polifix.is_height_above_max_size()

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

    lista_ar_item1 = arkepzok.LISTA_AR(kedvezmenyes_ar_item1)
    osszesen_ar_item1 = sum([kedvezmenyes_ar_item1, szereles_ar_item1])
    alapszerkezet_szerelessel_eur_item1 = currency_format(osszesen_ar_item1)
    alapszerkezet_szerelessel_huf_item1 = currency_format(round(osszesen_ar_item1 * eur_huf_arfolyam, -3))
    opcio_spot_lampa_kedvezmenyes_ar_item1 = 50 # statikus
    opcio_spot_lampa_lista_ar_item1 = arkepzok.LISTA_AR(opcio_spot_lampa_kedvezmenyes_ar_item1)
    opcio_spot_lampa_eur_item1 = currency_format(opcio_spot_lampa_kedvezmenyes_ar_item1)
    opcio_spot_lampa_huf_item1 = currency_format(round(opcio_spot_lampa_kedvezmenyes_ar_item1 * eur_huf_arfolyam, -3))

    projection_net_item1 = projection_item1 - 22
    width_net_item1 = width_item1 - 14
    height_net_item1 = int(height_item1 - 10 * width_item1 / 100)


    # zip_arnyekolo_width_kedvezmenyes_ar_item1 = 1340 #adatbázisból lekérdezés alapján megkapott adatok (width_net_item1, height_item1)
    zip_arnyekolo_width_kedvezmenyes_ar_item1 = arkepzok.REFLEKSOL_120_ZIP(datasheet_polifix.get_zip_price(width_net_item1, height_net_item1))
    # print(f"PRICE FETCH: zip_arnyekolo_width_kedvezmenyes_ar_item1 fetched: {zip_arnyekolo_width_kedvezmenyes_ar_item1} | Original: {1340}")
    zip_arnyekolo_width_lista_ar_item1 = arkepzok.LISTA_AR(zip_arnyekolo_width_kedvezmenyes_ar_item1)

    # zip_arnyekolo_projection_kedvezmenyes_ar_item1 = 1740 #adatbázisból lekérdezés alapján megkapott adatok (projection_net_item1, height_item1)
    zip_arnyekolo_projection_kedvezmenyes_ar_item1 = arkepzok.REFLEKSOL_120_ZIP(datasheet_polifix.get_zip_price(projection_net_item1, height_net_item1))
    # print(f"PRICE FETCH: zip_arnyekolo_projection_kedvezmenyes_ar_item1 fetched: {zip_arnyekolo_projection_kedvezmenyes_ar_item1} | Original: {1740}")
    zip_arnyekolo_projection_lista_ar_item1 = arkepzok.LISTA_AR(zip_arnyekolo_projection_kedvezmenyes_ar_item1)

    zip_arnyekolo_szereles_ar_item1 = int(sum([zip_arnyekolo_width_kedvezmenyes_ar_item1, zip_arnyekolo_projection_kedvezmenyes_ar_item1]) * 0.1)
    zip_arnyekolo_osszesen_ar_item1 = int(sum([zip_arnyekolo_width_kedvezmenyes_ar_item1, zip_arnyekolo_projection_kedvezmenyes_ar_item1, zip_arnyekolo_szereles_ar_item1]))
    zip_arnyekolo_szerelessel_eur_item1 = currency_format(zip_arnyekolo_osszesen_ar_item1)
    zip_arnyekolo_szerelessel_huf_item1 = currency_format(round(zip_arnyekolo_osszesen_ar_item1 * eur_huf_arfolyam, -3))

    # uvegfalrendszer_width_kedvezmenyes_ar_item1 = 1750 #adatbázisból lekérdezés alapján megkapott adatok (width_net_item1, height_item1)
    uvegfalrendszer_width_kedvezmenyes_ar_item1 = arkepzok.UVEGFAL_RENDSZER(datasheet_polifix.get_uvegfalrendszer_price(width_net_item1, height_net_item1))
    # print(f"PRICE FETCH: uvegfalrendszer_width_kedvezmenyes_ar_item1 fetched: {uvegfalrendszer_width_kedvezmenyes_ar_item1} | Original: {1750}")
    uvegfalrendszer_width_lista_ar_item1 = arkepzok.LISTA_AR(uvegfalrendszer_width_kedvezmenyes_ar_item1)
    
    # uvegfalrendszer_projection_kedvezmenyes_ar_item1 = 2450 #adatbázisból lekérdezés alapján megkapott adatok (projection_net_item1, height_item1)
    uvegfalrendszer_projection_kedvezmenyes_ar_item1 = arkepzok.UVEGFAL_RENDSZER(datasheet_polifix.get_uvegfalrendszer_price(projection_net_item1, height_net_item1))
    # print(f"PRICE FETCH: uvegfalrendszer_projection_kedvezmenyes_ar_item1 fetched: {uvegfalrendszer_projection_kedvezmenyes_ar_item1} | Original: {2450}")
    uvegfalrendszer_projection_lista_ar_item1 = arkepzok.LISTA_AR(uvegfalrendszer_projection_kedvezmenyes_ar_item1)

    uvegfalrendszer_width_tablak_szama_item1 = get_uvegfal_tablak_szama(width_net_item1)
    uvegfalrendszer_projection_tablak_szama_item1 = get_uvegfal_tablak_szama(projection_net_item1)
    uvegfalrendszer_szereles_ar_item1 = int(sum([uvegfalrendszer_width_kedvezmenyes_ar_item1, uvegfalrendszer_projection_kedvezmenyes_ar_item1]) * 0.12)
    uvegfalrendszer_osszesen_ar_item1 = int(sum([uvegfalrendszer_width_kedvezmenyes_ar_item1, uvegfalrendszer_projection_kedvezmenyes_ar_item1, uvegfalrendszer_szereles_ar_item1]))
    uvegfalrendszer_szerelessel_eur_item1 = currency_format(uvegfalrendszer_osszesen_ar_item1)
    uvegfalrendszer_szerelessel_huf_item1 = currency_format(round(uvegfalrendszer_osszesen_ar_item1 * eur_huf_arfolyam, -3))


    #####################################################################################################################
    # # # # # # # # # # # # # # # # # # # # # # # # # #   VARIABLES   # # # # # # # # # # # # # # # # # # # # # # # # # #
    html_variables = {
        "name": name,
        "projection": projection,
        "width": width,
        "height": height,
        "opcionalisan_feltuntetni_led_opcio": opcionalisan_feltuntetni_led_opcio,
        "opcionalisan_feltuntetni_oldalfal_zaras": opcionalisan_feltuntetni_oldalfal_zaras,
        "eur_huf_arfolyam": eur_huf_arfolyam,
        "is_oldalso_arnyekolo_enabled": is_oldalso_arnyekolo_enabled,
        "is_uvegfal_rendszer_enabled": is_uvegfal_rendszer_enabled,

        # ITEM 1
        "projection_item1": projection_item1,
        "width_item1": width_item1,
        "height_item1": height_item1,
        "labak_szama_item1": labak_szama_item1,
        "warning_msg_size_not_found_item1": warning_msg_size_not_found_item1,
        'kedvezmenyes_ar_item1': kedvezmenyes_ar_item1,
        'lista_ar_item1': lista_ar_item1,
        "szereles_ar_item1": szereles_ar_item1,
        "osszesen_ar_item1": osszesen_ar_item1,
        "alapszerkezet_szerelessel_eur_item1": alapszerkezet_szerelessel_eur_item1,
        "alapszerkezet_szerelessel_huf_item1": alapszerkezet_szerelessel_huf_item1,
        "opcio_spot_lampa_lista_ar_item1": opcio_spot_lampa_lista_ar_item1,
        "opcio_spot_lampa_kedvezmenyes_ar_item1": opcio_spot_lampa_kedvezmenyes_ar_item1,
        "opcio_spot_lampa_eur_item1": opcio_spot_lampa_eur_item1,
        "opcio_spot_lampa_huf_item1": opcio_spot_lampa_huf_item1,

        "projection_net_item1": projection_net_item1,
        "height_net_item1": height_net_item1,
        "width_net_item1": width_net_item1,

        "zip_arnyekolo_width_kedvezmenyes_ar_item1": zip_arnyekolo_width_kedvezmenyes_ar_item1,
        "zip_arnyekolo_projection_kedvezmenyes_ar_item1": zip_arnyekolo_projection_kedvezmenyes_ar_item1,
        "zip_arnyekolo_width_lista_ar_item1": zip_arnyekolo_width_lista_ar_item1,
        "zip_arnyekolo_projection_lista_ar_item1": zip_arnyekolo_projection_lista_ar_item1,
        "zip_arnyekolo_szereles_ar_item1": zip_arnyekolo_szereles_ar_item1,
        "zip_arnyekolo_osszesen_ar_item1": zip_arnyekolo_osszesen_ar_item1,
        "zip_arnyekolo_szerelessel_eur_item1": zip_arnyekolo_szerelessel_eur_item1,
        "zip_arnyekolo_szerelessel_huf_item1": zip_arnyekolo_szerelessel_huf_item1,

        "uvegfalrendszer_width_tablak_szama_item1": uvegfalrendszer_width_tablak_szama_item1,
        "uvegfalrendszer_width_kedvezmenyes_ar_item1": uvegfalrendszer_width_kedvezmenyes_ar_item1,
        "uvegfalrendszer_width_lista_ar_item1": uvegfalrendszer_width_lista_ar_item1,
        "uvegfalrendszer_projection_tablak_szama_item1": uvegfalrendszer_projection_tablak_szama_item1,
        "uvegfalrendszer_projection_kedvezmenyes_ar_item1": uvegfalrendszer_projection_kedvezmenyes_ar_item1,
        "uvegfalrendszer_projection_lista_ar_item1": uvegfalrendszer_projection_lista_ar_item1,
        "uvegfalrendszer_szereles_ar_item1": uvegfalrendszer_szereles_ar_item1,
        "uvegfalrendszer_osszesen_ar_item1": uvegfalrendszer_osszesen_ar_item1,
        "uvegfalrendszer_szerelessel_eur_item1": uvegfalrendszer_szerelessel_eur_item1,
        "uvegfalrendszer_szerelessel_huf_item1": uvegfalrendszer_szerelessel_huf_item1,

        "szallitasi_dij": currency_format(szallitasi_dij),
        "telepules": telepules,
    }

    Renderer().render_template(form_data, html_variables)





