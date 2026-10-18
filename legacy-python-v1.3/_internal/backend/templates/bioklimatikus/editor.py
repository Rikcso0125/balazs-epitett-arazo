from backend.utils import FormData
from backend.utils import BeepitesTipus

from backend.utils import Arkepzok
from backend.utils import currency_format
from backend.utils import get_uvegfal_tablak_szama
from backend.utils import get_last_day_of_current_month
from backend.templates import Renderer

from backend.templates.bioklimatikus.datasheet import SB400, SeeSkyBio, KedrySkylife


def main(form_data: FormData):

    #formsban megadott adatok
    name = form_data.name.split(" ")[-1]
    projection = form_data.projection
    width = form_data.width
    height = form_data.height
    is_oldalso_arnyekolo_enabled = form_data.is_oldalso_arnyekolo_enabled
    is_uvegfal_rendszer_enabled = form_data.is_uvegfal_rendszer_enabled
    beepites_tipusa = form_data.beepites_tipusa
    eur_huf_arfolyam = form_data.eur_huf_arfolyam
    szallitasi_dij = form_data.szallitasi_dij
    telepules = form_data.telepules

    arkepzok = Arkepzok()

    ######################################################################################################################
    # # # # # # # # # # # # # # # # # # # # # # # # # #   BEVEZETŐ   # # # # # # # # # # # # # # # # # # # # # # # # # # #

    if (is_oldalso_arnyekolo_enabled and is_uvegfal_rendszer_enabled):
        opcionalisan_feltuntetni = f"Opcionálisan feltüntettem a szerkezet {width} cm illetve {projection} cm oldalára a motoros-oldalsó árnyékolókat és a keret nélküli, elcsúsztatható üvegfalrendszert is." 
    elif (is_oldalso_arnyekolo_enabled and not is_uvegfal_rendszer_enabled):
        opcionalisan_feltuntetni = f"Opcionálisan feltüntettem a szerkezet {width} cm illetve {projection} cm oldalára a motoros-oldalsó árnyékolókat is." 
    elif (not is_oldalso_arnyekolo_enabled and is_uvegfal_rendszer_enabled):
        opcionalisan_feltuntetni = f"Opcionálisan feltüntettem a szerkezet {width} cm illetve {projection} cm oldalára a keret nélküli, elcsúsztatható üvegfalrendszert is."
    else:
        opcionalisan_feltuntetni=""
        
    if beepites_tipusa == BeepitesTipus.EpulethezRogzitett:
        beepites_tipustol_fuggo_rogzites = "A pergolát falhoz rögzítve, elől 2 db lábbal építenénk"
        hany_labon_all = "elől 2 db lábon álló"
        labak_szama = "elől 2 db lábbal"
    elif beepites_tipusa == BeepitesTipus.SzabadonAllo:
        beepites_tipustol_fuggo_rogzites = "A pergolát különálló szerkezetként rögzítve, összesen 4 db lábbal építenénk"
        hany_labon_all = "összesen 4 db lábon álló"
        labak_szama = "összesen 4 db lábbal"

    ######################################################################################################################
    # # # # # # # # # # # # # # # # # # # # # # # # # # #   ITEM 1   # # # # # # # # # # # # # # # # # # # # # # # # # # #
    # SOLARE 400

    # projection_item1 = 500 #adatbázisból lekérdezés alapján megkapott adatok
    # width_item1 = 400 #adatbázisból lekérdezés alapján megkapott adatok
    # height_item1 = 250 #adatbázisból lekérdezés alapján megkapott adatok
    # kedvezmenyes_ar_item1 = 8100 #adatbázisból lekérdezés alapján megkapott adatok

    datasheet_sb400 = SB400(beepites_tipusa, projection, width)
    projection_item1 = datasheet_sb400.get_item_projection()
    if datasheet_sb400.is_width_above_max_size() or datasheet_sb400.is_width_below_min_size():
        width_item1 = datasheet_sb400.get_item_width()
    else:
        width_item1 = width # a lamellák hosszúságát centire pontosan lehet szabni, nem csak fix méret lehet
    kedvezmenyes_ar_item1 = arkepzok.SB400(datasheet_sb400.get_item_price())
    # print(f"PRICE FETCH: kedvezmenyes_ar_item1 fetched: {kedvezmenyes_ar_item1} | Original: {8100}")
    height_item1 = height

############################################################  DATASHEET READ END ############################################################

    if datasheet_sb400.is_projection_rounded() or datasheet_sb400.is_width_above_max_size() or datasheet_sb400.is_width_below_min_size():
        if datasheet_sb400.is_projection_above_max_size() or datasheet_sb400.is_width_above_max_size():
            min_max_item1 = "maximum"
        elif datasheet_sb400.is_projection_below_min_size() or datasheet_sb400.is_width_below_min_size():
            min_max_item1 = "minimum"
        else:
            min_max_item1 = ""
        warning_msg_size_not_found_item1 = f"FONTOS: Nincsen a megadott méretben ({projection} * {width} * {height}), csak {min_max_item1} {projection_item1} * {width_item1} * {height_item1}. Az ajánlatban ezzel a mérettel kalkuláltam. Ha mindenképpen az eredeti méret ({projection} * {width} * {height}) érdekli, kérem vegye fel velem a kapcsolatot."
    else:
        warning_msg_size_not_found_item1 = ""

    lista_ar_item1 = arkepzok.LISTA_AR(kedvezmenyes_ar_item1)
    szereles_ar_item1 = int(kedvezmenyes_ar_item1 * 0.11) if kedvezmenyes_ar_item1 < 8500 else int(kedvezmenyes_ar_item1 * 0.10)
    taviranyito_kedvezmenyes_ar_item1 = 100 # statikus
    osszesen_ar_item1 = sum([kedvezmenyes_ar_item1, taviranyito_kedvezmenyes_ar_item1, szereles_ar_item1])
    alapszerkezet_szerelessel_eur_item1 = currency_format(osszesen_ar_item1)
    alapszerkezet_szerelessel_huf_item1 = currency_format(round(osszesen_ar_item1 * eur_huf_arfolyam, -3))
    opcio_led_vilagitas_kedvezmenyes_ar_item1 = 700 # statikus
    opcio_led_vilagitas_eur_item1 = currency_format(opcio_led_vilagitas_kedvezmenyes_ar_item1)
    opcio_led_vilagitas_huf_item1 = currency_format(round(opcio_led_vilagitas_kedvezmenyes_ar_item1 * eur_huf_arfolyam, -3))

    if beepites_tipusa == BeepitesTipus.EpulethezRogzitett:
        width_net_item1 = width_item1 - 8.5
        projection_net_item1 = projection_item1 - 30
    elif beepites_tipusa == BeepitesTipus.SzabadonAllo:
        width_net_item1 = width_item1 - 17
        projection_net_item1 = projection_item1 - 30

    # zip_arnyekolo_width_kedvezmenyes_ar_item1 = 1540 #adatbázisból lekérdezés alapján megkapott adatok (width_net_item1, height_item1)
    zip_arnyekolo_width_kedvezmenyes_ar_item1 = arkepzok.REFLEKSOL_120_ZIP(datasheet_sb400.get_zip_price(width_net_item1, height_item1))
    # print(f"PRICE FETCH: zip_arnyekolo_width_kedvezmenyes_ar_item1 fetched: {zip_arnyekolo_width_kedvezmenyes_ar_item1} | Original: {1540}")
    zip_arnyekolo_width_lista_ar_item1 = arkepzok.LISTA_AR(zip_arnyekolo_width_kedvezmenyes_ar_item1)

    # zip_arnyekolo_projection_kedvezmenyes_ar_item1 = 1640 #adatbázisból lekérdezés alapján megkapott adatok (projection_net_item1, height_item1)
    zip_arnyekolo_projection_kedvezmenyes_ar_item1 = arkepzok.REFLEKSOL_120_ZIP(datasheet_sb400.get_zip_price(projection_net_item1, height_item1))
    # print(f"PRICE FETCH: zip_arnyekolo_projection_kedvezmenyes_ar_item1 fetched: {zip_arnyekolo_projection_kedvezmenyes_ar_item1} | Original: {1640}")
    zip_arnyekolo_projection_lista_ar_item1 = arkepzok.LISTA_AR(zip_arnyekolo_projection_kedvezmenyes_ar_item1)

    zip_arnyekolo_szereles_ar_item1 = int(sum([zip_arnyekolo_width_kedvezmenyes_ar_item1, zip_arnyekolo_projection_kedvezmenyes_ar_item1]) * 0.08)
    zip_arnyekolo_osszesen_ar_item1 = int(sum([zip_arnyekolo_width_kedvezmenyes_ar_item1, zip_arnyekolo_projection_kedvezmenyes_ar_item1, zip_arnyekolo_szereles_ar_item1]))
    zip_arnyekolo_szerelessel_eur_item1 = currency_format(zip_arnyekolo_osszesen_ar_item1)
    zip_arnyekolo_szerelessel_huf_item1 = currency_format(round(zip_arnyekolo_osszesen_ar_item1 * eur_huf_arfolyam, -3))

    # uvegfalrendszer_width_kedvezmenyes_ar_item1 = 2200 #adatbázisból lekérdezés alapján megkapott adatok (width_net_item1, height_item1)
    uvegfalrendszer_width_kedvezmenyes_ar_item1 = arkepzok.UVEGFAL_RENDSZER(datasheet_sb400.get_uvegfalrendszer_price(width_net_item1, height_item1))
    # print(f"PRICE FETCH: uvegfalrendszer_width_kedvezmenyes_ar_item1 fetched: {uvegfalrendszer_width_kedvezmenyes_ar_item1} | Original: {2200}")
    uvegfalrendszer_width_lista_ar_item1 = arkepzok.LISTA_AR(uvegfalrendszer_width_kedvezmenyes_ar_item1)
    
    # uvegfalrendszer_projection_kedvezmenyes_ar_item1 = 2450 #adatbázisból lekérdezés alapján megkapott adatok (projection_net_item1, height_item1)
    uvegfalrendszer_projection_kedvezmenyes_ar_item1 = arkepzok.UVEGFAL_RENDSZER(datasheet_sb400.get_uvegfalrendszer_price(projection_net_item1, height_item1))
    # print(f"PRICE FETCH: uvegfalrendszer_projection_kedvezmenyes_ar_item1 fetched: {uvegfalrendszer_projection_kedvezmenyes_ar_item1} | Original: {2450}")
    uvegfalrendszer_projection_lista_ar_item1 = arkepzok.LISTA_AR(uvegfalrendszer_projection_kedvezmenyes_ar_item1)

    uvegfalrendszer_width_tablak_szama_item1 = get_uvegfal_tablak_szama(width_net_item1)
    uvegfalrendszer_projection_tablak_szama_item1 = get_uvegfal_tablak_szama(projection_net_item1)
    uvegfalrendszer_szereles_ar_item1 = int(sum([uvegfalrendszer_width_kedvezmenyes_ar_item1, uvegfalrendszer_projection_kedvezmenyes_ar_item1]) * 0.12)
    uvegfalrendszer_osszesen_ar_item1 = int(sum([uvegfalrendszer_width_kedvezmenyes_ar_item1, uvegfalrendszer_projection_kedvezmenyes_ar_item1, uvegfalrendszer_szereles_ar_item1]))
    uvegfalrendszer_szerelessel_eur_item1 = currency_format(uvegfalrendszer_osszesen_ar_item1)
    uvegfalrendszer_szerelessel_huf_item1 = currency_format(round(uvegfalrendszer_osszesen_ar_item1 * eur_huf_arfolyam, -3))

    led_spot_vilagitas_darab_item1 = datasheet_sb400.get_spot_vilagitas_darabszam()
    led_spot_vilagitas_ar_item1 = datasheet_sb400.get_spot_vilagitas_price()


    ######################################################################################################################
    # # # # # # # # # # # # # # # # # # # # # # # # # # #   ITEM 2   # # # # # # # # # # # # # # # # # # # # # # # # # # #
    # SEESKY BIO
    # projection_item2 = 500 #adatbázisból lekérdezés alapján megkapott adatok
    # width_item2 = 400 #adatbázisból lekérdezés alapján megkapott adatok
    # height_item2 = 250 #adatbázisból lekérdezés alapján megkapott adatok
    # kedvezmenyes_ar_item2 = 10000 #adatbázisból lekérdezés alapján megkapott adatok

    datasheet_seeskybio = SeeSkyBio(beepites_tipusa, projection, width)
    projection_item2 = datasheet_seeskybio.get_item_projection()
    # width_item2 = datasheet_seeskybio.get_item_width()
    if datasheet_seeskybio.is_width_above_max_size() or datasheet_seeskybio.is_width_below_min_size():
        width_item2 = datasheet_seeskybio.get_item_width()
    else:
        width_item2 = width # a lamellák hosszúságát centire pontosan lehet szabni, nem csak fix méret lehet
    kedvezmenyes_ar_item2 = arkepzok.SESKY_BIO(datasheet_seeskybio.get_item_price())
    # print(f"PRICE FETCH: kedvezmenyes_ar_item2 fetched: {kedvezmenyes_ar_item2} | Original: {10000}")
    height_item2 = height

############################################################  DATASHEET READ END ############################################################

    if datasheet_seeskybio.is_projection_rounded() or datasheet_seeskybio.is_width_above_max_size() or datasheet_seeskybio.is_width_below_min_size():
        if datasheet_seeskybio.is_projection_above_max_size() or datasheet_seeskybio.is_width_above_max_size():
            min_max_item2 = "maximum"
        elif datasheet_seeskybio.is_projection_below_min_size() or datasheet_seeskybio.is_width_below_min_size():
            min_max_item2 = "minimum"
        else:
            min_max_item2 = ""
        warning_msg_size_not_found_item2 = f"FONTOS: Nincsen a megadott méretben ({projection} * {width} * {height}), csak {min_max_item2} {projection_item2} * {width_item2} * {height_item2}. Az ajánlatban ezzel a mérettel kalkuláltam. Ha mindenképpen az eredeti méret ({projection} * {width} * {height}) érdekli, kérem vegye fel velem a kapcsolatot."
    else:
        warning_msg_size_not_found_item2 = ""

    lista_ar_item2 = arkepzok.LISTA_AR(kedvezmenyes_ar_item2)
    szereles_ar_item2 = int(kedvezmenyes_ar_item2 * 0.11) if kedvezmenyes_ar_item2 < 8500 else int(kedvezmenyes_ar_item2 * 0.10)
    taviranyito_kedvezmenyes_ar_item2 = 100 # statikus
    osszesen_ar_item2 = sum([kedvezmenyes_ar_item2, taviranyito_kedvezmenyes_ar_item2, szereles_ar_item2])
    alapszerkezet_szerelessel_eur_item2 = currency_format(osszesen_ar_item2)
    alapszerkezet_szerelessel_huf_item2 = currency_format(round(osszesen_ar_item2 * eur_huf_arfolyam, -3))
    opcio_led_vilagitas_kedvezmenyes_ar_item2 = 700 # statikus
    opcio_led_vilagitas_eur_item2 = currency_format(opcio_led_vilagitas_kedvezmenyes_ar_item2)
    opcio_led_vilagitas_huf_item2 = currency_format(round(opcio_led_vilagitas_kedvezmenyes_ar_item2 * eur_huf_arfolyam, -3))

    if beepites_tipusa == BeepitesTipus.EpulethezRogzitett:
        width_net_item2 = width_item2 - 16
        projection_net_item2 = projection_item2 - 32
    elif beepites_tipusa == BeepitesTipus.SzabadonAllo:
        width_net_item2 = width_item2 - 32
        projection_net_item2 = projection_item2 - 32


    # zip_arnyekolo_width_kedvezmenyes_ar_item2 = 1540 #adatbázisból lekérdezés alapján megkapott adatok (width_net_item2, height_item2)
    zip_arnyekolo_width_kedvezmenyes_ar_item2 = arkepzok.REFLEKSOL_120_ZIP(datasheet_seeskybio.get_zip_price(width_net_item2, height_item2))
    # print(f"PRICE FETCH: zip_arnyekolo_width_kedvezmenyes_ar_item2 fetched: {zip_arnyekolo_width_kedvezmenyes_ar_item2} | Original: {1540}")
    zip_arnyekolo_width_lista_ar_item2 = arkepzok.LISTA_AR(zip_arnyekolo_width_kedvezmenyes_ar_item2)

    # zip_arnyekolo_projection_kedvezmenyes_ar_item2 = 1640 #adatbázisból lekérdezés alapján megkapott adatok (projection_net_item2, height_item2)
    zip_arnyekolo_projection_kedvezmenyes_ar_item2 = arkepzok.REFLEKSOL_120_ZIP(datasheet_seeskybio.get_zip_price(projection_net_item2, height_item2))
    # print(f"PRICE FETCH: zip_arnyekolo_projection_kedvezmenyes_ar_item2 fetched: {zip_arnyekolo_projection_kedvezmenyes_ar_item2} | Original: {1640}")
    zip_arnyekolo_projection_lista_ar_item2 = arkepzok.LISTA_AR(zip_arnyekolo_projection_kedvezmenyes_ar_item2)

    zip_arnyekolo_szereles_ar_item2 = int(sum([zip_arnyekolo_width_kedvezmenyes_ar_item2, zip_arnyekolo_projection_kedvezmenyes_ar_item2]) * 0.08)
    zip_arnyekolo_osszesen_ar_item2 = int(sum([zip_arnyekolo_width_kedvezmenyes_ar_item2, zip_arnyekolo_projection_kedvezmenyes_ar_item2, zip_arnyekolo_szereles_ar_item2]))
    zip_arnyekolo_szerelessel_eur_item2 = currency_format(zip_arnyekolo_osszesen_ar_item2)
    zip_arnyekolo_szerelessel_huf_item2 = currency_format(round(zip_arnyekolo_osszesen_ar_item2 * eur_huf_arfolyam, -3))

    # uvegfalrendszer_width_kedvezmenyes_ar_item2 = 2200 #adatbázisból lekérdezés alapján megkapott adatok (width_net_item2, height_item2)
    uvegfalrendszer_width_kedvezmenyes_ar_item2 = arkepzok.UVEGFAL_RENDSZER(datasheet_seeskybio.get_uvegfalrendszer_price(width_net_item2, height_item2))
    # print(f"PRICE FETCH: uvegfalrendszer_width_kedvezmenyes_ar_item2 fetched: {uvegfalrendszer_width_kedvezmenyes_ar_item2} | Original: {2200}")
    uvegfalrendszer_width_lista_ar_item2 = arkepzok.LISTA_AR(uvegfalrendszer_width_kedvezmenyes_ar_item2)

    # uvegfalrendszer_projection_kedvezmenyes_ar_item2 = 2450 #adatbázisból lekérdezés alapján megkapott adatok (projection_net_item2, height_item2)
    uvegfalrendszer_projection_kedvezmenyes_ar_item2 = arkepzok.UVEGFAL_RENDSZER(datasheet_seeskybio.get_uvegfalrendszer_price(projection_net_item2, height_item2))
    # print(f"PRICE FETCH: uvegfalrendszer_projection_kedvezmenyes_ar_item2 fetched: {uvegfalrendszer_projection_kedvezmenyes_ar_item2} | Original: {2450}")
    uvegfalrendszer_projection_lista_ar_item2 = arkepzok.LISTA_AR(uvegfalrendszer_projection_kedvezmenyes_ar_item2)

    uvegfalrendszer_width_tablak_szama_item2 = get_uvegfal_tablak_szama(width_net_item2)
    uvegfalrendszer_projection_tablak_szama_item2 = get_uvegfal_tablak_szama(projection_net_item2)
    uvegfalrendszer_szereles_ar_item2 = int(sum([uvegfalrendszer_width_kedvezmenyes_ar_item2, uvegfalrendszer_projection_kedvezmenyes_ar_item2]) * 0.12)
    uvegfalrendszer_osszesen_ar_item2 = int(sum([uvegfalrendszer_width_kedvezmenyes_ar_item2, uvegfalrendszer_projection_kedvezmenyes_ar_item2, uvegfalrendszer_szereles_ar_item2]))
    uvegfalrendszer_szerelessel_eur_item2 = currency_format(uvegfalrendszer_osszesen_ar_item2)
    uvegfalrendszer_szerelessel_huf_item2 = currency_format(round(uvegfalrendszer_osszesen_ar_item2 * eur_huf_arfolyam, -3))



    ######################################################################################################################
    # # # # # # # # # # # # # # # # # # # # # # # # # # #   ITEM 3   # # # # # # # # # # # # # # # # # # # # # # # # # # #
    # KEDRY SKYLIFE
    # projection_item3 = 491 #adatbázisból lekérdezés alapján megkapott adatok
    # width_item3 = 400 #adatbázisból lekérdezés alapján megkapott adatok
    # height_item3 = 250 #adatbázisból lekérdezés alapján megkapott adatok
    # kedvezmenyes_ar_item3 = 15160 #adatbázisból lekérdezés alapján megkapott adatok

    datasheet_kedryskylife = KedrySkylife(beepites_tipusa, projection, width)
    projection_item3 = datasheet_kedryskylife.get_item_projection()
    # width_item3 = datasheet_kedryskylife.get_item_width()
    if datasheet_kedryskylife.is_width_above_max_size() or datasheet_kedryskylife.is_width_below_min_size():
        width_item3 = datasheet_kedryskylife.get_item_width()
    else:
        width_item3 = width # a lamellák hosszúságát centire pontosan lehet szabni, nem csak fix méret lehet
    
    kedvezmenyes_ar_item3 = arkepzok.KEDRY_SKYLIFE(datasheet_kedryskylife.get_item_price())
    # print(f"PRICE FETCH: kedvezmenyes_ar_item3 fetched: {kedvezmenyes_ar_item3} | Original: {15160}")
    height_item3 = height

############################################################  DATASHEET READ END ############################################################

    if datasheet_kedryskylife.is_projection_rounded() or datasheet_kedryskylife.is_width_above_max_size() or datasheet_kedryskylife.is_width_below_min_size():
        if datasheet_kedryskylife.is_projection_above_max_size() or datasheet_kedryskylife.is_width_above_max_size():
            min_max_item3 = "maximum"
        elif datasheet_kedryskylife.is_projection_below_min_size() or datasheet_kedryskylife.is_width_below_min_size():
            min_max_item3 = "minimum"
        else:
            min_max_item3 = ""
        warning_msg_size_not_found_item3 = f"FONTOS: Nincsen a megadott méretben ({projection} * {width} * {height}), csak {min_max_item3} {projection_item3} * {width_item3} * {height_item3}. Az ajánlatban ezzel a mérettel kalkuláltam. Ha mindenképpen az eredeti méret ({projection} * {width} * {height}) érdekli, kérem vegye fel velem a kapcsolatot."
    else:
        warning_msg_size_not_found_item3 = ""

    lista_ar_item3 = arkepzok.LISTA_AR(kedvezmenyes_ar_item3)
    szereles_ar_item3 = int(kedvezmenyes_ar_item3 * 0.10) if kedvezmenyes_ar_item3 < 8500 else int(kedvezmenyes_ar_item3 * 0.08)
    motor_kedvezmenyes_ar_item3 = 523 # statikus
    taviranyito_kedvezmenyes_ar_item3 = 100 # statikus
    osszesen_ar_item3 = sum([kedvezmenyes_ar_item3, motor_kedvezmenyes_ar_item3, taviranyito_kedvezmenyes_ar_item3, szereles_ar_item3])
    alapszerkezet_szerelessel_eur_item3 = currency_format(osszesen_ar_item3)
    alapszerkezet_szerelessel_huf_item3 = currency_format(round(osszesen_ar_item3 * eur_huf_arfolyam, -3))
    opcio_led_vilagitas_kedvezmenyes_ar_item3 = 900 # statikus
    opcio_led_vilagitas_eur_item3 = currency_format(opcio_led_vilagitas_kedvezmenyes_ar_item3)
    opcio_led_vilagitas_huf_item3 = currency_format(round(opcio_led_vilagitas_kedvezmenyes_ar_item3 * eur_huf_arfolyam, -3))

    if beepites_tipusa == BeepitesTipus.EpulethezRogzitett:
        width_net_item3 = width_item3 - 16
        projection_net_item3 = projection_item3 - 32
    elif beepites_tipusa == BeepitesTipus.SzabadonAllo:
        width_net_item3 = width_item3 - 32
        projection_net_item3 = projection_item3 - 32


    # zip_arnyekolo_width_kedvezmenyes_ar_item3 = 2127 #adatbázisból lekérdezés alapján megkapott adatok (width_net_item3, height_item3)
    zip_arnyekolo_width_kedvezmenyes_ar_item3 = arkepzok.VERTICA_PRIME_ZIP(datasheet_kedryskylife.get_zip_price(width_net_item3, height_item3))
    # print(f"PRICE FETCH: zip_arnyekolo_width_kedvezmenyes_ar_item3 fetched: {zip_arnyekolo_width_kedvezmenyes_ar_item3} | Original: {2127}")
    zip_arnyekolo_width_lista_ar_item3 = arkepzok.LISTA_AR(zip_arnyekolo_width_kedvezmenyes_ar_item3)

    # zip_arnyekolo_projection_kedvezmenyes_ar_item3 = 2350 #adatbázisból lekérdezés alapján megkapott adatok (projection_net_item3, height_item3)
    zip_arnyekolo_projection_kedvezmenyes_ar_item3 = arkepzok.VERTICA_PRIME_ZIP(datasheet_kedryskylife.get_zip_price(projection_net_item3, height_item3))
    # print(f"PRICE FETCH: zip_arnyekolo_projection_kedvezmenyes_ar_item3 fetched: {zip_arnyekolo_projection_kedvezmenyes_ar_item3} | Original: {2350}")
    zip_arnyekolo_projection_lista_ar_item3 = arkepzok.LISTA_AR(zip_arnyekolo_projection_kedvezmenyes_ar_item3)

    zip_arnyekolo_szereles_ar_item3 = int(sum([zip_arnyekolo_width_kedvezmenyes_ar_item3, zip_arnyekolo_projection_kedvezmenyes_ar_item3]) * 0.08)
    zip_arnyekolo_osszesen_ar_item3 = int(sum([zip_arnyekolo_width_kedvezmenyes_ar_item3, zip_arnyekolo_projection_kedvezmenyes_ar_item3, zip_arnyekolo_szereles_ar_item3]))
    zip_arnyekolo_szerelessel_eur_item3 = currency_format(zip_arnyekolo_osszesen_ar_item3)
    zip_arnyekolo_szerelessel_huf_item3 = currency_format(round(zip_arnyekolo_osszesen_ar_item3 * eur_huf_arfolyam, -3))

    # uvegfalrendszer_width_kedvezmenyes_ar_item3 = 2200 #adatbázisból lekérdezés alapján megkapott adatok (width_net_item3, height_item3)
    uvegfalrendszer_width_kedvezmenyes_ar_item3 = arkepzok.UVEGFAL_RENDSZER(datasheet_kedryskylife.get_uvegfalrendszer_price(width_net_item3, height_item3))
    # print(f"PRICE FETCH: uvegfalrendszer_width_kedvezmenyes_ar_item3 fetched: {uvegfalrendszer_width_kedvezmenyes_ar_item3} | Original: {2200}")
    uvegfalrendszer_width_lista_ar_item3 = arkepzok.LISTA_AR(uvegfalrendszer_width_kedvezmenyes_ar_item3)

    uvegfalrendszer_projection_kedvezmenyes_ar_item3 = 2450 #adatbázisból lekérdezés alapján megkapott adatok (projection_net_item3, height_item3)
    uvegfalrendszer_projection_kedvezmenyes_ar_item3 = arkepzok.UVEGFAL_RENDSZER(datasheet_kedryskylife.get_uvegfalrendszer_price(projection_net_item3, height_item3))
    # print(f"PRICE FETCH: uvegfalrendszer_projection_kedvezmenyes_ar_item3 fetched: {uvegfalrendszer_projection_kedvezmenyes_ar_item3} | Original: {2450}")
    uvegfalrendszer_projection_lista_ar_item3 = arkepzok.LISTA_AR(uvegfalrendszer_projection_kedvezmenyes_ar_item3)

    uvegfalrendszer_width_tablak_szama_item3 = get_uvegfal_tablak_szama(width_net_item3)
    uvegfalrendszer_projection_tablak_szama_item3 = get_uvegfal_tablak_szama(projection_net_item3)
    uvegfalrendszer_szereles_ar_item3 = int(sum([uvegfalrendszer_width_kedvezmenyes_ar_item3, uvegfalrendszer_projection_kedvezmenyes_ar_item3]) * 0.12)
    uvegfalrendszer_osszesen_ar_item3 = int(sum([uvegfalrendszer_width_kedvezmenyes_ar_item3, uvegfalrendszer_projection_kedvezmenyes_ar_item3, uvegfalrendszer_szereles_ar_item3]))
    uvegfalrendszer_szerelessel_eur_item3 = currency_format(uvegfalrendszer_osszesen_ar_item3)
    uvegfalrendszer_szerelessel_huf_item3 = currency_format(round(uvegfalrendszer_osszesen_ar_item3 * eur_huf_arfolyam, -3))


    #####################################################################################################################
    # # # # # # # # # # # # # # # # # # # # # # # # # #   VARIABLES   # # # # # # # # # # # # # # # # # # # # # # # # # #
    html_variables = {
        "name": name,
        "projection": projection,
        "width": width,
        "height": height,
        "opcionalisan_feltuntetni": opcionalisan_feltuntetni,
        "beepites_tipustol_fuggo_rogzites": beepites_tipustol_fuggo_rogzites,
        "hany_labon_all": hany_labon_all,
        "labak_szama": labak_szama,
        "eur_huf_arfolyam": eur_huf_arfolyam,
        "last_day_of_current_month": get_last_day_of_current_month(),
        "is_oldalso_arnyekolo_enabled": is_oldalso_arnyekolo_enabled,
        "is_uvegfal_rendszer_enabled": is_uvegfal_rendszer_enabled,

        # ITEM 1
        "projection_item1": projection_item1,
        "width_item1": width_item1,
        "height_item1": height_item1,
        "warning_msg_size_not_found_item1": warning_msg_size_not_found_item1,
        'kedvezmenyes_ar_item1': kedvezmenyes_ar_item1,
        'lista_ar_item1': lista_ar_item1,
        "szereles_ar_item1": szereles_ar_item1,
        "osszesen_ar_item1": osszesen_ar_item1,
        "alapszerkezet_szerelessel_eur_item1": alapszerkezet_szerelessel_eur_item1,
        "alapszerkezet_szerelessel_huf_item1": alapszerkezet_szerelessel_huf_item1,
        "opcio_led_vilagitas_kedvezmenyes_ar_item1": opcio_led_vilagitas_kedvezmenyes_ar_item1, 
        "opcio_led_vilagitas_eur_item1": opcio_led_vilagitas_eur_item1,
        "opcio_led_vilagitas_huf_item1": opcio_led_vilagitas_huf_item1,
        "width_net_item1": width_net_item1,
        "projection_net_item1": projection_net_item1,
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

        "led_spot_vilagitas_darab_item1": led_spot_vilagitas_darab_item1,
        "led_spot_vilagitas_ar_item1": led_spot_vilagitas_ar_item1,

        # ITEM 2
        "projection_item2": projection_item2,
        "width_item2": width_item2,
        "height_item2": height_item2,
        "warning_msg_size_not_found_item2": warning_msg_size_not_found_item2,
        'kedvezmenyes_ar_item2': kedvezmenyes_ar_item2,
        'lista_ar_item2': lista_ar_item2,
        "szereles_ar_item2": szereles_ar_item2,
        "osszesen_ar_item2": osszesen_ar_item2,
        "alapszerkezet_szerelessel_eur_item2": alapszerkezet_szerelessel_eur_item2,
        "alapszerkezet_szerelessel_huf_item2": alapszerkezet_szerelessel_huf_item2,
        "opcio_led_vilagitas_kedvezmenyes_ar_item2": opcio_led_vilagitas_kedvezmenyes_ar_item2, 
        "opcio_led_vilagitas_eur_item2": opcio_led_vilagitas_eur_item2,
        "opcio_led_vilagitas_huf_item2": opcio_led_vilagitas_huf_item2,
        "width_net_item2": width_net_item2,
        "projection_net_item2": projection_net_item2,
        "zip_arnyekolo_width_kedvezmenyes_ar_item2": zip_arnyekolo_width_kedvezmenyes_ar_item2,
        "zip_arnyekolo_projection_kedvezmenyes_ar_item2": zip_arnyekolo_projection_kedvezmenyes_ar_item2,
        "zip_arnyekolo_width_lista_ar_item2": zip_arnyekolo_width_lista_ar_item2,
        "zip_arnyekolo_projection_lista_ar_item2": zip_arnyekolo_projection_lista_ar_item2,
        "zip_arnyekolo_szereles_ar_item2": zip_arnyekolo_szereles_ar_item2,
        "zip_arnyekolo_osszesen_ar_item2": zip_arnyekolo_osszesen_ar_item2,
        "zip_arnyekolo_szerelessel_eur_item2": zip_arnyekolo_szerelessel_eur_item2,
        "zip_arnyekolo_szerelessel_huf_item2": zip_arnyekolo_szerelessel_huf_item2,

        "uvegfalrendszer_width_tablak_szama_item2": uvegfalrendszer_width_tablak_szama_item2,
        "uvegfalrendszer_width_kedvezmenyes_ar_item2": uvegfalrendszer_width_kedvezmenyes_ar_item2,
        "uvegfalrendszer_width_lista_ar_item2": uvegfalrendszer_width_lista_ar_item2,
        "uvegfalrendszer_projection_tablak_szama_item2": uvegfalrendszer_projection_tablak_szama_item2,
        "uvegfalrendszer_projection_kedvezmenyes_ar_item2": uvegfalrendszer_projection_kedvezmenyes_ar_item2,
        "uvegfalrendszer_projection_lista_ar_item2": uvegfalrendszer_projection_lista_ar_item2,
        "uvegfalrendszer_szereles_ar_item2": uvegfalrendszer_szereles_ar_item2,
        "uvegfalrendszer_osszesen_ar_item2": uvegfalrendszer_osszesen_ar_item2,
        "uvegfalrendszer_szerelessel_eur_item2": uvegfalrendszer_szerelessel_eur_item2,
        "uvegfalrendszer_szerelessel_huf_item2": uvegfalrendszer_szerelessel_huf_item2,

        # ITEM 3
        "projection_item3": projection_item3,
        "width_item3": width_item3,
        "height_item3": height_item3,
        "warning_msg_size_not_found_item3": warning_msg_size_not_found_item3,
        'kedvezmenyes_ar_item3': kedvezmenyes_ar_item3,
        'lista_ar_item3': lista_ar_item3,
        "szereles_ar_item3": szereles_ar_item3,
        "osszesen_ar_item3": osszesen_ar_item3,
        "alapszerkezet_szerelessel_eur_item3": alapszerkezet_szerelessel_eur_item3,
        "alapszerkezet_szerelessel_huf_item3": alapszerkezet_szerelessel_huf_item3,
        "opcio_led_vilagitas_kedvezmenyes_ar_item3": opcio_led_vilagitas_kedvezmenyes_ar_item3, 
        "opcio_led_vilagitas_eur_item3": opcio_led_vilagitas_eur_item3,
        "opcio_led_vilagitas_huf_item3": opcio_led_vilagitas_huf_item3,
        "width_net_item3": width_net_item3,
        "projection_net_item3": projection_net_item3,
        "zip_arnyekolo_width_kedvezmenyes_ar_item3": zip_arnyekolo_width_kedvezmenyes_ar_item3,
        "zip_arnyekolo_projection_kedvezmenyes_ar_item3": zip_arnyekolo_projection_kedvezmenyes_ar_item3,
        "zip_arnyekolo_width_lista_ar_item3": zip_arnyekolo_width_lista_ar_item3,
        "zip_arnyekolo_projection_lista_ar_item3": zip_arnyekolo_projection_lista_ar_item3,
        "zip_arnyekolo_szereles_ar_item3": zip_arnyekolo_szereles_ar_item3,
        "zip_arnyekolo_osszesen_ar_item3": zip_arnyekolo_osszesen_ar_item3,
        "zip_arnyekolo_szerelessel_eur_item3": zip_arnyekolo_szerelessel_eur_item3,
        "zip_arnyekolo_szerelessel_huf_item3": zip_arnyekolo_szerelessel_huf_item3,

        "uvegfalrendszer_width_tablak_szama_item3": uvegfalrendszer_width_tablak_szama_item3,
        "uvegfalrendszer_width_kedvezmenyes_ar_item3": uvegfalrendszer_width_kedvezmenyes_ar_item3,
        "uvegfalrendszer_width_lista_ar_item3": uvegfalrendszer_width_lista_ar_item3,
        "uvegfalrendszer_projection_tablak_szama_item3": uvegfalrendszer_projection_tablak_szama_item3,
        "uvegfalrendszer_projection_kedvezmenyes_ar_item3": uvegfalrendszer_projection_kedvezmenyes_ar_item3,
        "uvegfalrendszer_projection_lista_ar_item3": uvegfalrendszer_projection_lista_ar_item3,
        "uvegfalrendszer_szereles_ar_item3": uvegfalrendszer_szereles_ar_item3,
        "uvegfalrendszer_osszesen_ar_item3": uvegfalrendszer_osszesen_ar_item3,
        "uvegfalrendszer_szerelessel_eur_item3": uvegfalrendszer_szerelessel_eur_item3,
        "uvegfalrendszer_szerelessel_huf_item3": uvegfalrendszer_szerelessel_huf_item3,

        "szallitasi_dij": currency_format(szallitasi_dij),
        "telepules": telepules,
        
    }

    Renderer().render_template(form_data, html_variables)





