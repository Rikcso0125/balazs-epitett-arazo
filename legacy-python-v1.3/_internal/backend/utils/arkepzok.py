import json
import os

class Arkepzok:
    def __init__(self):
        root_path = os.path.join('_internal',)
        self.arkepzok_config_file = os.path.join(root_path, "arkepzok.json")

        # Default values if file is missing or broken
        self.default_arkepzo_values = {
            "LISTA_AR_SZORZO": 1.25,
            "ARKEPZO_SB400": 0.61,
            "ARKEPZO_SESKY_BIO": 1.0,
            "ARKEPZO_KEDRY_SKYLIFE": 0.55,
            "ARKEPZO_REFLEKSOL_120_ZIP": 1.0, # SOLARE 400 és SeeSky Biohoz
            "ARKEPZO_VERTICA_PRIME_ZIP": 0.55, # Kedry Skylife
            "ARKEPZO_UVEGFAL_RENDSZER": 1.0,
            "ARKEPZO_PERGOLA_V_ZIIP": 0.5,
            "ARKEPZO_HYDRA": 0.55,
            "ARKEPZO_A100LUX": 0.55,
            "ARKEPZO_POLIFIX": 1.0,
            "ARKEPZO_VERANDA_TENS_UVEGTETOS": 0.5,
            "ARKEPZO_KEPLAN": 0.55,
            "ARKEPZO_ISOLA_2A": 0.55,
            "ARKEPZO_VERANDA_TENS_FESZITETT_VASZNAS_TETORE": 1.0,
            "ARKEPZO_VERANDA_V_ZIP": 0.5,
        }
        self.arkepzok = self._load()

    def LISTA_AR(self, price):
        arkepzo = self.arkepzok["LISTA_AR_SZORZO"]
        return int(price * arkepzo)
    
    def SB400(self, price): # =((B3*0.61)+2500)
        arkepzo = self.arkepzok["ARKEPZO_SB400"]
        return int(price * arkepzo + 2500)

    def SESKY_BIO(self, price): #=HA(B6<13,B7*B6,(HA(B6<16,B6*B8,B6*B9)))
        arkepzo = self.arkepzok["ARKEPZO_SESKY_BIO"]
        return int(price * arkepzo)

    def KEDRY_SKYLIFE(self, price): # =((B3*0.55)-(B3*0.55*0.1))+3500
        arkepzo = self.arkepzok["ARKEPZO_KEDRY_SKYLIFE"]
        return int((price * arkepzo) - (price * arkepzo * 0.1) + 3500)

    def REFLEKSOL_120_ZIP(self, price): # =(B4+250+120)
        arkepzo = self.arkepzok["ARKEPZO_REFLEKSOL_120_ZIP"]
        return int(price * arkepzo + 250 + 120)

    def VERTICA_PRIME_ZIP(self, price): # =((B17*0.55)-(B17*0.55*0.1))+1000
        arkepzo = self.arkepzok["ARKEPZO_VERTICA_PRIME_ZIP"]
        return int((price * arkepzo) - (price * arkepzo * 0.1) + 1000)
    
    def UVEGFAL_RENDSZER(self, price):
        arkepzo = self.arkepzok["ARKEPZO_UVEGFAL_RENDSZER"]
        return int(price * arkepzo)
    
    def PERGOLA_V_ZIIP(self, price): # =((B3*0,5)+2100) 
        arkepzo = self.arkepzok["ARKEPZO_PERGOLA_V_ZIIP"]
        return int(price * arkepzo + 2100)
    
    def HYDRA(self, price): # =((B4*0,55)-(B4*0,55*0,1))+370+1975
        arkepzo = self.arkepzok["ARKEPZO_HYDRA"]
        return int((price * arkepzo) - (price * arkepzo * 0.1) + 370 + 1975)
    
    def A100LUX(self, price): # =((B3*0,55)-(B3*0,55*0,1))+370+2100
        arkepzo = self.arkepzok["ARKEPZO_A100LUX"]
        return int((price * arkepzo) - (price * arkepzo * 0.1) + 370 + 2100)
    
    def POLIFIX(self, price):
        arkepzo = self.arkepzok["ARKEPZO_POLIFIX"]
        return int(price * arkepzo)
    
    def VERANDA_TENS_UVEGTETOS(self, price): # =(B4/2+250+200+100)+800
        arkepzo = self.arkepzok["ARKEPZO_VERANDA_TENS_UVEGTETOS"]
        return int((price * arkepzo + 100))
    
    def KEPLAN(self, price): # =((B3*0,55)+370+2100)
        arkepzo = self.arkepzok["ARKEPZO_KEPLAN"]
        return int((price * arkepzo) + 370 + 2100)
    
    def ISOLA_2A(self, price): # =((B4*0,55)-(B4*0,55*0,1))+370+2500
        arkepzo = self.arkepzok["ARKEPZO_ISOLA_2A"]
        return int((price * arkepzo) - (price * arkepzo * 0.1) + 370 + 2500)
    
    def VERANDA_TENS_FESZITETT_VASZNAS_TETORE(self, price):
        arkepzo = self.arkepzok["ARKEPZO_VERANDA_TENS_FESZITETT_VASZNAS_TETORE"]
        return int(price * arkepzo + 125)
    
    def VERANDA_V_ZIP(self, price): # =(G4/2)+125+1000
        arkepzo = self.arkepzok["ARKEPZO_VERANDA_V_ZIP"]
        return int(price * arkepzo + 125 + 1000)

    def _load(self):
        try:
            with open(self.arkepzok_config_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return self.default_arkepzo_values.copy()

    def _save(self, data):
        with open(self.arkepzok_config_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)

# def get_arkepzok():
#     arkepzok = Arkepzok()
#     data = arkepzok.load()

#     class Data:
#         def __init__(self, values: dict):
#             for key, value in values.items():
#                 setattr(self, key, value)

#     return Data(data)

# arkepzok = get_arkepzok()

# print(arkepzok.LISTA_AR_SZORZO)
    
