"""FPP / ITRF — Formulir Permintaan Perangkat IT (FRM.IT.001), three company variants.

.venv/bin/python scripts/tpl/fpp.py <folder with the 3 originals>
  -> templates/fpp-bmss.docx, templates/fpp-di.docx, templates/fpp-dsi.docx

Variant differences handled here (see src/forms/defs/fpp.ts for the data side):
  BMSS / DSI : section 2 has the software checkbox grid (38 boxes incl. Lainnya)
  DI         : section 2 has a "Detail Pengajuan Perangkat" item table instead; Evaluasi has an
               extra "Penjelasan:" line; the original is a filled example (values are cleared)
  DI / DSI   : section 4 software rows are pre-labelled "Perangkat Lunak 1..5 / Lainnya"
  signatures : BMSS ... HR / CHRO / CFO;  DI & DSI ... HR / Director
"""
import glob
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from docx.oxml.ns import qn
from docx.text.paragraph import Paragraph
from lib import (append_text, checkbox, find_table, open_doc, replace_after, row_loop, save, set_cell, strip_highlight,
                 sub)

# order = checkbox order in the BMSS/DSI templates; must match SOFTWARE in src/forms/defs/fpp.ts
SOFTWARE = [
    "RPMGlobal XPAC", "Autodesk Civil 3D", "GEOVIA Surpac", "GEOVIA Minex", "Bentley STAAD Pro", "Bentley PLAXIS 2D",
    "Waterloo Hydrogeologic Modflow Flex", "Rocscience RS2", "Rocscience Slide2", "Inim SmartLook", "Autodesk AutoCAD",
    "Autodesk AutoCAD Map 3D", "Autodesk AutoCAD LT", "Datamine Minescape", "Agisoft Metashape", "Global Mapper",
    "Esri ArcGIS Pro", "SketchUp Studio", "SketchUp Pro", "Chaos V-Ray", "Golden Software Surfer",
    "Google Android Studio", "PostHog", "Microsoft Visual Studio", "Microsoft Visual Studio Code", "Jaspersoft",
    "PremiumSoft Navicat", "Oracle MySQL", "Adobe Creative Cloud Pro", "Adobe Photoshop", "Adobe Illustrator",
    "Microsoft Power BI Report Server", "Microsoft Power BI Desktop", "Microsoft SQL Server Management Studio",
    "ZionStar Sublime LMS", "Microsoft Office 2024", "Microsoft Windows 11",
]
KATEGORI = [
    "Teknikal / Mekanikal", "Administrasi umum", "Data Analyst", "Operasional kompleks", "Executive / Strategic",
    "Reproduksi warna", "Engineer workstation", "High Performance Specialist", "CIST / Programing",
]
STATUS_PENGAJUAN = ["Pemberian Pertama", "Pemberian Tambahan", "Penggantian akibat kerusakan", "Kumulatif penggunaan"]
EVALUASI = ["Tidak ada masalah", "Produk Cacat", "Keausan", "Kesalahan dan/atau Kelalaian"]
VERIFIKASI = ["tidak sesuai kebutuhan", "Tidak ada persediaan"]
# signature row label -> tag
SIG = {"PIC/User": "sigUser", "Atasan*": "sigAtasan", "IT Service & Support": "sigItss", "IT Corp.": "sigItCorp",
       "HR (Optional)": "sigHr", "CHRO": "sigChro", "CFO": "sigCfo", "Director": "sigDirector"}

VARIANTS = {"bmss": ("BMSS-FRM", "Rev06"), "di": ("DI-FRM", "Rev05"), "dsi": ("DSI FRM", "Rev06")}


def pars_of(d):
    return d.paragraphs  # all form paragraphs are top-level body paragraphs


def find(d, pattern, start=0):
    """index of the first top-level paragraph at/after `start` whose text matches."""
    ps = pars_of(d)
    for i in range(start, len(ps)):
        if re.search(pattern, ps[i].text):
            return i
    raise SystemExit(f"/{pattern}/ not found after P{start}")


def P(d, i):
    return pars_of(d)[i]


def fill_colon(p, tag, label=r":\s*", style="label"):
    """Replace everything after the label (default the first ':') with the tag."""
    replace_after(p, label, tag, style=style)


def unbold(el):
    for tag in ("w:b", "w:bCs"):
        for b in list(el.iter(qn(tag))):
            b.getparent().remove(b)


def tidy_bold(d, checkbox_pars):
    """The DI original is a filled example with the chosen options in bold; values must not be bold either."""
    for p in checkbox_pars:
        for r in p._p.iter(qn("w:r")):
            unbold(r)
    for t in d.element.body.iter(qn("w:t")):
        if t.text and "{" in t.text and not re.search(r"\{sig\w+\}", t.text):
            unbold(t.getparent())


def drop_comments(d):
    body = d.element.body
    for tag in ("w:commentRangeStart", "w:commentRangeEnd"):
        for el in list(body.iter(qn(tag))):
            el.getparent().remove(el)
    for ref in list(body.iter(qn("w:commentReference"))):
        r = ref.getparent()
        r.getparent().remove(r)
    for rId, rel in list(d.part.rels.items()):
        if "comments" in rel.reltype or rel.reltype.endswith("/people"):
            d.part.drop_rel(rId)


def headers(d, rev):
    for rel in d.part.rels.values():
        if not rel.reltype.endswith("/header"):
            continue
        for p_el in rel.target_part.element.iter(qn("w:p")):
            p = Paragraph(p_el, None)
            strip_highlight(p)
            if re.search(r"^No\. ITRF", p.text):
                replace_after(p, r"No\. ITRF :", " {noDok}", style="label")
            if re.search(r"FRM\.IT\.001;Rev\d+", p.text):
                # "Rev" + digits are split over several runs: put the digits in the "Rev" run
                ts = list(p_el.iter(qn("w:t")))
                k = next(j for j, t in enumerate(ts) if t.text and t.text.endswith("Rev"))
                ts[k].text += rev[3:]
                for t in ts[k + 1:]:
                    if re.fullmatch(r"\d*", t.text or ""):
                        t.text = ""


def build(variant, src, out):
    _, rev = VARIANTS[variant]
    d = open_doc(src)
    drop_comments(d)
    strip_highlight(d)
    headers(d, rev)

    # ---------------- 1. DETAIL PENGGUNA
    i = find(d, r"^Nama\t")
    fill_colon(P(d, i), "{nama}")
    p = P(d, find(d, r"^SBU"))
    replace_after(p, r"Departemen\t:\s*", "{departemen}", style="label")
    if re.search("MOHON DIISI", p.text):
        sub(p, r"MOHON DIISI", "{sbu}")
    else:
        sub(p, r":", ": {sbu}")
    replace_after(P(d, find(d, r"^Status\t")), r"Posisi\t+:\s*", "{posisi}", style="label")
    for k, pat in enumerate([r"Pegawai Lama", r"Bukan Pengganti", r"Pegawai Baru - Pengganti"]):
        checkbox(P(d, find(d, pat)), f"stp_{k}")
    i = find(d, r"Pegawai Baru - Pengganti")
    for pat, tag in ((r"^\t+Nama\t:", "pgNama"), (r"^\t+Departemen\t:", "pgDepartemen"), (r"^\t+Posisi\t:", "pgPosisi")):
        i = find(d, pat, i)
        append_text(P(d, i), " {" + tag + "}")
    i = find(d, r"Kategori Pekerjaan")
    for k, pat in enumerate(KATEGORI):
        i = find(d, "^\t" + re.escape(pat), i)
        checkbox(P(d, i), f"kat_{k}")
    i = find(d, r"^\tLainnya", i)
    checkbox(P(d, i), "katLainCb")
    fill_colon(P(d, i), " {katLainnya}", r"Lainnya( \(sebutkan\))?\s*:")

    # ---------------- 2. PENGAJUAN PERANGKAT IT
    for k, (pat, tag) in enumerate(((r"^\tPerangkat Keras", "ketKeras"), (r"^\tPerangkat Lunak", "ketLunak"),
                                    (r"^\tPerangkat IT Lainnya", "ketLainnya"))):
        p = P(d, find(d, pat))
        checkbox(p, f"pj_{k}")
        fill_colon(p, "{" + tag + "}")

    if variant == "di":
        t = find_table(d, r"Detail Pengajuan Perangkat")
        row_loop(t, 2, "detail", ["{item}", "{brand}", "{model}", "{spek}", "{jumlah}"], drop_rows=range(3, 9))
    else:
        i = find(d, r"^\nUntuk pengajuan laptop|^Untuk pengajuan laptop")
        for k, name in enumerate(SOFTWARE):
            i = find(d, r"\S", i + 1)
            p = P(d, i)
            if p.text.strip() != name:
                raise SystemExit(f"software #{k}: expected {name!r}, got {p.text!r}")
            checkbox(p, f"sw_{k}")
        i = find(d, r"^\tLainnya", i + 1)
        checkbox(P(d, i), "swLainCb")
        fill_colon(P(d, i), " {swLainnya}", r"Lainnya( \(sebutkan\))?\s*:")

    i = find(d, r"Status Pengajuan")
    for k, pat in enumerate(STATUS_PENGAJUAN):
        i = find(d, "^\t" + re.escape(pat), i)
        checkbox(P(d, i), f"sp_{k}")
        if k == 1:
            sub(P(d, i), r"…+", "{tambahanKe}")
    i = find(d, r"^\tLainnya", i)
    checkbox(P(d, i), "spLainCb")
    fill_colon(P(d, i), " {spLainnya}", r"Lainnya( \(sebutkan\))?\s*:")

    for pat, tag in ((r"^Latar belakang", "latarBelakang"), (r"^Kenapa dibutuhkan", "alasan"),
                     (r"^Tujuan penggunaan", "tujuan"), (r"^Jika pengajuan tidak", "risikoTidak"),
                     (r"^Jika pengajuan disetujui", "risikoSetuju")):
        fill_colon(P(d, find(d, pat)), "{" + tag + "}", style="value")

    # ---------------- 3./4. REKOMENDASI and DATA PERANGKAT LAMA tables
    for nth, pre in ((0, "rk"), (1, "lm")):
        t = find_table(d, r"Group Laptop", nth)
        set_cell(t.rows[1].cells[1], "{" + pre + "Jenis}")
        set_cell(t.rows[2].cells[1], "{" + pre + "Group}")
        row_loop(t, 4, pre + "Keras", ["{item}", "{brand}", "{model}", "{spek}", "{note}"], drop_rows=range(5, 11))
        # after deleting 6 rows: 5 = "Perangkat Lunak", 6 = header, 7.. = blank rows
        last = len(t.rows) - 1
        row_loop(t, 7, pre + "Lunak", ["{item}", "{brand}", "{model}", "{spek}", "{jumlah}" if pre == "lm" else "{note}"],
                 drop_rows=range(8, last + 1))

    # ---------------- 5. EVALUASI
    i = find(d, r"^EVALUASI DEPARTEMEN IT")
    for k, pat in enumerate(EVALUASI):
        i = find(d, "^\t" + re.escape(pat), i)
        checkbox(P(d, i), f"ev_{k}")
    i = find(d, r"^\tLainnya", i)
    checkbox(P(d, i), "evLainCb")
    if variant == "di":
        append_text(P(d, i), "{#evLainnya} : {evLainnya}{/evLainnya}")
        append_text(P(d, find(d, r"^\tPenjelasan:", i)), " {evPenjelasan}")
    else:
        fill_colon(P(d, i), " {evLainnya}", r"Lainnya( \(sebutkan\))?\s*:")

    # ---------------- 6. VERIFIKASI
    i = find(d, r"^VERIFIKASI PEMBELIAN")
    for k, pat in enumerate(VERIFIKASI):
        i = find(d, re.escape(pat), i)
        checkbox(P(d, i), f"vf_{k}")

    # ---------------- signatures: names row (2) keyed by the role row (3)
    t = find_table(d, r"Diajukan")
    seen = set()
    for c_name, c_role in zip(t.rows[2].cells, t.rows[3].cells):
        if id(c_name._tc) in seen:
            continue
        seen.add(id(c_name._tc))
        role = c_role.text.strip()
        if role not in SIG:
            raise SystemExit(f"unknown signature role {role!r}")
        set_cell(c_name, "{" + SIG[role] + "}")

    if variant == "di":
        # the filled DI example has page breaks where its long texts overflowed; use the BMSS layout
        # instead (page 2 = sections filled by Dept. IT)
        for br in list(d.element.body.iter(qn("w:br"))):
            if br.get(qn("w:type")) == "page":
                br.getparent().remove(br)
        for lr in list(d.element.body.iter(qn("w:lastRenderedPageBreak"))):
            lr.getparent().remove(lr)
        P(d, find(d, r"^REKOMENDASI PENGAJUAN")).paragraph_format.page_break_before = True
    cb_pars = [p for p in pars_of(d) if re.search(r"\{(stp|kat|katLainCb|pj|sw|swLainCb|sp|spLainCb|ev|evLainCb|vf)(_\d+)?\}", p.text)]
    tidy_bold(d, cb_pars)

    # sanity: no glyphs / placeholders left
    left = [t.text for t in d.element.body.iter(qn("w:t")) if t.text and re.search("[☐☒□■]|MOHON DIISI", t.text)]
    if left:
        raise SystemExit(f"{variant}: leftovers {left}")
    save(d, out)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(f"usage: {sys.argv[0]} <folder with the FRM.IT.001 originals> [outdir]")
    folder = sys.argv[1]
    outdir = sys.argv[2] if len(sys.argv) > 2 else "templates"
    for v, (prefix, _) in VARIANTS.items():
        hits = [f for f in glob.glob(os.path.join(folder, "*.docx")) if os.path.basename(f).startswith("Template " + prefix)]
        if len(hits) != 1:
            raise SystemExit(f"{v}: expected one 'Template {prefix}*.docx' in {folder}, got {hits}")
        build(v, hits[0], os.path.join(outdir, f"fpp-{v}.docx"))
