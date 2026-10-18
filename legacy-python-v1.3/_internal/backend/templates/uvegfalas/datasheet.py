# import pandas as pd
# import numpy as np

#######################################################################################################################
#######################################################################################################################

class OldalfalZaras_uvegfalrendszer_lengyel:
    def __init__(self):
        pass

    def get_price(self, net_width, net_height):      
        m2 = (net_width / 100) * (net_height / 100)
        if m2 <= 8.5:   # Euro/m2 - 8,5m2 alatt	257
            return int(m2 * 257)
        elif m2 <=13.5: # Euro/m2 - 13,5m2 alatt 200
            return int(m2 * 210)
        else:           # Euro/m2 - 13,5m2 felett 200
            return int(m2 * 200)

#######################################################################################################################
#######################################################################################################################

class OldalfalZaras_uvegfalrendszer_spanyol:
    def __init__(self):
        pass

    def get_price(self, net_width, net_height):      
        m2 = (net_width / 100) * (net_height / 100)
        if m2 <= 8.5:   # Euro/m2 - 8,5m2 alatt	324
            return int(m2 * 324)
        elif m2 <=13.5: # Euro/m2 - 13,5m2 alatt 278
            return int(m2 * 278)
        else:           # Euro/m2 - 13,5m2 felett 268
            return int(m2 * 268)