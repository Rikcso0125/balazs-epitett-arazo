import argparse

def main():
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers()

    run_parser = subparsers.add_parser( "run", help="Run the application.")
    run_subparsers = run_parser.add_subparsers()
    
    ################### FORM GUI ###################
    def run_formGUI(args):
        print('\nRunning Form.\n')

        ##################
        # # TEST FORM GUI
        GUI_ENABLED = True
        if GUI_ENABLED:
            from backend import form_gui
            form_data = form_gui.main()

        ##################
        else:
            from backend import FormData, BeepitesTipus, TermekTipus
            from backend import bioklimatikus_editor
            from backend import feszitett_vasznas_editor
            from backend import polikarbonatos_editor
            from backend import uvegtetos_editor
            # from backend import karos_napellenzos_editor
            from backend import ZIPes_editor
            from backend import feszitett_vasznas_tetore_editor
            from backend import elhuzhato_ponyvas_editor
            from backend import uvegfalas_editor

            form_data = FormData(
                name = "Henrietta",
                telepules="Budapest",
                szallitasi_dij = 40000,
                eur_huf_arfolyam = 400,
                termek_tipusa = TermekTipus.FeszitettVasznasTetore,
                beepites_tipusa = BeepitesTipus.EpulethezRogzitett,
                projection = 700, # Balazs szelesseg (A)
                width = 500,      # Balazs kinyulas (B)
                height = 250,     # Balazs magassag (C)
                is_uvegfal_rendszer_enabled = True,
                is_oldalso_arnyekolo_enabled = True,
                is_opcio_led_vilagitas_enabled=True,
            )
        
            if form_data is not None and form_data.termek_tipusa == TermekTipus.Bioklimatikus:
                bioklimatikus_editor(form_data)
            if form_data is not None and form_data.termek_tipusa == TermekTipus.FeszitettVasznas:
                feszitett_vasznas_editor(form_data)
            if form_data is not None and form_data.termek_tipusa == TermekTipus.Polikarbonatos:
                polikarbonatos_editor(form_data)
            if form_data is not None and form_data.termek_tipusa == TermekTipus.Uvegtetos:
                uvegtetos_editor(form_data)
            if form_data is not None and form_data.termek_tipusa == TermekTipus.Zipes:
                ZIPes_editor(form_data)
            # if form_data is not None and form_data.termek_tipusa == TermekTipus.KarosNapellenzos: # End-Of-Life
            #     karos_napellenzos_editor(form_data) # End-Of-Life
            if form_data is not None and form_data.termek_tipusa == TermekTipus.FeszitettVasznasTetore:
                feszitett_vasznas_tetore_editor(form_data)
            if form_data is not None and form_data.termek_tipusa == TermekTipus.ElhuzhatoPonyvas:
                elhuzhato_ponyvas_editor(form_data)
            if form_data is not None and form_data.termek_tipusa == TermekTipus.Uvegfalas:
                uvegfalas_editor(form_data)

    p = run_subparsers.add_parser('FormGUI')
    p.set_defaults(func=run_formGUI)


    #################### EDITOR ####################
    def run_editor(args):
        print('\nRunning Editor.\n')
        from backend import edit_quote

        edit_quote.main()

    p = run_subparsers.add_parser('Editor')
    p.set_defaults(func=run_editor)
    

    #################### PARSER ####################
    def bad_args(arguments):
        parser.print_help()
        exit(0)
    parser.set_defaults(func=bad_args)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()





    




