"""FDIA — Form Disposal Aset IT / Proposal for Plan of Disposal Non Equipment (FRM.IT.004).
.venv/bin/python scripts/tpl/fdia.py <BMSS-FRM.IT.004.FPPDNE.Rev00_2023.docx>  -> templates/fdia.docx

The original "LAMPIRAN 1" page only has the heading (no table), so the builder adds a
"Daftar Disposal" table (row loop) and a photo block after it.
"""
import copy
import os
import sys

from docx.oxml import parse_xml
from docx.shared import Pt
from docx.text.paragraph import Paragraph

sys.path.insert(0, os.path.dirname(__file__))
from lib import add_paragraph_after, checkbox, find_par, main_args, open_doc, replace_after, save, set_cell, sub

src, *rest = main_args()
out = rest[0] if rest else "templates/fdia.docx"
d = open_doc(src)

# --- headers: "No. FPP : ..…/………….….. /..…. /……." in default AND first-page header
n = 0
for s in d.sections:
    for hdr in (s.header, s.first_page_header, s.even_page_header):
        if hdr.is_linked_to_previous:
            continue
        for p in hdr.paragraphs:
            if p.text.startswith("No. FPP"):
                replace_after(p, r"No\. FPP : ", "{noDok}", style="label")
                n += 1
if n < 2:
    raise SystemExit(f"expected 2 header numbers, replaced {n}")

# --- identity lines: "Label<TAB>:" -> append value
for pat, tag in ((r"^Perusahaan", "perusahaan"), (r"^Lokasi/Site", "lokasiSite"), (r"^Departement", "departemen"),
                 (r"^Tanggal Pengajuan", "tanggal")):
    p = find_par(d, pat)
    replace_after(p, r":(?=\s*$)", " {" + tag + "}", style="label")

# --- disposal method: 5 ☐ lines; "kepada ……" dots replaced by the value (dots kept when empty)
for i, pat in enumerate((r"satuan unit", r"material terurai", r"Disumbangkan", r"Dihibahkan", r"Dimusnahkan")):
    checkbox(find_par(d, pat), f"cb{i}")
sub(find_par(d, r"Disumbangkan"), r"kepada …+\.*", "kepada {disumbangkanKepada}")
sub(find_par(d, r"Dihibahkan"), r"kepada …+\.*", "kepada {dihibahkanKepada}")

# --- signature table: header row Diajukan(1) | Diketahui(2) | Disetujui(2); names in last row
sig = d.tables[0]
names = sig.rows[2].cells
for c, tag in zip(names, ("diajukan", "diketahui1", "diketahui2", "disetujui1", "disetujui2")):
    if c.text.strip():
        set_cell(c, "{" + tag + "}")
    else:  # empty name cells: copy the formatting of a filled one
        src_p = names[2].paragraphs[0]
        c._tc.remove(c.paragraphs[0]._p)
        c._tc.append(copy.deepcopy(src_p._p))
        set_cell(c, "{" + tag + "}")

# --- LAMPIRAN 1: subtitle + Daftar Disposal table + photos
head = find_par(d, r"^LAMPIRAN 1$")
sub_p = add_paragraph_after(head, "Daftar Disposal")
sub_p.runs[0].font.underline = False

W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
COLS = [("No", 450), ("Nama / Deskripsi Aset", 2200), ("No. Aset", 1300), ("Merk / Tipe", 1500), ("Serial Number", 1400),
        ("Tahun Perolehan", 950), ("Kondisi / Alasan Disposal", 2118)]
TAGS = ["{#items}{no}", "{nama}", "{noAset}", "{merk}", "{sn}", "{tahun}", "{kondisi}{/items}"]
RPR = '<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>{b}<w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>'


def cell(text: str, width: int, bold: bool, center: bool) -> str:
    rpr = RPR.format(b="<w:b/>" if bold else "")
    jc = '<w:jc w:val="center"/>' if center else ""
    shade = '<w:shd w:val="clear" w:color="auto" w:fill="D9D9D9"/>' if bold else ""
    return (f'<w:tc><w:tcPr><w:tcW w:w="{width}" w:type="dxa"/>{shade}<w:vAlign w:val="center"/></w:tcPr>'
            f'<w:p><w:pPr><w:spacing w:before="40" w:after="40"/>{jc}{rpr}</w:pPr>'
            f'<w:r>{rpr}<w:t xml:space="preserve">{text}</w:t></w:r></w:p></w:tc>')


total = sum(w for _, w in COLS)
tbl = (f'<w:tbl {W}><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="{total}" w:type="dxa"/>'
       '<w:tblInd w:w="-709" w:type="dxa"/><w:tblLayout w:type="fixed"/>'
       '<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>'
       '</w:tblPr><w:tblGrid>' + "".join(f'<w:gridCol w:w="{w}"/>' for _, w in COLS) + '</w:tblGrid>'
       '<w:tr><w:trPr><w:tblHeader/></w:trPr>' + "".join(cell(t, w, True, True) for t, w in COLS) + '</w:tr>'
       '<w:tr><w:trPr><w:cantSplit/></w:trPr>'
       + "".join(cell(t, w, False, i in (0, 5)) for i, ((_, w), t) in enumerate(zip(COLS, TAGS))) + '</w:tr></w:tbl>')
tbl_el = parse_xml(tbl)
sub_p._p.addnext(tbl_el)

# paragraph after the table, then the photos block (only when there are photos)
after = parse_xml(f'<w:p {W}><w:pPr><w:spacing w:before="120"/><w:ind w:left="-709"/></w:pPr></w:p>')
tbl_el.addnext(after)
after_p = Paragraph(after, head._parent)
p_open = add_paragraph_after(after_p, "{#adaFoto}")
p_title = add_paragraph_after(p_open, "Foto:")
p_title.runs[0].font.bold = True
p_title.runs[0].font.name = "Arial"
p_title.runs[0].font.size = Pt(9)
p_img = add_paragraph_after(p_title, "{@foto}")
add_paragraph_after(p_img, "{/adaFoto}")
for p in (p_open, p_title, p_img):
    p.paragraph_format.alignment = 0
save(d, out)
