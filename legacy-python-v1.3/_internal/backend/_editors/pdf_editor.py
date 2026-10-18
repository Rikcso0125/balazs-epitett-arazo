import tkinter as tk
from tkinter import filedialog, messagebox
from PyPDF2 import PdfReader
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import os

class PDFEditorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Simple PDF Text Editor")
        self.file_path = None

        # Set up menu
        menu_bar = tk.Menu(root)
        file_menu = tk.Menu(menu_bar, tearoff=0)
        file_menu.add_command(label="Open", command=self.open_pdf)
        file_menu.add_command(label="Save As", command=self.save_pdf)
        file_menu.add_separator()
        file_menu.add_command(label="Exit", command=root.quit)
        menu_bar.add_cascade(label="File", menu=file_menu)
        root.config(menu=menu_bar)

        # Set up text widget
        self.text = tk.Text(root, wrap=tk.WORD)
        self.text.pack(expand=1, fill=tk.BOTH)

    def open_pdf(self):
        """Open a PDF file and load its text into the editor."""
        path = filedialog.askopenfilename(
            filetypes=[("PDF Files", "*.pdf")]
        )
        if not path:
            return
        try:
            reader = PdfReader(path)
            text_content = []
            for page in reader.pages:
                text_content.append(page.extract_text() or "")
            full_text = "\n\n".join(text_content)
            self.text.delete(1.0, tk.END)
            self.text.insert(tk.END, full_text)
            self.file_path = path
            self.root.title(f"Simple PDF Text Editor - {os.path.basename(path)}")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to open PDF:\n{e}")

    def save_pdf(self):
        """Save the edited text back to a PDF file."""
        if not self.text.get(1.0, tk.END).strip():
            messagebox.showwarning("Warning", "Text is empty. Nothing to save.")
            return

        path = filedialog.asksaveasfilename(
            defaultextension=".pdf",
            filetypes=[("PDF Files", "*.pdf")]
        )
        if not path:
            return
        try:
            content = self.text.get(1.0, tk.END).splitlines()
            c = canvas.Canvas(path, pagesize=letter)
            width, height = letter
            margin = 40
            y = height - margin
            line_height = 12

            for line in content:
                if y < margin:
                    c.showPage()
                    y = height - margin
                c.drawString(margin, y, line)
                y -= line_height

            c.save()
            messagebox.showinfo("Success", f"PDF saved successfully to {path}")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save PDF:\n{e}")

if __name__ == "__main__":
    root = tk.Tk()
    app = PDFEditorApp(root)
    root.geometry("800x600")
    root.mainloop()
