"""Build templates/bast-template.docx from an original filled BAST form.

Usage: python3 -I scripts/build_template.py <source.docx> <out.docx>

Keeps the original layout (header, logo, tab stops, tables) and replaces the
filled-in values with placeholders that src/lib/docx.ts fills at runtime:
  {{key}}       plain text value
  {{opt:key}}   option list rendered with strikethrough on unselected options
"""
import re
import sys
import zipfile

SRC, OUT = sys.argv[1], sys.argv[2]

FONT = '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>'
VAL_RPR = f'<w:rPr>{FONT}<w:u w:val="dotted"/></w:rPr>'
PLAIN_RPR = f'<w:rPr>{FONT}</w:rPr>'
ITALIC_RPR = f'<w:rPr>{FONT}<w:i/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>'
CHECK_RPR = ('<w:rPr><w:rFonts w:ascii="Segoe UI Symbol" w:eastAsia="Times New Roman" '
             'w:hAnsi="Segoe UI Symbol" w:cs="Segoe UI Symbol"/><w:color w:val="000000"/></w:rPr>')


def run(text, rpr=PLAIN_RPR):
    return f'<w:r>{rpr}<w:t xml:space="preserve">{text}</w:t></w:r>'


def tab_run(rpr=PLAIN_RPR):
    return f'<w:r>{rpr}<w:tab/></w:r>'


RUN_RE = re.compile(r'<w:r[ >].*?</w:r>', re.S)


def visible_runs(p):
    """Runs that render something (text or tab), as (match) objects."""
    out = []
    for m in RUN_RE.finditer(p):
        r = m.group(0)
        if re.search(r'<w:t[^>]*>[^<]+</w:t>', r) or '<w:tab/>' in r:
            out.append(m)
    return out


def ppr_end(p):
    m = re.search(r'</w:pPr>', p)
    return m.end() if m else re.match(r'<w:p[^>]*>', p).end()


def keep_runs(p, n, new_runs):
    """Keep paragraph up to the n-th visible run, then append new runs."""
    runs = visible_runs(p)
    cut = runs[n - 1].end() if n else ppr_end(p)
    rest = p[cut:]
    bm = ''.join(re.findall(r'<w:bookmarkEnd [^>]*/>', rest))
    return p[:cut] + new_runs + bm + '</w:p>'


def first_rpr(p):
    m = re.search(r'<w:r[ >].*?(<w:rPr>.*?</w:rPr>)', p[ppr_end(p):], re.S)
    if m:
        return m.group(1)
    m = re.search(r'<w:pPr>.*?(<w:rPr>.*?</w:rPr>).*?</w:pPr>', p, re.S)
    return m.group(1) if m else PLAIN_RPR


def replace_content(p, new_runs):
    bm = ''.join(re.findall(r'<w:bookmark(?:Start|End) [^>]*/>', p))
    return p[:ppr_end(p)] + bm + new_runs + '</w:p>'


def strip_rsid(x):
    return re.sub(r' w:rsid\w*="[^"]*"', '', x)


with zipfile.ZipFile(SRC) as z:
    files = {n: z.read(n) for n in z.namelist()}

# ---------------------------------------------------------------- document
doc = files['word/document.xml'].decode('utf8')
P_RE = re.compile(r'<w:p[ >].*?</w:p>', re.S)
spans = [(m.start(), m.end()) for m in P_RE.finditer(doc)]
paras = [doc[s:e] for s, e in spans]
new = {}

V = lambda key: run(f'{{{{{key}}}}}', VAL_RPR)  # noqa: E731
colon = run(':') + run(' ')

# Penyerahan / Jenis Perangkat: label + tabs, then option list
new[1] = keep_runs(paras[1], 3, colon + run('{{opt:penyerahan}}') + tab_run()
                   + run('(pilih salah satu)', ITALIC_RPR))
new[2] = keep_runs(paras[2], 3, run('{{opt:jenis}}') + tab_run()
                   + run('(pilih salah satu)', ITALIC_RPR))
new[3] = keep_runs(paras[3], 3, V('kode'))
new[4] = keep_runs(paras[4], 3, V('merk'))
new[5] = keep_runs(paras[5], 3, V('spek1'))
new[6] = keep_runs(paras[6], 4, V('spek2'))
# para 7 is a blank continuation line: give it the same "⇥⇥⇥: " prefix
pref6 = ''.join(m.group(0) for m in visible_runs(paras[6])[:4])
new[7] = replace_content(paras[7], pref6 + V('spek3'))
new[9] = keep_runs(paras[9], 4, V('kelengkapan'))
new[10] = keep_runs(paras[10], 5, V('lokasi'))
new[11] = keep_runs(paras[11], 4, V('penerima'))
new[12] = keep_runs(paras[12], 4, V('perusahaan'))
new[13] = keep_runs(paras[13], 4, V('departemen'))

# Perangkat Lama checkboxes (two content-control checkboxes: Ada, Tidak Ada)
p14 = paras[14]
for key in ('lama_ada', 'lama_tidak'):
    p14 = re.sub(r'<w14:checked w14:val="[01]"/>', f'<w14:checked w14:val="{{{{cv:{key}}}}}"/>', p14, count=1)
    p14 = re.sub(r'(<w:sdtContent>.*?<w:t>)[☒☐](</w:t>)', rf'\g<1>{{{{cb:{key}}}}}\g<2>', p14, count=1, flags=re.S)
new[14] = p14

new[16] = keep_runs(paras[16], 3, V('lama_kode'))
new[18] = keep_runs(paras[18], 2, run(' ') + V('lama_merk'))
new[20] = keep_runs(paras[20], 4, V('lama_spek1'))
new[21] = keep_runs(paras[21], 4, V('lama_spek2'))
new[22] = keep_runs(paras[22], 4, V('lama_kelengkapan'))
new[25] = keep_runs(paras[25], 4, V('keterangan'))
new[26] = keep_runs(paras[26], 5, V('keterangan2'))
new[27] = keep_runs(paras[27], 3, V('keterangan3'))

# Signature table 1 (Diterima / Diserahkan / Diketahui)
for idx, key in ((33, 'tgl_terima'), (34, 'tgl_serah'), (37, 'tgl_tahu')):
    new[idx] = replace_content(paras[idx], run('Tanggal: ', first_rpr(paras[idx])) + run(f'{{{{{key}}}}}', first_rpr(paras[idx])))
for idx, key in ((38, 'nama_terima'), (39, 'nama_serah'), (42, 'nama_tahu')):
    new[idx] = replace_content(paras[idx], run(f'(Nama: {{{{{key}}}}})', first_rpr(paras[idx])))
# Signature table 2 (Diterima / Diinformasikan / Diketahui)
new[60] = replace_content(paras[60], run('Tanggal: ', first_rpr(paras[60])) + run('{{tgl2_tahu}}', first_rpr(paras[60])))
for idx, key in ((61, 'nama2_terima'), (62, 'nama2_info'), (65, 'nama2_tahu')):
    new[idx] = replace_content(paras[idx], run(f'(Nama: {{{{{key}}}}})', first_rpr(paras[idx])))

# Checklist header
r72 = first_rpr(paras[72])
new[72] = replace_content(paras[72], run('Ceklist Perangkat Baru : ', r72) + run('{{opt:ceklist_jenis}}', r72)
                          + run(' ', r72) + run('(pilih salah satu)', ITALIC_RPR))

# Checklist rows: 20 rows x (No, Nama, Baik, Kurang Baik, Keterangan)
for i in range(20):
    base = 91 + i * 5
    for j, suffix in enumerate(('no', 'nama', 'b', 'k', 'ket')):
        idx = base + j
        rpr = CHECK_RPR if suffix in ('b', 'k') else first_rpr(paras[idx])
        txt = f'{{{{ck{i}_{suffix}}}}}'
        p = paras[idx]
        if suffix in ('b', 'k'):  # center the check mark
            p = re.sub(r'<w:jc w:val="[^"]*"/>', '', p)
            p = p.replace('<w:pPr>', '<w:pPr><w:jc w:val="center"/>', 1) if '<w:pPr>' in p else p
        new[idx] = replace_content(p, run(txt, rpr))

assert ''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', paras[157])) == 'Additional Port'

out = []
last = 0
for i, (s, e) in enumerate(spans):
    if i in new:
        out.append(doc[last:s])
        out.append(new[i])
        last = e
out.append(doc[last:])
doc = strip_rsid(''.join(out))
files['word/document.xml'] = doc.encode('utf8')

# ---------------------------------------------------------------- header
hdr = files['word/header1.xml'].decode('utf8')
hspans = [(m.start(), m.end()) for m in P_RE.finditer(hdr)]
for s, e in hspans:
    p = hdr[s:e]
    txt = ''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', p))
    if txt.startswith('No.BAST'):
        p2 = keep_runs(p, 3, run('{{no_bast}}', first_rpr(p)))
        hdr = hdr[:s] + p2 + hdr[e:]
        break
else:
    raise SystemExit('header No.BAST paragraph not found')
files['word/header1.xml'] = strip_rsid(hdr).encode('utf8')

# drop customXml / docProps personal metadata
core = files['docProps/core.xml'].decode('utf8')
core = re.sub(r'(<dc:creator>)[^<]*', r'\1', core)
core = re.sub(r'(<cp:lastModifiedBy>)[^<]*', r'\1', core)
files['docProps/core.xml'] = core.encode('utf8')

with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
    for n, b in files.items():
        z.writestr(n, b)

keys = sorted(set(re.findall(r'\{\{([^}]+)\}\}', doc + hdr)))
print(f'wrote {OUT}; {len(keys)} placeholders')
print([k for k in keys if not k.startswith('ck')])
