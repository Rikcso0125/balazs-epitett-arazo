
# https://jinja.palletsprojects.com/en/stable/templates/

from jinja2 import Environment, Undefined # Template, StrictUndefined, Undefined
from termcolor import colored
from datetime import datetime
import re
import os

from backend.utils import html2pdf
from backend.utils import FormData, TermekTipus
from backend.utils import TermekTipus_to_TermekNevRoviden
from backend.utils import open_quote_editor

class Renderer:
    def __init__(self):
        self._root_path = os.path.join("_internal", "backend", "templates")
        self._pdf_root_path = "ajanlatok"
        self._pdf_suffix = "árajánlat"
        self._pdf_suffix_edited = "árajánlat-szerkesztve"
        self._temp_html_prefix = "temp-last-quote"


    def _generate_unique_pdf_name(self, data: FormData, edited=False):
        now = datetime.now()
        timestamp = now.strftime("%Y%m%d-%H%M%S")
        telepules = data.telepules
        name = data.name.replace(' ', '-')
        termek_nev = TermekTipus_to_TermekNevRoviden(data.termek_tipusa).value.replace('_', '-')

        if not edited:
            filename = f"{timestamp}_{telepules}_{name}_{termek_nev}_{self._pdf_suffix}.pdf"
        else:
            filename = f"{timestamp}_{telepules}_{name}_{termek_nev}_{self._pdf_suffix_edited}.pdf"

        return filename


    def _generate_last_temp_html_name(self, data: FormData):
        telepules = data.telepules
        name = data.name.replace(' ', '-')
        
        filename = f"{self._temp_html_prefix}_{telepules}_{name}.html"
        return filename


    def render_template(self, form_data: FormData, html_variables : dict):
        template_path = os.path.join(self._root_path, form_data.termek_tipusa.value)

        # Template betöltés + renderelés:
        filename = os.path.join(template_path, "template.html")
        file = open(filename, "r", encoding='utf-8')
        data = file.read()

        variables = DetectVariables(data)
        UndefinedVariables = _get_UndefinedVariables_class(variables)

        env = Environment(undefined=UndefinedVariables)
        template = env.from_string(data)
        rendered_html = template.render(html_variables)

        temp_html_filename = self._generate_last_temp_html_name(form_data)
        temp_html_path = os.path.join(template_path, temp_html_filename)
        with open(temp_html_path, "w", encoding="utf-8") as f:
            f.write(rendered_html)
        
        output_filename = self._generate_unique_pdf_name(form_data)
        output_filepath = os.path.join(self._pdf_root_path, output_filename)

        html2pdf(temp_html_path, output_filepath, remove_current_html=False)

        variables.show_missing_variables()

        print(f"\n✅ Az {output_filename} fájl sikeresen generálva lett!")
        os.startfile(output_filepath)


    def _get_last_temp_html_filename(self, path):
        if os.path.exists(path):
            for filename in os.listdir(path):
                if filename.startswith(self._temp_html_prefix):
                    return filename
        return None


    def _get_form_data_from_last_temp_html_filename(self, filename):
        # f"{self._temp_html_prefix}_{telepules}_{name}.html"
        if filename is not None:
            segments, ext = os.path.splitext(filename)
            prefix, telepules, name = segments.split('_')
            return FormData(telepules=telepules, name=name)
        return None
        
        
    def is_last_edited_exists(self, termek_tipusa: TermekTipus):
        template_path = os.path.join(self._root_path, termek_tipusa.value)
        temp_html_filename = self._get_last_temp_html_filename(template_path)

        if temp_html_filename is not None:
            temp_html_path = os.path.join(template_path, temp_html_filename)
            return os.path.exists(temp_html_path)
        else:
            return False
        

    def edit_last_template(self, termek_tipusa: TermekTipus):
        template_path = os.path.join(self._root_path, termek_tipusa.value)

        temp_html_filename = self._get_last_temp_html_filename(template_path)

        if temp_html_filename is not None:
            form_data = self._get_form_data_from_last_temp_html_filename(temp_html_filename)
            form_data.termek_tipusa = termek_tipusa
            temp_html_path = os.path.join(template_path, temp_html_filename)

            open_quote_editor(temp_html_path, wait_for_window_close=True)
        
            output_filename = self._generate_unique_pdf_name(form_data, edited=True)
            output_filepath = os.path.join(self._pdf_root_path, output_filename)

            html2pdf(temp_html_path, output_filepath, remove_current_html=False)

            print(f"\n✅ Az {output_filename} fájl sikeresen generálva lett!")
            os.startfile(output_filepath)



class DetectVariables:
    def __init__(self, template_data):
        self.data = template_data
        self.missing_variables = []

        self.all_variables_info = []

        pattern = re.compile(r"{{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*}}")
        for lineno, line in enumerate(template_data.splitlines(), start=1):
            for match in pattern.finditer(line):
                varname = match.group(1)
                context = line.strip()
                self.all_variables_info.append((varname, lineno, context))

    def append(self, var):
        self.missing_variables.append(var)

    def show_missing_variables(self):
        if self.missing_variables:
            is_listing = input("There are missing variables. Do you want to list report? [y (or enter); n]: ")
            if is_listing.lower() == "n":
                return
            missing_var_count = 0
            unique_missing_vars = list()
            print("\n⚠️  Hiányzó változók:", sorted(self.missing_variables))
            for varname in self.missing_variables:
                for var_name, lineno, context in self.all_variables_info:
                    if varname == var_name:
                        missing_var_count += 1
                        if var_name not in unique_missing_vars:
                            unique_missing_vars.append(var_name)
                        print(colored(f"  - {missing_var_count}) '{var_name}' a(z) {lineno}. sorban:", 'red'), f"\n\t {context}")
            print(colored(f"\nÖsszesen {missing_var_count} változó hiányzik, aminek értéket kellene adni a html-ben.\nEbből egyedi változónév: {len(unique_missing_vars)} db", 'yellow'))
            is_listing_unique_vars_in_order = input("Do you want to list all variables in order? [y; n (or enter)]: ")
            if is_listing_unique_vars_in_order.lower() == "y":
                print()
                for var in unique_missing_vars:
                    print(f"\t {var}")

                input("\nPress enter to continue!")


def _get_UndefinedVariables_class(variables: DetectVariables, debug=True):
    class UndefinedVariables(Undefined):
        def __str__(self):
            varname = self._undefined_name
            variables.append(varname)
            if debug:
                return "{{ " + varname + " }}"
            else:
                return ""
    return UndefinedVariables


