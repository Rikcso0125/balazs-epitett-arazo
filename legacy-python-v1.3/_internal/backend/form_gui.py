import tkinter as tk
from tkinter import ttk, Scrollbar
from tkinter import messagebox
from PIL import Image, ImageEnhance, ImageTk
import xml.etree.ElementTree as ET
from datetime import datetime
import requests
import os

from backend.utils import FormData
from backend.utils import BeepitesTipus
from backend.utils import TermekTipus
from backend.utils import Arkepzok

from backend.templates import bioklimatikus_editor
from backend.templates import feszitett_vasznas_editor
from backend.templates import polikarbonatos_editor
from backend.templates import uvegtetos_editor
from backend.templates import ZIPes_editor
# from backend.templates import karos_napellenzos_edito
from backend.templates import feszitett_vasznas_tetore_editor
from backend.templates import elhuzhato_ponyvas_editor
from backend.templates import uvegfalas_editor


class MegrendeloAblak:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Megrendelő adatai")
        self.root.geometry("665x700")
        root_path = os.path.join('_internal', 'backend')

        # self.product_names = {
        #     # "bioklimatikus": "Bioklimatikus pergola mozgatható lamellás tetővel",
        # } # nem kellett sehol, hisz a bioklimatikus.png a templates/bioklimatikus mappára fog mutatni

        self.selected_item_brightness = 0.6
        self.image_scale = 0.8

        self.product_images_size = (188, 344)
        self.product_images_path = os.path.join(root_path, 'resource', 'arnyekolo tipusok')
        
        self.beepites_images_size = (188, 250)
        self.beepites_images_path = os.path.join(root_path, 'resource', 'beepites tipusok')

        # ----------- FONTOK, STÍLUSOK -----------
        self.title_font = ("Arial", 16, "bold")
        self.subtitle_font = ("Arial", 12, "italic")
        self.normal_font = ("Arial", 11)

        self.size_input_layout = None

        # ----------- MENU BAR -----------
        self.menu_bar = tk.Menu(self.root)
        self.arkepzok_menu = tk.Menu(self.menu_bar, tearoff=0)
        self.arkepzok_menu.add_command(label="Árképzők", command=self.open_arkepzok_window)
        self.menu_bar.add_cascade(label="Beállítások", menu=self.arkepzok_menu)
        self.root.config(menu=self.menu_bar)

        self.root = self.init_scrolling(self.root)

        # ----------- FEJLÉC -----------
        self.title_label = tk.Label(self.root, text="Megrendelő adatai", font=self.title_font)
        self.title_label.pack(pady=10)

        # ----------- KERET A MEGRENDELŐ ADATAIHOZ -----------
        self.data_frame = data_frame = tk.Frame(self.root)
        data_frame.pack(pady=10)
        
        row=0
        tk.Label(data_frame, text="Név:", font=self.normal_font).grid(row=row, column=0, sticky="e", padx=5, pady=2)
        self.name_entry = tk.Entry(data_frame, width=30)
        self.name_entry.grid(row=row, column=1, padx=5, pady=2)
        row += 1
        tk.Label(data_frame, text="Email-cím:", font=self.normal_font).grid(row=row, column=0, sticky="e", padx=5, pady=2)
        self.email_entry = tk.Entry(data_frame, width=30)
        self.email_entry.grid(row=row, column=1, padx=5, pady=2)
        row += 1
        tk.Label(data_frame, text="Telefonszám:", font=self.normal_font).grid(row=row, column=0, sticky="e", padx=5, pady=2)
        self.phone_entry = tk.Entry(data_frame, width=30)
        self.phone_entry.grid(row=row, column=1, padx=5, pady=2)
        row += 1
        tk.Label(data_frame, text="Település:", font=self.normal_font).grid(row=row, column=0, sticky="e", padx=5, pady=2)
        self.city_entry = tk.Entry(data_frame, width=30)
        self.city_entry.grid(row=row, column=1, padx=5, pady=2)
        row += 1
        tk.Label(data_frame, text="Szállítási díj:", font=self.normal_font).grid(row=row, column=0, sticky="e", padx=5, pady=2)
        self.szallitasi_dij = tk.Entry(data_frame, width=30)
        self.szallitasi_dij.grid(row=row, column=1, padx=5, pady=2)
        row += 1
        tk.Label(data_frame, text="EUR/HUF árfolyam:", font=self.normal_font).grid(row=row, column=0, sticky="e", padx=5, pady=2)
        self.eur_huf_arfolyam = tk.Entry(data_frame, width=30)
        self.eur_huf_arfolyam.grid(row=row, column=1, padx=5, pady=2)

        # Refresh button
        self.refresh_btn = tk.Button(data_frame, text="⟳", font=("Arial", 12, "bold"), width=2, command=self.refresh_arfolyam)
        self.refresh_btn.grid(row=row, column=2, padx=(0,5), pady=2)

        # Nem szerkeszthető label a dátumnak
        self.last_update_label = tk.Label(data_frame, text="", font=("Arial", 9), width=20, anchor="w")
        self.last_update_label.grid(row=row, column=3, padx=5, pady=2)

        #######################################################

        # ----------- TERMÉK KIVÁLASZTÁSA -----------
        tk.Label(self.root, text="Válaszd ki a megrendelni kívánt terméket", font=self.normal_font).pack(pady=10)

        # A termékek elhelyezésére szolgáló keret, ahol a gombok a képek előtt és után vannak elhelyezve
        product_frame = tk.Frame(self.root)
        product_frame.pack(fill="x", expand=True)

        self.left_button = tk.Button(product_frame, text="<", command=self.scroll_left)
        self.left_button.grid(row=0, column=0, padx=10)

        # A képek konténere: kitölti a rendelkezésre álló helyet
        self.images_frame = tk.Frame(product_frame)
        self.images_frame.grid(row=0, column=1, sticky="ew")
        product_frame.grid_columnconfigure(1, weight=1)

        self.right_button = tk.Button(product_frame, text=">", command=self.scroll_right)
        self.right_button.grid(row=0, column=2, padx=10)

        self.product_images_normal = []
        self.product_images_dim = []
        self.product_images_name = os.listdir(self.product_images_path)

        for i, filename in enumerate(self.product_images_name):
            img_path = os.path.join(self.product_images_path, filename)
            img = Image.open(img_path)
            img = img.resize((int(self.product_images_size[0] * self.image_scale), int(self.product_images_size[1] * self.image_scale)))
            img_tk = ImageTk.PhotoImage(img)

            enhancer = ImageEnhance.Brightness(img)
            dim_img = enhancer.enhance(self.selected_item_brightness)
            dim_img_tk = ImageTk.PhotoImage(dim_img)

            self.product_images_normal.append(img_tk)
            self.product_images_dim.append(dim_img_tk)

        self.current_start_index = 0  # lapozáshoz szükséges index
        self.selected_product_index = None  # kiválasztott termék indexe (0..11)
        self.selected_product_name = None

        self.product_labels = []
        for i in range(len(self.product_images_name)):
            lbl = tk.Label(self.images_frame, bd=2, relief="groove")
            lbl.grid(row=0, column=i, padx=5)
            lbl.bind("<Button-1>", lambda e, idx=i: self.select_product(idx))
            self.product_labels.append(lbl)
        self.update_product_images()  # Első kirajzolás

        # ----------- BEÉPÍTÉS TÍPUSA -----------
        tk.Label(self.root, text="Beépítés típusa", font=self.normal_font).pack(pady=10)

        beepites_frame = tk.Frame(self.root)
        beepites_frame.pack()

        self.beepites_images_normal = []
        self.beepites_images_dim = []
        self.beepites_images_name = os.listdir(self.beepites_images_path)
        for i, filename in enumerate(self.beepites_images_name):
            img_path = os.path.join(self.beepites_images_path, filename)
            img = Image.open(img_path)
            img = img.resize((int(self.beepites_images_size[0] * self.image_scale), int(self.beepites_images_size[1] * self.image_scale)))
            img_tk = ImageTk.PhotoImage(img)

            enhancer = ImageEnhance.Brightness(img)
            dim_img = enhancer.enhance(self.selected_item_brightness)
            dim_img_tk = ImageTk.PhotoImage(dim_img)

            self.beepites_images_normal.append(img_tk)
            self.beepites_images_dim.append(dim_img_tk)

        self.selected_beepites_index = None
        self.selected_beepites_name = None
        self.beepites_labels = []
        for i, filename in enumerate(self.beepites_images_name):
            lbl = tk.Label(beepites_frame, bd=2, relief="groove")
            lbl.grid(row=0, column=i, padx=5)
            lbl.bind("<Button-1>", lambda e, idx=i: self.select_beepites(idx))
            self.beepites_labels.append(lbl)
        self.update_beepites_images()
        
        # ----------- MÉRETEK MEGADÁSA -----------
        self.size_frame = tk.Frame(self.root)
        self.size_frame.pack(pady=10, fill="x", expand=True)

        self.a_label = tk.Label(self.size_frame, text="A | Szélesség (cm):", font=self.normal_font)
        self.szelesseg_entry = tk.Entry(self.size_frame, width=10)

        self.b_label = tk.Label(self.size_frame, text="B | Mélység (cm):", font=self.normal_font)
        self.melyseg_entry = tk.Entry(self.size_frame, width=10)

        self.c_label = tk.Label(self.size_frame, text="C | Magasság (cm):", font=self.normal_font)
        self.magassag_entry = tk.Entry(self.size_frame, width=10)

        self.size_frame.bind("<Configure>", self.update_size_layout)


        # ----------- OPCIONÁLIS KIEGÉSZÍTŐK -----------
        tk.Label(self.root, text="Opcionális kiegészítők", font=self.normal_font).pack(anchor="w", pady=10)

        tk.Label(self.root, text="Oldalfal zárás", font=self.subtitle_font, fg="gray").pack(anchor="w", padx=20)
        self.oldalfal_frame = tk.Frame(self.root)
        self.oldalfal_frame.pack(anchor="w", padx=40)

        self.uvegfal_var = tk.BooleanVar()
        self.oldalso_var = tk.BooleanVar()
        self.nemszukseges_var = tk.BooleanVar()

        self.uvegfal_cb = tk.Checkbutton(self.oldalfal_frame, text="Üvegfal rendszer", variable=self.uvegfal_var, font=self.normal_font)
        self.uvegfal_cb.pack(anchor="w")
        self.oldalso_cb = tk.Checkbutton(self.oldalfal_frame, text="Oldalsó árnyékoló", variable=self.oldalso_var, font=self.normal_font)
        self.oldalso_cb.pack(anchor="w")
        self.nemsz_cb = tk.Checkbutton(self.oldalfal_frame, text="Nem szükséges", variable=self.nemszukseges_var, font=self.normal_font)
        self.nemsz_cb.pack(anchor="w")

        tk.Label(self.root, text="Választható opciók", font=self.subtitle_font, fg="gray").pack(anchor="w", padx=20, pady=(10,0))
        self.opciok_frame = tk.Frame(self.root)
        self.opciok_frame.pack(anchor="w", padx=40)

        self.led_var = tk.BooleanVar()
        self.erzekelo_var = tk.BooleanVar()
        self.terasz_var = tk.BooleanVar()
        self.okos_var = tk.BooleanVar()

        self.led_cb = tk.Checkbutton(self.opciok_frame, text="LED Világítás", variable=self.led_var, font=self.normal_font)
        self.led_cb.pack(anchor="w")
        self.erzekelo_cb = tk.Checkbutton(self.opciok_frame, text="Érzékelők/Szenzorok (eső-, szél-, nap- érzékelők)", variable=self.erzekelo_var, font=self.normal_font)
        self.erzekelo_cb.pack(anchor="w")
        self.terasz_cb = tk.Checkbutton(self.opciok_frame, text="Teraszfűtés", variable=self.terasz_var, font=self.normal_font)
        self.terasz_cb.pack(anchor="w")
        self.okos_cb = tk.Checkbutton(self.opciok_frame, text="Okos otthon vezérlő", variable=self.okos_var, font=self.normal_font)
        self.okos_cb.pack(anchor="w")

        # ----------- SUBMIT GOMB -----------
        self.submit_button = tk.Button(self.root, text="Submit", command=self.submit_data, font=self.normal_font)
        self.submit_button.pack(pady=20)
        self.is_submitted = False

        # only a placeholder at the bottom of the form to scroll down entirely
        tk.Label(self.root, text="", font=self.normal_font).pack(pady=30)
    
    def init_scrolling(self, frame, vertical=True, horizontal=False):
        if vertical or horizontal:
            if vertical:
                vscrollbar = Scrollbar(frame, orient=tk.VERTICAL)
                vscrollbar.pack(fill=tk.Y, side=tk.RIGHT, expand=tk.FALSE)
                
            if horizontal:
                hscrollbar = Scrollbar(frame, orient=tk.HORIZONTAL)
                hscrollbar.pack(fill=tk.X, side=tk.BOTTOM, expand=tk.FALSE)

            if vertical and horizontal:
                canvas = tk.Canvas(frame, bd=0, highlightthickness=0, yscrollcommand=vscrollbar.set, xscrollcommand=hscrollbar.set)
                vscrollbar.config(command=canvas.yview)
                hscrollbar.config(command=canvas.xview)
            elif vertical:
                canvas = tk.Canvas(frame, bd=0, highlightthickness=0, yscrollcommand=vscrollbar.set)
                vscrollbar.config(command=canvas.yview)
            elif horizontal:
                canvas = tk.Canvas(frame, bd=0, highlightthickness=0, xscrollcommand=hscrollbar.set)
                hscrollbar.config(command=canvas.xview)
            canvas.pack(fill=tk.BOTH, expand=tk.TRUE)

            # Reset the view
            canvas.xview_moveto(0)
            canvas.yview_moveto(0)

            # Create a frame inside the canvas which will be scrolled with it.
            scrollable_canvas = interior = ttk.Frame(canvas)
            interior_id = canvas.create_window(0, 0, window=interior, anchor=tk.NW)

            # Track changes to the canvas and frame width and sync them, also updating the scrollbar.
            def _configure_interior(event):
                # Update the scrollbars to match the size of the inner frame.
                size = (interior.winfo_reqwidth(), interior.winfo_reqheight())
                canvas.config(scrollregion="0 0 %s %s" % size)
                if interior.winfo_reqwidth() != canvas.winfo_width():
                    # Update the canvas's width to fit the inner frame.
                    canvas.config(width=interior.winfo_reqwidth(), height= interior.winfo_reqheight()) ####### !!!!!!!!!!!!!!!!!!!!!!!!!!!!!height was not there
            interior.bind('<Configure>', _configure_interior)

            def _configure_canvas(event):
                if interior.winfo_reqwidth() != canvas.winfo_width():
                    # Update the inner frame's width to fill the canvas.
                    canvas.itemconfigure(interior_id, width=canvas.winfo_width())
            canvas.bind('<Configure>', _configure_canvas)

            return scrollable_canvas # self.root = self.init_scrolling(self.root) # implement at the beginning of __init__(self, root)
        else:
            return frame

    def open_arkepzok_window(self):
        root_window = tk.Toplevel(self.root)
        root_window.title("Árképzők szerkesztése")
        root_window.geometry("425x250")

        # Fő layout: felső frame a scrollozható mezőkhöz, alsó a gombhoz
        content_frame = tk.Frame(root_window)
        content_frame.pack(fill="both", expand=True)

        content_frame.grid_rowconfigure(0, weight=1)
        content_frame.grid_columnconfigure(0, weight=1)

        scroll_holder = tk.Frame(content_frame)
        scroll_holder.grid(row=0, column=0, sticky="nsew", padx=10, pady=(10, 0))

        arkepzok_frame = self.init_scrolling(scroll_holder)

        arkepzok = Arkepzok()
        data = arkepzok._load()
        entries = {}

        for i, (key, value) in enumerate(data.items()):
            if value != 1.0:
                tk.Label(arkepzok_frame, text=key).grid(row=i, column=0, sticky="w", padx=10, pady=5)
                entry = ttk.Entry(arkepzok_frame)
                entry.insert(0, str(value))
                entry.grid(row=i, column=1, padx=10, pady=5)
                entries[key] = entry

        def save():
            try:
                for key, entry in entries.items():
                    new_value = float(entry.get())
                    data[key] = new_value
                arkepzok._save(data)
                # messagebox.showinfo("Success", "Értékek sikeresen elmentve.")
                root_window.destroy()
            except ValueError:
                messagebox.showerror("Invalid Input", "Csak érvényes számokat adjon meg!")

        save_button_frame = tk.Frame(content_frame)
        save_button_frame.grid(row=1, column=0, pady=10)

        ttk.Button(save_button_frame, text="Mentés", command=save).pack()

        # Minimum ablakméret (gomb + egy kis rész az inputokból)
        root_window.update_idletasks()
        min_height = save_button_frame.winfo_reqheight() + 60
        min_width = 300
        root_window.minsize(min_width, min_height)

        
    def refresh_arfolyam(self):
        url = "http://api.napiarfolyam.hu/?valuta=eur&bank=mnb"
        try:
            resp = requests.get(url, timeout=5)
            resp.raise_for_status()
            # Parse XML
            root = ET.fromstring(resp.content)
            deviza = root.find("./deviza/item")
            kozep = float(deviza.findtext("kozep"))
            datum = deviza.findtext("datum")
        except Exception as e:
            messagebox.showerror("Hiba", f"Árfolyam lekérése sikertelen:\n{e}")
            return

        # Entry frissítése
        self.eur_huf_arfolyam.delete(0, tk.END)
        self.eur_huf_arfolyam.insert(0, f"{kozep:.2f}")

        # Dátum frissítése az XML-ből kapott értékkel
        # self.last_update_label.config(text=datum)
        now_str = datetime.now().strftime("%Y.%m.%d %H:%M:%S")
        self.last_update_label.config(text=now_str)


    # ------------------ MÉRET MEGADÁS ELRENDEZÉS ------------------
    def update_size_layout(self, event=None):

        width = self.size_frame.winfo_width()
        horizontal_threshold = 600

        if width >= horizontal_threshold:
            layout = 'horizontal'
        else:
            layout = 'vertical'

        if self.size_input_layout != layout:
            # Töröljük az eddigi grid elrendezést a size_frame-ben
            for widget in self.size_frame.grid_slaves():
                widget.grid_forget()
            
            self.size_input_layout = layout

            if layout == 'horizontal':
                # Vízszintes elrendezés: egy sorban mindhárom pár
                self.a_label.grid(row=0, column=0, padx=5, pady=2, sticky="e")
                self.szelesseg_entry.grid(row=0, column=1, padx=5, pady=2)

                self.b_label.grid(row=0, column=2, padx=5, pady=2, sticky="e")
                self.melyseg_entry.grid(row=0, column=3, padx=5, pady=2)

                self.c_label.grid(row=0, column=4, padx=5, pady=2, sticky="e")
                self.magassag_entry.grid(row=0, column=5, padx=5, pady=2)
            elif layout == 'vertical':
                # Függőleges elrendezés: minden pár saját sorban, balra zárva
                self.a_label.grid(row=0, column=0, padx=5, pady=2, sticky="w")
                self.szelesseg_entry.grid(row=0, column=1, padx=5, pady=2, sticky="w")

                self.b_label.grid(row=1, column=0, padx=5, pady=2, sticky="w")
                self.melyseg_entry.grid(row=1, column=1, padx=5, pady=2, sticky="w")

                self.c_label.grid(row=2, column=0, padx=5, pady=2, sticky="w")
                self.magassag_entry.grid(row=2, column=1, padx=5, pady=2, sticky="w")

    def scroll_left(self, step=1):
        self.current_start_index = (self.current_start_index - step) % len(self.product_images_normal)
        self.update_product_images()

    def scroll_right(self, step=1):
        self.current_start_index = (self.current_start_index + step) % len(self.product_images_normal)
        self.update_product_images()


    # --------------- TERMÉK KÉPEK FRISSÍTÉSE ---------------
    def update_product_images(self):
        for i in range(len(self.product_images_name)):
            product_index = (self.current_start_index + i) % len(self.product_images_normal)
            if self.selected_product_index == product_index or self.selected_product_index is None:
                self.product_labels[i].config(image=self.product_images_normal[product_index])
            else:
                self.product_labels[i].config(image=self.product_images_dim[product_index])
            self.product_labels[i].image_index = product_index
    
    # ---------------BEÉPÍTÉSI KÉPEK FRISSÍTÉSE --------------
    def update_beepites_images(self):
        for i in range(len(self.beepites_images_name)):
            if self.selected_beepites_index == i or self.selected_beepites_index is None:
                self.beepites_labels[i].config(image=self.beepites_images_normal[i])
            else:
                self.beepites_labels[i].config(image=self.beepites_images_dim[i])

    # ----------- TERMÉK KIVÁLASZTÁSA -----------
    def select_product(self, idx):
        actual_idx = (self.current_start_index + idx) % len(self.product_images_normal)
        if self.selected_product_index == actual_idx:
            self.selected_product_index = None
            self.selected_product_name = None
        else:
            self.selected_product_index = actual_idx
            self.selected_product_name = (os.path.splitext(self.product_images_name[actual_idx])[0])
        self.update_product_images()

    # ----------- BEÉPÍTÉS KIVÁLASZTÁSA -----------
    def select_beepites(self, idx):
        if self.selected_beepites_index == idx:
            self.selected_beepites_index = None
            self.selected_beepites_name = None
        else:
            self.selected_beepites_index = idx
            self.selected_beepites_name = os.path.splitext(self.beepites_images_name[idx])[0]
        self.update_beepites_images()

    def get_clean_entry_val(self, entry: tk.Entry, replace_from=" ", replace_to="", skip_replace=False) -> str:
        if not skip_replace:
            return entry.get().strip().replace("_", "").replace(replace_from, replace_to)
        else:
            return entry.get().strip().replace("_", "")

    # ------------------ SUBMIT ------------------
    def submit_data(self, show_summary=False):
        name = self.get_clean_entry_val(self.name_entry, skip_replace=True)
        email = self.get_clean_entry_val(self.email_entry)
        phone_number = self.get_clean_entry_val(self.phone_entry)

        telepules = self.get_clean_entry_val(self.city_entry)
        szallitasi_dij = self.get_clean_entry_val(self.szallitasi_dij)
        eur_huf_arfolyam = self.get_clean_entry_val(self.eur_huf_arfolyam)

        width = self.get_clean_entry_val(self.szelesseg_entry)
        projection = self.get_clean_entry_val(self.melyseg_entry)
        height = self.get_clean_entry_val(self.magassag_entry)

        entry_error = []
        if name == '':
            entry_error.append("Név")
        if telepules == '':
            entry_error.append("Település")
        if szallitasi_dij == '':
            entry_error.append("Szállítási díj")
        if eur_huf_arfolyam == '':
            entry_error.append("Euró Forint árfolyam")
        if width == '':
            entry_error.append("Szélesség")
        if projection == '':
            entry_error.append("Mélység")
        if height == '':
            entry_error.append("Magasság")

        if self.selected_product_name is not None:
            if self.selected_product_name == TermekTipus.Bioklimatikus.value:
                termek_tipusa = TermekTipus.Bioklimatikus
            elif self.selected_product_name == TermekTipus.ElhuzhatoPonyvas.value:
                termek_tipusa = TermekTipus.ElhuzhatoPonyvas
            elif self.selected_product_name == TermekTipus.FeszitettVasznas.value:
                termek_tipusa = TermekTipus.FeszitettVasznas
            elif self.selected_product_name == TermekTipus.FeszitettVasznasTetore.value:
                termek_tipusa = TermekTipus.FeszitettVasznasTetore
            elif self.selected_product_name == TermekTipus.HivdFel.value:
                termek_tipusa = TermekTipus.HivdFel
            elif self.selected_product_name == TermekTipus.KarosNapellenzos.value:
                termek_tipusa = TermekTipus.KarosNapellenzos
            elif self.selected_product_name == TermekTipus.Polikarbonatos.value:
                termek_tipusa = TermekTipus.Polikarbonatos
            elif self.selected_product_name == TermekTipus.Uvegfalas.value:
                termek_tipusa = TermekTipus.Uvegfalas
            elif self.selected_product_name == TermekTipus.Uvegtetos.value:
                termek_tipusa = TermekTipus.Uvegtetos
            elif self.selected_product_name == TermekTipus.Zipes.value:
                termek_tipusa = TermekTipus.Zipes
        else:
            entry_error.append("Termék típusa nincs kiválasztva")
            # raise Exception(f"Termék típusa nincs kiválasztva: {self.selected_product_name}")
        
        if self.selected_beepites_name is not None:
            if self.selected_beepites_name == BeepitesTipus.EpulethezRogzitett.value:
                beepites_tipusa = BeepitesTipus.EpulethezRogzitett
            elif self.selected_beepites_name == BeepitesTipus.SzabadonAllo.value:
                beepites_tipusa = BeepitesTipus.SzabadonAllo
        else:
            entry_error.append("Beépítés típusa nincs kiválasztva")
            # raise Exception(f"Beépítés Típusa nincs kiválasztva: {self.selected_beepites_name}")

        if len(entry_error) == 1:
            text = f"A(z) {entry_error[0].replace(' nincs kiválasztva', '')} mező kitöltése helytelen. Kérlek ellenőrizd a megadott mezőt."
            messagebox.showwarning(f"Hiba a bevitt adatokban", text)

        if len(entry_error) > 1:
            text = "Az alábbi mezők kitöltése helytelen. Kérlek ellenőrizd a megadott adatokat:\n"
            for entry in entry_error:
                text += f"\n- {entry}"
            messagebox.showwarning("Hiba a bevitt adatokban", text)
        
        if entry_error:
            raise Exception(text)


        is_uvegfal_rendszer_enabled = self.uvegfal_var.get()
        is_oldalso_arnyekolo_enabled = self.oldalso_var.get()
        is_oldalfal_zaras_nem_szükseges = self.nemszukseges_var.get()

        is_opcio_led_vilagitas_enabled = self.led_var.get()
        is_opcio_erzekelo_szenzorok_enabled = self.erzekelo_var.get()
        is_opcio_teraszfutes_enabled = self.terasz_var.get()
        is_opcio_okos_otthon_enabled = self.okos_var.get()

        self.form_data = FormData(
            name=name,
            email=email,
            phone_number=phone_number,
            telepules=telepules,
            szallitasi_dij=int(szallitasi_dij),
            eur_huf_arfolyam=int(float(eur_huf_arfolyam)),
            termek_tipusa=termek_tipusa,
            beepites_tipusa=beepites_tipusa,
            # projection=int(projection),
            # width=int(width),
            projection=int(width),
            width=int(projection),
            height=int(height),
            is_uvegfal_rendszer_enabled=is_uvegfal_rendszer_enabled,
            is_oldalso_arnyekolo_enabled=is_oldalso_arnyekolo_enabled,
            is_oldalfal_zaras_nem_szükseges=is_oldalfal_zaras_nem_szükseges,
            is_opcio_led_vilagitas_enabled=is_opcio_led_vilagitas_enabled,
            is_opcio_erzekelo_szenzorok_enabled=is_opcio_erzekelo_szenzorok_enabled,
            is_opcio_teraszfutes_enabled=is_opcio_teraszfutes_enabled,
            is_opcio_okos_otthon_enabled=is_opcio_okos_otthon_enabled
        )

        if show_summary:
            result_window = tk.Toplevel(self.root)
            result_window.title("Bevitt adatok")
            tk.Label(result_window, text=self.form_data.to_string(), justify="left").pack(padx=20, pady=20)
        self.is_submitted = True

        if self.form_data.termek_tipusa == TermekTipus.Bioklimatikus:
            bioklimatikus_editor(self.form_data)
        elif self.form_data.termek_tipusa == TermekTipus.FeszitettVasznas:
            feszitett_vasznas_editor(self.form_data)
        elif self.form_data.termek_tipusa == TermekTipus.Polikarbonatos:
            polikarbonatos_editor(self.form_data)
        elif self.form_data.termek_tipusa == TermekTipus.Uvegtetos:
            uvegtetos_editor(self.form_data)
        elif self.form_data.termek_tipusa == TermekTipus.Zipes:
            ZIPes_editor(self.form_data)
        elif self.form_data.termek_tipusa == TermekTipus.FeszitettVasznasTetore:
            feszitett_vasznas_tetore_editor(self.form_data)
        elif self.form_data.termek_tipusa == TermekTipus.ElhuzhatoPonyvas:
            elhuzhato_ponyvas_editor(self.form_data)
        elif self.form_data.termek_tipusa == TermekTipus.Uvegfalas:
            uvegfalas_editor(self.form_data)
        
        elif self.form_data.termek_tipusa == TermekTipus.KarosNapellenzos:
            # karos_napellenzos_editor(self.form_data)
            messagebox.showwarning("Hiba!", f"Ez a termék ({TermekTipus.KarosNapellenzos}) nem elérhető...")
        elif self.form_data.termek_tipusa == TermekTipus.HivdFel:
            if self.form_data.phone_number:
                additional_text = f"\n\n{self.form_data.name}: {self.form_data.phone_number}"
            else:
                additional_text = ""
            messagebox.showwarning("Hívd fel te!", f"Te Barom! Ne kattints ide. Hívd fel!{additional_text}")
        
        else:
            messagebox.showwarning("Hiba", "Ez a termék jelenleg még nem elérhető. De dolgozom rajta...")



def main() -> FormData:
    root = tk.Tk()
    app = MegrendeloAblak(root)
    root.mainloop()

    if app.is_submitted:
        return app.form_data
    else:
        return None


# if __name__ == "__main__":
#     main()
