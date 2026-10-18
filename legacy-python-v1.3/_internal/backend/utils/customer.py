from backend.utils.pergola import TermekTipus
from backend.utils.pergola import BeepitesTipus

class FormData:
    def __init__(self,
            name : str = None,
            email : str = None,
            phone_number : str = None,
            telepules : str = None,
            szallitasi_dij : int = None,
            eur_huf_arfolyam : int = None,
            termek_tipusa : TermekTipus = None,
            beepites_tipusa : BeepitesTipus = None,
            projection : int = None,
            width : int = None,
            height : int = None,
            is_uvegfal_rendszer_enabled : bool = False,
            is_oldalso_arnyekolo_enabled : bool = False,
            is_oldalfal_zaras_nem_szükseges : bool = False,
            is_opcio_led_vilagitas_enabled : bool = False,
            is_opcio_erzekelo_szenzorok_enabled : bool = False,
            is_opcio_teraszfutes_enabled : bool = False,
            is_opcio_okos_otthon_enabled : bool = False):
        self.name = name
        self.email = email
        self.phone_number = phone_number
        self.telepules = telepules
        self.szallitasi_dij = szallitasi_dij
        self.eur_huf_arfolyam = eur_huf_arfolyam
        self.termek_tipusa = termek_tipusa
        self.beepites_tipusa = beepites_tipusa
        self.projection = projection
        self.width = width
        self.height = height
        self.is_uvegfal_rendszer_enabled = is_uvegfal_rendszer_enabled
        self.is_oldalso_arnyekolo_enabled = is_oldalso_arnyekolo_enabled
        self.is_oldalfal_zaras_nem_szükseges = is_oldalfal_zaras_nem_szükseges
        self.is_opcio_led_vilagitas_enabled = is_opcio_led_vilagitas_enabled
        self.is_opcio_erzekelo_szenzorok_enabled = is_opcio_erzekelo_szenzorok_enabled
        self.is_opcio_teraszfutes_enabled = is_opcio_teraszfutes_enabled
        self.is_opcio_okos_otthon_enabled = is_opcio_okos_otthon_enabled

    def to_string(self) -> str:
        text = f"""
Név: {self.name}
Email: {self.email}
Telefonszám: {self.phone_number}
Település: {self.telepules}
Szállítási dij: {self.szallitasi_dij} Ft
EUR/HUF árfolyam: {self.eur_huf_arfolyam} Ft

Kiválasztott termék: {self.termek_tipusa}
Beépítés típusa: {self.beepites_tipusa.value}

Méretek:
    Szélesség: {self.width} cm
    Mélység: {self.projection} cm
    Magasság: {self.height} cm

Opcionális kiegészítők:
    Üvegfal rendszer: {self.is_uvegfal_rendszer_enabled}
    Oldalsó árnyékoló: {self.is_oldalso_arnyekolo_enabled}
    Nem szükséges: {self.is_oldalfal_zaras_nem_szükseges}

Válaszható opciók:
    LED Világítás: {self.is_opcio_led_vilagitas_enabled}
    Érzékelők/Szenzorok: {self.is_opcio_erzekelo_szenzorok_enabled}
    Teraszfűtés: {self.is_opcio_teraszfutes_enabled}
    Okos otthon vezérlő: {self.is_opcio_okos_otthon_enabled}
"""
        return text
    