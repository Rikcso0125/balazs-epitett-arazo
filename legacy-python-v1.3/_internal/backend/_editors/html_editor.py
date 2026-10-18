import tkinter as tk
from tkinter import font, colorchooser, simpledialog, messagebox, filedialog

class HTMLTextEditor(tk.Tk):
    def __init__(self):
        super().__init__()

        self.title("HTML Text Editor")
        self.geometry("800x600")

        # Set up the text widget
        self.text = tk.Text(self, wrap=tk.WORD, font=("Arial", 12), undo=True)
        self.text.pack(fill=tk.BOTH, expand=True)

        # Create the toolbar frame
        toolbar = tk.Frame(self)
        toolbar.pack(fill=tk.X)

        # Add buttons to the toolbar
        self.bold_button = tk.Button(toolbar, text="B", command=self.toggle_bold)
        self.bold_button.pack(side=tk.LEFT)

        self.underline_button = tk.Button(toolbar, text="U", command=self.toggle_underline)
        self.underline_button.pack(side=tk.LEFT)

        self.color_button = tk.Button(toolbar, text="Color", command=self.change_color)
        self.color_button.pack(side=tk.LEFT)

        self.size_button = tk.Button(toolbar, text="Size", command=self.change_size)
        self.size_button.pack(side=tk.LEFT)

        self.save_button = tk.Button(toolbar, text="Save", command=self.save_text)
        self.save_button.pack(side=tk.LEFT)

        self.create_menubar()

    def create_menubar(self):
        menubar = tk.Menu(self)
        
        file_menu = tk.Menu(menubar, tearoff=0)
        file_menu.add_command(label="Open", command=self.open_file)
        file_menu.add_command(label="Save", command=self.save_text)
        file_menu.add_separator()
        file_menu.add_command(label="Exit", command=self.quit)
        
        menubar.add_cascade(label="File", menu=file_menu)
        self.config(menu=menubar)

    def toggle_bold(self):
        current_tags = self.text.tag_names("sel.first")
        if "bold" in current_tags:
            self.text.tag_remove("bold", "sel.first", "sel.last")
        else:
            self.text.tag_add("bold", "sel.first", "sel.last")
            self.text.tag_configure("bold", font=("Arial", 12, "bold"))

    def toggle_underline(self):
        current_tags = self.text.tag_names("sel.first")
        if "underline" in current_tags:
            self.text.tag_remove("underline", "sel.first", "sel.last")
        else:
            self.text.tag_add("underline", "sel.first", "sel.last")
            self.text.tag_configure("underline", underline=True)

    def change_color(self):
        color = colorchooser.askcolor()[1]
        if color:
            current_tags = self.text.tag_names("sel.first")
            if "color" in current_tags:
                self.text.tag_remove("color", "sel.first", "sel.last")
            self.text.tag_add("color", "sel.first", "sel.last")
            self.text.tag_configure("color", foreground=color)

    def change_size(self):
        size = simpledialog.askinteger("Select Size", "Enter font size:", minvalue=8, maxvalue=72)
        if size:
            current_tags = self.text.tag_names("sel.first")
            if "size" in current_tags:
                self.text.tag_remove("size", "sel.first", "sel.last")
            self.text.tag_add("size", "sel.first", "sel.last")
            self.text.tag_configure("size", font=("Arial", size))

    def save_text(self):
        # Get the content of the Text widget
        text_content = self.text.get("1.0", tk.END)
        
        # Process the content to save it as HTML with styles
        html_content = self.convert_to_html(text_content)

        # Ask for the filename
        file_path = filedialog.asksaveasfilename(defaultextension=".html", filetypes=[("HTML files", "*.html")])
        if file_path:
            try:
                with open(file_path, "w") as file:
                    file.write("<html><body>\n")
                    file.write(html_content)
                    file.write("\n</body></html>")
                messagebox.showinfo("Save", "Text saved successfully as HTML!")
            except Exception as e:
                messagebox.showerror("Error", f"An error occurred: {e}")

    def convert_to_html(self, text_content):
        # Replace newline characters with <br> tags
        html_content = text_content.replace("\n", "<br>")

        # Now, let's process the tags and convert them to HTML
        # Bold
        html_content = self.apply_tag_to_html(html_content, "bold", "<strong>", "</strong>")
        
        # Underline
        html_content = self.apply_tag_to_html(html_content, "underline", "<ins>", "</ins>")
        
        # Color
        html_content = self.apply_color_to_html(html_content, "color")

        # Font size
        html_content = self.apply_size_to_html(html_content, "size")

        return html_content

    def apply_tag_to_html(self, html_content, tag_name, start_tag, end_tag):
        # Add start and end HTML tags for the given tag
        start = f"<{tag_name}>"
        end = f"</{tag_name}>"

        if start in html_content:
            html_content = html_content.replace(start, start_tag).replace(end, end_tag)

        return html_content

    def apply_color_to_html(self, html_content, tag_name):
        # Replace color tags with inline style
        start_tag = f'<span style="color:'
        end_tag = '">'

        if tag_name in self.text.tag_names():
            color = self.text.tag_configure(tag_name)["foreground"]
            html_content = html_content.replace(f"<{tag_name}>", f'{start_tag}{color}{end_tag}')

        return html_content

    def apply_size_to_html(self, html_content, tag_name):
        # Replace size tags with inline style
        start_tag = f'<span style="font-size:'
        end_tag = '">'

        if tag_name in self.text.tag_names():
            size = self.text.tag_configure(tag_name)["font"][1]
            html_content = html_content.replace(f"<{tag_name}>", f'{start_tag}{size}px{end_tag}')

        return html_content

    def open_file(self):
        file_path = filedialog.askopenfilename(filetypes=[("HTML files", "*.html")])
        if file_path:
            try:
                with open(file_path, "r", encoding='utf-8') as file:
                    content = file.read()
                    self.text.delete(1.0, tk.END)  # Clear the existing content
                    self.text.insert(tk.END, content)
            except Exception as e:
                messagebox.showerror("Error", f"An error occurred: {e}")

if __name__ == "__main__":
    app = HTMLTextEditor()
    app.mainloop()
