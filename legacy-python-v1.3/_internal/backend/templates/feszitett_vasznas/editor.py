from backend.utils import FormData

from backend.utils import Arkepzok
from backend.utils import currency_format
from backend.templates import Renderer

from backend.templates.feszitett_vasznas.datasheet_transposed import PergolaVZIIP, Hydra, A100Lux


def main(form_data: FormData):

    #formsban megadott adatok
    name = form_data.name.split(" ")[-1]
    projection = form_data.projection
    width = form_data.width
    height = form_data.height
    is_opcio_led_vilagitas_enabled = form_data.is_opcio_led_vilagitas_enabled
    eur_huf_arfolyam = form_data.eur_huf_arfolyam
    szallitasi_dij = form_data.szallitasi_dij
    telepules = form_data.telepules

    arkepzok = Arkepzok()

    ######################################################################################################################
    # # # # # # # # # # # # # # # # # # # # # # # # # #   BEVEZETŐ   # # # # # # # # # # # # # # # # # # # # # # # # # # #
    if is_opcio_led_vilagitas_enabled:
        opcionalisan_feltuntetni = "Opcionálisan LED világítással a felső gerendákban." 
    else:
        opcionalisan_feltuntetni = ""

    ######################################################################################################################
    # # # # # # # # # # # # # # # # # # # # # # # # # # #   ITEM 1   # # # # # # # # # # # # # # # # # # # # # # # # # # #
    # Pergola V ZIIIP

    # projection_item1 = 500 #adatbázisból lekérdezés alapján megkapott adatok
    # width_item1 = 500 #adatbázisból lekérdezés alapján megkapott adatok
    # height_item1 = 300 #adatbázisból lekérdezés alapján megkapott adatok
    # kedvezmenyes_ar_item1 = 5600 #adatbázisból lekérdezés alapján megkapott adatok
    # modulok_szama_item1 = 1
    # labak_szama_item1 = modulok_szama_item1 * 2

    datasheet_pergolavziip = PergolaVZIIP(projection, width, height)
    if datasheet_pergolavziip.is_projection_above_max_size() or datasheet_pergolavziip.is_projection_below_min_size():
        projection_item1 = datasheet_pergolavziip.get_item_projection() * datasheet_pergolavziip.get_modul_num()
    else:
        projection_item1 = projection
    
    if datasheet_pergolavziip.is_width_above_max_size() or datasheet_pergolavziip.is_width_below_min_size():
        width_item1 = datasheet_pergolavziip.get_item_width()
    else:
        width_item1 = width
    
    height_item1 = datasheet_pergolavziip.get_item_height()

    kedvezmenyes_ar_item1 = arkepzok.PERGOLA_V_ZIIP(datasheet_pergolavziip.get_item_price())
    # print(f"PRICE FETCH: kedvezmenyes_ar_item1 fetched: {kedvezmenyes_ar_item1} | Original: {5600}")
    modulok_szama_item1 = datasheet_pergolavziip.get_modul_num()
    labak_szama_item1 = datasheet_pergolavziip.get_legs_num()

############################################################  DATASHEET READ END ############################################################

    is_projection_below_min_size = datasheet_pergolavziip.is_projection_below_min_size()
    is_projection_above_max_size = datasheet_pergolavziip.is_projection_above_max_size()
    is_width_below_min_size = datasheet_pergolavziip.is_width_below_min_size()
    is_width_above_max_size = datasheet_pergolavziip.is_width_above_max_size()
    is_height_below_min_size = datasheet_pergolavziip.is_height_below_min_size()
    is_height_above_max_size = datasheet_pergolavziip.is_height_above_max_size()

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
    taviranyito_kedvezmenyes_ar_item1 = 100 # statikus

    reszosszeg_item1 = sum([kedvezmenyes_ar_item1, taviranyito_kedvezmenyes_ar_item1])
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

    ######################################################################################################################
    # # # # # # # # # # # # # # # # # # # # # # # # # # #   ITEM 2   # # # # # # # # # # # # # # # # # # # # # # # # # # #
    # HYDRA
    # projection_item2 = 500 #adatbázisból lekérdezés alapján megkapott adatok
    # width_item2 = 500 #adatbázisból lekérdezés alapján megkapott adatok
    # height_item2 = 300 #adatbázisból lekérdezés alapján megkapott adatok
    # kedvezmenyes_ar_item2 = 6000 #adatbázisból lekérdezés alapján megkapott adatok
    # modulok_szama_item2 = 1 # ? ez kiszamitos
    # labak_szama_item2 = modulok_szama_item2 + 1 

    datasheet_hydra = Hydra(projection, width, height)
    if datasheet_hydra.is_projection_above_max_size() or datasheet_hydra.is_projection_below_min_size():
        projection_item2 = datasheet_hydra.get_item_projection()
    else:
        projection_item2 = projection
    
    if datasheet_hydra.is_width_above_max_size() or datasheet_hydra.is_width_below_min_size():
        width_item2 = datasheet_hydra.get_item_width()
    else:
        width_item2 = width
    
    height_item2 = datasheet_hydra.get_item_height()

    if datasheet_hydra.get_modul_num() == 1:
        kedvezmenyes_ar_item2 = arkepzok.HYDRA(datasheet_hydra.get_item_price())
    elif datasheet_hydra.get_modul_num() == 2:
        kedvezmenyes_ar_item2 = arkepzok.HYDRA(datasheet_hydra.get_item_price()) + 525

    # print(f"PRICE FETCH: kedvezmenyes_ar_item2 fetched: {kedvezmenyes_ar_item2} | Original: {6000}")
    modulok_szama_item2 = datasheet_hydra.get_modul_num()
    labak_szama_item2 = datasheet_hydra.get_legs_num()

############################################################  DATASHEET READ END ############################################################

    is_projection_below_min_size = datasheet_hydra.is_projection_below_min_size()
    is_projection_above_max_size = datasheet_hydra.is_projection_above_max_size()
    is_width_below_min_size = datasheet_hydra.is_width_below_min_size()
    is_width_above_max_size = datasheet_hydra.is_width_above_max_size()
    is_height_below_min_size = datasheet_hydra.is_height_below_min_size()
    is_height_above_max_size = datasheet_hydra.is_height_above_max_size()

    is_warning_neccessary = False
    if is_projection_below_min_size or is_width_below_min_size or is_height_below_min_size:
        min_max_item2 = "minimum"
        is_warning_neccessary = True
    if is_projection_above_max_size or is_width_above_max_size or is_height_above_max_size:
        min_max_item2 = "maximum"
        is_warning_neccessary = True
    
    if is_warning_neccessary:
        warning_msg_size_not_found_item2 = f"FONTOS: Nincsen a megadott méretben ({projection} * {width} * {height}), csak {min_max_item2} {projection_item2} * {width_item2} * {height_item2}. Az ajánlatban ezzel a mérettel kalkuláltam. Ha mindenképpen az eredeti méret ({projection} * {width} * {height}) érdekli, kérem vegye fel velem a kapcsolatot."
    else:
        warning_msg_size_not_found_item2 = ""

    lista_ar_item2 = arkepzok.LISTA_AR(kedvezmenyes_ar_item2)
    motor_kedvezmenyes_ar_item2 = 600 * modulok_szama_item2 # statikus
    motor_lista_ar_ar_item2 = arkepzok.LISTA_AR(motor_kedvezmenyes_ar_item2)
    taviranyito_kedvezmenyes_ar_item2 = 100 # statikus
    
    reszosszeg_item2 = sum([kedvezmenyes_ar_item2, motor_kedvezmenyes_ar_item2, taviranyito_kedvezmenyes_ar_item2])
    if reszosszeg_item2 < 5000:
        szereles_ar_item2 = int(reszosszeg_item2 * 0.13)
    elif (reszosszeg_item2 >= 5000 and reszosszeg_item2 < 7500):
        szereles_ar_item2 = int(reszosszeg_item2 * 0.12)
    elif reszosszeg_item2 >= 7500:
        szereles_ar_item2 = int(reszosszeg_item2 * 0.10)
    else:
        raise Exception("elágazás logika hiba a szereles_ar_item2 számításakor")

    osszesen_ar_item2 = sum([reszosszeg_item2, szereles_ar_item2])
    alapszerkezet_szerelessel_eur_item2 = currency_format(osszesen_ar_item2)
    alapszerkezet_szerelessel_huf_item2 = currency_format(round(osszesen_ar_item2 * eur_huf_arfolyam, -3))

    if modulok_szama_item2 == 1:
        if projection_item2 < 500:
            opcio_led_vilagitas_kedvezmenyes_ar_item2 = 400
        elif projection_item2 >= 500:
            opcio_led_vilagitas_kedvezmenyes_ar_item2 = 500
    elif modulok_szama_item2 == 2:
        if projection_item2 < 950:
            opcio_led_vilagitas_kedvezmenyes_ar_item2 = 600
        elif projection_item2 >= 950:
            opcio_led_vilagitas_kedvezmenyes_ar_item2 = 700
    else:
        raise Exception(f"elágazás logika hiba a opcio_led_vilagitas_kedvezmenyes_ar_item2 számításakor. 2 modulnál többet nem kezel a rendszer, jelenlegi modulok száma: {modulok_szama_item2}")

    opcio_led_vilagitas_lista_ar_item2 = arkepzok.LISTA_AR(opcio_led_vilagitas_kedvezmenyes_ar_item2)

    opcio_led_vilagitas_eur_item2 = currency_format(opcio_led_vilagitas_kedvezmenyes_ar_item2)
    opcio_led_vilagitas_huf_item2 = currency_format(round(opcio_led_vilagitas_kedvezmenyes_ar_item2 * eur_huf_arfolyam, -3))


    ######################################################################################################################
    # # # # # # # # # # # # # # # # # # # # # # # # # # #   ITEM 3   # # # # # # # # # # # # # # # # # # # # # # # # # # #
    # GENNIUS A100 LUX
    # projection_item3 = 500 #adatbázisból lekérdezés alapján megkapott adatok
    # width_item3 = 500 #adatbázisból lekérdezés alapján megkapott adatok
    # height_item3 = 300 #adatbázisból lekérdezés alapján megkapott adatok
    # kedvezmenyes_ar_item3 = 6666 #adatbázisból lekérdezés alapján megkapott adatok
    # modulok_szama_item3 = 1 # ? ez kiszamitos
    # labak_szama_item3 = modulok_szama_item3 + 1


    datasheet_a100lux = A100Lux(projection, width, height)
    if datasheet_a100lux.is_projection_above_max_size() or datasheet_a100lux.is_projection_below_min_size():
        projection_item3 = datasheet_a100lux.get_item_projection()
    else:
        projection_item3 = projection
    
    if datasheet_a100lux.is_width_above_max_size() or datasheet_a100lux.is_width_below_min_size():
        width_item3 = datasheet_a100lux.get_item_width()
    else:
        width_item3 = width
    
    height_item3 = datasheet_a100lux.get_item_height()

    if datasheet_a100lux.get_modul_num() == 1:
        kedvezmenyes_ar_item3 = arkepzok.A100LUX(datasheet_a100lux.get_item_price() + datasheet_a100lux.get_eloteto_ar()) # 1 modul
    elif datasheet_a100lux.get_modul_num() == 2:
        kedvezmenyes_ar_item3 = arkepzok.A100LUX(datasheet_a100lux.get_item_price() + datasheet_a100lux.get_eloteto_ar()) + 1400 # 2 modul
    elif datasheet_a100lux.get_modul_num() == 3:
        kedvezmenyes_ar_item3 = arkepzok.A100LUX(datasheet_a100lux.get_item_price() + datasheet_a100lux.get_eloteto_ar()) + 2400 # 3 modul
        
    # print(f"PRICE FETCH: kedvezmenyes_ar_item3 fetched: {kedvezmenyes_ar_item3} | Original: {6666}")
    modulok_szama_item3 = datasheet_a100lux.get_modul_num()
    labak_szama_item3 = datasheet_a100lux.get_legs_num()

############################################################  DATASHEET READ END ############################################################

    is_projection_below_min_size = datasheet_a100lux.is_projection_below_min_size()
    is_projection_above_max_size = datasheet_a100lux.is_projection_above_max_size()
    is_width_below_min_size = datasheet_a100lux.is_width_below_min_size()
    is_width_above_max_size = datasheet_a100lux.is_width_above_max_size()
    is_height_below_min_size = datasheet_a100lux.is_height_below_min_size()
    is_height_above_max_size = datasheet_a100lux.is_height_above_max_size()

    is_warning_neccessary = False
    if is_projection_below_min_size or is_width_below_min_size or is_height_below_min_size:
        min_max_item3 = "minimum"
        is_warning_neccessary = True
    if is_projection_above_max_size or is_width_above_max_size or is_height_above_max_size:
        min_max_item3 = "maximum"
        is_warning_neccessary = True
    
    if is_warning_neccessary:
        warning_msg_size_not_found_item3 = f"FONTOS: Nincsen a megadott méretben ({projection} * {width} * {height}), csak {min_max_item3} {projection_item3} * {width_item3} * {height_item3}. Az ajánlatban ezzel a mérettel kalkuláltam. Ha mindenképpen az eredeti méret ({projection} * {width} * {height}) érdekli, kérem vegye fel velem a kapcsolatot."
    else:
        warning_msg_size_not_found_item3 = ""

    lista_ar_item3 = arkepzok.LISTA_AR(kedvezmenyes_ar_item3)
    motor_kedvezmenyes_ar_item3 = 800 + (modulok_szama_item3-1) * 100 # statikus
    motor_lista_ar_ar_item3 = arkepzok.LISTA_AR(motor_kedvezmenyes_ar_item3)
    taviranyito_kedvezmenyes_ar_item3 = 100 # statikus

    reszosszeg_item3 = sum([kedvezmenyes_ar_item3, motor_kedvezmenyes_ar_item3, taviranyito_kedvezmenyes_ar_item3])
    if reszosszeg_item3 < 5000:
        szereles_ar_item3 = int(reszosszeg_item3 * 0.13)
    elif (reszosszeg_item3 >= 5000 and reszosszeg_item3 < 7500):
        szereles_ar_item3 = int(reszosszeg_item3 * 0.12)
    elif reszosszeg_item3 >= 7500:
        szereles_ar_item3 = int(reszosszeg_item3 * 0.10)
    else:
        raise Exception("elágazás logika hiba a szereles_ar_item3 számításakor")

    osszesen_ar_item3 = sum([reszosszeg_item3, szereles_ar_item3])
    alapszerkezet_szerelessel_eur_item3 = currency_format(osszesen_ar_item3)
    alapszerkezet_szerelessel_huf_item3 = currency_format(round(osszesen_ar_item3 * eur_huf_arfolyam, -3))
    opcio_led_vilagitas_kedvezmenyes_ar_item3 = 400 # statikus
    opcio_led_vilagitas_eur_item3 = currency_format(opcio_led_vilagitas_kedvezmenyes_ar_item3)
    opcio_led_vilagitas_huf_item3 = currency_format(round(opcio_led_vilagitas_kedvezmenyes_ar_item3 * eur_huf_arfolyam, -3))

    #####################################################################################################################
    # # # # # # # # # # # # # # # # # # # # # # # # # #   VARIABLES   # # # # # # # # # # # # # # # # # # # # # # # # # #
    html_variables = {
        "name": name,
        "projection": projection,
        "width": width,
        "height": height,
        "opcionalisan_feltuntetni": opcionalisan_feltuntetni,
        "eur_huf_arfolyam": eur_huf_arfolyam,

        # ITEM 1
        "projection_item1": projection_item1,
        "width_item1": width_item1,
        "height_item1": height_item1,
        "modulok_szama_item1": modulok_szama_item1,
        "labak_szama_item1": labak_szama_item1,
        "warning_msg_size_not_found_item1": warning_msg_size_not_found_item1,
        'kedvezmenyes_ar_item1': kedvezmenyes_ar_item1,
        'lista_ar_item1': lista_ar_item1,
        "szereles_ar_item1": szereles_ar_item1,
        "osszesen_ar_item1": osszesen_ar_item1,
        "alapszerkezet_szerelessel_eur_item1": alapszerkezet_szerelessel_eur_item1,
        "alapszerkezet_szerelessel_huf_item1": alapszerkezet_szerelessel_huf_item1,

        # ITEM 2
        "projection_item2": projection_item2,
        "width_item2": width_item2,
        "height_item2": height_item2,
        "modulok_szama_item2": modulok_szama_item2,
        "labak_szama_item2": labak_szama_item2,
        "warning_msg_size_not_found_item2": warning_msg_size_not_found_item2,
        'kedvezmenyes_ar_item2': kedvezmenyes_ar_item2,
        'lista_ar_item2': lista_ar_item2,
        "szereles_ar_item2": szereles_ar_item2,
        "motor_lista_ar_ar_item2": motor_lista_ar_ar_item2,
        "motor_kedvezmenyes_ar_item2": motor_kedvezmenyes_ar_item2,
        "osszesen_ar_item2": osszesen_ar_item2,
        "alapszerkezet_szerelessel_eur_item2": alapszerkezet_szerelessel_eur_item2,
        "alapszerkezet_szerelessel_huf_item2": alapszerkezet_szerelessel_huf_item2,
        "opcio_led_vilagitas_kedvezmenyes_ar_item2": opcio_led_vilagitas_kedvezmenyes_ar_item2, 
        "opcio_led_vilagitas_lista_ar_item2": opcio_led_vilagitas_lista_ar_item2,
        "opcio_led_vilagitas_eur_item2": opcio_led_vilagitas_eur_item2,
        "opcio_led_vilagitas_huf_item2": opcio_led_vilagitas_huf_item2,
        
        # ITEM 3
        "projection_item3": projection_item3,
        "width_item3": width_item3,
        "height_item3": height_item3,
        "modulok_szama_item3": modulok_szama_item3,
        "labak_szama_item3": labak_szama_item3,
        "warning_msg_size_not_found_item3": warning_msg_size_not_found_item3,
        'kedvezmenyes_ar_item3': kedvezmenyes_ar_item3,
        'lista_ar_item3': lista_ar_item3,
        "szereles_ar_item3": szereles_ar_item3,
        "motor_lista_ar_ar_item3": motor_lista_ar_ar_item3,
        "motor_kedvezmenyes_ar_item3": motor_kedvezmenyes_ar_item3,
        "osszesen_ar_item3": osszesen_ar_item3,
        "alapszerkezet_szerelessel_eur_item3": alapszerkezet_szerelessel_eur_item3,
        "alapszerkezet_szerelessel_huf_item3": alapszerkezet_szerelessel_huf_item3,
        "opcio_led_vilagitas_kedvezmenyes_ar_item3": opcio_led_vilagitas_kedvezmenyes_ar_item3, 
        "opcio_led_vilagitas_eur_item3": opcio_led_vilagitas_eur_item3,
        "opcio_led_vilagitas_huf_item3": opcio_led_vilagitas_huf_item3,
        
        "szallitasi_dij": currency_format(szallitasi_dij),
        "telepules": telepules,
    }

    Renderer().render_template(form_data, html_variables)





