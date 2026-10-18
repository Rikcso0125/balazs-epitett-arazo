import pandas as pd

from backend.utils import BeepitesTipus

#######################################################################################################################
#######################################################################################################################

class SB400:
    def __init__(self, beepites_tipusa: BeepitesTipus, projection: int, width: int):
        self.projection = projection
        self.width = width
        
        item_projections = [150, 200, 250, 300, 350, 400]
        item_widths = [340, 360, 380, 400, 420, 440, 460, 480, 500, 520, 540, 560, 580, 600, 620, 640, 660, 680, 700]

        self.item_widths = item_projections
        self.item_projections = item_widths

        # SB 400 - 4db lábon álló- Free standing
        data_free_standing = {
                 # 150,  200,  250,  300,  350,  400
            340: [5221, 5637, 6053, 6469, 6885, 7300],
            360: [5376, 5811, 6248, 6685, 7120, 7557],
            380: [5528, 5986, 6443, 6901, 7358, 7814],
            400: [5684, 6162, 6638, 7116, 7595, 8073],
            420: [5838, 6337, 6833, 7332, 7831, 8330],
            440: [5991, 6513, 7030, 7548, 8068, 8587],
            460: [6145, 6688, 7225, 7765, 8304, 8844],
            480: [6299, 6863, 7420, 7981, 8542, 9101],
            500: [6454, 7039, 7615, 8197, 8778, 9360],
            520: [7039, 7644, 8248, 8853, 9458, 10061],
            540: [7193, 7819, 8443, 9069, 9695, 10320],
            560: [7347, 7993, 8640, 9287, 9933, 10578],
            580: [7501, 8168, 8837, 9503, 10170, 10837],
            600: [7654, 8342, 9033, 9721, 10408, 11096],
            620: [7808, 8518, 9230, 9937, 10645, 11354],
            640: [7963, 8691, 9425, 10154, 10884, 11613],
            660: [8117, 8867, 9621, 10371, 11121, 11870],
            680: [8270, 9041, 9818, 10587, 11359, 12128],
            700: [8424, 9215, 10014, 10805, 11596, 12387],
        }
        df_free_standing = pd.DataFrame(data_free_standing, index=self.item_widths, columns=self.item_projections)

        # SB 400 - 2db lábon álló- Wall mounted
        data_wall_mounted = {
                 # 150,  200,  250,  300,  350,  400
            340: [5041, 5457, 5873, 6289, 6705, 7120],
            360: [5196, 5631, 6068, 6505, 6940, 7377],
            380: [5348, 5806, 6263, 6721, 7178, 7634],
            400: [5504, 5982, 6458, 6936, 7415, 7893],
            420: [5658, 6157, 6653, 7152, 7651, 8150],
            440: [5811, 6333, 6850, 7368, 7888, 8407],
            460: [5965, 6508, 7045, 7585, 8124, 8664],
            480: [6119, 6683, 7240, 7801, 8362, 8921],
            500: [6274, 6859, 7435, 8017, 8598, 9180],
            520: [6859, 7464, 8068, 8673, 9278, 9881],
            540: [7013, 7639, 8263, 8889, 9515, 10140],
            560: [7167, 7813, 8460, 9107, 9753, 10398],
            580: [7321, 7988, 8657, 9323, 9990, 10657],
            600: [7474, 8162, 8853, 9541, 10228, 10916],
            620: [7628, 8338, 9050, 9757, 10465, 11174],
            640: [7783, 8511, 9245, 9974, 10704, 11433],
            660: [7937, 8687, 9441, 10191, 10941, 11690],
            680: [8090, 8861, 9638, 10407, 11179, 11948],
            700: [8244, 9035, 9834, 10625, 11416, 12207],
        }
        df_wall_mounted = pd.DataFrame(data_wall_mounted, index=self.item_widths, columns=self.item_projections)
        
        if beepites_tipusa == BeepitesTipus.EpulethezRogzitett:
            self.df = df_wall_mounted
        elif beepites_tipusa == BeepitesTipus.SzabadonAllo:
            self.df = df_free_standing
    
        
    def get_item_projection(self):
        """
        Select the nearest available projection based on rounding rules:
        If below min, use min; if above max, use max; otherwise nearest.
        """
        if self.projection <= self.item_projections[0]:
            return self.item_projections[0]
        if self.projection >= self.item_projections[-1]:
            return self.item_projections[-1]
        return min(self.item_projections, key=lambda x: abs(x-1 - self.projection))

    
    def get_item_width(self):
        """
        Select the smallest width that fits the given input.
        If input <= a width, return that width; if above all, return max.
        """
        for width in self.item_widths:
            if self.width <= width:
                return width
        return self.item_widths[-1]
    
    
    def get_item_price(self):
        """
        Return the price for the projection and width.
        """
        proj = self.get_item_projection()
        wid = self.get_item_width()
        return self.df.at[wid, proj]
    

    def is_projection_above_max_size(self):
        return max(self.item_projections) < self.projection
    
    def is_projection_below_min_size(self):
        return min(self.item_projections) > self.projection
    
    def is_projection_rounded(self):
        return self.get_item_projection() != self.projection
    

    def is_width_above_max_size(self):
        return max(self.item_widths) < self.width
    
    def is_width_below_min_size(self):
        return min(self.item_widths) > self.width
    
    def is_width_rounded(self):
        return self.get_item_width() != self.width
        
    
    def get_zip_price(self, net_width, net_height):
         return OldalfalZaras_Refleksol_120_ZIP().get_zip_price(net_width, net_height)
    
    def get_uvegfalrendszer_price(self, net_width, net_height):
         return OldalfalZaras_uvegfalrendszer().get_uvegfalrendszer_price(net_width, net_height)
    
    def get_spot_vilagitas_darabszam(self):
        proj = self.get_item_projection()
        wid = self.get_item_width()
        return LedSpotVilagitas().get_darabszam(proj, wid)
    
    def get_spot_vilagitas_price(self):
        proj = self.get_item_projection()
        wid = self.get_item_width()
        return LedSpotVilagitas().get_price(proj, wid)


    

#######################################################################################################################
#######################################################################################################################

class SeeSkyBio:
    def __init__(self, beepites_tipusa: BeepitesTipus, projection: int, width: int):
        self.beepites_tipusa = beepites_tipusa
        self.projection = projection
        self.width = width

        self.item_widths = range(150, 471, 1)
        self.item_projections = range(140, 641, 20)
    
    
    def get_item_width(self):
        """
        Select the smallest width that fits the given input.
        If input <= a width, return that width; if above all, return max.
        """
        for width in self.item_widths:
            if self.width <= width:
                return width
        return self.item_widths[-1]
    

    # def get_item_projection(self):
    #     return self.projection
    
    def get_item_projection(self):
        """
        Select the nearest available projection based on rounding rules:
        If below min, use min; if above max, use max; otherwise nearest.
        """
        if self.projection <= self.item_projections[0]:
            return self.item_projections[0]
        if self.projection >= self.item_projections[-1]:
            return self.item_projections[-1]
        return min(self.item_projections, key=lambda x: abs(x-1 - self.projection))

    def get_item_price(self):
        """
        Return the price for the projection and width.
        """
        projection = self.get_item_projection()
        width = self.get_item_width()

        m2 = (projection / 100) * (width / 100)

        if self.beepites_tipusa == BeepitesTipus.SzabadonAllo: # SEESKY BIO - 4db lábbal
            if m2 <= 13:  # Euro/m2 - 13m2 alatt	800
                return m2 * 800
            elif m2 <= 16: # Euro/m2 - 16m2 alatt	695
                return m2 * 695
            else:         # Euro/m2 - 16m2 felett	631
                return m2 * 631
            
        elif self.beepites_tipusa == BeepitesTipus.EpulethezRogzitett: # SEESKY BIO - elől 2db lábbal
            if m2 <= 13:  # Euro/m2 - 13m2 alatt	761
                return m2 * 761
            elif m2 <= 16: # Euro/m2 - 16m2 alatt	659
                return m2 * 659
            else:         # Euro/m2 - 16m2 felett	610
                return m2 * 610
            
    
    def is_projection_above_max_size(self):
        return max(self.item_projections) < self.projection
    
    def is_projection_below_min_size(self):
        return min(self.item_projections) > self.projection
    
    def is_projection_rounded(self):
        return self.get_item_projection() != self.projection
    

    def is_width_above_max_size(self):
        return max(self.item_widths) < self.width
    
    def is_width_below_min_size(self):
        return min(self.item_widths) > self.width
    
    def is_width_rounded(self):
        return self.get_item_width() != self.width
            
    
    def get_zip_price(self, net_width, net_height):
         return OldalfalZaras_Refleksol_120_ZIP().get_zip_price(net_width, net_height)
    
    def get_uvegfalrendszer_price(self, net_width, net_height):
         return OldalfalZaras_uvegfalrendszer().get_uvegfalrendszer_price(net_width, net_height)
    

#######################################################################################################################
#######################################################################################################################

class KedrySkylife:
    def __init__(self, beepites_tipusa: BeepitesTipus, projection: int, width: int):
        self.projection = projection
        self.width = width
        
        item_projections = [200, 225, 250, 275, 300, 325, 350, 375, 400, 425, 450]
        item_widths = [211, 231, 251, 271, 291, 311, 331, 351, 371, 391, 411, 431, 451, 471, 491, 511, 531, 551, 571, 591, 611]

        self.item_widths = item_projections
        self.item_projections = item_widths
        # self.item_widths = item_widths ##################### ez igy nem számítható
        # self.item_projections = item_projections

        # Kedry Skylife - 4 db lábon álló - Free standing
        data_free_standing = {
                 #  200,   225,   250,   275,   300,   325,   350,   375,   400,   425,   450
            211: [12758, 13630, 13893, 14030, 14293, 14329, 14881, 15593, 15597, 16628, 17151],
            231: [13067, 13984, 14249, 14425, 14691, 14769, 15322, 16126, 16128, 17158, 17685],
            251: [13563, 14526, 14790, 15010, 15276, 15395, 15950, 16841, 16844, 17873, 18401],
            271: [13873, 14879, 15146, 15409, 15675, 15837, 16390, 17371, 17376, 18404, 18931],
            291: [14108, 15160, 15424, 15730, 15996, 16202, 16754, 17825, 17830, 18861, 19387],
            311: [14603, 15698, 15963, 16314, 16580, 16828, 17382, 18544, 18547, 19576, 20104],
            331: [14930, 16070, 16337, 16728, 16994, 17286, 17841, 19089, 19094, 20125, 20654],
            351: [15714, 16899, 17165, 17600, 17868, 18200, 18754, 20093, 20099, 21130, 21659],
            371: [16014, 17245, 17511, 17986, 18255, 18630, 19186, 20615, 20619, 21649, 22178],
            391: [16247, 17522, 17789, 18310, 18576, 18994, 19551, 21068, 21074, 22105, 22634],
            411: [16481, 17800, 18070, 18632, 18899, 19360, 19915, 21523, 21528, 22561, 23089],
            431: [16866, 18232, 18500, 19103, 19374, 19875, 20432, 22128, 22134, 23166, 23696],
            451: [17622, 19032, 19301, 19948, 20217, 20765, 21318, 23106, 23112, 24147, 24675],
            471: [17859, 19313, 19581, 20270, 20541, 21129, 21685, 23561, 23567, 24601, 25132],
            491: [18092, 19592, 19861, 20593, 20862, 21495, 22051, 24015, 24022, 25057, 25589],
            511: [18327, 19869, 20138, 20916, 21185, 21860, 22417, 24471, 24478, 25512, 26042],
            531: [18709, 20299, 20569, 21387, 21658, 22374, 22933, 25075, 25083, 26118, 26649],
            551: [19467, 21101, 21371, 22232, 22502, 23264, 23821, 26052, 26061, 27095, 27627],
            571: [19703, 21380, 21649, 22554, 22825, 23627, 24186, 26507, 26515, 27552, 28083],
            591: [19937, 21661, 21931, 22877, 23146, 23994, 24551, 26961, 26973, 28009, 28539],
            611: [20172, 21937, 22210, 23199, 23470, 24359, 24917, 27417, 27427, 28462, 28995],
        }
        df_free_standing = pd.DataFrame(data_free_standing, index=self.item_widths, columns=self.item_projections)

        # Kedry Skylife - 2 db lábon álló - Wall mounted
        data_wall_mounted = {
                  # 200, 225, 250, 275, 300, 325, 350, 375, 400, 425, 450
            211: [11071, 11943, 12206, 12343, 12606, 12642, 13194, 13906, 13910, 14941, 15464],
            231: [11380, 12297, 12562, 12738, 13004, 13082, 13635, 14439, 14441, 15471, 15998],
            251: [11876, 12839, 13103, 13323, 13589, 13708, 14263, 15154, 15157, 16186, 16714],
            271: [12186, 13192, 13459, 13722, 13988, 14150, 14703, 15684, 15689, 16717, 17244],
            291: [12421, 13473, 13737, 14043, 14309, 14515, 15067, 16138, 16143, 17174, 17700],
            311: [12916, 14011, 14276, 14627, 14893, 15141, 15695, 16857, 16860, 17889, 18417],
            331: [13243, 14383, 14650, 15041, 15307, 15599, 16154, 17402, 17407, 18438, 18967],
            351: [14027, 15212, 15478, 15913, 16181, 16513, 17067, 18406, 18412, 19443, 19972],
            371: [14327, 15558, 15824, 16299, 16568, 16943, 17499, 18928, 18932, 19962, 20491],
            391: [14560, 15835, 16102, 16623, 16889, 17307, 17864, 19381, 19387, 20418, 20947],
            411: [14794, 16113, 16383, 16945, 17212, 17673, 18228, 19836, 19841, 20874, 21402],
            431: [15179, 16545, 16813, 17416, 17687, 18188, 18745, 20441, 20447, 21479, 22009],
            451: [15935, 17345, 17614, 18261, 18530, 19078, 19631, 21419, 21425, 22460, 22988],
            471: [16172, 17626, 17894, 18583, 18854, 19442, 19998, 21874, 21880, 22914, 23445],
            491: [16405, 17905, 18174, 18906, 19175, 19808, 20364, 22328, 22335, 23370, 23902],
            511: [16640, 18182, 18451, 19229, 19498, 20173, 20730, 22784, 22791, 23825, 24355],
            531: [17022, 18612, 18882, 19700, 19971, 20687, 21246, 23388, 23396, 24431, 24962],
            551: [17780, 19414, 19684, 20545, 20815, 21577, 22134, 24365, 24374, 25408, 25940],
            571: [18016, 19693, 19962, 20867, 21138, 21940, 22499, 24820, 24828, 25865, 26396],
            591: [18250, 19974, 20244, 21190, 21459, 22307, 22864, 25274, 25286, 26322, 26852],
            611: [18485, 20250, 20523, 21512, 21783, 22672, 23230, 25730, 25740, 26775, 27308],
        }
        df_wall_mounted = pd.DataFrame(data_wall_mounted, index=self.item_widths, columns=self.item_projections)
        
        if beepites_tipusa == BeepitesTipus.EpulethezRogzitett:
            self.df = df_wall_mounted
        elif beepites_tipusa == BeepitesTipus.SzabadonAllo:
            self.df = df_free_standing
    
        
    def get_item_projection(self):
        """
        Select the nearest available projection based on rounding rules:
        If below min, use min; if above max, use max; otherwise nearest.
        """
        if self.projection <= self.item_projections[0]:
            return self.item_projections[0]
        if self.projection >= self.item_projections[-1]:
            return self.item_projections[-1]
        return min(self.item_projections, key=lambda x: abs(x-1 - self.projection))

    
    def get_item_width(self):
        """
        Select the smallest width that fits the given input.
        If input <= a width, return that width; if above all, return max.
        """
        for width in self.item_widths:
            if self.width <= width:
                return width
        return self.item_widths[-1]
    
    
    def get_item_price(self):
        """
        Return the price for the projection and width.
        """
        proj = self.get_item_projection()
        wid = self.get_item_width()
        return self.df.at[wid, proj]
    

    def is_projection_above_max_size(self):
        return max(self.item_projections) < self.projection
    
    def is_projection_below_min_size(self):
        return min(self.item_projections) > self.projection
    
    def is_projection_rounded(self):
        return self.get_item_projection() != self.projection
    

    def is_width_above_max_size(self):
        return max(self.item_widths) < self.width
    
    def is_width_below_min_size(self):
        return min(self.item_widths) > self.width
    
    def is_width_rounded(self):
        return self.get_item_width() != self.width
    
    
    def get_zip_price(self, net_width, net_height):
         return OldalfalZaras_Vertica_PRIME_ZIP().get_zip_price(net_width, net_height)
    
    def get_uvegfalrendszer_price(self, net_width, net_height):
         return OldalfalZaras_uvegfalrendszer().get_uvegfalrendszer_price(net_width, net_height)


#######################################################################################################################
#######################################################################################################################

class OldalfalZaras_Refleksol_120_ZIP: # SOLARE 400 és SeeSky Bio külön szerelt árnyékolói
    def __init__(self):
        self.zip_heights = [100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400]
        self.zip_widths = [100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400, 425, 450, 475, 500, 525, 550, 575, 600, 625, 650, 675, 700]

        #  SOLARE 400 és SeeSky Bio külön szerelt árnyékolói - Refleksol 120 ZIP
        data_zip_arnyekolo = {
            # 100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400, 425, 450, 475, 500, 525, 550, 575, 600, 625, 650, 675, 700,
        100: [329, 361, 395, 427, 459, 491, 524, 556, 588, 620, 653, 685, 717, 836, 872, 909, 945, 1308, 1362, 1415, 1470, 1524, 1578, 1631, 1685],
        125: [363, 397, 432, 467, 502, 536, 572, 606, 641, 676, 711, 745, 781, 905, 944, 984, 1023, 1375, 1431, 1487, 1543, 1599, 1655, 1711, 1767],
        150: [395, 432, 470, 508, 544, 582, 620, 657, 694, 732, 769, 807, 844, 975, 1017, 1060, 1102, 1441, 1500, 1558, 1616, 1674, 1733, 1791, 1849],
        175: [431, 471, 511, 551, 591, 631, 671, 711, 751, 791, 831, 871, 911, 1049, 1094, 1139, 1183, 1511, 1572, 1632, 1693, 1753, 1814, 1874, 1934],
        200: [464, 507, 549, 591, 635, 677, 719, 761, 804, 847, 889, 932, 974, 1118, 1166, 1213, 1261, 1580, 1642, 1705, 1768, 1831, 1894, 1956, 2019],
        225: [496, 542, 587, 632, 677, 723, 767, 813, 857, 903, 948, 992, 1038, 1188, 1237, 1287, 1336, 1646, 1711, 1776, 1841, 1906, 1971, 2036, 2101],
        250: [529, 577, 624, 672, 720, 768, 815, 863, 911, 958, 1006, 1054, 1102, 1257, 1310, 1363, 1415, 1713, 1780, 1847, 1914, 1981, 2049, 2115, 2183],
        275: [565, 615, 665, 716, 766, 816, 867, 917, 967, 1017, 1068, 1118, 1168, 1332, 1387, 1441, 1496, 1783, 1852, 1921, 1990, 2060, 2129, 2198, 2267],
        300: [598, 651, 704, 757, 809, 862, 915, 968, 1021, 1073, 1126, 1179, 1232, 1400, 1459, 1516, 1574, 1850, 1921, 1992, 2064, 2135, 2207, 2278, 2349],
        325: [631, 686, 742, 797, 853, 908, 964, 1019, 1073, 1129, 1184, 1240, 1295, 1470, 1530, 1590, 1649, 1916, 1990, 2063, 2137, 2210, 2284, 2357, 2431],
        350: [664, 721, 780, 838, 895, 953, 1012, 1069, 1127, 1185, 1243, 1301, 1359, 1539, 1603, 1666, 1728, 1985, 2060, 2136, 2212, 2288, 2364, 2440, 2516],
        375: [700, 760, 821, 881, 942, 1003, 1063, 1124, 1184, 1244, 1304, 1365, 1425, 1614, 1680, 1744, 1809, 2055, 2133, 2211, 2289, 2367, 2445, 2523, 2601],
        400: [733, 796, 859, 921, 984, 1048, 1111, 1174, 1237, 1300, 1364, 1427, 1489, 1682, 1752, 1819, 1887, 2121, 2202, 2282, 2362, 2442, 2522, 2602, 2683],
        }
        self.df_zip_arnyekolo = pd.DataFrame(data_zip_arnyekolo, index=self.zip_widths, columns=self.zip_heights)
    
    def get_zip_price(self, net_width, net_height):
        w = self.zip_widths[-1]
        for width in self.zip_widths:
            if net_width <= width:
                w = width
                break
        
        h = self.zip_heights[-1]
        for height in self.zip_heights:
            if net_height <= height:
                h = height
                break

        return self.df_zip_arnyekolo.at[w, h]
    

#######################################################################################################################
#######################################################################################################################

class OldalfalZaras_Vertica_PRIME_ZIP: # Kedry Skylife gerendába integrált árnyékolók katalógus
    def __init__(self):
        self.zip_heights = [140, 160, 180, 200, 220, 240, 260, 280, 300]
        self.zip_widths = [120, 200, 240, 300, 360, 400, 450, 500, 550, 600]

        # Kedry Skylife gerendába integrált árnyékolók katalógus - Vertica PRIME ZIP
        data_zip_arnyekolo = {
                 # 120,  200,  240,  300,  360,  400,  450,  500,  550,  600
            140: [1020, 1119, 1192, 1292, 1433, 1504, 1617, 1780, 1916, 1965],
            160: [1428, 1558, 1649, 1781, 1950, 2041, 2188, 2370, 2535, 2603],
            180: [1441, 1565, 1661, 1792, 1963, 2056, 2201, 2385, 2550, 2618],
            200: [1450, 1576, 1671, 1802, 1973, 2065, 2210, 2395, 2564, 2636],
            220: [1464, 1591, 1681, 1816, 1986, 2079, 2224, 2414, 2580, 2651],
            240: [1550, 1706, 1818, 1986, 2190, 2301, 2482, 2692, 2886, 2977],
            260: [1562, 1721, 1834, 1999, 2205, 2319, 2498, 2711, 2907, 2996],
            280: [1574, 1733, 1846, 2011, 2213, 2333, 2509, 2726, 2920, 3011],
            300: [1584, 1745, 1860, 2021, 2228, 2344, 2522, 2735, 2933, 3026],
        }
        self.df_zip_arnyekolo = pd.DataFrame(data_zip_arnyekolo, index=self.zip_widths, columns=self.zip_heights)
    
    def get_zip_price(self, net_width, net_height):
        w = self.zip_widths[-1]
        for width in self.zip_widths:
            if net_width <= width:
                w = width
                break
        
        h = self.zip_heights[-1]
        for height in self.zip_heights:
            if net_height <= height:
                h = height
                break

        return self.df_zip_arnyekolo.at[w, h]


#######################################################################################################################
#######################################################################################################################

class OldalfalZaras_uvegfalrendszer:
    def __init__(self):
        pass

    def get_uvegfalrendszer_price(self, net_width, net_height):      
        m2 = (net_width / 100) * (net_height / 100)
        if m2 <= 8.5:   # Euro/m2 - 8,5m2 alatt	257
            return m2 * 257
        elif m2 <=13.5: # Euro/m2 - 13,5m2 alatt 200
            return m2 * 210
        else:           # Euro/m2 - 13,5m2 felett 200
            return m2 * 200
        

class LedSpotVilagitas:
    def __init__(self):
        # Adattábla létrehozása DataFrame-ben
        self.df = pd.DataFrame([
            {"proj_min": 140, "proj_max": 359, "width_min": 140, "width_max": 274, "points": 4, "price": 619},
            {"proj_min": 140, "proj_max": 359, "width_min": 275, "width_max": 400, "points": 6, "price": 679},
            {"proj_min": 360, "proj_max": 539, "width_min": 140, "width_max": 274, "points": 6, "price": 679},
            {"proj_min": 360, "proj_max": 539, "width_min": 275, "width_max": 400, "points": 9, "price": 827},
            {"proj_min": 540, "proj_max": 700, "width_min": 140, "width_max": 274, "points": 8, "price": 767},
            {"proj_min": 540, "proj_max": 700, "width_min": 275, "width_max": 400, "points": 12, "price": 945}
        ])

    def _select(self, projection, width):
        """
        Belső segédfüggvény, amely kiválasztja a megfelelő sort.
        """
        match = self.df[
            (self.df["proj_min"] <= projection) & (projection <= self.df["proj_max"]) &
            (self.df["width_min"] <= width) & (width <= self.df["width_max"])
        ]
        if not match.empty:
            return match.iloc[0]
        else:
            return None  # vagy dobj hibát

    def get_darabszam(self, projection, width):
        row = self._select(projection, width)
        return row["points"] if row is not None else None

    def get_price(self, projection, width):
        row = self._select(projection, width)
        return row["price"] if row is not None else None


