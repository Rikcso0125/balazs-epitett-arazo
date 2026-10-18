import pandas as pd
import numpy as np
#######################################################################################################################
#######################################################################################################################

class PergolaVZIIP:
    def __init__(self, projection: int, width: int, height: int):
        self.projection = projection
        self.width = width
        self.height = height
        
        self.item_projections = [200, 250, 300, 350, 400, 450, 500]
        self.item_widths = [200, 250, 300, 350, 400, 450, 500, 550, 600]
        self.item_heights = range(0, 301, 1)
        self.item_projection_max_modul_num = 30 # no way this value exceeds its limit (30*5=150m)

        data = {
                #  200,  250,  300,  350,  400,  450,  500
            200: [3747, 3960, 4051, 4280, 4370, 4584, 4682],
            250: [3931, 4165, 4255, 4449, 4594, 4722, 4929],
            300: [4008, 4262, 4572, 4923, 5040, 5401, 5500],
            350: [4085, 4608, 4669, 5041, 5158, 5539, 5637],
            400: [4383, 4705, 4766, 5158, 5275, 5677, 5775],
            450: [4567, 4907, 5026, 5381, 5828, 6354, 6469],
            500: [4644, 5005, 5123, 5800, 5946, 6515, 6607],
            550: [4721, 5102, 5496, 5918, 6063, 6653, 6745],
            600: [4798, 5448, 5593, 6036, 6181, 6815, 6883],
        }
        self.df = pd.DataFrame(data, index=self.item_projections, columns=self.item_widths).transpose()

    def get_modul_num(self):
        modules = int(np.ceil(self.projection / max(self.item_projections)))
        return max(1, min(modules, self.item_projection_max_modul_num))
    
    def get_legs_num(self):
        return self.get_modul_num() * 2
        
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
    
    def get_item_height(self):
        if self.is_height_above_max_size():
            return max(self.item_heights)
        elif self.is_height_below_min_size():
            return min(self.item_heights)
        else:
            return self.height
    
    
    def get_item_price(self):
        """
        Return the price for the projection and width.
        """
        proj = self.get_item_projection()
        wid = self.get_item_width()
        price = self.df.at[wid, proj] * self.get_modul_num()
        # print(f"datasheet FETCH: kedvezmenyes_ar_item1 fetched: {price} | Original: {4594}")
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
    

    def is_height_above_max_size(self):
        return max(self.item_heights) < self.height
    
    def is_height_below_min_size(self):
        return min(self.item_heights) > self.height
    
    def is_height_rounded(self):
        return self.get_item_height() != self.height

    

#######################################################################################################################
#######################################################################################################################

class Hydra:
    def __init__(self, projection: int, width: int, height: int):
        self.projection = projection
        self.width = width
        self.height = height
        
        self.item_projections_modul1 = [200, 250, 300, 350, 400, 450, 500, 550, 600]
        self.item_projections_modul2 = [650, 700, 750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200]
        self.item_projections = self.item_projections_modul1 + self.item_projections_modul2
        self.item_widths = [200, 250, 300, 350, 400, 450, 500]
        self.item_heights = range(0, 301, 1)

        
        data = {
        #    # 200,  250,  300,  350,  400,  450,  500,  550,  600,  650,  700,  750,  800,  850,  900,  950, 1000, 1050,  1100,  1150,  1200
        200: [3383, 3605, 3830, 4216, 4370, 4763, 4821, 5305, 5360, 7991, 8047, 8112, 8356, 9082, 9138, 9194, 9252, 9978, 10220, 10278, 10332],
        250: [3531, 3761, 3993, 4391, 4553, 4952, 5016, 5512, 5576, 8330, 8394, 8471, 8723, 9459, 9523, 9586, 9651, 10387, 10639, 10703, 10767],
        300: [3864, 4103, 4345, 4747, 4918, 5328, 5399, 5903, 5975, 9040, 9113, 9196, 9459, 10199, 10275, 10346, 10418, 11162, 11421, 11495, 11570],
        350: [3909, 4149, 4389, 4792, 4963, 5372, 5445, 5948, 6021, 9135, 9207, 9292, 9552, 10295, 10368, 10440, 10513, 11256, 11514, 11591, 11665],
        400: [3964, 4213, 4463, 4873, 5053, 5469, 5553, 6061, 6144, 9293, 9373, 9464, 9734, 10483, 10564, 10647, 10731, 11482, 11747, 11830, 11912],
        450: [4403, 4688, 4977, 5457, 5645, 6127, 6219, 6796, 6885, 10452, 10540, 10642, 10919, 11794, 11886, 11976, 12066, 12946, 13222, 13314, 13402],
        500: [4457, 4755, 5050, 5537, 5733, 6226, 6325, 6909, 7009, 10608, 10707, 10815, 11100, 11987, 12086, 12182, 12282, 13170, 13452, 13553, 13652],
        # előtető: 189, 196, 205, 214, 221, 230, 239, 247, 255, 265, 272, 282, 290, 298, 307, 316, 323, 332, 341, 348, 358
        #előtető nincs bele írva az árba mert lényegtelen ~~Balázs
        }
        self.df = pd.DataFrame(data, index=self.item_projections, columns=self.item_widths).transpose()

    def get_modul_num(self):
        min_modul1 = min(self.item_projections_modul1)
        max_modul1 = max(self.item_projections_modul1)

        min_modul2 = min(self.item_projections_modul2)
        max_modul2 = max(self.item_projections_modul2)
        if self.projection in range(min_modul1, max_modul1 + 1):
            return 1 # 1 modul
        elif self.projection in range(min_modul2, max_modul2 + 1):
            return 2 # 2 modul
        else:
            # raise ("no modul_num selected in Hydra.get_modul_num()")
            if min(min_modul1, min_modul2) > self.projection: # self.is_projection_below_min_size(): # race condition
                return 1
            elif max(max_modul1, max_modul2) < self.projection: # self.is_projection_above_max_size(): # race condition
                return 2
        
    
    def get_legs_num(self):
        return self.get_modul_num() + 1
        
    def get_item_projection(self): # used in get_item_price() as well
        """
        Select the smallest projection that fits the given input.
        If input <= a projection, return that projection; if above all, return max.
        """
        projection = self.projection
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
    
    def get_item_height(self):
        if self.is_height_above_max_size():
            return max(self.item_heights)
        elif self.is_height_below_min_size():
            return min(self.item_heights)
        else:
            return self.height
    
    
    def get_item_price(self):
        """
        Return the price for the projection and width.
        """
        proj = self.get_item_projection()
        wid = self.get_item_width()
        price = self.df.at[wid, proj]
        # print(f"datasheet FETCH: kedvezmenyes_ar_item1 fetched: {price} | Original: {4594}")
        return price
    

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


#######################################################################################################################
#######################################################################################################################

class A100Lux:
    def __init__(self, projection: int, width: int, height: int):
        self.projection = projection
        self.width = width
        self.height = height

        self.item_heights = range(0, 301, 1)

        self.item_projections_modul1 = [250, 300, 350, 400, 450, 500]
        self.item_widths_modul1 = [250, 300, 350, 400, 450, 500, 550, 600]

        data_modul1 = {
            #    # 250,  300,  350,  400,  450,  500
            250: [4725, 4856, 5014, 5222, 5573, 5580],
            300: [4899, 5068, 5237, 5446, 5805, 5818],
            350: [5102, 5293, 5482, 5714, 6103, 6129],
            400: [5445, 5654, 5864, 6113, 6536, 6579],
            450: [5649, 5881, 6107, 6380, 6836, 6964],
            500: [5991, 6239, 6489, 6783, 7270, 7417],
            550: [6195, 6466, 6736, 7047, 7567, 7738],
            600: [6268, 6547, 6821, 7139, 7670, 7860],
        # eloteto  351,  422,  491,  561,  631,  700
        }

        eloteto_ar_vals1 = [351, 422, 491, 561, 631, 700]
        eloteto_ar_modul1 = {
            #    # 250,  300,  350,  400,  450,  500
            250: eloteto_ar_vals1,
            300: eloteto_ar_vals1,
            350: eloteto_ar_vals1,
            400: eloteto_ar_vals1,
            450: eloteto_ar_vals1,
            500: eloteto_ar_vals1,
            550: eloteto_ar_vals1,
            600: eloteto_ar_vals1,
        }

        df_modul1 = pd.DataFrame(data_modul1, index=self.item_projections_modul1, columns=self.item_widths_modul1).transpose()
        df_eloteto_ar_modul1 = pd.DataFrame(eloteto_ar_modul1, index=self.item_projections_modul1, columns=self.item_widths_modul1).transpose()

        self.item_projections_modul2 = [550, 600, 650, 700, 750, 800, 850, 900]
        self.item_projections_modul3 = [950, 1000, 1050, 1100, 1150, 1200, 1250, 1300]
        self.item_widths_modul2_3 = [250, 300, 350, 400, 450, 500]
        item_projections_modul2_3 = self.item_projections_modul2 + self.item_projections_modul3
        data_modul2_3 = {
            #    # 550,  600,  650,  700,  750,  800,  850,  900,   950,  1000,  1050,  1100,  1150,  1200,  1250,  1300
            250: [7521, 7547, 7889, 7912, 8131, 8155, 8855, 8872, 10711, 10739, 10763, 11242, 11267, 11292, 12317, 12342],
            300: [7852, 7870, 8232, 8250, 8487, 8503, 9219, 9242, 11179, 11201, 11219, 11727, 11746, 11767, 12818, 12836],
            350: [8238, 8250, 8661, 8671, 8963, 8973, 9756, 9785, 11806, 11818, 11830, 12416, 12425, 12437, 13597, 13610],
            400: [8831, 8833, 9293, 9295, 9643, 9647, 10492, 10531, 12700, 12708, 12710, 13373, 13376, 13382, 14645, 14649],
            450: [9212, 9219, 9717, 9719, 10114, 10119, 11028, 11073, 13292, 13325, 13332, 14053, 14054, 14060, 15423, 15425],
            500: [9799, 9809, 10339, 10351, 10787, 10796, 11766, 11817, 14203, 14215, 14223, 14994, 15005, 15016, 16461, 16473],
        # eloteto  771,  840,   909,   978,  1048,  1118,  1188,  1256,  1326,  1395,  1467,  1536,  1604,  1674,  1743,  1814
        }

        eloteto_ar_vals2_3 = [771, 840, 909, 978, 1048, 1118, 1188, 1256, 1326, 1395, 1467, 1536, 1604, 1674, 1743, 1814]
        eloteto_ar_modul2_3 = {
            #    # 250,  300,  350,  400,  450,  500
            250: eloteto_ar_vals2_3,
            300: eloteto_ar_vals2_3,
            350: eloteto_ar_vals2_3,
            400: eloteto_ar_vals2_3,
            450: eloteto_ar_vals2_3,
            500: eloteto_ar_vals2_3,
        }

        df_modul2_3 = pd.DataFrame(data_modul2_3, index=item_projections_modul2_3, columns=self.item_widths_modul2_3).transpose()
        df_eloteto_ar_modul2_3 = pd.DataFrame(eloteto_ar_modul2_3, index=item_projections_modul2_3, columns=self.item_widths_modul2_3).transpose()

        if self.get_modul_num() == 1:
            self.item_projections = self.item_projections_modul1
            self.item_widths = self.item_widths_modul1
            self.df_eloteto_ar = df_eloteto_ar_modul1
            self.df = df_modul1
        elif self.get_modul_num() == 2:
            self.item_projections = self.item_projections_modul2
            self.item_widths = self.item_widths_modul2_3
            self.df_eloteto_ar = df_eloteto_ar_modul2_3
            self.df = df_modul2_3
        elif self.get_modul_num() == 3:
            self.item_projections = self.item_projections_modul3
            self.item_widths = self.item_widths_modul2_3
            self.df_eloteto_ar = df_eloteto_ar_modul2_3
            self.df = df_modul2_3


    def get_modul_num(self):
        min_modul1 = min(self.item_projections_modul1)
        max_modul1 = max(self.item_projections_modul1)

        min_modul2 = min(self.item_projections_modul2)
        max_modul2 = max(self.item_projections_modul2)

        min_modul3 = min(self.item_projections_modul3)
        max_modul3 = max(self.item_projections_modul3)

        if self.projection in range(min_modul1, max_modul1 + 1):
            return 1 # 1 modul
        elif self.projection in range(min_modul2, max_modul2 + 1):
            return 2 # 2 modul
        elif self.projection in range(min_modul3, max_modul3 + 1):
            return 3 # 3 modul
        else:
            # raise Warning("no modul_num selected in A_100_LUX.get_modul_num()")
            if min(min_modul1, min_modul2, min_modul3) > self.projection: # self.is_projection_below_min_size(): # race condition
                return 1
            elif max(max_modul1, max_modul2, max_modul3) < self.projection: # self.is_projection_above_max_size(): # race condition
                return 3
    
    def get_legs_num(self):
        return self.get_modul_num() + 1
        
    def get_item_projection(self): # used in get_item_price() as well
        """
        Select the smallest projection that fits the given input.
        If input <= a projection, return that projection; if above all, return max.
        """
        projection = self.projection
        for proj in self.item_projections:
            if projection <= proj:
                return proj
        return self.item_projections[-1]

    
    def get_item_width(self): # used in get_item_price() as well
        """
        Select the smallest width that fits the given input.
        If input <= a width, return that width; if above all, return max.
        """
        item_widths = self.item_widths
        for width in item_widths:
            if self.width <= width:
                return width
        return item_widths[-1]
    
    def get_item_height(self):
        if self.is_height_above_max_size():
            return max(self.item_heights)
        elif self.is_height_below_min_size():
            return min(self.item_heights)
        else:
            return self.height
        
    def get_eloteto_ar(self):
        proj = self.get_item_projection()
        wid = self.get_item_width()
        price = self.df_eloteto_ar.at[wid, proj]
        return price
    
    
    def get_item_price(self):
        """
        Return the price for the projection and width.
        """
        proj = self.get_item_projection()
        wid = self.get_item_width()
        price = self.df.at[wid, proj]
        return price

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
