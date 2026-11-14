"""LI — Laporan Insiden (FRM.IT.011).
.venv/bin/python scripts/tpl/li.py "<BMSS-FRM.IT.011.LI-Laporan Insiden_Rev00_2025_Template.docx>"  -> templates/li.docx

Vertically merged label cells (Kronologi "Judul", "Solusi Jangka Pendek/Panjang") survive looping by
splitting each block in two rows: the first item lives in the row holding the vMerge="restart" label,
the remaining items loop over a row whose label cell is vMerge "continue".
"""
import copy
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from docx.oxml.ns import qn
from docx.table import _Cell
from lib import add_paragraph_after, delete_rows, find_table, main_args, open_doc, remove_par, save, set_cell, set_text

src, *rest = main_args()
out = rest[0] if rest else "templates/li.docx"
d = open_doc(src)


def tcs(table, ri):
    """Unique cells of a row straight from the XML (python-docx maps vMerge-continue cells to the cell above)."""
    tr = table.rows[ri]._tr
    return [_Cell(tc, table) for tc in tr.findall(qn("w:tc"))]


def loop_cells(table, ri, loop, tags):
    cells = tcs(table, ri)
    assert len(cells) == len(tags), (ri, len(cells), tags)
    for i, (c, tag) in enumerate(zip(cells, tags)):
        txt = tag or ""
        if i == 0:
            txt = "{#" + loop + "}" + txt
        if i == len(cells) - 1:
            txt += "{/" + loop + "}"
        set_cell(c, txt)


def fill(table, ri, tags):
    for c, tag in zip(tcs(table, ri), tags):
        if tag is not None:
            set_cell(c, tag)


def bullet_loop(cell, loop):
    """Cell's (numbered/bulleted) paragraph becomes a paragraph loop: one bullet per item {t}."""
    set_cell(cell, "{t}")
    p = cell.paragraphs[0]
    before = copy.deepcopy(p._p)
    after = copy.deepcopy(p._p)
    p._p.addprevious(before)
    p._p.addnext(after)
    from docx.text.paragraph import Paragraph
    for el, tag in ((before, "{#" + loop + "}"), (after, "{/" + loop + "}")):
        q = Paragraph(el, p._parent)
        npr = el.find(qn("w:pPr") + "/" + qn("w:numPr"))
        if npr is not None:
            npr.getparent().remove(npr)
        set_text(q, tag)


# ------------------------------------------------------------------ headers (default + first page)
for s in d.sections:
    for hdr in (s.header, s.first_page_header):
        pars = [p for t in hdr.tables for r in t.rows for c in r.cells for p in c.paragraphs]
        seen = set()
        for p in pars:
            if id(p._p) in seen:
                continue
            seen.add(id(p._p))
            txt = p.text
            if txt.startswith("LI-") or txt.startswith("LI–"):
                set_text(p, "{noDok}")
            elif txt.startswith("(Hari/") or (txt[:2].strip().isdigit() and "20" in txt):
                set_text(p, "{hariTgl}")
                for r in p.runs:
                    r.italic = None
            elif txt in ("JUDUL LAPORAN INSIDEN", "Server Debora – Remote Desktop Connection"):
                set_text(p, "{judulLaporan}")

# ------------------------------------------------------------------ detail informasi (table 0)
t = find_table(d, "DETAIL INFORMASI")
fill(t, 1, [None, "{namaKaryawan}"])
fill(t, 2, [None, "{insiden}"])
fill(t, 3, [None, "{lokasi}"])
fill(t, 4, [None, "{tglInsiden}", None, "{waktuInsiden}"])
fill(t, 5, [None, "{kategori}", None, "{durasi}"])
fill(t, 6, [None, "{sla}", None])

# Kronologi: row 9 = judul + first item, row 10 = the rest (judul cell vMerge continue), row 11 dropped
fill(t, 9, ["{judulKronologi}", "{kWaktu}", "{kDeskripsi}"])
loop_cells(t, 10, "kronologiRest", [None, "{waktu}", "{deskripsi}"])

# Root cause / impact: bullet paragraph loops
bullet_loop(tcs(t, 13)[1], "rootCause")
bullet_loop(tcs(t, 15)[1], "impact")

# Solusi jangka pendek: row 17 (label restart + first), row 18 loop (label continue)
fill(t, 17, [None, "{pSolusi}", "{pStatus}"])
loop_cells(t, 18, "pendekRest", [None, "{solusi}", "{status}"])

# Solusi jangka panjang: clone the two pendek rows after row 19, relabel, switch to numId of row 19
num_panjang = t.rows[19]._tr.find(".//" + qn("w:numId")).get(qn("w:val"))
r17, r18, r19 = (t.rows[i]._tr for i in (17, 18, 19))
n1, n2 = copy.deepcopy(r17), copy.deepcopy(r18)
r19.addnext(n1)
n1.addnext(n2)
for el in (n1, n2):
    for nid in el.iter(qn("w:numId")):
        nid.set(qn("w:val"), num_panjang)
label = _Cell(n1.findall(qn("w:tc"))[0], t)
set_cell(label, "Solusi Jangka Panjang")
for el in (n1, n2):
    for tt in el.iter(qn("w:t")):
        tt.text = tt.text.replace("{pSolusi}", "{qSolusi}").replace("{pStatus}", "{qStatus}").replace("pendekRest", "panjangRest")
delete_rows(t, [19, 11])

# ------------------------------------------------------------------ tindakan (table 1)
t = find_table(d, "^TINDAKAN")
loop_cells(t, 2, "tindakan", ["{tanggal}", "{deskripsi}", "{pic}", "{status}"])
loop_cells(t, 9, "selanjutnya", ["{tanggal}", "{deskripsi}", "{pic}", "{status}"])
delete_rows(t, [3, 4, 5, 6, 7, 10])

# ------------------------------------------------------------------ lampiran (table 2)
t = find_table(d, "SEBELUM PERBAIKAN")
for ri, loop in ((2, "sebelum"), (6, "setelah")):
    c0, c1, c2 = tcs(t, ri)
    set_cell(c0, "{#" + loop + "}{tanggal}")
    set_cell(c1, "{@gambar}")
    set_cell(c2, "{keterangan}{/" + loop + "}")
delete_rows(t, [7, 8, 9])

_ = (add_paragraph_after, remove_par)
save(d, out)
