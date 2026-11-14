"""BAPP — Berita Acara Pemeriksaan Perangkat IT (FRM.IT.002).
.venv/bin/python scripts/tpl/bapp.py <BMSS-FRM.IT.002.BAPP.Rev02_2026.docx>  -> templates/bapp.docx

The check boxes in this form are tiny nested 1x1 tables (not ☐ glyphs); the original marks a
box by typing "x" inside it, so the template puts a text tag ("x" or "") in that nested cell.
"""
import copy
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from docx.text.paragraph import Paragraph
from lib import (add_paragraph_after, find_par, find_table, main_args, open_doc, option_runs, replace_after, row_loop,
                 save, set_cell, set_text)

src, *rest = main_args()
out = rest[0] if rest else "templates/bapp.docx"
d = open_doc(src)


def box(cell, tag: str):
    """Tag inside the small framed box (a nested 1x1 table) of a cell; clears any example 'x'."""
    inner = cell.tables[0].rows[0].cells[0]
    set_cell(inner, "{" + tag + "}")
    inner.paragraphs[0].alignment = 1  # center


# --- header: document number (one default header)
for s in d.sections:
    for hdr in (s.header, s.first_page_header, s.even_page_header):
        if hdr.is_linked_to_previous:  # don't create empty header parts
            continue
        for p in hdr.paragraphs:
            if p.text.startswith("No. BAPP"):
                replace_after(p, r"No\. BAPP : ", "{noDok}", style="label")

# --- identity table (label | ": value")
ident = d.tables[0]
for i, tag in enumerate(["tanggal", "lokasi", None, "merk", "kodePerangkat", "tahunPembuatan", "tahunPembelian",
                         "user", "jabatan", "departemen", "sbu"]):
    if tag is None:
        continue
    p = ident.rows[i].cells[1].paragraphs[0]
    replace_after(p, r"^:", " {" + tag + "}", style="label")

# Tipe: ": Laptop/Desktop/Printer/TV <spaces>(pilih salah satu)" -> unselected options struck through
tipe = ident.rows[2].cells[1].paragraphs[0]
pilih = [copy.deepcopy(r._r) for r in tipe.runs[-2:]]  # "pilih salah satu" (italic), ")"
option_runs(tipe, r"^: ", "tipe", ["Laptop", "Desktop", "Printer", "TV"], sep="/", tail=" " * 50 + "(")
for r in pilih:
    tipe._p.append(r)

# --- PEMERIKSAAN grid: rows 0..14 = items (box in cell 1, catatan in cell 3), row 15 = sparepart
grid = d.tables[1]
for i in range(15):
    cells = grid.rows[i].cells
    box(cells[1], f"ck{i}")
    set_cell(cells[3], "{cat" + str(i) + "}")
sp = grid.rows[15].cells
box(sp[1], "spAda")
box(sp[3], "spTidak")

# --- HASIL PEMERIKSAAN (one-cell box)
set_cell(d.tables[2].rows[0].cells[0], "{hasil}")

# --- REKOMENDASI boxes: Perbaikan*, Penggantian, Layak pakai
rek = d.tables[3]
box(rek.rows[0].cells[1], "rkPerbaikan")
box(rek.rows[0].cells[3], "rkPenggantian")
box(rek.rows[1].cells[1], "rkLayak")

# --- signatures "(Nama: ...)"
sig = d.tables[4]
for c, tag in zip(sig.rows[2].cells, ("namaUser", "namaPemeriksa", "namaDiketahui")):
    set_cell(c, "(Nama: {" + tag + "})")

# --- LAMPIRAN table: No | Gambar | Deskripsi  -> row loop; whole page only if there are photos
lamp = find_table(d, r"^No\nGambar")
row_loop(lamp, 1, "lampiran", ["{no}", "{@gambar}", "{deskripsi}"], drop_rows=[2])
head = find_par(d, r"LAMPIRAN$")
blank_before = head._p.getprevious()
# open the condition in its own paragraph before the page-break/"LAMPIRAN" paragraph
add_paragraph_after(Paragraph(blank_before, head._parent), "{#adaLampiran}")
# close it in the (empty) paragraph right after the table
close = Paragraph(lamp._tbl.getnext(), head._parent)
if close.text.strip():
    raise SystemExit("unexpected text after lampiran table")
set_text(close, "{/adaLampiran}")

# drop the example photos of the original lampiran (now unreferenced)
xml = d.element.xml
for rid, rel in list(d.part.rels.items()):
    if rel.reltype.endswith("/image") and f'"{rid}"' not in xml:
        d.part.drop_rel(rid)

save(d, out)
