# https://github.com/quandyfactory/PyHtmlEdit/tree/master

import subprocess


def edit(html_filepath=None, wait_for_window_close=True):
    # Adjust the path and file as necessary
    # seamonkey_path = "C:\\Program Files (x86)\\SeaMonkey\\seamonkey.exe"
    seamonkey_path = "_internal/SeaMonkey/seamonkey.exe"

    if html_filepath:
        # Launch SeaMonkey Composer with the file
        proc = subprocess.Popen([seamonkey_path, "-edit", html_filepath])
    else:
        # Launch SeaMonkey Composer without file
        proc = subprocess.Popen([seamonkey_path, "-edit"])
    if wait_for_window_close:
        proc.wait()


def open_quote_editor(html_filepath, wait_for_window_close): # THIS method is for testing purposes ONLY
    # print("editing happens here...")
    # not_implemented()
    edit(html_filepath, wait_for_window_close)
    return html_filepath


def not_implemented():
    print("\n\n\n")
    print("""
                  # ## ### ############################################################# ### ## #
          
                            Az árajánlat szerkesztő jelenleg még nincsen kész...
                            Hamarosan ez is elkészül!
                            A főbb munkálatok eddig a pergola termékeknél folytak!
          
                  # ## ### ############################################################# ### ## #
    """)
    print("\n\n\n")
    exit()
    # raise NotImplementedError()

def main():
    html_file = input("enter the html file path you want to edit: ")
    edit(html_file)
    print("Exit code: 0")
    
if __name__ == "__main__":
    main()
