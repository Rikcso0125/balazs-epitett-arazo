import pandas as pd
import numpy as np

#######################################################################################################################
#######################################################################################################################

class VerandaTens:
    def __init__(self, projection: int, width: int):
        self.projection = projection
        self.width = width
        
        self.item_projections = [125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400, 425, 450]
        self.item_widths = [150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400]
        self.item_projection_max_modul_num = 30 # no way this value exceeds its limit (30*5=150m)

        data = {
                # 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400, 425, 450
            150: [801, 880, 959, 1039, 1118, 1197, 1277, 1356, 1435, 1515, 1594, 1673, 1753, 1832],
            175: [840, 921, 1002, 1085, 1168, 1249, 1332, 1413, 1496, 1579, 1660, 1743, 1826, 1907],
            200: [866, 951, 1036, 1120, 1205, 1291, 1376, 1461, 1546, 1631, 1717, 1802, 1887, 1971],
            225: [894, 981, 1069, 1157, 1244, 1332, 1420, 1509, 1596, 1684, 1772, 1859, 1947, 2036],
            250: [921, 1011, 1101, 1192, 1283, 1373, 1465, 1555, 1646, 1737, 1828, 1918, 2008, 2100],
            275: [958, 1051, 1145, 1239, 1333, 1426, 1520, 1614, 1707, 1801, 1894, 1988, 2081, 2175],
            300: [985, 1081, 1178, 1274, 1371, 1467, 1564, 1660, 1757, 1853, 1950, 2046, 2143, 2239],
            325: [1012, 1111, 1210, 1311, 1410, 1509, 1609, 1708, 1807, 1906, 2006, 2105, 2204, 2303],
            350: [1043, 1144, 1245, 1346, 1448, 1550, 1653, 1754, 1857, 1958, 2061, 2164, 2265, 2368],
            375: [1393, 1393, 1393, 1393, 1497, 1603, 1708, 1813, 1918, 2022, 2127, 2233, 2338, 2443],
            400: [1428, 1428, 1428, 1428, 1536, 1644, 1752, 1859, 1968, 2076, 2184, 2292, 2399, 2507],
        }
        self.df = pd.DataFrame(data, index=self.item_projections, columns=self.item_widths).transpose()

    def get_modul_num(self):
        modules = int(np.ceil(self.projection / max(self.item_projections)))
        return max(1, min(modules, self.item_projection_max_modul_num))
        
    def get_item_projection(self): # used in get_item_price() as well
        """
        Select the smallest projection that fits the given input.
        If input <= a projection, return that projection; if above all, return max.
        """
        projection = int(self.projection / self.get_modul_num())
        for proj in self.item_projections:
            if projection <= proj:
                return proj
        return self.item_projections[-1]

    
    def get_item_width(self): # used in get_item_price() as well
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
        price = self.df.at[wid, proj] * self.get_modul_num()
        return price
        

    def is_projection_above_max_size(self):
        return max(self.item_projections) * self.item_projection_max_modul_num < self.projection
    
    def is_projection_below_min_size(self):
        return min(self.item_projections) > self.projection
    
    def is_projection_rounded(self):
        return self.get_item_projection() * self.get_modul_num() != self.projection
    

    def is_width_above_max_size(self):
        return max(self.item_widths) < self.width
    
    def is_width_below_min_size(self):
        return min(self.item_widths) > self.width
    
    def is_width_rounded(self):
        return self.get_item_width() != self.width
    

#######################################################################################################################
#######################################################################################################################


class VerandaVZIP:
    def __init__(self, projection: int, width: int):
        self.projection = projection
        self.width = width
        
        self.item_projections = [200, 250, 300, 350, 400, 450, 500]
        self.item_widths = [200, 250, 300, 350, 400, 450, 500, 550, 600]
        self.item_projection_max_modul_num = 30 # no way this value exceeds its limit (30*5=150m)

        data = {
                # 200, 250, 300, 350, 400, 450, 500
            200: [3247, 3460, 3551, 3780, 3870, 4084, 4182],
            250: [3431, 3665, 3755, 3949, 4094, 4222, 4429],
            300: [3508, 3762, 4072, 4423, 4540, 4901, 5000],
            350: [3585, 4108, 4169, 4541, 4658, 5039, 5137],
            400: [3883, 4205, 4266, 4658, 4775, 5177, 5275],
            450: [4067, 4407, 4526, 4881, 5328, 5854, 5969],
            500: [4144, 4505, 4623, 5300, 5446, 6015, 6107],
            550: [4221, 4602, 4996, 5418, 5563, 6153, 6245],
            600: [4298, 4948, 5093, 5536, 5681, 6315, 6383],
        }
        self.df = pd.DataFrame(data, index=self.item_projections, columns=self.item_widths).transpose()

    def get_modul_num(self):
        modules = int(np.ceil(self.projection / max(self.item_projections)))
        return max(1, min(modules, self.item_projection_max_modul_num))
        
    def get_item_projection(self): # used in get_item_price() as well
        """
        Select the smallest projection that fits the given input.
        If input <= a projection, return that projection; if above all, return max.
        """
        projection = int(self.projection / self.get_modul_num())
        for proj in self.item_projections:
            if projection <= proj:
                return proj
        return self.item_projections[-1]

    
    def get_item_width(self): # used in get_item_price() as well
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
        price = self.df.at[wid, proj] * self.get_modul_num()
        return price
        

    def is_projection_above_max_size(self):
        return max(self.item_projections) * self.item_projection_max_modul_num < self.projection
    
    def is_projection_below_min_size(self):
        return min(self.item_projections) > self.projection
    
    def is_projection_rounded(self):
        return self.get_item_projection() * self.get_modul_num() != self.projection
    

    def is_width_above_max_size(self):
        return max(self.item_widths) < self.width
    
    def is_width_below_min_size(self):
        return min(self.item_widths) > self.width
    
    def is_width_rounded(self):
        return self.get_item_width() != self.width
