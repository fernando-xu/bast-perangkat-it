"""IK — Instruksi Kerja (FRM.IT.007).
.venv/bin/python scripts/tpl/ik.py "<Template_BMSS-FRM.IT.007.IK.Rev01_2025.docx>"  -> templates/ik.docx

The 4.1 / 4.1.1 / 5.1 / 7.1 numbers in the original are typed text (not Word numbering), so the
template prints numbers computed in toTemplate ({no}) inside nested paragraph loops.
"""
import copy
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from docx.oxml.ns import qn
from docx.text.paragraph import Paragraph
from lib import find_par, iter_paragraphs, find_table, main_args, open_doc, remove_par, replace_after, row_loop, save, set_cell, set_text

src, *rest = main_args()
out = rest[0] if rest else "templates/ik.docx"
d = open_doc(src)
P = d.paragraphs  # indexes refer to the original document


def run(like_r, text, bold=None, tab_before=False, tab_after=False):
    r = copy.deepcopy(like_r)
    for ch in list(r):
        if ch.tag != qn("w:rPr"):
            r.remove(ch)
    rpr = r.find(qn("w:rPr"))
    if bold is False and rpr is not None:
        for b in rpr.findall(qn("w:b")):
            rpr.remove(b)
    if tab_before:
        r.append(r.makeelement(qn("w:tab"), {}))
    if text:
        t = r.makeelement(qn("w:t"), {})
        t.text = text
        t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
        r.append(t)
    if tab_after:
        r.append(r.makeelement(qn("w:tab"), {}))
    return r


def plain(p, sz=None):
    """Drop bold/underline (runs + paragraph mark) and optionally force the font size (half-points)."""
    for rpr in p._p.iter(qn("w:rPr")):
        for tag in ("w:b", "w:u"):
            for el in rpr.findall(qn(tag)):
                rpr.remove(el)
        if sz:
            for tag in ("w:sz", "w:szCs"):
                el = rpr.find(qn(tag))
                if el is not None:
                    el.set(qn("w:val"), str(sz))


def rebuild(p, runs):
    """Replace the runs of paragraph p with `runs`."""
    like = p._p.findall(qn("w:r"))[0]
    for r in p._p.findall(qn("w:r")):
        p._p.remove(r)
    for spec in runs:
        p._p.append(run(like, **spec))


def marker(after_el, like_p, text):
    """New plain paragraph (no runs/numbering) holding a loop marker, inserted after element."""
    el = copy.deepcopy(like_p._p)
    for ch in list(el):
        if ch.tag != qn("w:pPr"):
            el.remove(ch)
    after_el.addnext(el)
    q = Paragraph(el, like_p._parent)
    set_text(q, text)
    return el


def nested_list(head, sub, loop):
    """head = '4.1<tab>' paragraph, sub = '<tab>4.1.1<tab>' paragraph -> nested paragraph loops."""
    rebuild(head, [dict(text="{no}", tab_after=True), dict(text="{judul}")])
    rebuild(sub, [dict(text="{no}", tab_before=True, tab_after=True), dict(text="{t}", bold=False)])
    start = marker(head._p.getprevious(), head, "{#" + loop + "}")
    _ = start
    marker(head._p, head, "{#items}")
    marker(sub._p, head, "{/items}")
    marker(sub._p.getnext(), head, "{/" + loop + "}")


# ------------------------------------------------------------------ header (default; first page only has the code)
for s in d.sections:
    for p in iter_paragraphs(s.header):
        txt = p.text.strip()
        if txt.startswith("IK-"):
            set_text(p, "{noDok}")
        elif txt == "00":
            set_text(p, "{revisi}")
        elif txt == "JUDUL INTRUKSI KERJA":
            set_text(p, "{judul}")
        elif txt == "4 Agustus 2025":
            set_text(p, "{tanggal}")

# ------------------------------------------------------------------ cover
set_text(P[4], "{judul}")
replace_after(P[5], r"No\. IK : ", "{noDok}", style="label")
remove_par(P[6])

t = find_table(d, "Disiapkan Oleh")
for ri, k in ((1, "siap"), (2, "periksa"), (3, "setuju")):
    cells = t.rows[ri].cells
    nama, jabatan = cells[1].paragraphs[:2]
    set_text(nama, "{" + k + "Nama} /")
    set_text(jabatan, "{" + k + "Jabatan}")
    set_cell(cells[3], "{" + k + "Tgl}")
    for r in cells[3].paragraphs[0].runs:
        r.italic = None

# ------------------------------------------------------------------ sections 1,2,3,6: free text
for idx, tag in ((18, "{deskripsi}"), (20, "{ruangLingkup}"), (22, "{pelaksana}"), (46, "{sanksi}")):
    set_text(P[idx], tag)
    plain(P[idx])

# ------------------------------------------------------------------ 4 uraian instruksi / 5 larangan
nested_list(P[24], P[27], "uraian")
nested_list(P[40], P[41], "larangan")

# ------------------------------------------------------------------ 7 dokumen terkait
rebuild(P[48], [dict(text="{no}", tab_after=True), dict(text="{t}", bold=False)])
marker(P[48]._p.getprevious(), P[48], "{#dokumen}")
marker(P[48]._p, P[48], "{/dokumen}")

for i in [25, 26] + list(range(28, 39)) + [42, 43, 49]:
    remove_par(P[i])

# ------------------------------------------------------------------ catatan perubahan
t = find_table(d, "No. Revisi")
row_loop(t, 1, "revisiRows", ["{noRev}", "{bagian}", "{halaman}", "{tgl}"], drop_rows=range(2, 27))
for c in t.rows[1].cells:
    for q in c.paragraphs:
        plain(q, 22)

_ = find_par
save(d, out)
