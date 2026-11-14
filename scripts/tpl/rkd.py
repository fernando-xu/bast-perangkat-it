"""RKD — Rekomendasi Perangkat IT (FRM.IT.005).
.venv/bin/python scripts/tpl/rkd.py <BMSS-FRM.IT.005.RKD.Rev00_2024.docx>  -> templates/rkd.docx
"""
import copy
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from lib import (add_paragraph_after, append_text, checkbox_cell, delete_rows, find_par, main_args, open_doc, option_runs,
                 replace_after, row_loop, save, set_cell, sub)

src, *rest = main_args()
out = rest[0] if rest else "templates/rkd.docx"
d = open_doc(src)

# --- header: document number (same header object for linked sections)
for s in d.sections:
    for p in s.header.paragraphs:
        if p.text.startswith("No. RKD"):
            replace_after(p, r"No\. RKD :", " {noDok}", style="label")

# --- Kepada (one-cell table at the top): "Kepada <spaces> FRM.IT.005;Rev00"
kepada = d.tables[0].rows[0].cells[0].paragraphs[0]
sub(kepada, r"^Kepada\s+", "Kepada {kepada}")

# --- recipient block
replace_after(find_par(d, r"^Nama/PIC"), r"Nama/PIC\t: ", "{nama}", style="label")
replace_after(find_par(d, r"^Departement"), r"Departement\t: ", "{departemen}", style="label")
replace_after(find_par(d, r"^Perusahaan"), r"Perusahaan \t: ", "{perusahaan}", style="label")
replace_after(find_par(d, r"^Lokasi Pekerjaan"), r"Lokasi Pekerjaan: ", "\t{lokasiPekerjaan}", style="label")
replace_after(find_par(d, r"^Tanggal\t"), r"Tanggal\t: ", "{tanggal}", style="label")

# --- Perihal: Laptop/Desktop/Printer/<lainnya>   (pilih salah satu)
per = find_par(d, r"^Perihal")
pilih = copy.deepcopy(per.runs[-2]._r), copy.deepcopy(per.runs[-1]._r)
option_runs(per, r"Perihal\t: ", "perihal", ["Laptop", "Desktop", "Printer"], sep="/",
            tail="/{perihalLain}\t\t")
for r in pilih:
    per._p.append(r)

# --- items table: row 1 becomes the loop, rows 2..12 dropped
t = d.tables[1]
row_loop(t, 1, "items", ["{no}", "{deskripsi}", "{jumlah}", "{satuan}", "{hargaSatuan}", "{estimasi}"],
         drop_rows=range(2, 13))
# after deleting rows: row 2 = "Alasan Permintaan" (the tall writing box) -> value goes inside it
add_paragraph_after(t.rows[2].cells[0].paragraphs[-1], "{alasan}")
# total row is not in the original; keep the table as is.

# --- signatures: "(......)" x3 and "Tgl:" x3
sig = find_par(d, r"\(\.{5,}")
for tag in ("dibuatOleh", "diperiksaOleh", "disetujuiOleh"):
    sub(sig, r"\(\.{5,}\)", "({" + tag + "})")
tgl = find_par(d, r"Tgl:")
for tag in ("tglDibuat", "tglDiperiksa", "tglDisetujui"):
    sub(tgl, r"Tgl:(?! \{)", "Tgl: {" + tag + "}")

# --- checklist lampiran
cl = d.tables[2]
for i, tag in enumerate(("cbFoto", "cbPenawaran", "cbLain"), start=1):
    checkbox_cell(cl.rows[i].cells[0], tag)

# --- LAMPIRAN page: photos / attachments after the heading
add_paragraph_after(find_par(d, r"^LAMPIRAN$"), "{@lampiran}")

_ = (delete_rows, set_cell, append_text)
save(d, out)
