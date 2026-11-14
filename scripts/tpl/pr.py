"""PR — Purchase Request IT (FRM.IT.000).
.venv/bin/python scripts/tpl/pr.py <PR_BMSS_FRM_IT_00_Rev.0_2026.docx>  -> templates/pr.docx
"""
import copy
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from docx.oxml.ns import qn
from lib import _runs, main_args, open_doc, remove_par, replace_after, row_loop, save, set_cell, set_text, sub

src, *rest = main_args()
out = rest[0] if rest else "templates/pr.docx"
d = open_doc(src)


def unbold(p):
    """Last run of `p` loses bold (value text after a bold label)."""
    r = _runs(p)[-1]
    for tag in ("w:b", "w:bCs"):
        for el in r.findall(qn("w:rPr") + "/" + qn(tag)):
            el.getparent().remove(el)


def value_after_break(p, label, tag):
    """'Label:<br>old value' -> 'Label:<br>{tag}' (value run keeps its own formatting)."""
    replace_after(p, label, tag)
    r = _runs(p)[-1]
    t = r.find(qn("w:t"))
    if r.getprevious() is None or r.getprevious().find(qn("w:br")) is None:
        t.addprevious(r.makeelement(qn("w:br"), {}))


# --- header block (nested table inside table 1): PR No / OPU / Departemen / dates
info = d.tables[1].rows[0].cells[0].tables[0]
for row, tag in zip(info.rows, ("{noPr}", "{opu}", "{departemen}", "{tglPermintaan}", "{tglDibutuhkan}")):
    set_cell(row.cells[2], tag)
# "Tanggal Dibutuhkan" was empty: give it the run formatting of the other values (small font)
src_rpr = _runs(info.rows[3].cells[2].paragraphs[0])[0].find(qn("w:rPr"))
r = _runs(info.rows[4].cells[2].paragraphs[0])[0]
old = r.find(qn("w:rPr"))
if old is not None:
    r.remove(old)
r.insert(0, copy.deepcopy(src_rpr))

# --- items table: row 1 is the loop, row 2 (second example item) dropped; row 3 is the blank spacer row
t = d.tables[2]
row_loop(t, 1, "items", ["{no}", "{deskripsi}", "{jumlah}", "{satuan}", "{hargaSatuan}", "{estimasi}"], drop_rows=[2])
# rows after the drop: 2 spacer, 3 Alasan, 4 TSR, 5 Lokasi, 6 Supplier
alasan = t.rows[3].cells[0]
replace_after(alasan.paragraphs[0], r"Request :", "{alasan}")
for p in alasan.paragraphs[1:]:
    remove_par(p)

tsr = t.rows[4].cells[0].paragraphs[0]
replace_after(tsr, r"No :", "{referenceTsr}", style="label")
unbold(tsr)

value_after_break(t.rows[5].cells[0].paragraphs[0], r"Delivery Location:", "{lokasiPekerjaan} - {lokasiPengantaran}")

sup = t.rows[6].cells[0].paragraphs[0]
replace_after(sup, r"Account :", "{supplier}", style="label")
unbold(sup)

# --- signatures: "( name )" + "Date : ..." in each of the 5 cells
sig = d.tables[3]
cells = sig.rows[2].cells
first = cells[0]
# cell 0 holds the example name + date in one paragraph; rebuild it like the other cells (two paragraphs)
date_par = copy.deepcopy(cells[1].paragraphs[1]._p)
first.paragraphs[0]._p.addnext(date_par)
for c, (name, tgl) in zip(cells, (("dibuatOleh", "tglDibuat"), ("pemintaJasa", "tglPeminta"), ("dicekOleh", "tglDicek"),
                                  ("disetujuiOleh", "tglDisetujui"), ("purchasing", "tglPurchasing"))):
    set_text(c.paragraphs[0], "( {" + name + "} )")
    replace_after(c.paragraphs[1], r"Date :", " {" + tgl + "}", style="label")

# --- checklist lampiran: the two hand-drawn text-box squares become ☐/☒ glyphs
#     (docx-preview, used for the PDF, does not render floating text boxes)
cl = d.tables[4]
MC = "{http://schemas.openxmlformats.org/markup-compatibility/2006}AlternateContent"
for row, tag in ((cl.rows[1], "cbTsr"), (cl.rows[2], "cbRab")):
    p = row.cells[0].paragraphs[0]
    for run in _runs(p):
        if run.find(MC) is not None or run.find(qn("w:drawing")) is not None or run.find(qn("w:pict")) is not None:
            for child in list(run):
                if child.tag != qn("w:rPr"):
                    run.remove(child)
            t_el = run.makeelement(qn("w:t"), {})
            t_el.text = "{" + tag + "} "
            t_el.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
            run.append(t_el)
            break
    else:
        raise SystemExit(f"no text box in checklist row for {tag}")
# the RAB line was indented with spaces under the floating box; the glyph takes ~2 of them
sub(cl.rows[2].cells[0].paragraphs[0], r"^  ", "")

# the logo picture's name carries an old PR number
for el in d.element.body.iter():
    name = el.get("name")
    if name and re.search(r"PR\d{6,}", name):
        el.set("name", re.sub(r"PR\d{6,}_?", "", name))

save(d, out)
