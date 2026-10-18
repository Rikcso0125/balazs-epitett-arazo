import pandas as pd
import numpy as np

#######################################################################################################################
#######################################################################################################################

class Glassfix:
    def __init__(self, projection: int, width: int, height: int):
        self.projection = projection
        self.width = width
        self.height = height

        self.item_widths = range(50, 401, 1)
        self.item_projections = range(100, 1801, 1)
        self.item_heights = range(min(int(np.ceil(width / 10)), 2000), 2001, 1) # net_width min constraint
    
    
    def get_item_width(self):
        if self.is_width_below_min_size():
            return self.item_widths[0]
        elif self.is_width_above_max_size():
            return self.item_widths[-1]
        else:
            return self.width
    
    def get_item_projection(self):
        if self.is_projection_below_min_size():
            return self.item_projections[0]
        elif self.is_projection_above_max_size():
            return self.item_projections[-1]
        else:
            return self.projection
        
    def get_item_height(self):
        if self.is_height_below_min_size():
            return self.item_heights[0]
        elif self.is_height_above_max_size():
            return self.item_heights[-1]
        else:
            return self.height
        

    def get_labak_szama(self):
        proj = self.get_item_projection()
        if proj <= 600:
           return 2
        elif proj <= 1200:
            return 3
        elif proj <= 1800:
            return 4
        else:
            raise Exception("HIBA AZ ELÁGAZÁSBAN, nem lehet nagyobb a projection mint 1800, ezt a datasheetben állítsd be")
    
    def get_m2(self):
        width = self.get_item_width()
        projection = self.get_item_projection()
        m2 = (projection / 100) * (width / 100)
        return m2
    
    def get_m2_price(self):
        m2 = self.get_m2()
        labak_szama = self.get_labak_szama()

        if labak_szama == 2:
            # Euro/m2 - 12m2 -ig	312,5
            # Euro/m2 - 18m2 -ig	273,5
            # Euro/m2 - 24m2 -ig	252,5
            if m2 <= 12:
                return 312.5
            elif m2 <= 18:
                return 273.5
            elif m2 <= 24:
                return 252.5
            else:
                raise Exception("HIBA AZ ELÁGAZÁSBAN")
        elif labak_szama == 3:
            # Euro/m2 - 24m2 -ig	312,5
            # Euro/m2 - 36m2 -ig	260,5
            # Euro/m2 - 48m2 -ig	231
            if m2 <= 24:
                return 312.5
            elif m2 <= 36:
                return 260.5
            elif m2 <= 48:
                return 231
            else:
                raise Exception("HIBA AZ ELÁGAZÁSBAN")
        elif labak_szama == 4:
            # Euro/m2 - 36m2 -ig	312,5
            # Euro/m2 - 54m2 -ig	260,5
            # Euro/m2 - 72m2 -ig	231
            if m2 <= 36:
                return 312.5
            elif m2 <= 54:
                return 260.5
            elif m2 <= 72:
                return 231
            else:
                raise Exception("HIBA AZ ELÁGAZÁSBAN")
        else:
            raise Exception("HIBA AZ ELÁGAZÁSBAN")

            
    def get_item_price(self):
        """
        Return the price for the projection and width.
        """
        m2 = self.get_m2()
        m2_price = self.get_m2_price()
        
        return int(m2 * m2_price)
    
    def get_szereles_ar(self):
        """
        24m2-ig: 800 eur\n
        36m2-ig: 1200 eur\n
        48m2-ig: 1500 eur\n
        72m2-ig: 2000 eur\n
        """
        m2 = self.get_m2()
        if m2 <= 24:
            return 800
        elif m2 <= 36:
            return 1200
        elif m2 <= 48:
            return 1500
        elif m2 <= 72:
            return 2000

    
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
    
    
    def is_height_above_max_size(self):
        return max(self.item_heights) < self.height
    
    def is_height_below_min_size(self):
        return min(self.item_heights) > self.height
    
    def is_height_rounded(self):
        return self.get_item_height() != self.height
            
    
    def get_zip_price(self, net_width, net_height):
         return OldalfalZaras_Refleksol_120_ZIP().get_zip_price(net_width, net_height)
    
    def get_uvegfalrendszer_price(self, net_width, net_height):
         return OldalfalZaras_uvegfalrendszer().get_uvegfalrendszer_price(net_width, net_height)
    
    def get_veranda_tens_price(self, projection, width):
        return VerandaTens().get_price(width, projection)
    
    def get_veranda_tens_modul_num(self, projection):
        return VerandaTens().get_modul_num(projection)
    

#######################################################################################################################
#######################################################################################################################

class OldalfalZaras_Refleksol_120_ZIP: # SOLARE 400 és SeeSky Bio külön szerelt árnyékolói
    def __init__(self):
        self.zip_heights = [100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400]
        self.zip_widths = [100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400, 425, 450, 475, 500, 525, 550, 575, 600, 625, 650, 675, 700]
        self.zip_width_max_modul_num = 999
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


    def get_modul_num(self, net_width):
        modules = int(np.ceil(net_width / max(self.zip_widths)))
        return max(1, min(modules, self.zip_width_max_modul_num))
    
    def get_zip_width(self, net_width):
        # w = self.zip_widths[-1]
        net_w = int(net_width / self.get_modul_num(net_width))
        for width in self.zip_widths:
            if net_w <= width:
                w = width
                break
        return w
    
    def get_zip_height(self, net_height):
        h = self.zip_heights[-1]
        found_valid_val = False
        for height in self.zip_heights:
            if net_height <= height:
                h = height
                found_valid_val = True
                break
        if not found_valid_val:
            print(f"FIGYELEM: a Refleksol 120 ZIP magasság mérete meghaladja a maximum {max(self.zip_heights)}cm értéket. Megadott méret: {net_height}cm.\n{h}cm mérettel lett számolva az ár!")
        return h

    def get_zip_price(self, net_width, net_height):
        w = self.get_zip_width(net_width)
        h = self.get_zip_height(net_height)

        return self.df_zip_arnyekolo.at[w, h] * self.get_modul_num(net_width)
    
#######################################################################################################################
#######################################################################################################################

class OldalfalZaras_uvegfalrendszer:
    def __init__(self):
        pass

    def get_uvegfalrendszer_price(self, net_width, net_height):      
        m2 = (net_width / 100) * (net_height / 100)
        if m2 <= 8.5:   # Euro/m2 - 8,5m2 alatt	257
            return int(m2 * 257)
        elif m2 <=13.5: # Euro/m2 - 13,5m2 alatt 200
            return int(m2 * 210)
        else:           # Euro/m2 - 13,5m2 felett 200
            return int(m2 * 200)

#######################################################################################################################
#######################################################################################################################

class VerandaTens:
    def __init__(self):
        projections = [150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400]
        widths = [125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400, 425, 450]
        self.projections = widths
        self.widths = projections
        self.projection_max_modul_num = float('inf')
        #  SOLARE 400 és SeeSky Bio külön szerelt árnyékolói - Refleksol 120 ZIP
        data = {
            # 125, 150, 175,  200,  225,  250,  275,  300,  325,  350,  375,  400,  425,  450
        150: [801, 880, 959, 1039, 1118, 1197, 1277, 1356, 1435, 1515, 1594, 1673, 1753, 1832],
        175: [840, 921, 1002, 1085, 1168, 1249, 1332, 1413, 1496, 1579, 1660, 1743, 1826, 1907],
        200: [866, 951, 1036, 1120, 1205, 1291, 1376, 1461, 1546, 1631, 1717, 1802, 1887, 1971],
        225: [894, 981, 1069, 1157, 1244, 1332, 1420, 1509, 1596, 1684, 1772, 1859, 1947, 2036],
        250: [921, 1011, 1101, 1192, 1283, 1373, 1465, 1555, 1646, 1737, 1828, 1918, 2008, 2100],
        275: [958, 1051, 1145, 1239, 1333, 1426, 1520, 1614, 1707, 1801, 1894, 1988, 2081, 2175],
        300: [985, 1081, 1178, 1274, 1371, 1467, 1564, 1660, 1757, 1853, 1950, 2046, 2143, 2239],
        325: [1012, 1111, 1210, 1311, 1410, 1509, 1609, 1708, 1807, 1906, 2006, 2105, 2204, 2303],
        350: [1043, 1144, 1245, 1346, 1448, 1550, 1653, 1754, 1857, 1958, 2061, 2164, 2265, 2368],
        375: [1043, 1144, 1245, 1393, 1497, 1603, 1708, 1813, 1918, 2022, 2127, 2233, 2338, 2443],
        400: [1043, 1144, 1245, 1428, 1536, 1644, 1752, 1859, 1968, 2076, 2184, 2292, 2399, 2507],
        }
        self.df_zip_arnyekolo = pd.DataFrame(data, index=widths, columns=projections)# .transpose()


    def get_modul_num(self, net_projection):
        modules = int(np.ceil(net_projection / max(self.projections)))
        return max(1, min(modules, self.projection_max_modul_num))

    def get_width(self, net_width):
        w = self.widths[-1]
        found_valid_val = False
        net_w = net_width
        for width in self.widths:
            if net_w <= width:
                w = width
                found_valid_val = True
                break
        if not found_valid_val:
            print(f"FIGYELEM: a VerandaTens kinyúlás mérete meghaladja a maximum {max(self.widths)}cm értéket. Megadott méret: {net_w}cm.\n{w}cm mérettel lett számolva az ár!")
        return w
    
    def get_projection(self, net_projection):
        # p = self.projections[-1]
        net_p = int(net_projection / self.get_modul_num(net_projection))
        for projection in self.projections:
            if net_p <= projection:
                p = projection
                break
        return p

    def get_price(self, net_width, net_projection):
        w = self.get_width(net_width)
        h = self.get_projection(net_projection)
        price = self.df_zip_arnyekolo.at[h, w] # * self.get_modul_num(net_width)
        return price