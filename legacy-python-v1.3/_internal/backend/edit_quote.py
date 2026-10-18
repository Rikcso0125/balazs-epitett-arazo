import tkinter as tk
from tkinter import ttk, Scrollbar
from tkinter import messagebox
from PIL import Image, ImageEnhance, ImageTk
import os

from backend.utils import FormData
from backend.utils import TermekTipus

from backend.templates import Renderer


class EditorWindow:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.title = "Árajánlat szerkesztő"
        self.root.title(self.title)
        self.root.geometry("1155x450")
        root_path = os.path.join('_internal', 'backend')

        self.selected_item_brightness = 0.6
        self.image_scale = 0.8

        self.product_images_size = (188, 344)
        self.product_images_path = os.path.join(root_path, 'resource', 'arnyekolo tipusok')


        # ----------- FONTOK, STÍLUSOK -----------
        self.title_font = ("Arial", 16, "bold")
        self.subtitle_font = ("Arial", 12, "italic")
        self.normal_font = ("Arial", 11)

        self.size_input_layout = None

        self.root = self.init_scrolling(self.root)

        # ----------- FEJLÉC -----------
        self.title_label = tk.Label(self.root, text=self.title, font=self.title_font)
        self.title_label.pack(pady=10)
        
        #######################################################

        # ----------- TERMÉK KIVÁLASZTÁSA -----------
        tk.Label(self.root, text="Legutolsó generált árajánlat szerkesztéséhez válassza ki a terméktípust", font=self.normal_font).pack(pady=10)

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

        # ----------- SUBMIT GOMB -----------
        self.submit_button = tk.Button(self.root, text="Submit", command=self.submit_data, font=self.normal_font)
        self.submit_button.pack(pady=20)
        self.is_submitted = False

        # only a placeholder at the bottom of the form to scroll down entirely
        # tk.Label(self.root, text="", font=self.normal_font).pack(pady=30)
    
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

    
    def get_clean_entry_val(self, entry: tk.Entry, replace_from=" ", replace_to="", skip_replace=False) -> str:
        if not skip_replace:
            return entry.get().strip().replace("_", "").replace(replace_from, replace_to)
        else:
            return entry.get().strip().replace("_", "")

    # ------------------ SUBMIT ------------------
    def submit_data(self):

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
                # termek_tipusa = TermekTipus.KarosNapellenzos
                messagebox.showwarning("Hiba!", f"Ez a termék ({TermekTipus.KarosNapellenzos}) nem elérhető...")
                return
            elif self.selected_product_name == TermekTipus.Polikarbonatos.value:
                termek_tipusa = TermekTipus.Polikarbonatos
            elif self.selected_product_name == TermekTipus.Uvegfalas.value:
                termek_tipusa = TermekTipus.Uvegfalas
            elif self.selected_product_name == TermekTipus.Uvegtetos.value:
                termek_tipusa = TermekTipus.Uvegtetos
            elif self.selected_product_name == TermekTipus.Zipes.value:
                termek_tipusa = TermekTipus.Zipes
            else:
                text = f"Nincs ilyen termék: {self.selected_product_name}"
                messagebox.showerror(f"Nincs ilyen termék", text)
                # raise Exception(text)
        else:
            text = "Termék típusa nincs kiválasztva"
            messagebox.showwarning(f"Hiba a bevitt adatokban", text)
            # raise Exception(text)

        renderer = Renderer()
        if not renderer.is_last_edited_exists(termek_tipusa):
            text = f"Nincsen még generálva a kiválasztott termékben árajánlat ({termek_tipusa.value}). A(z) {self.title} használatához generálj egy ajánlatot az általad kiválaszott terméktípusban."
            messagebox.showwarning(f"Legutolsó árajánlat nem található a kiválasztott típusban", text)
            # raise Exception(text)
        else:
            renderer.edit_last_template(termek_tipusa)
            exit()



def main():
    root = tk.Tk()
    app = EditorWindow(root)
    root.mainloop()


# if __name__ == "__main__":
#     main()


#######################################################################################################################################
#######################################################################################################################################

# def main():
#     print("\n\n\n")
#     print("""
#                   # ## ### ############################################################# ### ## #
          
#                             A szerkesztési lehetőség még nincsen kész...
#                             Hamarosan ez is elkészül!
#                             A főbb munkálatok eddig a bioklimatikus pergolánál folytak!
          
#                   # ## ### ############################################################# ### ## #
#     """)
#     print("\n\n\n")
#     # raise NotImplementedError()

#######################################################################################################################################
#######################################################################################################################################
 #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #
############################################################# FileDropApp #############################################################
 #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #   #
#######################################################################################################################################
#######################################################################################################################################

# import os
# import sys
# import subprocess
# import tkinter as tk
# from tkinter import messagebox
# from tkinterdnd2 import TkinterDnD, DND_FILES

# class FileDropApp:
#     def __init__(self):
#         self.root = TkinterDnD.Tk()
#         self.root.title("File Drop Viewer")
#         self.root.minsize(600, 400)
#         self.root.configure(bg="#f0f0f0")

#         self.drop_area = tk.Frame(
#             self.root,
#             width=400,
#             height=200,
#             bg="#ffffff",
#             highlightthickness=3,
#             highlightbackground="#cccccc"
#         )
#         self.drop_area.place(relx=0.5, rely=0.5, anchor="center")

#         self.label = tk.Label(
#             self.drop_area,
#             text="Drag & drop a file here",
#             font=("Helvetica", 12),
#             bg="#ffffff",
#             fg="#333333"
#         )
#         self.label.place(relx=0.5, rely=0.5, anchor="center")

#         self.drop_area.drop_target_register(DND_FILES)
#         self.drop_area.dnd_bind("<<Drop>>", self.on_drop)

#     def flash_feedback(self, color="#cceeff", duration=200):
#         """Briefly change the drop area background and border for visual feedback."""
#         self.drop_area.configure(bg=color, highlightbackground="#3399ff")
#         self.label.configure(bg=color)
#         self.root.after(duration, self.reset_visuals)
#         # self.root.after(500, None)

#     def reset_visuals(self):
#         self.drop_area.configure(bg="#ffffff", highlightbackground="#cccccc")
#         self.label.configure(bg="#ffffff")

#     def on_drop(self, event):
#         self.flash_feedback()

#         files = self.root.tk.splitlist(event.data)
#         if not files:
#             return event.action
#         if len(files) > 1:
#             messagebox.showwarning("Multiple Files", "Only one file at a time.")
#         file_path = files[0]
#         ext = os.path.splitext(file_path)[1].lower()

#         # if ext == ".pdf":
#         #     try:
#         #         if sys.platform.startswith("win"):
#         #             os.startfile(file_path)
#         #         elif sys.platform == "darwin":
#         #             subprocess.run(["open", file_path])
#         #         else:
#         #             subprocess.run(["xdg-open", file_path])
#         #     except Exception as e:
#         #         messagebox.showerror("Error Opening File", f"Could not open PDF:\n{e}")
#         # else:
#         #     messagebox.showinfo("Unsupported File", f"Unsupported file type: {ext}")
#         return event.action

#     def run(self):
#         self.root.mainloop()

# def main():
#     app = FileDropApp()
#     app.run()


