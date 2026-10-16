# -*- coding: utf-8 -*-
import sys
import os
import json
import shutil
from datetime import datetime
import fitz  # PyMuPDF
from PIL import Image


HONAPOK_RAGVAL = {
    1: "Január 31-ig",
    2: "Február 28-ig",
    3: "Március 31-ig",
    4: "Április 30-ig",
    5: "Május 31-ig",
    6: "Június 30-ig",
    7: "Július 31-ig",
    8: "Augusztus 31-ig",
    9: "Szeptember 30-ig",
    10: "Október 31-ig",
    11: "November 30-ig",
    12: "December 31-ig",
}


def fmt_dot(val):
    """Formats numbers like 15.500 or 5.642.000 (matching original OpenSky PDFs)."""
    try:
        n = int(round(float(val or 0)))
        return f"{n:,}".replace(",", ".")
    except Exception:
        return "0"


def fmt_plain(val):
    try:
        return str(int(round(float(val or 0))))
    except Exception:
        return "0"


def get_month_deadline_str():
    now = datetime.now()
    return HONAPOK_RAGVAL.get(now.month, "hónap végéig")


def prepare_images(legacy_root, termek_tipus, work_img_dir):
    """
    Copies and prepares images into work_img_dir so that:
    1) Portrait photos (like bioklimatikus image_01.jpg 1126x1501 and image_02.jpg 480x640)
       are cropped to their exact horizontal window from the original Google Docs template,
       preventing any horizontal stretching/squishing.
    2) Shared reference assets (RAL chart, Glass Wall rails & photo, ZIP photo,
       Debreczeni Balázs business card) are always available.
    """
    os.makedirs(work_img_dir, exist_ok=True)

    folder_map = {
        "bioklimatikus": "bioklimatikus",
        "elhuzhato_ponyvas": "elhuzhato_ponyvas",
        "feszitett_vasznas": "feszitett_vasznas",
        "feszitett_vasznas_tetore": "feszitett_vasznas_tetore",
        "polikarbonatos": "polikarbonatos",
        "uvegfalas": "uvegfalas",
        "uvegtetos": "uvegtetos",
        "ZIPes": "ZIPes",
    }
    folder = folder_map.get(termek_tipus, "bioklimatikus")
    bioklim_img_dir = os.path.join(
        legacy_root, "_internal", "backend", "templates", "bioklimatikus", "images"
    )
    cat_img_dir = os.path.join(
        legacy_root, "_internal", "backend", "templates", folder, "images"
    )
    if not os.path.exists(cat_img_dir):
        cat_img_dir = bioklim_img_dir

    # Copy shared assets from bioklimatikus/images
    shared_map = {
        "image_01.jpg": ("_bio_01.jpg", (0.2856, 0.7451)),
        "image_02.jpg": ("_bio_02.jpg", (0.2056, 0.5909)),
        "image_03.jpg": ("_bio_03.jpg", None),
        "image_09.png": ("_bio_09.png", None),
        "image_10.png": ("_bio_10.png", None),
        "image_11.png": ("_ral_25.png", None),
        "image_13.png": ("_bio_13.png", None),
        "image_14.jpg": ("_bio_14.jpg", None),
        "image_16.png": ("_ral_5.png", None),
        "image_17.png": ("_uveg_rails.png", None),
        "image_18.jpg": ("_uveg_photo.jpg", None),
        "image_19.png": ("_zip_photo.png", None),
        "image_20.jpg": ("_balazs_card.jpg", None),
    }

    for src_name, (dst_name, crop_y) in shared_map.items():
        src_path = os.path.join(bioklim_img_dir, src_name)
        dst_path = os.path.join(work_img_dir, dst_name)
        if os.path.exists(src_path):
            if crop_y is not None:
                with Image.open(src_path) as im:
                    w, h = im.size
                    y1 = int(round(h * crop_y[0]))
                    y2 = int(round(h * crop_y[1]))
                    cropped = im.crop((0, y1, w, y2))
                    cropped.save(dst_path, quality=92)
            else:
                shutil.copy2(src_path, dst_path)

    # Also copy category-specific product photos if not bioklimatikus
    cat_photos = []
    if folder != "bioklimatikus" and os.path.exists(cat_img_dir):
        all_files = sorted(
            [
                f
                for f in os.listdir(cat_img_dir)
                if f.lower().endswith((".jpg", ".jpeg", ".png"))
            ]
        )
        # Exclude the last image which is always the business card (625x288)
        for idx, fn in enumerate(all_files[:-1]):
            src_path = os.path.join(cat_img_dir, fn)
            try:
                with Image.open(src_path) as im:
                    w, h = im.size
                    # Skip thin divider bars (height < 200)
                    if h < 200:
                        continue
                    dst_name = f"_cat_{idx:02d}{os.path.splitext(fn)[1].lower()}"
                    dst_path = os.path.join(work_img_dir, dst_name)
                    if h > w * 1.1:
                        # Portrait photo -> crop center landscape band so it is never stretched
                        cropped = im.crop((0, int(h * 0.22), w, int(h * 0.74)))
                        cropped.save(dst_path, quality=92)
                    else:
                        shutil.copy2(src_path, dst_path)
                    cat_photos.append(dst_name)
            except Exception:
                pass

    return cat_photos


def img_html(work_img_dir, filename, target_width_pt, max_height_pt=None, align="center"):
    """
    Generates an <img> tag with exact proportional width & height in points
    calculated from the actual image pixel dimensions so aspect ratio is 100% preserved.
    """
    img_path = os.path.join(work_img_dir, filename)
    if not os.path.exists(img_path):
        return ""
    try:
        with Image.open(img_path) as im:
            w_px, h_px = im.size
        if w_px <= 0 or h_px <= 0:
            return ""
        ratio = h_px / float(w_px)
        w_pt = float(target_width_pt)
        h_pt = w_pt * ratio
        if max_height_pt is not None and h_pt > max_height_pt:
            h_pt = float(max_height_pt)
            w_pt = h_pt / ratio
        w_int = int(round(w_pt))
        h_int = int(round(h_pt))
        return f'<p style="text-align:{align};margin:6pt 0;"><img src="{filename}" width="{w_int}" height="{h_int}" /></p>'
    except Exception:
        return ""


COMMON_STYLE = """
<style>
  body {
    font-family: Calibri, Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.28;
    color: #000000;
  }
  p {
    margin-top: 2pt;
    margin-bottom: 2pt;
  }
  ul {
    margin-top: 2pt;
    margin-bottom: 2pt;
  }
  li {
    font-size: 10pt;
    font-weight: bold;
    margin-bottom: 1.5pt;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 4pt;
    margin-bottom: 6pt;
  }
  td {
    border: 0.5pt solid #000000;
    padding: 3pt 4.5pt;
    font-size: 9.8pt;
    vertical-align: middle;
  }
</style>
"""


def wrap_html(inner_html):
    return f"""<!DOCTYPE html>
<html lang="hu">
<head>
<meta charset="UTF-8">
{COMMON_STYLE}
</head>
<body>
{inner_html}
</body>
</html>"""


def resolve_custom_photo_file(url_str, idx, slot, legacy_root, work_img_dir):
    """
    Resolves a photo URL (e.g. '/api/template-images/bioklimatikus/image_01.jpg'
    or '/api/template-images/uploaded/foo.jpg' or '/uploads/templates/foo.jpg')
    to a prepared local filename inside work_img_dir.
    """
    if not url_str or not isinstance(url_str, str):
        return None
    url_clean = url_str.strip()
    web_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    category = None
    fn = None
    if url_clean.startswith("/api/template-images/"):
        rest = url_clean[len("/api/template-images/") :]
        parts = [p for p in rest.split("/") if p]
        if len(parts) >= 2:
            category, fn = parts[0], parts[1]
    elif url_clean.startswith("/uploads/templates/"):
        category = "uploaded"
        fn = url_clean.split("/")[-1]

    if not category or not fn:
        return None

    # Use pre-cropped bioklimatikus image_01 and image_02 if selected
    if category == "bioklimatikus" and fn == "image_01.jpg":
        return "_bio_01.jpg"
    if category == "bioklimatikus" and fn == "image_02.jpg":
        return "_bio_02.jpg"

    if category == "uploaded":
        src_path = os.path.join(web_root, "public", "uploads", "templates", fn)
    else:
        src_path = os.path.join(
            legacy_root, "_internal", "backend", "templates", category, "images", fn
        )

    if not os.path.exists(src_path):
        return None

    ext = os.path.splitext(fn)[1].lower() or ".jpg"
    dst_name = f"_opt_{idx}_p{slot}_{category}_{os.path.splitext(fn)[0]}{ext}"
    dst_path = os.path.join(work_img_dir, dst_name)
    try:
        with Image.open(src_path) as im:
            w, h = im.size
            if category != "uploaded" and h > w * 1.15:
                # Legacy portrait photo -> crop center horizontal band so it fits cleanly
                cropped = im.crop((0, int(h * 0.22), w, int(h * 0.74)))
                cropped.save(dst_path, quality=92)
            else:
                shutil.copy2(src_path, dst_path)
        return dst_name
    except Exception:
        return None


def get_option_photos_and_descs(
    opt, idx, config, legacy_root, work_img_dir, cat_photos, default_photo_pairs
):
    """
    Returns (file1, desc1, file2, desc2) for the given option (1-indexed idx).
    """
    pair = default_photo_pairs[(idx - 1) % len(default_photo_pairs)]
    if idx == 1 and cat_photos:
        def_f1 = cat_photos[0]
        def_f2 = cat_photos[1] if len(cat_photos) > 1 else "_bio_02.jpg"
    else:
        def_f1 = pair[0]
        def_f2 = pair[1]

    pdf_photos = opt.get("pdfPhotos")
    if not pdf_photos:
        model_id = opt.get("modelId")
        models_cfg = (config or {}).get("models") or {}
        if model_id and model_id in models_cfg:
            pdf_photos = models_cfg[model_id].get("pdfPhotos")

    f1, d1 = def_f1, ""
    f2, d2 = def_f2, ""

    if isinstance(pdf_photos, list):
        if len(pdf_photos) >= 1 and isinstance(pdf_photos[0], dict):
            custom_f1 = resolve_custom_photo_file(
                pdf_photos[0].get("url"), idx, 1, legacy_root, work_img_dir
            )
            if custom_f1:
                f1 = custom_f1
            d1 = (pdf_photos[0].get("description") or "").strip()
        if len(pdf_photos) >= 2 and isinstance(pdf_photos[1], dict):
            custom_f2 = resolve_custom_photo_file(
                pdf_photos[1].get("url"), idx, 2, legacy_root, work_img_dir
            )
            if custom_f2:
                f2 = custom_f2
            d2 = (pdf_photos[1].get("description") or "").strip()

    return f1, d1, f2, d2


def build_story_sections(quote, config, legacy_root, work_img_dir, cat_photos):
    customer_name = quote.get("customerName") or "Ügyfél"
    greeting_name = quote.get("greetingName") or customer_name.split(" ")[-1]
    city = quote.get("city") or "Budapest"
    projection = int(quote.get("projection") or 400)
    width = int(quote.get("width") or 350)
    height = int(quote.get("height") or 250)
    eur_rate = int(round(float(quote.get("eurHufRate") or 400)))
    szallitas_huf = int(round(float(quote.get("szallitasiDijHuf") or 40000)))
    beepites = quote.get("beepitesTipus") or "Épülethez rögzített"
    custom_notes = (quote.get("customNotes") or "").strip()

    has_led = bool(quote.get("hasLed", True))
    has_zip = bool(quote.get("hasZip", True))
    has_uvegfal = bool(quote.get("hasUvegfal", True))
    has_heating = bool(quote.get("hasHeating", True))
    has_sensors = bool(quote.get("hasSensors", True))

    options = [o for o in (quote.get("calculatedOptions") or []) if o.get("enabled", True)]
    if not options and quote.get("calculatedOptions"):
        options = quote.get("calculatedOptions")

    if beepites == "Épülethez rögzített":
        beepites_mondat = "A pergolát falhoz rögzítve, elől 2 db lábbal építenénk"
        hany_labon_all = "elől 2 db lábon álló"
        labak_szama = "elől 2 db lábbal"
    else:
        beepites_mondat = "A pergolát különálló szerkezetként rögzítve, összesen 4 db lábbal építenénk"
        hany_labon_all = "összesen 4 db lábon álló"
        labak_szama = "összesen 4 db lábbal"

    if has_zip and has_uvegfal:
        opcionalisan_feltuntetni = (
            f"Opcionálisan feltüntettem a szerkezet {width} cm illetve {projection} cm oldalára "
            f"a motoros-oldalsó árnyékolókat és a keret nélküli, elcsúsztatható üvegfalrendszert is."
        )
    elif has_zip:
        opcionalisan_feltuntetni = (
            f"Opcionálisan feltüntettem a szerkezet {width} cm illetve {projection} cm oldalára "
            f"a motoros-oldalsó árnyékolókat is."
        )
    elif has_uvegfal:
        opcionalisan_feltuntetni = (
            f"Opcionálisan feltüntettem a szerkezet {width} cm illetve {projection} cm oldalára "
            f"a keret nélküli, elcsúsztatható üvegfalrendszert is."
        )
    else:
        opcionalisan_feltuntetni = ""

    deadline_str = get_month_deadline_str()

    # Determine option photo sets (each option gets 2 proportional photos)
    default_photo_pairs = [
        ("_bio_01.jpg", "_bio_02.jpg", "_bio_03.jpg"),
        ("_bio_09.png", "_bio_10.png", None),
        ("_bio_13.png", "_bio_14.jpg", None),
    ]

    sections = []

    # --- SECTION 1: Bevezető + 1. Opció leírása és fotói ---
    first_opt = options[0] if options else {}
    first_name = first_opt.get("modelName") or "SOLARE 400"
    first_sub = (
        first_opt.get("subtitle")
        or "Alumínium vázával, 0-120° között elforgatható lamellával, oszlopaiban rejtett esővíz elvezetésével jó választás az időjárás elemeivel szemben."
    )
    first_proj = first_opt.get("calculatedProjection") or projection
    first_wid = first_opt.get("calculatedWidth") or width
    first_hei = first_opt.get("calculatedHeight") or height
    first_warn = first_opt.get("sizeWarning") or ""

    f1_file, f1_desc, f2_file, f2_desc = get_option_photos_and_descs(
        first_opt, 1, config, legacy_root, work_img_dir, cat_photos, default_photo_pairs
    )
    p1_img1 = img_html(work_img_dir, f1_file, 345, max_height_pt=175) if f1_file else ""
    p1_img2 = img_html(work_img_dir, f2_file, 390, max_height_pt=200) if f2_file else ""

    if f1_desc:
        first_desc_block = f"<p>{first_sub}</p><p style='margin-top:2pt;'>{f1_desc}</p>"
    else:
        first_desc_block = f"<p>{first_sub}. Alumínium vázával, 0-120° között elforgatható lamellával, oszlopaiban rejtett esővíz elvezetésével jó választás az időjárás elemeivel szemben. A lamellák mozgatását villanymotor végzi, amelyet távirányítóval vezérelhetünk.</p>"

    sec1_html = f"""
    <p>Kedves {greeting_name}!</p>
    <p style="margin-top:5pt;">
      Örömmel fogadtuk megkeresését! Kérésének megfelelően küldjük tájékoztató jellegű árajánlatunkat az Ön által megadott paraméterek alapján:
      <b>1db {projection}x{width}x{height} cm-es</b> bioklimatikus pergola, forgatható lamellás tetővel, termékeinkre.
      Opcionálisan LED világítással a szerkezet felső gerendáiban. Ajándék eső érzékelővel és ajándék infrafűtéssel.
    </p>
    {"<p>" + opcionalisan_feltuntetni + "</p>" if opcionalisan_feltuntetni else ""}
    <p style="margin-top:5pt;">
      Azért ajánljuk ezeket a lamellás szerkezeteket, mert télen-nyáron használhatóak, és lamellák dőlésszögének állításával nem csak a bejutó fény mennyiségét tudjuk szabályozni, hanem a szellőzést is, így megvalósul a bioklimatikus hatás.
    </p>
    <p>
      Illetve ezeket a termékeket lehet körbe szerelni elcsúsztatható üvegfalrendszerrel és oldalsó árnyékolókkal, így megnövelve nem csak a terasz, de akár a nappali méretét és kihasználhatóságát. Ezekkel az opciókkal igazából egy télikertet kialakítva, amit tényleg télen-nyáron lehet használni.
    </p>
    <p style="margin-top:4pt;">
      {beepites_mondat}. A motoros oldalsó árnyékolókat illetve üvegfal rendszereket később is tudjuk szerelni a pergolákhoz.
    </p>
    <p style="margin-top:4pt;">Hóterhelése a szerkezeteknek:</p>
    <ul>
      <li>Kedry Skylife: 250 kg/m2</li>
      <li>SEESKYBIO modellnél: 200 kg/m2</li>
      <li>Solare 400 / prémium lamellás modellnél: 150 kg/m2</li>
    </ul>
    <p style="margin-top:3pt;">
      Szélterhelése az EN 13561 szabvány szerinti legmagasabb, 6. osztályba sorolt, azaz orkán erejű szélnek is ellenáll (119 km/h).
    </p>

    <p style="margin-top:8pt;">
      <span style="background-color:#808080;font-weight:bold;padding:1pt 4pt;">
        1. {first_name} forgatható lamellás tetejű pergola:
      </span>
    </p>
    <p>
      <b>Méretek: <i>{first_proj} cm hosszú x {first_wid} cm széles (kinyúlás) x {first_hei} cm magas (belső) – {hany_labon_all}.</i></b>
    </p>
    {f'<p style="color:#b91c1c;font-weight:bold;">{first_warn}</p>' if first_warn else ''}
    <p style="font-size:9.5pt;margin-top:2pt;">
      <i>Profilok méretei: -gerenda (21x8,5-cm), -lamella (21,6 cm), -oszlop (15x8,5-cm)</i>
    </p>
    {first_desc_block}
    {p1_img1}
    """
    sections.append(wrap_html(sec1_html))

    # --- Loop through each option to build its pricing & accessories sections ---
    for idx, opt in enumerate(options, start=1):
        m_name = opt.get("modelName") or f"{idx}. Pergola opció"
        m_sub = opt.get("subtitle") or ""
        c_proj = opt.get("calculatedProjection") or projection
        c_wid = opt.get("calculatedWidth") or width
        c_hei = opt.get("calculatedHeight") or height
        s_warn = opt.get("sizeWarning") or ""

        lista_eur_val = int(round(float(opt.get("listaArEur") or 0)))
        kedv_eur_val = int(round(float(opt.get("kedvezmenyesAlaparEur") or 0)))
        motor_eur_val = int(round(float(opt.get("motorEur") or 0)))
        motor_lista_val = int(round(motor_eur_val * 1.25))
        tav_eur_val = int(round(float(opt.get("taviranyitoEur") or 100)))
        tav_lista_val = int(round(tav_eur_val * 1.25)) if tav_eur_val > 0 else 0
        szer_eur_val = int(round(float(opt.get("szerelesEur") or 0)))
        ossz_eur_val = int(round(float(opt.get("alapszerkezetOsszesenEur") or 0)))
        ossz_huf_val = int(round(float(opt.get("alapszerkezetOsszesenHuf") or 0)))

        led_eur_val = int(round(float(opt.get("ledEur") or 700)))
        led_lista_val = 1000 if led_eur_val <= 700 else int(round(led_eur_val * 1.25))
        led_huf_val = int(round(float(opt.get("ledHuf") or (led_eur_val * eur_rate))))

        zip_w_cm = opt.get("zipWidthNetCm") or c_wid
        zip_p_cm = opt.get("zipProjectionNetCm") or c_proj
        zip_w_eur_val = int(round(float(opt.get("zipWidthEur") or 0)))
        zip_w_lista_val = int(round(zip_w_eur_val * 1.25))
        zip_p_eur_val = int(round(float(opt.get("zipProjectionEur") or 0)))
        zip_p_lista_val = int(round(zip_p_eur_val * 1.25))
        zip_sz_eur_val = int(round(float(opt.get("zipSzerelesEur") or 0)))
        zip_ossz_eur_val = int(round(float(opt.get("zipOsszesenEur") or 0)))
        zip_ossz_huf_val = int(round(float(opt.get("zipOsszesenHuf") or 0)))

        uveg_w_tab = opt.get("uvegfalWidthTablak") or 4
        uveg_p_tab = opt.get("uvegfalProjectionTablak") or 4
        uveg_w_eur_val = int(round(float(opt.get("uvegfalWidthEur") or 0)))
        uveg_w_lista_val = int(round(uveg_w_eur_val * 1.25))
        uveg_p_eur_val = int(round(float(opt.get("uvegfalProjectionEur") or 0)))
        uveg_p_lista_val = int(round(uveg_p_eur_val * 1.25))
        uveg_sz_eur_val = int(round(float(opt.get("uvegfalSzerelesEur") or 0)))
        uveg_ossz_eur_val = int(round(float(opt.get("uvegfalOsszesenEur") or 0)))
        uveg_ossz_huf_val = int(round(float(opt.get("uvegfalOsszesenHuf") or 0)))

        # Header + photos for options >= 2, or second photo for option 1
        top_block = ""
        if idx == 1:
            desc2_html = f'<p style="margin-bottom:3pt;">{f2_desc}</p>' if f2_desc else ""
            top_block = f"{desc2_html}{p1_img2}"
        else:
            opt_f1, opt_d1, opt_f2, opt_d2 = get_option_photos_and_descs(
                opt, idx, config, legacy_root, work_img_dir, cat_photos, default_photo_pairs
            )
            img_a = img_html(work_img_dir, opt_f1, 380, max_height_pt=180) if opt_f1 else ""
            img_b = img_html(work_img_dir, opt_f2, 380, max_height_pt=180) if opt_f2 else ""
            desc_a_html = f"<p style='margin-top:2pt;'>{opt_d1}</p>" if opt_d1 else (f"<p>{m_sub}</p>" if m_sub else "")
            desc_b_html = f"<p style='margin-top:2pt;'>{opt_d2}</p>" if opt_d2 else ""
            top_block = f"""
            <p>
              <span style="background-color:#808080;font-weight:bold;padding:1pt 4pt;">
                {idx}. {m_name} bioklimatikus pergolánk:
              </span>
            </p>
            <p>
              <b>Méretek: <i>{c_proj} cm hosszú x {c_wid} cm széles (kinyúlás) x {c_hei} cm magas (belső) – {hany_labon_all}.</i></b>
            </p>
            {f'<p style="color:#b91c1c;font-weight:bold;">{s_warn}</p>' if s_warn else ''}
            {desc_a_html}
            {img_a}
            {desc_b_html}
            {img_b}
            """

        motor_note = "Az ár tartalmazza a motort" if motor_eur_val == 0 else ""

        opt_price_html = f"""
        {top_block}
        <table>
          <tr style="background-color:#bfbfbf;">
            <td style="width:42%;font-weight:bold;">Megnevezés</td>
            <td style="width:16%;font-weight:bold;">Listaár (EUR)</td>
            <td style="width:24%;font-weight:bold;">Kedvezményes ár: -20% (EUR)</td>
            <td style="width:18%;font-weight:bold;">&nbsp;</td>
          </tr>
          <tr>
            <td style="width:42%;">{m_name} ({c_proj}x{c_wid}x{c_hei} cm)-elforgatható lamellákkal. -{labak_szama}</td>
            <td style="width:16%;text-align:right;">{fmt_plain(lista_eur_val)}</td>
            <td style="width:24%;text-align:right;font-weight:bold;">{fmt_plain(kedv_eur_val)}</td>
            <td style="width:18%;font-weight:bold;">{motor_note}</td>
          </tr>
          <tr>
            <td style="width:42%;">Motor-Automatizált-Somfy I0</td>
            <td style="width:16%;text-align:right;">{fmt_plain(motor_lista_val)}</td>
            <td style="width:24%;text-align:right;font-weight:bold;">{fmt_plain(motor_eur_val)}</td>
            <td style="width:18%;">&nbsp;</td>
          </tr>
          <tr>
            <td style="width:42%;">Távirányító</td>
            <td style="width:16%;text-align:right;">{fmt_plain(tav_lista_val)}</td>
            <td style="width:24%;text-align:right;font-weight:bold;">{fmt_plain(tav_eur_val)}</td>
            <td style="width:18%;">&nbsp;</td>
          </tr>
          <tr>
            <td style="width:42%;">Infrafűtés 1db</td>
            <td style="width:16%;text-align:right;">400</td>
            <td style="width:24%;text-align:right;font-weight:bold;">0</td>
            <td style="width:18%;font-weight:bold;">{"Ajándék" if has_heating else "-"}</td>
          </tr>
          <tr>
            <td style="width:42%;">Eső és szél érzékelő</td>
            <td style="width:16%;text-align:right;">200</td>
            <td style="width:24%;text-align:right;font-weight:bold;">0</td>
            <td style="width:18%;font-weight:bold;">{"Ajándék" if has_sensors else "-"}</td>
          </tr>
          <tr>
            <td style="width:42%;">Szerelés</td>
            <td style="width:16%;">&nbsp;</td>
            <td style="width:24%;text-align:right;font-weight:bold;">{fmt_plain(szer_eur_val)}</td>
            <td style="width:18%;">&nbsp;</td>
          </tr>
          <tr>
            <td style="width:42%;">&nbsp;</td>
            <td style="width:16%;">Összesen:</td>
            <td style="width:24%;text-align:right;font-weight:bold;">{fmt_plain(ossz_eur_val)}</td>
            <td style="width:18%;">&nbsp;</td>
          </tr>
          <tr>
            <td style="width:42%;">LED világítás 4 felső gerendába-belülről/ szerkezet</td>
            <td style="width:16%;text-align:right;">{fmt_plain(led_lista_val)}</td>
            <td style="width:24%;text-align:right;font-weight:bold;">{fmt_plain(led_eur_val)}</td>
            <td style="width:18%;font-weight:bold;">Opció-kedvezmény-</td>
          </tr>
        </table>

        <p style="text-align:center;margin-top:6pt;">
          Az alapszerkezet szereléssel Összesen: <b>{fmt_dot(ossz_eur_val)} EUR (+ Áfa)</b>
        </p>
        <p style="text-align:center;font-size:9.5pt;">
          Az ajánlat írásának napján, {eur_rate} Ft/EUR árfolyamon az összeg: <b>{fmt_dot(ossz_huf_val)} Ft (+Áfa)</b>
        </p>

        <p style="margin-top:6pt;">
          • Opció: LED világítás a felső gerendák belső oldalain ( 4 db szabályozható fényerejű, meleg fehér LED-szalag)/szerkezet : <b>+ {fmt_dot(led_eur_val)} EUR (+Áfa)</b>
        </p>
        <p style="font-size:9.5pt;margin-left:14pt;">
          Az ajánlat írásának napján, {eur_rate} Ft/EUR árfolyamon az összeg: <b>{fmt_dot(led_huf_val)} Ft (+Áfa)</b>
        </p>

        <p style="margin-top:8pt;font-weight:bold;">
          Ha {deadline_str} megrendeli az alapszerkezetet kedvezményt tudok biztosítani! Az infrafűtést és az eső szenzort ajándékba tudom adni!
        </p>
        """
        sections.append(wrap_html(opt_price_html))

        # --- Accessories page for this option (ZIP + Üvegfal + Alapszínek) ---
        acc_blocks = []
        if has_zip and zip_ossz_eur_val > 0:
            acc_blocks.append(
                f"""
                <p style="font-weight:bold;margin-top:1pt;">Opció ZIP-es árnyékolók</p>
                <table>
                  <tr style="background-color:#bfbfbf;">
                    <td style="width:42%;font-weight:bold;">Megnevezés</td>
                    <td style="width:16%;font-weight:bold;">Listaár (EUR)</td>
                    <td style="width:24%;font-weight:bold;">Kedvezményes ár: -20% (EUR)</td>
                    <td style="width:18%;font-weight:bold;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td style="width:42%;">Külön szerelt-oldalsó árnyékoló -az egyik {c_wid} cm oldalra-{zip_w_cm}x{c_hei} cm-, Refleksol 120 ZIP- Serge 600 ponyva+BLEBOX I0 motor-távirányító - 1 db</td>
                    <td style="width:16%;text-align:right;">{fmt_plain(zip_w_lista_val)}</td>
                    <td style="width:24%;text-align:right;font-weight:bold;">{fmt_plain(zip_w_eur_val)}</td>
                    <td style="width:18%;font-weight:bold;">Opció</td>
                  </tr>
                  <tr>
                    <td style="width:42%;">Külön szerelt-oldalsó árnyékoló -az egyik {c_proj} cm oldalra-{zip_p_cm}x{c_hei} cm-, Refleksol 120 ZIP- Serge 600 ponyva+BLEBOX I0 motor-távirányító - 1 db</td>
                    <td style="width:16%;text-align:right;">{fmt_plain(zip_p_lista_val)}</td>
                    <td style="width:24%;text-align:right;font-weight:bold;">{fmt_plain(zip_p_eur_val)}</td>
                    <td style="width:18%;font-weight:bold;">Opció</td>
                  </tr>
                  <tr>
                    <td style="width:42%;">Árnyékolók szerelése, programozása</td>
                    <td style="width:16%;">&nbsp;</td>
                    <td style="width:24%;text-align:right;font-weight:bold;">{fmt_plain(zip_sz_eur_val)}</td>
                    <td style="width:18%;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td style="width:42%;">Összesen</td>
                    <td style="width:16%;">&nbsp;</td>
                    <td style="width:24%;text-align:right;font-weight:bold;">{fmt_plain(zip_ossz_eur_val)}</td>
                    <td style="width:18%;">&nbsp;</td>
                  </tr>
                </table>
                <p>
                  • Opció: A {c_wid}- és {c_proj} cm-es oldalra ZIP-es rendszerű, motoros árnyékolók szereléssel: <b>+ {fmt_dot(zip_ossz_eur_val)} EUR (+Áfa)</b>
                </p>
                <p style="font-size:9.5pt;margin-left:14pt;">
                  Az ajánlat írásának napján, {eur_rate} Ft/EUR árfolyamon az összeg: <b>{fmt_dot(zip_ossz_huf_val)} Ft (+Áfa)</b>
                </p>
                """
            )

        if has_uvegfal and uveg_ossz_eur_val > 0:
            acc_blocks.append(
                f"""
                <p style="font-weight:bold;margin-top:5pt;">Opció: Keret nélküli, elcsúsztatható üvegfalrendszerek</p>
                <table>
                  <tr style="background-color:#bfbfbf;">
                    <td style="width:42%;font-weight:bold;">Megnevezés</td>
                    <td style="width:16%;font-weight:bold;">Listaár (EUR)</td>
                    <td style="width:24%;font-weight:bold;">Kedvezményes ár: -20% (EUR)</td>
                    <td style="width:18%;font-weight:bold;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td style="width:42%;">Keret nélküli, elcsúsztatható üvegfalrendszer -az egyik {c_wid} cm oldalon - {zip_w_cm}x{c_hei} cm -{uveg_w_tab} táblás - 1db</td>
                    <td style="width:16%;text-align:right;">{fmt_plain(uveg_w_lista_val)}</td>
                    <td style="width:24%;text-align:right;font-weight:bold;">{fmt_plain(uveg_w_eur_val)}</td>
                    <td style="width:18%;font-weight:bold;">Opció</td>
                  </tr>
                  <tr>
                    <td style="width:42%;">Keret nélküli, elcsúsztatható üvegfalrendszer -az egyik {c_proj} cm oldalon - {zip_p_cm}x{c_hei} cm -{uveg_p_tab} táblás - 1db</td>
                    <td style="width:16%;text-align:right;">{fmt_plain(uveg_p_lista_val)}</td>
                    <td style="width:24%;text-align:right;font-weight:bold;">{fmt_plain(uveg_p_eur_val)}</td>
                    <td style="width:18%;font-weight:bold;">Opció</td>
                  </tr>
                  <tr>
                    <td style="width:42%;">Üvegfal rendszer szerelése</td>
                    <td style="width:16%;">&nbsp;</td>
                    <td style="width:24%;text-align:right;font-weight:bold;">{fmt_plain(uveg_sz_eur_val)}</td>
                    <td style="width:18%;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td style="width:42%;">&nbsp;</td>
                    <td style="width:16%;">Összesen:</td>
                    <td style="width:24%;text-align:right;font-weight:bold;">{fmt_plain(uveg_ossz_eur_val)}</td>
                    <td style="width:18%;">&nbsp;</td>
                  </tr>
                </table>
                <p>
                  • Opció: A {c_wid}- és {c_proj} cm-es oldalra üvegfalrendszer szereléssel: <b>+ {fmt_dot(uveg_ossz_eur_val)} EUR (+Áfa)</b>
                </p>
                <p style="font-size:9.5pt;margin-left:14pt;">
                  Az ajánlat írásának napján, {eur_rate} Ft/EUR árfolyamon az összeg: <b>{fmt_dot(uveg_ossz_huf_val)} Ft (+Áfa)</b>
                </p>
                """
            )

        ral_img = img_html(work_img_dir, "_ral_25.png", 320, max_height_pt=88)
        acc_blocks.append(
            f"""
            <p style="margin-top:4pt;">A tartó szerkezetek alapszínei: 25 db alapszín</p>
            {ral_img}
            <p style="margin-top:3pt;">
              <span style="background-color:#808080;font-weight:bold;padding:1pt 4pt;">
                +Opcionálisan rendelhető {m_name} termékhez:
              </span>
            </p>
            <p>- egyedi RAL színek (+20% felár ellenében)</p>
            <p>- LED spot világítás a lamellákban (szabályozható fényerejű) 6db: <b>+679 EUR</b></p>
            <p>- Üvegfalrendszer • Oldalsó árnyékoló</p>
            <p>- Okosotthon vezérlő (Conexxon, Tahoma – Somfy vagy BLEBOX Applikációval): <b>+ 250 EUR</b></p>
            """
        )
        sections.append(wrap_html("\n".join(acc_blocks)))

    # --- FINAL SECTION: Üvegfal + Oldalsó árnyékoló leírás + Információ + Debreczeni Balázs névjegy ---
    uveg_rails_img = img_html(work_img_dir, "_uveg_rails.png", 260, max_height_pt=110)
    zip_photo_img = img_html(work_img_dir, "_zip_photo.png", 145, max_height_pt=115)
    balazs_card_img = img_html(work_img_dir, "_balazs_card.jpg", 220, max_height_pt=100, align="left")

    notes_html = ""
    if custom_notes:
        notes_html = f"""
        <p style="margin-top:3pt;"><b>Egyedi megjegyzés az árajánlathoz:</b> {custom_notes}</p>
        """

    closing_html = f"""
    <p style="font-weight:bold;text-decoration:underline;">Keret nélküli, elcsúsztatható üvegfalrendszereink:</p>
    <p style="margin-top:2pt;font-size:9.5pt;">
      1., Üvegfal rendszereinkkel is garantáljuk a természetes fény adta pozitívumokat.
      <b>GLASS WALL</b> rendszerünk, amely síneken csúszó 10 mm vastag biztonsági, edzett üvegtáblákból áll, könnyen telepíthető és keret nélküli üvegfalakkal biztosítja a zavartalan kilátást. Mindkét irányban nyithatóak és zárhatóak.
    </p>
    {uveg_rails_img}

    <p style="font-weight:bold;text-decoration:underline;margin-top:3pt;">Oldalsó árnyékolónk:</p>
    <p style="margin-top:2pt;font-size:9.5pt;">
      SCREENY GPZ család oldalsó árnyékolóinál a napháló megvezetése egy speciális oldalsó zipzáras megvezetésben rejlik, amely lehetővé teszi, hogy a ponyva mindig feszes maradjon és a szúnyogháló feladatát is teljes mértékben ellátja.
    </p>
    {zip_photo_img}
    {notes_html}

    <p style="margin-top:4pt;">
      <span style="background-color:#808080;font-weight:bold;padding:1pt 4pt;">Információ:</span>
    </p>
    <p style="font-size:9.5pt;">- az ajánlat érvényes 30 napig • EUR áraink az aktuális nap MNB középárfolyamon számítandók</p>
    <p style="font-size:9.5pt;">- Szállítási költség ide: {city}: +{fmt_dot(szallitas_huf)} Ft (+Áfa)</p>
    <p style="font-size:9.5pt;">- A termékekre a garancia: <b>a szerkezetre 10 év; a vásznakra, ponyvákra 5 év; a motorokra, érzékelőkre 3 év (SKYLIFE termékre +2 év garancia kérhető)</b></p>
    <p style="font-size:9.5pt;">- átfutási idő a visszaigazolástól számított: <b>30-60 nap</b> • Fizetés: Szerződés kötéskor 60%, átvételkor a maradék 40%</p>
    <p style="font-size:9.5pt;">- az árajánlat a későbbi műszaki tartalom változása és a helyszíni felmérés miatt módosulhat</p>

    <p style="margin-top:4pt;font-size:9.5pt;">
      Amennyiben ajánlatunk szimpatikus Önnek, kérem e-mailben jelezzen vissza, mely után helyszíni felmérésre, méretpontosításra van szükség. Bármilyen kérdés esetén, keressen minket bizalommal.
    </p>
    <p style="font-size:7.8pt;font-style:italic;margin-top:3pt;">
      Megjegyzés: Az extra anyagmozgatás, villamos tervezés és elektromos kiállások költsége, kiegészítő lakatos szerkezetek építése, beton alap létesítése, burkolásimunkák és fogadó szerkezetek kialakításának költségei a vevőt terhelik. Vállalási díjaink normál szerelési körülmények esetén, szabad és folyamatos munkaterület biztosítása mellett érvényesek. Amennyiben a megfelelő szerelési terület nem áll rendelkezésre, a szerződésben megállapodott, előre egyeztetett időpontban, vagy a helyszín nem alkalmas az árnyékolók felszerelésére, ebben az estben a felmerülő költségekért felelősséget nem vállalunk, azok a megrendelőt terhelik.
    </p>
    {balazs_card_img}
    """
    sections.append(wrap_html(closing_html))

    return sections


def main():
    if len(sys.argv) < 3:
        print("Usage: render_pdf.py <input_json> <output_pdf>")
        sys.exit(1)

    input_json_path = sys.argv[1]
    output_pdf_path = sys.argv[2]

    with open(input_json_path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    quote = payload["quote"]
    config = payload.get("config", {})
    legacy_root = payload["legacyRoot"]

    work_img_dir = os.path.join(os.path.dirname(input_json_path), "_pdf_assets_cache")
    cat_photos = prepare_images(legacy_root, quote.get("termekTipus"), work_img_dir)

    sections = build_story_sections(quote, config, legacy_root, work_img_dir, cat_photos)

    os.makedirs(os.path.dirname(output_pdf_path), exist_ok=True)
    temp_pdf_path = output_pdf_path + ".tmp.pdf"

    writer = fitz.DocumentWriter(temp_pdf_path)
    mediabox = fitz.paper_rect("a4")
    where = mediabox + (54, 102, -54, -70)

    for sec_html in sections:
        story = fitz.Story(html=sec_html, archive=work_img_dir)
        more = True
        page_guard = 0
        while more and page_guard < 15:
            dev = writer.begin_page(mediabox)
            more, _ = story.place(where)
            story.draw(dev)
            writer.end_page()
            page_guard += 1

    writer.close()

    bg_img = os.path.join(
        legacy_root, "_internal", "backend", "resource", "header_footer", "header_footer.jpg"
    )
    doc = fitz.open(temp_pdf_path)
    if os.path.exists(bg_img) and len(doc) > 0:
        img_rect = fitz.Rect(0, 0, doc[0].rect.width, doc[0].rect.height)
        for page in doc:
            page.insert_image(img_rect, filename=bg_img, overlay=False)

    doc.save(output_pdf_path)
    doc.close()

    try:
        os.remove(temp_pdf_path)
    except Exception:
        pass

    print("GENERATED_PDF_OK:" + os.path.basename(output_pdf_path))


if __name__ == "__main__":
    main()
