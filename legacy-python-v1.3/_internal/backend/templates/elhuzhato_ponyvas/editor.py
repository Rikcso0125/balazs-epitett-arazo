from backend.utils import FormData
from backend.utils import BeepitesTipus

from backend.utils import Arkepzok
from backend.utils import currency_format
from backend.utils import get_uvegfal_tablak_szama
from backend.templates import Renderer

from backend.templates.elhuzhato_ponyvas.datasheet import A100Lux, Keplan, Isola


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
        opcionalisan_feltuntetni = f"Opcionálisan feltüntettem a szerkezet {width} cm-es, illetve {projection} cm-es oldalára a motoros-oldalsó árnyékolókat és a keret nélküli, elcsúsztatható üvegfalrendszert is." 
    elif (is_oldalso_arnyekolo_enabled and not is_uvegfal_rendszer_enabled):
        opcionalisan_feltuntetni = f"Opcionálisan feltüntettem a szerkezet {width} cm-es, illetve {projection} cm-es oldalára a motoros-oldalsó árnyékolókat is." 
    elif (not is_oldalso_arnyekolo_enabled and is_uvegfal_rendszer_enabled):
        opcionalisan_feltuntetni = f"Opcionálisan feltüntettem a szerkezet {width} cm-es, illetve {projection} cm-es oldalára a keret nélküli, elcsúsztatható üvegfalrendszert is."
    else:
        opcionalisan_feltuntetni=""
        
    if beepites_tipusa == BeepitesTipus.EpulethezRogzitett:
        rogzites_tipus_item1 = "falhoz rögzítve"
        labak_rogzitese_item1 = "elől"
        rogzites_tipus_item2 = "falhoz rögzítve"
        labak_rogzitese_item2 = "elől"
        rogzites_tipus_item3 = "falhoz rögzítve"
        labak_rogzitese_item3 = "elől"
    elif beepites_tipusa == BeepitesTipus.SzabadonAllo:
        rogzites_tipus_item1 = "falhoz rögzítve"
        labak_rogzitese_item1 = "elől"
        rogzites_tipus_item2 = "különálló szerkezetként rögzítve"
        labak_rogzitese_item2 = "összesen"
        rogzites_tipus_item3 = "különálló szerkezetként rögzítve"
        labak_rogzitese_item3 = "összesen"
    
    is_epulethez_rogzitett = beepites_tipusa == BeepitesTipus.EpulethezRogzitett

    ######################################################################################################################
    # # # # # # # # # # # # # # # # # # # # # # # # # # #   ITEM 1   # # # # # # # # # # # # # # # # # # # # # # # # # # #
    # GENIUS A100 LUX
    # projection_item1 = 500 #adatbázisból lekérdezés alapján megkapott adatok
    # width_item1 = 500 #adatbázisból lekérdezés alapján megkapott adatok
    # height_item1 = 300 #adatbázisból lekérdezés alapján megkapott adatok
    # kedvezmenyes_ar_item1 = 6666 #adatbázisból lekérdezés alapján megkapott adatok
    # modulok_szama_item1 = 1 # ? ez kiszamitos
    # labak_szama_item1 = modulok_szama_item1 + 1

    datasheet_a100lux = A100Lux(projection, width, height)
    if datasheet_a100lux.is_projection_above_max_size() or datasheet_a100lux.is_projection_below_min_size():
        projection_item1 = datasheet_a100lux.get_item_projection()
    else:
        projection_item1 = projection
    
    if datasheet_a100lux.is_width_above_max_size() or datasheet_a100lux.is_width_below_min_size():
        width_item1 = datasheet_a100lux.get_item_width()
    else:
        width_item1 = width
    
    height_item1 = datasheet_a100lux.get_item_height()

    if datasheet_a100lux.get_modul_num() == 1:
        kedvezmenyes_ar_item1 = arkepzok.A100LUX(datasheet_a100lux.get_item_price() + datasheet_a100lux.get_eloteto_ar()) # 1 modul
    elif datasheet_a100lux.get_modul_num() == 2:
        kedvezmenyes_ar_item1 = arkepzok.A100LUX(datasheet_a100lux.get_item_price() + datasheet_a100lux.get_eloteto_ar()) + 1400 # 2 modul
    elif datasheet_a100lux.get_modul_num() == 3:
        kedvezmenyes_ar_item1 = arkepzok.A100LUX(datasheet_a100lux.get_item_price() + datasheet_a100lux.get_eloteto_ar()) + 2400 # 3 modul
        
    # print(f"PRICE FETCH: kedvezmenyes_ar_item1 fetched: {kedvezmenyes_ar_item1} | Original: {6666}")
    modulok_szama_item1 = datasheet_a100lux.get_modul_num()
    labak_szama_item1 = datasheet_a100lux.get_legs_num()

############################################################  DATASHEET READ END ############################################################

    is_projection_below_min_size = datasheet_a100lux.is_projection_below_min_size()
    is_projection_above_max_size = datasheet_a100lux.is_projection_above_max_size()
    is_width_below_min_size = datasheet_a100lux.is_width_below_min_size()
    is_width_above_max_size = datasheet_a100lux.is_width_above_max_size()
    is_height_below_min_size = datasheet_a100lux.is_height_below_min_size()
    is_height_above_max_size = datasheet_a100lux.is_height_above_max_size()

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
    motor_kedvezmenyes_ar_item1 = 800 + (modulok_szama_item1 - 1) * 100 # statikus
    motor_lista_ar_item1 = arkepzok.LISTA_AR(motor_kedvezmenyes_ar_item1)
    taviranyito_kedvezmenyes_ar_item1 = 100 # statikus

    reszosszeg_item1 = sum([kedvezmenyes_ar_item1, motor_kedvezmenyes_ar_item1, taviranyito_kedvezmenyes_ar_item1])
    if reszosszeg_item1 < 5000:
        szereles_ar_item1 = int(reszosszeg_item1 * 0.13)
    elif (reszosszeg_item1 >= 5000 and reszosszeg_item1 < 7500):
        szereles_ar_item1 = int(reszosszeg_item1 * 0.12)
    elif reszosszeg_item1 >= 7500:
        szereles_ar_item1 = int(reszosszeg_item1 * 0.10)
    else:
        raise Exception("elágazás logika hiba a szereles_ar_item1 számításakor")

    osszesen_ar_item1 = sum([reszosszeg_item1, szereles_ar_item1])
    alapszerkezet_szerelessel_eur_item1 = currency_format(osszesen_ar_item1)
    alapszerkezet_szerelessel_huf_item1 = currency_format(round(osszesen_ar_item1 * eur_huf_arfolyam, -3))
    opcio_led_vilagitas_kedvezmenyes_ar_item1 = 400 + (modulok_szama_item1 - 1) * 200 # statikus
    opcio_led_vilagitas_lista_ar_item1 = arkepzok.LISTA_AR(opcio_led_vilagitas_kedvezmenyes_ar_item1)
    opcio_led_vilagitas_eur_item1 = currency_format(opcio_led_vilagitas_kedvezmenyes_ar_item1)
    opcio_led_vilagitas_huf_item1 = currency_format(round(opcio_led_vilagitas_kedvezmenyes_ar_item1 * eur_huf_arfolyam, -3))

    projection_net_item1 = projection_item1 - labak_szama_item1 * 6
    width_net_item1 = width_item1 - 11
    height_net_item1 = int(height_item1 - 10 * width_item1 / 100)

    # zip_arnyekolo_width_kedvezmenyes_ar_item1 = 2127 #adatbázisból lekérdezés alapján megkapott adatok (width_net_item1, height_item1)
    zip_arnyekolo_width_kedvezmenyes_ar_item1 = arkepzok.REFLEKSOL_120_ZIP(datasheet_a100lux.get_zip_price(width_net_item1, height_item1))
    # print(f"PRICE FETCH: zip_arnyekolo_width_kedvezmenyes_ar_item1 fetched: {zip_arnyekolo_width_kedvezmenyes_ar_item1} | Original: {2127}")
    zip_arnyekolo_width_lista_ar_item1 = arkepzok.LISTA_AR(zip_arnyekolo_width_kedvezmenyes_ar_item1)

    # zip_arnyekolo_projection_kedvezmenyes_ar_item1 = 2350 #adatbázisból lekérdezés alapján megkapott adatok (projection_net_item1, height_item1)
    zip_arnyekolo_projection_kedvezmenyes_ar_item1 = arkepzok.REFLEKSOL_120_ZIP(datasheet_a100lux.get_zip_price(projection_net_item1, height_item1))
    # print(f"PRICE FETCH: zip_arnyekolo_projection_kedvezmenyes_ar_item1 fetched: {zip_arnyekolo_projection_kedvezmenyes_ar_item1} | Original: {2350}")
    zip_arnyekolo_projection_lista_ar_item1 = arkepzok.LISTA_AR(zip_arnyekolo_projection_kedvezmenyes_ar_item1)

    zip_arnyekolo_szereles_ar_item1 = int(sum([zip_arnyekolo_width_kedvezmenyes_ar_item1, zip_arnyekolo_projection_kedvezmenyes_ar_item1]) * 0.1)
    zip_arnyekolo_osszesen_ar_item1 = int(sum([zip_arnyekolo_width_kedvezmenyes_ar_item1, zip_arnyekolo_projection_kedvezmenyes_ar_item1, zip_arnyekolo_szereles_ar_item1]))
    zip_arnyekolo_szerelessel_eur_item1 = currency_format(zip_arnyekolo_osszesen_ar_item1)
    zip_arnyekolo_szerelessel_huf_item1 = currency_format(round(zip_arnyekolo_osszesen_ar_item1 * eur_huf_arfolyam, -3))

    # uvegfalrendszer_width_kedvezmenyes_ar_item1 = 2200 #adatbázisból lekérdezés alapján megkapott adatok (width_net_item1, height_item1)
    uvegfalrendszer_width_kedvezmenyes_ar_item1 = arkepzok.UVEGFAL_RENDSZER(datasheet_a100lux.get_uvegfalrendszer_price(width_net_item1, height_item1))
    # print(f"PRICE FETCH: uvegfalrendszer_width_kedvezmenyes_ar_item1 fetched: {uvegfalrendszer_width_kedvezmenyes_ar_item1} | Original: {2200}")
    uvegfalrendszer_width_lista_ar_item1 = arkepzok.LISTA_AR(uvegfalrendszer_width_kedvezmenyes_ar_item1)

    # uvegfalrendszer_projection_kedvezmenyes_ar_item1 = 2450 #adatbázisból lekérdezés alapján megkapott adatok (projection_net_item1, height_item1)
    uvegfalrendszer_projection_kedvezmenyes_ar_item1 = arkepzok.UVEGFAL_RENDSZER(datasheet_a100lux.get_uvegfalrendszer_price(projection_net_item1, height_item1))
    # print(f"PRICE FETCH: uvegfalrendszer_projection_kedvezmenyes_ar_item1 fetched: {uvegfalrendszer_projection_kedvezmenyes_ar_item1} | Original: {2450}")
    uvegfalrendszer_projection_lista_ar_item1 = arkepzok.LISTA_AR(uvegfalrendszer_projection_kedvezmenyes_ar_item1)

    uvegfalrendszer_width_tablak_szama_item1 = get_uvegfal_tablak_szama(width_net_item1)
    uvegfalrendszer_projection_tablak_szama_item1 = get_uvegfal_tablak_szama(projection_net_item1)
    uvegfalrendszer_szereles_ar_item1 = int(sum([uvegfalrendszer_width_kedvezmenyes_ar_item1, uvegfalrendszer_projection_kedvezmenyes_ar_item1]) * 0.12)
    uvegfalrendszer_osszesen_ar_item1 = int(sum([uvegfalrendszer_width_kedvezmenyes_ar_item1, uvegfalrendszer_projection_kedvezmenyes_ar_item1, uvegfalrendszer_szereles_ar_item1]))
    uvegfalrendszer_szerelessel_eur_item1 = currency_format(uvegfalrendszer_osszesen_ar_item1)
    uvegfalrendszer_szerelessel_huf_item1 = currency_format(round(uvegfalrendszer_osszesen_ar_item1 * eur_huf_arfolyam, -3))


    ######################################################################################################################
    # # # # # # # # # # # # # # # # # # # # # # # # # # #   ITEM 2   # # # # # # # # # # # # # # # # # # # # # # # # # # #
    # KEPLAN
    # projection_item2 = 500 #adatbázisból lekérdezés alapján megkapott adatok
    # width_item2 = 400 #adatbázisból lekérdezés alapján megkapott adatok
    # height_item2 = 250 #adatbázisból lekérdezés alapján megkapott adatok
    # kedvezmenyes_ar_item2 = 10000 #adatbázisból lekérdezés alapján megkapott adatok
    modulok_szama_item2 = 1 # statikus

    if beepites_tipusa == BeepitesTipus.EpulethezRogzitett:
        labak_szama_item2 = 2
    elif beepites_tipusa == BeepitesTipus.SzabadonAllo:
        labak_szama_item2 = 4
    
    datasheet_keplan = Keplan(beepites_tipusa, projection, width)

    if datasheet_keplan.is_projection_above_max_size() or datasheet_keplan.is_projection_below_min_size():
        projection_item2 = datasheet_keplan.get_item_projection()
    else:
        projection_item2 = projection

    if datasheet_keplan.is_width_above_max_size() or datasheet_keplan.is_width_below_min_size():
        width_item2 = datasheet_keplan.get_item_width()
    else:
        width_item2 = width # a lamellák hosszúságát centire pontosan lehet szabni, nem csak fix méret lehet
    
    height_item2 = height

    kedvezmenyes_ar_item2 = arkepzok.KEPLAN(datasheet_keplan.get_item_price())
    # print(f"PRICE FETCH: kedvezmenyes_ar_item2 fetched: {kedvezmenyes_ar_item2} | Original: {10000}")

############################################################  DATASHEET READ END ############################################################

    is_projection_below_min_size = datasheet_keplan.is_projection_below_min_size()
    is_projection_above_max_size = datasheet_keplan.is_projection_above_max_size()
    is_width_below_min_size = datasheet_keplan.is_width_below_min_size()
    is_width_above_max_size = datasheet_keplan.is_width_above_max_size()

    is_warning_neccessary = False
    if is_projection_below_min_size or is_width_below_min_size:
        min_max_item2 = "minimum"
        is_warning_neccessary = True
    if is_projection_above_max_size or is_width_above_max_size:
        min_max_item2 = "maximum"
        is_warning_neccessary = True

    if is_warning_neccessary:
        warning_msg_size_not_found_item2 = f"FONTOS: Nincsen a megadott méretben ({projection} * {width} * {height}), csak {min_max_item2} {projection_item2} * {width_item2} * {height_item2}. Az ajánlatban ezzel a mérettel kalkuláltam. Ha mindenképpen az eredeti méret ({projection} * {width} * {height}) érdekli, kérem vegye fel velem a kapcsolatot."
    else:
        warning_msg_size_not_found_item2 = ""

    lista_ar_item2 = arkepzok.LISTA_AR(kedvezmenyes_ar_item2)
    
    motor_kedvezmenyes_ar_item2 = 800 # statikus
    motor_lista_ar_item2 = arkepzok.LISTA_AR(motor_kedvezmenyes_ar_item2)
    taviranyito_kedvezmenyes_ar_item2 = 100 # statikus

    reszosszeg_item2 = sum([kedvezmenyes_ar_item2, motor_kedvezmenyes_ar_item2, taviranyito_kedvezmenyes_ar_item2])
    szereles_ar_item2 = int(reszosszeg_item2 * 0.12)

    osszesen_ar_item2 = sum([reszosszeg_item2, szereles_ar_item2])

    alapszerkezet_szerelessel_eur_item2 = currency_format(osszesen_ar_item2)
    alapszerkezet_szerelessel_huf_item2 = currency_format(round(osszesen_ar_item2 * eur_huf_arfolyam, -3))

    opcio_led_vilagitas_kedvezmenyes_ar_item2 = 300 # statikus
    opcio_led_vilagitas_lista_ar_item2 = arkepzok.LISTA_AR(opcio_led_vilagitas_kedvezmenyes_ar_item2)

    opcio_led_vilagitas_eur_item2 = currency_format(opcio_led_vilagitas_kedvezmenyes_ar_item2)
    opcio_led_vilagitas_huf_item2 = currency_format(round(opcio_led_vilagitas_kedvezmenyes_ar_item2 * eur_huf_arfolyam, -3))

    if beepites_tipusa == BeepitesTipus.EpulethezRogzitett:
        width_net_item2 = width_item2 - 1 * 11
        projection_net_item2 = projection_item2 - 2 * 11
    elif beepites_tipusa == BeepitesTipus.SzabadonAllo:
        width_net_item2 = width_item2 - 2 * 11
        projection_net_item2 = projection_item2 - 2 * 11

    height_net_item2 = height_item2 - 10

    # zip_arnyekolo_width_kedvezmenyes_ar_item2 = 1540 #adatbázisból lekérdezés alapján megkapott adatok (width_net_item2, height_item2)
    zip_arnyekolo_width_kedvezmenyes_ar_item2 = arkepzok.REFLEKSOL_120_ZIP(datasheet_keplan.get_zip_price(width_net_item2, height_item2))
    # print(f"PRICE FETCH: zip_arnyekolo_width_kedvezmenyes_ar_item2 fetched: {zip_arnyekolo_width_kedvezmenyes_ar_item2} | Original: {1540}")
    zip_arnyekolo_width_lista_ar_item2 = arkepzok.LISTA_AR(zip_arnyekolo_width_kedvezmenyes_ar_item2)

    # zip_arnyekolo_projection_kedvezmenyes_ar_item2 = 1640 #adatbázisból lekérdezés alapján megkapott adatok (projection_net_item2, height_item2)
    zip_arnyekolo_projection_kedvezmenyes_ar_item2 = arkepzok.REFLEKSOL_120_ZIP(datasheet_keplan.get_zip_price(projection_net_item2, height_item2))
    # print(f"PRICE FETCH: zip_arnyekolo_projection_kedvezmenyes_ar_item2 fetched: {zip_arnyekolo_projection_kedvezmenyes_ar_item2} | Original: {1640}")
    zip_arnyekolo_projection_lista_ar_item2 = arkepzok.LISTA_AR(zip_arnyekolo_projection_kedvezmenyes_ar_item2)

    zip_arnyekolo_szereles_ar_item2 = int(sum([zip_arnyekolo_width_kedvezmenyes_ar_item2, zip_arnyekolo_projection_kedvezmenyes_ar_item2]) * 0.1)
    zip_arnyekolo_osszesen_ar_item2 = int(sum([zip_arnyekolo_width_kedvezmenyes_ar_item2, zip_arnyekolo_projection_kedvezmenyes_ar_item2, zip_arnyekolo_szereles_ar_item2]))
    zip_arnyekolo_szerelessel_eur_item2 = currency_format(zip_arnyekolo_osszesen_ar_item2)
    zip_arnyekolo_szerelessel_huf_item2 = currency_format(round(zip_arnyekolo_osszesen_ar_item2 * eur_huf_arfolyam, -3))

    # uvegfalrendszer_width_kedvezmenyes_ar_item2 = 2200 #adatbázisból lekérdezés alapján megkapott adatok (width_net_item2, height_item2)
    uvegfalrendszer_width_kedvezmenyes_ar_item2 = arkepzok.UVEGFAL_RENDSZER(datasheet_keplan.get_uvegfalrendszer_price(width_net_item2, height_item2))
    # print(f"PRICE FETCH: uvegfalrendszer_width_kedvezmenyes_ar_item2 fetched: {uvegfalrendszer_width_kedvezmenyes_ar_item2} | Original: {2200}")
    uvegfalrendszer_width_lista_ar_item2 = arkepzok.LISTA_AR(uvegfalrendszer_width_kedvezmenyes_ar_item2)

    # uvegfalrendszer_projection_kedvezmenyes_ar_item2 = 2450 #adatbázisból lekérdezés alapján megkapott adatok (projection_net_item2, height_item2)
    uvegfalrendszer_projection_kedvezmenyes_ar_item2 = arkepzok.UVEGFAL_RENDSZER(datasheet_keplan.get_uvegfalrendszer_price(projection_net_item2, height_item2))
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
    # Isola 2A
    # projection_item3 = 491 #adatbázisból lekérdezés alapján megkapott adatok
    # width_item3 = 400 #adatbázisból lekérdezés alapján megkapott adatok
    # height_item3 = 250 #adatbázisból lekérdezés alapján megkapott adatok
    # kedvezmenyes_ar_item3 = 15160 #adatbázisból lekérdezés alapján megkapott adatok
    modulok_szama_item3 = 1

    datasheet_isola = Isola(beepites_tipusa, projection, width)

    labak_szama_item3 = datasheet_isola.get_legs_num()

    if datasheet_isola.is_projection_above_max_size() or datasheet_isola.is_projection_below_min_size():
        projection_item3 = datasheet_isola.get_item_projection()
    else:
        projection_item3 = projection
    
    if datasheet_isola.is_width_above_max_size() or datasheet_isola.is_width_below_min_size():
        width_item3 = datasheet_isola.get_item_width()
    else:
        width_item3 = width
    
    height_item3 = height

    kedvezmenyes_ar_item3 = arkepzok.ISOLA_2A(datasheet_isola.get_item_price())
    if datasheet_isola.is_higher_size_price():
        kedvezmenyes_ar_item3 += 650
    # print(f"PRICE FETCH: kedvezmenyes_ar_item3 fetched: {kedvezmenyes_ar_item3} | Original: {15160}")

    print("tablazat értéke:", datasheet_isola.get_item_price())
    print("kedvezmenyes_ar_item3:", kedvezmenyes_ar_item3)


############################################################  DATASHEET READ END ############################################################

    is_projection_below_min_size = datasheet_isola.is_projection_below_min_size()
    is_projection_above_max_size = datasheet_isola.is_projection_above_max_size()
    is_width_below_min_size = datasheet_isola.is_width_below_min_size()
    is_width_above_max_size = datasheet_isola.is_width_above_max_size()

    is_warning_neccessary = False
    if is_projection_below_min_size or is_width_below_min_size:
        min_max_item3 = "minimum"
        is_warning_neccessary = True
    if is_projection_above_max_size or is_width_above_max_size:
        min_max_item3 = "maximum"
        is_warning_neccessary = True

    if is_warning_neccessary:
        warning_msg_size_not_found_item3 = f"FONTOS: Nincsen a megadott méretben ({projection} * {width} * {height}), csak {min_max_item3} {projection_item3} * {width_item3} * {height_item3}. Az ajánlatban ezzel a mérettel kalkuláltam. Ha mindenképpen az eredeti méret ({projection} * {width} * {height}) érdekli, kérem vegye fel velem a kapcsolatot."
    else:
        warning_msg_size_not_found_item3 = ""
    
    motor_kedvezmenyes_ar_item3 = 1200 if datasheet_isola.is_higher_size_price() else 1000 # statikus
    taviranyito_kedvezmenyes_ar_item3 = 100 # statikus
    
    motor_lista_ar_item3 = arkepzok.LISTA_AR(motor_kedvezmenyes_ar_item3)
    lista_ar_item3 = arkepzok.LISTA_AR(kedvezmenyes_ar_item3)

    reszosszeg_item3 = sum([kedvezmenyes_ar_item3, motor_kedvezmenyes_ar_item3, taviranyito_kedvezmenyes_ar_item3])
    
    szereles_ar_item3 = int(reszosszeg_item3 * 0.09) if datasheet_isola.is_higher_size_price() else int(reszosszeg_item3 * 0.08)
    osszesen_ar_item3 = sum([reszosszeg_item3, szereles_ar_item3])

    alapszerkezet_szerelessel_eur_item3 = currency_format(osszesen_ar_item3)
    alapszerkezet_szerelessel_huf_item3 = currency_format(round(osszesen_ar_item3 * eur_huf_arfolyam, -3))
    opcio_led_vilagitas_kedvezmenyes_ar_item3 = 1200 if datasheet_isola.is_higher_size_price() else 900 # statikus
    opcio_led_vilagitas_lista_ar_item3 = arkepzok.LISTA_AR(opcio_led_vilagitas_kedvezmenyes_ar_item3)
    opcio_led_vilagitas_eur_item3 = currency_format(opcio_led_vilagitas_kedvezmenyes_ar_item3)
    opcio_led_vilagitas_huf_item3 = currency_format(round(opcio_led_vilagitas_kedvezmenyes_ar_item3 * eur_huf_arfolyam, -3))

    if beepites_tipusa == BeepitesTipus.EpulethezRogzitett:
        width_net_item3 = width_item3 - 1 * 12
        if datasheet_isola.is_higher_size_price():
            projection_net_item3 = projection_item3 - 3 * 12
        else:
            projection_net_item3 = projection_item3 - 2 * 12
    elif beepites_tipusa == BeepitesTipus.SzabadonAllo:
        width_net_item3 = width_item3 - 2 * 12
        if datasheet_isola.is_higher_size_price():
            projection_net_item3 = projection_item3 - 3 * 12
        else:
            projection_net_item3 = projection_item3 - 2 * 12
    height_net_item3 = height_item3

    # zip_arnyekolo_width_kedvezmenyes_ar_item3 = 2127 #adatbázisból lekérdezés alapján megkapott adatok (width_net_item3, height_item3)
    zip_arnyekolo_width_kedvezmenyes_ar_item3 = arkepzok.REFLEKSOL_120_ZIP(datasheet_isola.get_zip_price(width_net_item3, height_item3))
    # print(f"PRICE FETCH: zip_arnyekolo_width_kedvezmenyes_ar_item3 fetched: {zip_arnyekolo_width_kedvezmenyes_ar_item3} | Original: {2127}")
    zip_arnyekolo_width_lista_ar_item3 = arkepzok.LISTA_AR(zip_arnyekolo_width_kedvezmenyes_ar_item3)

    # zip_arnyekolo_projection_kedvezmenyes_ar_item3 = 2350 #adatbázisból lekérdezés alapján megkapott adatok (projection_net_item3, height_item3)
    zip_arnyekolo_projection_kedvezmenyes_ar_item3 = arkepzok.REFLEKSOL_120_ZIP(datasheet_isola.get_zip_price(projection_net_item3, height_item3))
    # print(f"PRICE FETCH: zip_arnyekolo_projection_kedvezmenyes_ar_item3 fetched: {zip_arnyekolo_projection_kedvezmenyes_ar_item3} | Original: {2350}")
    zip_arnyekolo_projection_lista_ar_item3 = arkepzok.LISTA_AR(zip_arnyekolo_projection_kedvezmenyes_ar_item3)

    zip_arnyekolo_szereles_ar_item3 = int(sum([zip_arnyekolo_width_kedvezmenyes_ar_item3, zip_arnyekolo_projection_kedvezmenyes_ar_item3]) * 0.1)
    zip_arnyekolo_osszesen_ar_item3 = int(sum([zip_arnyekolo_width_kedvezmenyes_ar_item3, zip_arnyekolo_projection_kedvezmenyes_ar_item3, zip_arnyekolo_szereles_ar_item3]))
    zip_arnyekolo_szerelessel_eur_item3 = currency_format(zip_arnyekolo_osszesen_ar_item3)
    zip_arnyekolo_szerelessel_huf_item3 = currency_format(round(zip_arnyekolo_osszesen_ar_item3 * eur_huf_arfolyam, -3))

    # uvegfalrendszer_width_kedvezmenyes_ar_item3 = 2200 #adatbázisból lekérdezés alapján megkapott adatok (width_net_item3, height_item3)
    uvegfalrendszer_width_kedvezmenyes_ar_item3 = arkepzok.UVEGFAL_RENDSZER(datasheet_isola.get_uvegfalrendszer_price(width_net_item3, height_item3))
    # print(f"PRICE FETCH: uvegfalrendszer_width_kedvezmenyes_ar_item3 fetched: {uvegfalrendszer_width_kedvezmenyes_ar_item3} | Original: {2200}")
    uvegfalrendszer_width_lista_ar_item3 = arkepzok.LISTA_AR(uvegfalrendszer_width_kedvezmenyes_ar_item3)

    uvegfalrendszer_projection_kedvezmenyes_ar_item3 = 2450 #adatbázisból lekérdezés alapján megkapott adatok (projection_net_item3, height_item3)
    uvegfalrendszer_projection_kedvezmenyes_ar_item3 = arkepzok.UVEGFAL_RENDSZER(datasheet_isola.get_uvegfalrendszer_price(projection_net_item3, height_item3))
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
        "is_epulethez_rogzitett": is_epulethez_rogzitett,
        "eur_huf_arfolyam": eur_huf_arfolyam,
        "is_oldalso_arnyekolo_enabled": is_oldalso_arnyekolo_enabled,
        "is_uvegfal_rendszer_enabled": is_uvegfal_rendszer_enabled,

        # # ITEM 1
        "projection_item1": projection_item1,
        "width_item1": width_item1,
        "height_item1": height_item1,
        "modulok_szama_item1": modulok_szama_item1,
        "rogzites_tipus_item1": rogzites_tipus_item1,
        "labak_rogzitese_item1": labak_rogzitese_item1,
        "labak_szama_item1": labak_szama_item1,
        "warning_msg_size_not_found_item1": warning_msg_size_not_found_item1,
        'kedvezmenyes_ar_item1': kedvezmenyes_ar_item1,
        'lista_ar_item1': lista_ar_item1,
        "motor_lista_ar_item1": motor_lista_ar_item1,
        "motor_kedvezmenyes_ar_item1": motor_kedvezmenyes_ar_item1,
        "taviranyito_kedvezmenyes_ar_item1": taviranyito_kedvezmenyes_ar_item1,
        "szereles_ar_item1": szereles_ar_item1,
        "osszesen_ar_item1": osszesen_ar_item1,
        "alapszerkezet_szerelessel_eur_item1": alapszerkezet_szerelessel_eur_item1,
        "alapszerkezet_szerelessel_huf_item1": alapszerkezet_szerelessel_huf_item1,
        "opcio_led_vilagitas_kedvezmenyes_ar_item1": opcio_led_vilagitas_kedvezmenyes_ar_item1,
        "opcio_led_vilagitas_lista_ar_item1": opcio_led_vilagitas_lista_ar_item1,
        "opcio_led_vilagitas_eur_item1": opcio_led_vilagitas_eur_item1,
        "opcio_led_vilagitas_huf_item1": opcio_led_vilagitas_huf_item1,
        "width_net_item1": width_net_item1,
        "projection_net_item1": projection_net_item1,
        "height_net_item1": height_net_item1,
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

        # # ITEM 2
        "projection_item2": projection_item2,
        "width_item2": width_item2,
        "height_item2": height_item2,
        "modulok_szama_item2": modulok_szama_item2,
        "rogzites_tipus_item2": rogzites_tipus_item2,
        "labak_rogzitese_item2": labak_rogzitese_item2,
        "labak_szama_item2": labak_szama_item2,
        "warning_msg_size_not_found_item2": warning_msg_size_not_found_item2,
        'kedvezmenyes_ar_item2': kedvezmenyes_ar_item2,
        'lista_ar_item2': lista_ar_item2,
        "motor_lista_ar_item2": motor_lista_ar_item2,
        "motor_kedvezmenyes_ar_item2": motor_kedvezmenyes_ar_item2,
        "taviranyito_kedvezmenyes_ar_item2": taviranyito_kedvezmenyes_ar_item2,
        "szereles_ar_item2": szereles_ar_item2,
        "osszesen_ar_item2": osszesen_ar_item2,
        "alapszerkezet_szerelessel_eur_item2": alapszerkezet_szerelessel_eur_item2,
        "alapszerkezet_szerelessel_huf_item2": alapszerkezet_szerelessel_huf_item2,
        "opcio_led_vilagitas_kedvezmenyes_ar_item2": opcio_led_vilagitas_kedvezmenyes_ar_item2,
        "opcio_led_vilagitas_lista_ar_item2": opcio_led_vilagitas_lista_ar_item2,
        "opcio_led_vilagitas_eur_item2": opcio_led_vilagitas_eur_item2,
        "opcio_led_vilagitas_huf_item2": opcio_led_vilagitas_huf_item2,
        "width_net_item2": width_net_item2,
        "projection_net_item2": projection_net_item2,
        "height_net_item2": height_net_item2,
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

        # # ITEM 3
        "projection_item3": projection_item3,
        "width_item3": width_item3,
        "height_item3": height_item3,
        "modulok_szama_item3": modulok_szama_item3,
        "rogzites_tipus_item3": rogzites_tipus_item3,
        "labak_rogzitese_item3": labak_rogzitese_item3,
        "labak_szama_item3": labak_szama_item3,
        "warning_msg_size_not_found_item3": warning_msg_size_not_found_item3,
        'kedvezmenyes_ar_item3': kedvezmenyes_ar_item3,
        'lista_ar_item3': lista_ar_item3,
        "motor_lista_ar_item3": motor_lista_ar_item3,
        "motor_kedvezmenyes_ar_item3": motor_kedvezmenyes_ar_item3,
        "taviranyito_kedvezmenyes_ar_item3": taviranyito_kedvezmenyes_ar_item3,
        "szereles_ar_item3": szereles_ar_item3,
        "osszesen_ar_item3": osszesen_ar_item3,
        "alapszerkezet_szerelessel_eur_item3": alapszerkezet_szerelessel_eur_item3,
        "alapszerkezet_szerelessel_huf_item3": alapszerkezet_szerelessel_huf_item3,
        "opcio_led_vilagitas_kedvezmenyes_ar_item3": opcio_led_vilagitas_kedvezmenyes_ar_item3,
        "opcio_led_vilagitas_lista_ar_item3": opcio_led_vilagitas_lista_ar_item3,
        "opcio_led_vilagitas_eur_item3": opcio_led_vilagitas_eur_item3,
        "opcio_led_vilagitas_huf_item3": opcio_led_vilagitas_huf_item3,
        "width_net_item3": width_net_item3,
        "projection_net_item3": projection_net_item3,
        "height_net_item3": height_net_item3,
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





