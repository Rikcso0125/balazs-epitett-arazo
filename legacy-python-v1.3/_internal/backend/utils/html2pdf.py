# from weasyprint import HTML
import fitz  # PyMuPDF
import os
import pdfkit
import imgkit

def convert_html_to_image(html_file_path):
    config = imgkit.config(wkhtmltoimage='_internal/wkhtmltopdf/bin/wkhtmltoimage.exe')
    file = os.path.split(html_file_path)[1]
    filename, ext = os.path.splitext(file)
    try:
        imgkit.from_file(html_file_path, filename+'.jpg', config=config, options={'enable-local-file-access': ''})
    except Exception as e:
        print("Exception happened during html2image conversion", e)

def convert_html_to_pdf(html_path, output_pdf_path="ajanlatok/temp.pdf"):
    config = pdfkit.configuration(wkhtmltopdf='_internal/wkhtmltopdf/bin/wkhtmltopdf.exe')

    options = {
        'enable-local-file-access': '',  # Needed to load local CSS, images, etc.
        'margin-top': '1.30in',
        'margin-left': '0.90in',
        'margin-right': '0.90in',
        'margin-bottom': '0.98in',
        'print-media-type': '',
        'background': '',  # Print background graphics
        'encoding': 'UTF-8',
    }

    # try:
    pdfkit.from_file(html_path, output_pdf_path, configuration=config, options=options)
    # print(f"PDF successfully created: {output_pdf_path}")
    return output_pdf_path
    # except Exception as e:
    #     print("Exception happened during html2pdf conversion:", e)
    #     raise IOError()


def add_header_footer_to_pdf(input_path, output_path):
    image_path = "_internal/backend/resource/header_footer/header_footer.jpg"
    
    doc = fitz.open(input_path)
    img_rect = fitz.Rect(0, 0, doc[0].rect.width, doc[0].rect.height)

    for page in doc: # Apply the image as a background to each page
        page.insert_image(img_rect, filename=image_path, overlay=False) # overlay=False => background

    doc.save(output_path)
    doc.close()


def html2pdf(html_path, pdf_output_path, remove_current_html=False, remove_previous_htmls=True):
    os.makedirs(os.path.split(pdf_output_path)[0], exist_ok=True)
    temp_pdf_path = convert_html_to_pdf(html_path)

    if remove_current_html:
        os.remove(html_path)

    if remove_previous_htmls:
        path, filename = os.path.split(html_path)
        segments, ext = os.path.splitext(filename)
        prefix, telepules, name = segments.split('_')
        for file in os.listdir(path):
            filepath = os.path.join(path, file)
            if os.path.isfile(filepath) and file.startswith(prefix) and file.endswith(ext):
                if file != filename:
                    os.remove(filepath)


    add_header_footer_to_pdf(temp_pdf_path, pdf_output_path)
    os.remove(temp_pdf_path)

    

