"""Helpers to turn an original filled/blank Word form into a docxtemplater template.

Run builders with the project venv:  .venv/bin/python scripts/tpl/<form>.py <source.docx>

docxtemplater syntax used by the app (see src/lib/docgen.ts):
  {tag}                 text value (\\n becomes a line break)
  {#rows}...{/rows}     loop; inside a table row -> one row per item
  {#flag}...{/flag}     condition (truthy)   {^flag}...{/flag}  inverted condition
  {@tag}                raw OOXML; must be the ONLY thing in its paragraph (used for images)
"""
from __future__ import annotations

import copy
import re
import sys
from typing import Iterable, Iterator

from docx import Document
from docx.document import Document as DocumentT
from docx.oxml.ns import qn
from docx.table import Table, _Cell
from docx.text.paragraph import Paragraph

W_T = qn("w:t")
W_R = qn("w:r")
W_TAB = qn("w:tab")
W_BR = qn("w:br")


def open_doc(path: str) -> DocumentT:
    return Document(path)


def save(doc: DocumentT, out: str) -> None:
    doc.core_properties.author = ""
    doc.core_properties.last_modified_by = ""
    doc.save(out)
    print(f"wrote {out}")


# ------------------------------------------------------------------ finding

def iter_paragraphs(container) -> Iterator[Paragraph]:
    """All paragraphs in document order, descending into tables (and nested tables)."""
    for p in container.paragraphs:
        yield p
    for t in container.tables:
        for row in t.rows:
            seen = set()
            for cell in row.cells:
                if id(cell._tc) in seen:  # merged cells repeat
                    continue
                seen.add(id(cell._tc))
                yield from iter_paragraphs(cell)


def all_paragraphs(doc: DocumentT, headers: bool = False) -> list[Paragraph]:
    out = list(iter_paragraphs(doc))
    if headers:
        for s in doc.sections:
            for part in (s.header, s.first_page_header, s.even_page_header, s.footer, s.first_page_footer):
                if part is not None and part._element is not None:
                    try:
                        out.extend(iter_paragraphs(part))
                    except Exception:
                        pass
    return out


def find_par(doc_or_container, pattern: str, nth: int = 0, headers: bool = False) -> Paragraph:
    """nth paragraph whose text matches regex `pattern` (re.search)."""
    pars = all_paragraphs(doc_or_container, headers) if isinstance(doc_or_container, DocumentT) else list(iter_paragraphs(doc_or_container))
    hits = [p for p in pars if re.search(pattern, p.text)]
    if len(hits) <= nth:
        raise SystemExit(f"paragraph /{pattern}/ #{nth} not found ({len(hits)} hits)")
    return hits[nth]


def find_table(doc: DocumentT, pattern: str, nth: int = 0) -> Table:
    """nth table (incl. nested) whose text contains regex `pattern`."""
    hits = []

    def walk(container):
        for t in container.tables:
            txt = "\n".join(c.text for r in t.rows for c in r.cells)
            if re.search(pattern, txt):
                hits.append(t)
            for r in t.rows:
                for c in r.cells:
                    walk(c)

    walk(doc)
    if len(hits) <= nth:
        raise SystemExit(f"table /{pattern}/ #{nth} not found ({len(hits)} hits)")
    return hits[nth]


def dump(doc: DocumentT) -> None:
    """Print paragraphs and tables with indexes to help write a builder."""
    for i, p in enumerate(doc.paragraphs):
        if p.text.strip():
            print(f"P{i}: {p.text[:120]!r}")
    for ti, t in enumerate(doc.tables):
        print(f"--- table {ti}: {len(t.rows)} rows x {len(t.columns)} cols")
        for ri, row in enumerate(t.rows):
            cells = []
            prev = None
            for c in row.cells:
                cells.append("<" if c._tc is prev else c.text.replace("\n", "/")[:30])
                prev = c._tc
            print(f"  r{ri}: {cells}")


# ------------------------------------------------------------------ editing

def _runs(p: Paragraph):
    return p._p.findall(".//" + W_R)


def _clone_run(run_el, text: str):
    new = copy.deepcopy(run_el)
    for child in list(new):
        if child.tag != qn("w:rPr"):
            new.remove(child)
    t = new.makeelement(W_T, {})
    t.text = text
    t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    new.append(t)
    return new


def _new_run_like_mark(p: Paragraph, text: str):
    """New run carrying the paragraph-mark formatting (pPr/rPr), so empty cells keep their font."""
    r = p.add_run(text)._r
    mark = p._p.find(qn("w:pPr") + "/" + qn("w:rPr"))
    if mark is not None:
        old = r.find(qn("w:rPr"))
        if old is not None:
            r.remove(old)
        rpr = copy.deepcopy(mark)
        rpr.tag = qn("w:rPr")
        r.insert(0, rpr)
    return r


def set_text(p: Paragraph, text: str, style_run: int = 0) -> Paragraph:
    """Replace a paragraph's text, keeping the formatting of run `style_run`."""
    runs = _runs(p)
    if not runs:
        _new_run_like_mark(p, text)
        return p
    keep = runs[min(style_run, len(runs) - 1)]
    new = _clone_run(keep, text)
    runs[0].addprevious(new)
    for r in runs:
        r.getparent().remove(r)
    return p


def replace_after(p: Paragraph, label_pattern: str, tag_text: str, style: str = "value") -> Paragraph:
    """Keep text up to the end of regex `label_pattern` (e.g. r'Nama\\s*:'), replace the rest
    with `tag_text`. Formatting of the new run copies the first replaced run ("value")
    or the last kept run ("label")."""
    runs = _runs(p)
    texts = []
    for r in runs:
        s = ""
        for ch in r:
            if ch.tag == W_T:
                s += ch.text or ""
            elif ch.tag == W_TAB:
                s += "\t"
        texts.append(s)
    full = "".join(texts)
    m = re.search(label_pattern, full)
    if not m:
        raise SystemExit(f"label /{label_pattern}/ not in paragraph {full!r}")
    cut = m.end()
    pos = 0
    kept_last = None
    first_removed = None
    for r, s in zip(runs, texts):
        start, end = pos, pos + len(s)
        pos = end
        if end <= cut:
            kept_last = r
            continue
        if start < cut < end:  # split this run: keep the label part
            keep_part = s[: cut - start]
            # rebuild run with only kept text (tabs become real tabs again)
            rebuilt = _clone_run(r, "")
            rebuilt.remove(rebuilt.find(W_T))
            for chunk in re.split(r"(\t)", keep_part):
                if chunk == "\t":
                    rebuilt.append(rebuilt.makeelement(W_TAB, {}))
                elif chunk:
                    t = rebuilt.makeelement(W_T, {})
                    t.text = chunk
                    t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
                    rebuilt.append(t)
            r.addprevious(rebuilt)
            kept_last = rebuilt
            first_removed = first_removed if first_removed is not None else r
            r.getparent().remove(r)
            continue
        if first_removed is None:
            first_removed = r
        r.getparent().remove(r)
    src = first_removed if (style == "value" and first_removed is not None) else (kept_last if kept_last is not None else first_removed)
    if src is None:
        p.add_run(tag_text)
        return p
    new = _clone_run(src, tag_text)
    if kept_last is not None:
        kept_last.addnext(new)
    else:
        p._p.append(new)
    return p


def add_paragraph_after(p: Paragraph, text: str, like: Paragraph | None = None) -> Paragraph:
    """Insert a new paragraph after `p` (copying paragraph props of `like` or `p`) holding `text`."""
    src = like or p
    new_p = copy.deepcopy(src._p)
    for child in list(new_p):
        if child.tag != qn("w:pPr"):
            new_p.remove(child)
    p._p.addnext(new_p)
    np = Paragraph(new_p, p._parent)
    _new_run_like_mark(np, text)
    return np


def append_text(p: Paragraph, text: str, style_run: int = -1) -> Paragraph:
    runs = _runs(p)
    if not runs:
        _new_run_like_mark(p, text)
        return p
    src = runs[style_run]
    src.addnext(_clone_run(src, text))
    return p


def set_cell(cell: _Cell, text: str, style_par: int = 0, style_run: int = 0) -> _Cell:
    """Cell gets exactly one paragraph with `text` (formatting of an existing paragraph/run kept)."""
    pars = cell.paragraphs
    keep = pars[min(style_par, len(pars) - 1)]
    for p in pars:
        if p is not keep:
            p._p.getparent().remove(p._p)
    set_text(keep, text, style_run)
    return cell


def strip_highlight(container) -> None:
    """Remove yellow 'MOHON DIISI' style highlights from runs in a paragraph/cell/doc."""
    el = container._element if hasattr(container, "_element") else container._p
    for h in el.findall(".//" + qn("w:highlight")):
        h.getparent().remove(h)


def row_loop(table: Table, row_idx: int, loop: str, tags: list[str | None], drop_rows: Iterable[int] = ()) -> None:
    """Turn table row `row_idx` into a docxtemplater row loop over `loop`.
    `tags` gives the content per (unique) cell: e.g. ["{no}", "{deskripsi}", None] (None = keep empty).
    Rows in `drop_rows` are deleted (e.g. the other blank sample rows)."""
    row = table.rows[row_idx]
    cells = []
    for c in row.cells:
        if not cells or cells[-1]._tc is not c._tc:
            cells.append(c)
    if len(tags) != len(cells):
        raise SystemExit(f"row_loop: {len(cells)} cells but {len(tags)} tags")
    for i, (c, tag) in enumerate(zip(cells, tags)):
        txt = tag or ""
        if i == 0:
            txt = "{#" + loop + "}" + txt
        if i == len(cells) - 1:
            txt = txt + "{/" + loop + "}"
        set_cell(c, txt)
    delete_rows(table, drop_rows)


def delete_rows(table: Table, idxs: Iterable[int]) -> None:
    rows = table.rows
    for i in sorted(set(idxs), reverse=True):
        tr = rows[i]._tr
        tr.getparent().remove(tr)


def _unwrap_sdt(el) -> None:
    """Replace a content control (w:sdt) by its content so the glyph becomes plain text."""
    sdt = el
    while sdt is not None and sdt.tag != qn("w:sdt"):
        sdt = sdt.getparent()
    if sdt is None:
        return
    content = sdt.find(qn("w:sdtContent"))
    for child in list(content) if content is not None else []:
        sdt.addprevious(child)
    sdt.getparent().remove(sdt)


def checkbox(p: Paragraph, tag: str, nth: int = 0) -> Paragraph:
    """Replace the nth ☐/☒/□ glyph (plain text or content-control checkbox) with {tag}."""
    seen = 0
    for t in list(p._p.iter(W_T)):
        if t.text and re.search("[☐☒□■]", t.text):
            if seen < nth:
                seen += len(re.findall("[☐☒□■]", t.text))
                if seen <= nth:
                    continue
            t.text = re.sub("[☐☒□■]", "{" + tag + "}", t.text, count=1)
            _unwrap_sdt(t)
            return p
    raise SystemExit(f"no checkbox glyph #{nth} in {p.text!r}")


def checkbox_cell(cell: _Cell, tag: str) -> _Cell:
    for p in cell.paragraphs:
        for t in p._p.iter(W_T):
            if t.text and re.search("[☐☒□■]", t.text):
                checkbox(p, tag)
                return cell
    raise SystemExit("no checkbox glyph in cell")


def sub(p: Paragraph, pattern: str, repl: str, count: int = 1) -> Paragraph:
    """Regex replace inside single w:t text nodes (pattern must not span runs)."""
    done = 0
    for t in p._p.iter(W_T):
        if done >= count:
            break
        if t.text and re.search(pattern, t.text):
            t.text, n = re.subn(pattern, lambda _m: repl, t.text, count=count - done)
            t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
            done += n
    if done == 0:
        raise SystemExit(f"sub: /{pattern}/ not found in {p.text!r}")
    return p


def remove_par(p: Paragraph) -> None:
    p._p.getparent().remove(p._p)


def option_runs(p: Paragraph, label_pattern: str, key: str, options: list[str], sep: str = "/", tail: str | None = None) -> Paragraph:
    """'Tipe : Laptop/Desktop/Printer/TV' -> each option rendered struck-through unless selected.
    Data needs {key}_{i} booleans (see optionFlags in src/forms/schema.ts)."""
    replace_after(p, label_pattern, "", style="label")
    runs = _runs(p)
    base = runs[-1]
    base_rpr = base.find(qn("w:rPr"))
    for r in base.findall(qn("w:rPr") + "/" + qn("w:strike")):
        r.getparent().remove(r)
    anchor = base
    for i, o in enumerate(options):
        text = o + (sep if i < len(options) - 1 else "")
        on = _clone_run(base, "{#" + f"{key}_{i}" + "}" + text + "{/" + f"{key}_{i}" + "}")
        off = _clone_run(base, "{^" + f"{key}_{i}" + "}" + text + "{/" + f"{key}_{i}" + "}")
        rpr = off.find(qn("w:rPr"))
        if rpr is None:
            rpr = off.makeelement(qn("w:rPr"), {})
            off.insert(0, rpr)
        rpr.append(rpr.makeelement(qn("w:strike"), {}))
        anchor.addnext(on)
        on.addnext(off)
        anchor = off
    if tail:
        anchor.addnext(_clone_run(base, tail))
    _ = base_rpr
    return p


def main_args(n: int = 1) -> list[str]:
    if len(sys.argv) < n + 1:
        raise SystemExit(f"usage: {sys.argv[0]} <source.docx> [out.docx]")
    return sys.argv[1:]
