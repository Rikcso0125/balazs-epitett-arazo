import pandas as pd

from backend.utils import BeepitesTipus

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
    

    def get_zip_price(self, net_width, net_height):
         return OldalfalZaras_Refleksol_120_ZIP().get_zip_price(net_width, net_height)
    
    def get_uvegfalrendszer_price(self, net_width, net_height):
         return OldalfalZaras_uvegfalrendszer().get_uvegfalrendszer_price(net_width, net_height)


#######################################################################################################################
#######################################################################################################################

class Keplan:
    def __init__(self, beepites_tipusa: BeepitesTipus, projection: int, width: int):
        self.projection = projection
        self.width = width

        item_projections_free_standing = [250, 300, 350, 400, 450]
        item_widths_free_standing = [250, 300, 350, 400, 450, 500]

        item_projections_wall_mounted = [250, 300, 350, 400, 450, 500, 550]
        item_widths_wall_mounted = [250, 300, 350, 400, 450, 500, 550, 600]

        # Keplan - 4db lábon álló- Free standing
        data_free_standing = {
                 # 250,  300,  350,  400,  450
            250: [5821, 6056, 6601, 6813, 7126],
            300: [6074, 6361, 6926, 7159, 7506],
            350: [6436, 6743, 7328, 7581, 7961],
            400: [6481, 6794, 7386, 7645, 8031],
            450: [6842, 7175, 7788, 8067, 8487],
            500: [7050, 7404, 8037, 8335, 8789],
        }
        df_free_standing = pd.DataFrame(data_free_standing, index=item_projections_free_standing, columns=item_widths_free_standing).transpose()

        # Keplan - 2db lábon álló- Wall mounted
        data_wall_mounted = {
                 # 250,  300,  350,  400,  450,  500,  550
            250: [4956, 5145, 5505, 5717, 6030, 6066, 6495],
            300: [5209, 5450, 5830, 6063, 6408, 6451, 6915],
            350: [5570, 5832, 6231, 6484, 6864, 6913, 7411],
            400: [5615, 5883, 6289, 6548, 6935, 6991, 7494],
            450: [5977, 6264, 6692, 6971, 7391, 7468, 7991],
            500: [6185, 6493, 6939, 7239, 7693, 7787, 8333],
            550: [6546, 6875, 7342, 7661, 8148, 8249, 8829],
            600: [6754, 7102, 7589, 7930, 8450, 8538, 9157],
        }
        df_wall_mounted = pd.DataFrame(data_wall_mounted, index=item_projections_wall_mounted, columns=item_widths_wall_mounted).transpose()
        
        if beepites_tipusa == BeepitesTipus.EpulethezRogzitett:
            self.df = df_wall_mounted
            # self.item_widths = item_projections_wall_mounted
            # self.item_projections = item_widths_wall_mounted
            self.item_widths = item_widths_wall_mounted
            self.item_projections = item_projections_wall_mounted
        elif beepites_tipusa == BeepitesTipus.SzabadonAllo:
            self.df = df_free_standing
            # self.item_widths = item_projections_free_standing
            # self.item_projections = item_widths_free_standing
            self.item_widths = item_widths_wall_mounted
            self.item_projections = item_projections_wall_mounted
        
    def get_item_projection(self):
        """
        Select the smallest projection that fits the given input.
        If input <= a projection, return that projection; if above all, return max.
        """
        projection = self.projection
        for proj in self.item_projections:
            if projection <= proj:
                return proj
        return self.item_projections[-1]


    
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

#######################################################################################################################
#######################################################################################################################

class Isola:
    def __init__(self, beepites_tipusa: BeepitesTipus, projection: int, width: int):
        self.beepites_tipusa = beepites_tipusa
        self.projection = projection
        self.width = width

        item_projections_free_standing = [250, 300, 350, 400, 450, 500, 550]
        item_widths_free_standing = [250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 750, 800, 850, 900, 950, 1000]

        item_projections_wall_mounted = [250, 300, 350, 400, 450, 500, 550]
        item_widths_wall_mounted = [250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 750, 800, 850, 900, 950, 1000]

        # Keplan - 4db lábon álló- Free standing
        data_free_standing = {
                 #  250,   300,   350,   400,   450,   500,   550
            250: [11080, 11482, 11913, 12567, 13163, 13467, 14030],
            300: [11707, 12160, 12616, 13299, 13906, 14240, 14813],
            350: [12414, 12890, 13362, 14083, 14694, 15065, 15643],
            400: [13325, 13836, 14345, 15126, 15743, 16177, 16762],
            450: [14542, 15069, 15596, 16416, 17040, 17507, 18100],
            500: [14867, 15413, 15963, 16812, 17450, 17945, 18548],
            550: [15907, 16479, 17045, 17932, 18572, 19104, 19712],
            600: [16388, 16993, 17599, 18543, 19194, 19788, 20402],
            650: [17650, 18274, 18901, 19881, 20536, 21165, 21785],
            700: [17926, 18574, 19219, 20232, 20895, 21558, 22187],
            750: [21199, 21867, 22535, 23582, 24252, 24948, 25585],
            800: [21732, 22430, 23133, 24243, 24922, 25677, 26322],
            850: [23495, 24217, 24938, 26081, 26766, 27559, 28213],
            900: [23843, 24586, 25327, 26506, 27197, 28023, 28683],
            950: [24239, 25001, 25765, 26977, 27676, 28533, 29201],
            1000: [24791, 25588, 26387, 27660, 28369, 29289, 29963],
        }
        df_free_standing = pd.DataFrame(data_free_standing, index=item_projections_free_standing, columns=item_widths_free_standing)

        # Keplan - 2db lábon álló- Wall mounted
        data_wall_mounted = {
                 #  250,   300,   350,   400,   450,   500,   550
            250: [10084, 10483, 10916, 11569, 12166, 12469, 13031],
            300: [10708, 11164, 11617, 12300, 12908, 13244, 13812],
            350: [11416, 11888, 12361, 13083, 13696, 14054, 14644],
            400: [12328, 12836, 13342, 14127, 14744, 15175, 15764],
            450: [13541, 14071, 14600, 15417, 16041, 16507, 17102],
            500: [13867, 14414, 14967, 15814, 16447, 16947, 17549],
            550: [14908, 15478, 16049, 16933, 17571, 18106, 18714],
            600: [15389, 15994, 16599, 17544, 18193, 18788, 19402],
            650: [16652, 17277, 17900, 18883, 19538, 20165, 20787],
            700: [16928, 17574, 18220, 19234, 19896, 20557, 21188],
            750: [19615, 20282, 20949, 21994, 22668, 23359, 23998],
            800: [20146, 20846, 21547, 22655, 23333, 24089, 24735],
            850: [21909, 22631, 23351, 24495, 25180, 25973, 26625],
            900: [22258, 22999, 23742, 24919, 25611, 26437, 27096],
            950: [22651, 23416, 24180, 25390, 26087, 26948, 27616],
            1000: [23204, 24003, 24800, 26073, 26782, 27702, 28375],
        }
        df_wall_mounted = pd.DataFrame(data_wall_mounted, index=item_projections_wall_mounted, columns=item_widths_wall_mounted)
        
        if beepites_tipusa == BeepitesTipus.EpulethezRogzitett:
            self.df = df_wall_mounted
            self.item_widths = item_projections_wall_mounted
            self.item_projections = item_widths_wall_mounted
        elif beepites_tipusa == BeepitesTipus.SzabadonAllo:
            self.df = df_free_standing
            self.item_widths = item_projections_free_standing
            self.item_projections = item_widths_free_standing
        # if beepites_tipusa == BeepitesTipus.EpulethezRogzitett:
        #     self.df = df_wall_mounted
        #     # self.item_widths = item_projections_wall_mounted
        #     # self.item_projections = item_widths_wall_mounted
        #     self.item_widths = item_widths_wall_mounted
        #     self.item_projections = item_projections_wall_mounted
        # elif beepites_tipusa == BeepitesTipus.SzabadonAllo:
        #     self.df = df_free_standing
        #     # self.item_widths = item_projections_free_standing
        #     # self.item_projections = item_widths_free_standing
        #     self.item_widths = item_widths_wall_mounted
        #     self.item_projections = item_projections_wall_mounted

    
    def get_legs_num(self):
        if self.beepites_tipusa == BeepitesTipus.EpulethezRogzitett:
            if self.projection <= 700:
                return 2
            elif self.projection > 700:
                return 3
        elif self.beepites_tipusa == BeepitesTipus.SzabadonAllo:
            if self.projection <= 700:
                return 4
            elif self.projection > 700:
                return 6
    
    def is_higher_size_price(self): # KE - GENIUS - ISOLA 2 (700x550 cm-től 1000x550 cm-ig)
        return self.projection > 700

        
    def get_item_projection(self):
        """
        Select the smallest projection that fits the given input.
        If input <= a projection, return that projection; if above all, return max.
        """
        projection = self.projection
        for proj in self.item_projections:
            if projection <= proj:
                return proj
        return self.item_projections[-1]


    
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

