import { readFile } from "node:fs/promises";
import path from "node:path";
import PizZip from "pizzip";
import { type Bast, CHECKLIST_ROWS, CONDITIONS, DEVICE_TYPES, formatTanggal, noBast } from "./schema";

/**
 * HTML replica of the BAST Word form, used to produce the PDF.
 * Two fixed A4 pages: page 1 = handover data, page 2 = new-device checklist.
 */

const ROOT = process.cwd();
let assets: Promise<{ logo: string; fonts: string }> | null = null;

function loadAssets() {
  assets ??= (async () => {
    const zip = new PizZip(await readFile(path.join(ROOT, "templates", "bast-template.docx")));
    const gif = zip.file("word/media/image1.gif")!.asNodeBuffer();
    const fontDir = path.join(ROOT, "node_modules", "@fontsource", "arimo", "files");
    const face = async (file: string, weight: number, style: string) =>
      `@font-face{font-family:"BastArial";font-weight:${weight};font-style:${style};src:url(data:font/woff2;base64,${(
        await readFile(path.join(fontDir, file))
      ).toString("base64")}) format("woff2");}`;
    const fonts = (
      await Promise.all([
        face("arimo-latin-400-normal.woff2", 400, "normal"),
        face("arimo-latin-400-italic.woff2", 400, "italic"),
        face("arimo-latin-700-normal.woff2", 700, "normal"),
        face("arimo-latin-700-italic.woff2", 700, "italic"),
      ])
    ).join("\n");
    return { logo: `data:image/gif;base64,${gif.toString("base64")}`, fonts };
  })();
  return assets;
}

const e = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const CHECK_SVG = `<svg viewBox="0 0 16 16" width="12" height="12"><path d="M2 8.5l4 4L14 3.5" fill="none" stroke="#000" stroke-width="2"/></svg>`;
const box = (checked: boolean) =>
  `<svg viewBox="0 0 14 14" width="12" height="12" style="vertical-align:-1px"><rect x="1" y="1" width="12" height="12" fill="none" stroke="#000" stroke-width="1.3"/>${
    checked ? '<path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="#000" stroke-width="1.3"/>' : ""
  }</svg>`;

function options(opts: readonly string[], selected: string) {
  return opts
    .map((o, i) => {
      const t = e(o) + (i < opts.length - 1 ? " / " : "");
      return o === selected ? `<span>${t}</span>` : `<s>${t}</s>`;
    })
    .join("");
}

function field(label: string, value: string, sub?: string) {
  return `<div class="row"><div class="lbl">${e(label)}${sub ? `<div class="sub">${e(sub)}</div>` : ""}</div><div class="colon">:</div><div class="val">${e(value) || "&nbsp;"}</div></div>`;
}
function cont(value: string) {
  return `<div class="row"><div class="lbl"></div><div class="colon">:</div><div class="val">${e(value) || "&nbsp;"}</div></div>`;
}

function header(logo: string, b: Bast) {
  return `<header>
  <img class="logo" src="${logo}" alt="">
  <div class="title">BERITA ACARA SERAH TERIMA PERANGKAT IT</div>
  <div class="no">No.BAST : ${e(noBast(b))}</div>
  <div class="meta"><i>(No.Urut/Lokasi Area/Bulan Romawi/Tahun)</i><b>FRM.IT.003;Rev02</b></div>
</header>`;
}

function signTable(cols: { title: string; tanggal?: string | null; nama: string; role: string }[]) {
  const row = (f: (c: (typeof cols)[number]) => string, cls = "") =>
    `<tr class="${cls}">${cols.map((c, i) => (i === 2 ? `<td class="gap"></td>` : "") + `<td>${f(c)}</td>`).join("")}</tr>`;
  return `<table class="sign">
  <colgroup><col style="width:25%"><col style="width:25%"><col style="width:22%"><col style="width:28%"></colgroup>
  ${row((c) => e(c.title))}
  ${row((c) => (c.tanggal === null ? "" : `Tanggal: ${e(c.tanggal ?? "")}`), "space")}
  ${row((c) => `(Nama: ${e(c.nama) || "&nbsp;".repeat(14)})`, "center")}
  ${row((c) => c.role, "center")}
</table>`;
}

const CSS = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: "BastArial", Arial, Helvetica, sans-serif; font-size: 11pt; color: #000; -webkit-print-color-adjust: exact; }
.page { width: 210mm; height: 297mm; padding: 12.5mm 20mm 0 20mm; position: relative; overflow: hidden; page-break-after: always; }
.page:last-child { page-break-after: auto; }
header { position: relative; text-align: center; margin-bottom: 9mm; }
header .logo { position: absolute; left: -8mm; top: -2mm; width: 22mm; height: 16.1mm; }
header .title { font-size: 14pt; text-decoration: underline; padding-top: 6mm; }
header .no { margin-top: 1mm; }
header .meta { display: flex; justify-content: flex-end; align-items: baseline; gap: 10mm; margin-top: 1mm; }
header .meta i { font-size: 9pt; }
footer { position: absolute; right: 20mm; bottom: 12.5mm; font-size: 8pt; }
.row { display: grid; grid-template-columns: 52mm 4mm 1fr; align-items: end; min-height: 7.2mm; }
.lbl .sub { font-size: 9pt; font-style: italic; line-height: 1.1; }
.colon { padding-bottom: 1px; }
.val { border-bottom: 1px dotted #000; padding: 0 2px 1px; min-height: 5.5mm; }
.val.plain { border-bottom: none; }
.note { font-size: 9pt; font-style: italic; padding-left: 56mm; margin: 0.5mm 0 1mm; }
s { text-decoration: line-through; }
.chk { display: inline-flex; align-items: center; gap: 4px; margin-right: 32mm; }
.gapline { height: 4mm; }
.lead { margin: 8mm 0 3mm; }
table.sign { width: 100%; border-collapse: collapse; table-layout: fixed; }
table.sign td { border: 1px solid #000; padding: 2px 5px; vertical-align: top; }
table.sign td.gap { border: none; }
table.sign tr.space td { height: 22mm; }
table.sign tr.center td { text-align: center; }
table.sign tr td { word-wrap: break-word; }
.cl-head { margin: 0 0 3mm; }
table.cl { width: 100%; border-collapse: collapse; font-size: 10pt; }
table.cl td, table.cl th { border: 1px solid #000; padding: 1.6px 5px; height: 6.2mm; }
table.cl th { font-weight: 700; text-align: center; }
table.cl td.no { text-align: right; width: 9mm; }
table.cl td.mid { text-align: center; }
table.cl .la td { border: none; font-weight: 400; padding-top: 3mm; }
.closing { margin: 5mm 0 4mm; }
`;

export async function renderHtml(b: Bast): Promise<string> {
  const { logo, fonts } = await loadAssets();
  const lama = b.perangkatLama;
  const L = (v: string) => (lama ? v : "");

  const page1 = `<section class="page">
${header(logo, b)}
<div class="row"><div class="lbl">Penyerahan<div class="sub">(pilih salah satu)</div></div><div class="colon">:</div><div class="val plain">${options(DEVICE_TYPES, b.penyerahan)}</div></div>
<div class="row"><div class="lbl">Jenis Perangkat<div class="sub">(pilih salah satu)</div></div><div class="colon">:</div><div class="val plain">${options(CONDITIONS, b.jenis)}</div></div>
${field("Kode Perangkat", b.kode)}
${field("Merk/Spesifikasi/SN", b.merk)}
${cont(b.spek1)}
${cont(b.spek2)}
${cont(b.spek3)}
${field("Kelengkapan", b.kelengkapan)}
${field("Lokasi", b.lokasi)}
${field("Penerima", b.penerima)}
${field("Perusahaan", b.perusahaan)}
${field("Departement", b.departemen)}
<div class="row"><div class="lbl">Perangkat Lama</div><div class="colon">:</div><div class="val plain"><span class="chk">${box(lama)} Ada</span><span class="chk">${box(!lama)} Tidak Ada</span></div></div>
<div class="note">(Jika ada, harap isi pada baris dibawah ini)</div>
${field("Kode Perangkat", L(b.lamaKode), "(Perangkat Lama)")}
${field("Merk/Spesifikasi/SN", L(b.lamaMerk), "(Perangkat Lama)")}
${cont(L(b.lamaSpek1))}
${cont(L(b.lamaSpek2))}
${field("Kelengkapan", L(b.lamaKelengkapan), "(Perangkat Lama)")}
${field("Keterangan", b.keterangan)}
${cont(b.keterangan2)}
${cont(b.keterangan3)}
<div class="lead">Telah dilakukan proses serah terima:</div>
${signTable([
  { title: "Diterima Oleh,", tanggal: formatTanggal(b.tglTerima), nama: b.namaTerima, role: "<i>User /</i> PIC" },
  { title: "Diserahkan Oleh,", tanggal: formatTanggal(b.tglSerah), nama: b.namaSerah, role: "IT <i>In Charge</i>" },
  { title: "Diketahui Oleh,", tanggal: formatTanggal(b.tglTahu), nama: b.namaTahu, role: "IT / HR" },
])}
<footer>halaman 1 dari 2</footer>
</section>`;

  const rows: string[] = [];
  for (let i = 0; i < CHECKLIST_ROWS; i++) {
    const it = b.checklist[i];
    const filled = !!it && !!(it.nama || it.kondisi || it.keterangan);
    rows.push(
      `<tr><td class="no">${filled ? i + 1 : ""}</td><td>${e(it?.nama ?? "")}</td><td class="mid">${
        it?.kondisi === "baik" ? CHECK_SVG : ""
      }</td><td class="mid">${it?.kondisi === "kurang" ? CHECK_SVG : ""}</td><td>${e(it?.keterangan ?? "")}</td></tr>`,
    );
  }

  const page2 = `<section class="page">
${header(logo, b)}
<div class="cl-head">Ceklist Perangkat Baru : ${options(DEVICE_TYPES, b.penyerahan)} <i style="font-size:9pt">(pilih salah satu)</i></div>
<table class="cl">
  <colgroup><col style="width:9mm"><col style="width:48mm"><col style="width:20mm"><col style="width:22mm"><col></colgroup>
  <tr class="la"><td colspan="5">List Activity</td></tr>
  <tr><th rowspan="2">No</th><th rowspan="2">Nama Items</th><th colspan="2">Cek Unit dan Informasi Pemakaian</th><th rowspan="2">Keterangan</th></tr>
  <tr><th>Baik</th><th>Kurang Baik</th></tr>
  ${rows.join("\n")}
</table>
<p class="closing">Telah dilakukan proses pengecekan perangkat baru dan penyampaian informasi mengenai kondisi perangkat yang baru.</p>
${signTable([
  { title: "Diterima Oleh,", tanggal: null, nama: b.nama2Terima, role: "<i>User /</i> PIC" },
  { title: "Diinformasikan Oleh,", tanggal: null, nama: b.nama2Info, role: "IT <i>In Charge</i>" },
  { title: "Diketahui Oleh,", tanggal: formatTanggal(b.tgl2Tahu), nama: b.nama2Tahu, role: "IT / HR" },
])}
<footer>halaman 2 dari 2</footer>
</section>`;

  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${e(noBast(b))}</title><style>${fonts}${CSS}</style></head><body>${page1}${page2}</body></html>`;
}
