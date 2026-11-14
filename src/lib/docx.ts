import { readFile } from "node:fs/promises";
import path from "node:path";
import PizZip from "pizzip";
import {
  type Bast,
  CHECKLIST_ROWS,
  DEVICE_TYPES,
  CONDITIONS,
  formatTanggal,
  noBast,
} from "./schema";

const TEMPLATE = path.join(process.cwd(), "templates", "bast-template.docx");

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Plain values for {{key}} placeholders. */
export function templateValues(b: Bast): Record<string, string> {
  const v: Record<string, string> = {
    no_bast: noBast(b),
    kode: b.kode,
    merk: b.merk,
    spek1: b.spek1,
    spek2: b.spek2,
    spek3: b.spek3,
    kelengkapan: b.kelengkapan,
    lokasi: b.lokasi,
    penerima: b.penerima,
    perusahaan: b.perusahaan,
    departemen: b.departemen,
    lama_kode: b.perangkatLama ? b.lamaKode : "",
    lama_merk: b.perangkatLama ? b.lamaMerk : "",
    lama_spek1: b.perangkatLama ? b.lamaSpek1 : "",
    lama_spek2: b.perangkatLama ? b.lamaSpek2 : "",
    lama_kelengkapan: b.perangkatLama ? b.lamaKelengkapan : "",
    keterangan: b.keterangan,
    keterangan2: b.keterangan2,
    keterangan3: b.keterangan3,
    tgl_terima: formatTanggal(b.tglTerima),
    tgl_serah: formatTanggal(b.tglSerah),
    tgl_tahu: formatTanggal(b.tglTahu),
    nama_terima: b.namaTerima,
    nama_serah: b.namaSerah,
    nama_tahu: b.namaTahu,
    tgl2_tahu: formatTanggal(b.tgl2Tahu),
    nama2_terima: b.nama2Terima,
    nama2_info: b.nama2Info,
    nama2_tahu: b.nama2Tahu,
    "cv:lama_ada": b.perangkatLama ? "1" : "0",
    "cv:lama_tidak": b.perangkatLama ? "0" : "1",
    "cb:lama_ada": b.perangkatLama ? "☒" : "☐",
    "cb:lama_tidak": b.perangkatLama ? "☐" : "☒",
  };
  for (let i = 0; i < CHECKLIST_ROWS; i++) {
    const it = b.checklist[i];
    const filled = !!it && (it.nama || it.kondisi || it.keterangan);
    v[`ck${i}_no`] = filled ? String(i + 1) : "";
    v[`ck${i}_nama`] = it?.nama ?? "";
    v[`ck${i}_b`] = it?.kondisi === "baik" ? "✓" : "";
    v[`ck${i}_k`] = it?.kondisi === "kurang" ? "✓" : "";
    v[`ck${i}_ket`] = it?.keterangan ?? "";
  }
  return v;
}

const OPTIONS: Record<string, (b: Bast) => { options: readonly string[]; selected: string }> = {
  penyerahan: (b) => ({ options: DEVICE_TYPES, selected: b.penyerahan }),
  ceklist_jenis: (b) => ({ options: DEVICE_TYPES, selected: b.penyerahan }),
  jenis: (b) => ({ options: CONDITIONS, selected: b.jenis }),
};

function addStrike(rPr: string) {
  return rPr.replace("</w:rPr>", "<w:strike/></w:rPr>");
}

function fill(xml: string, b: Bast) {
  // 1) option lists -> several runs, unselected ones struck through
  xml = xml.replace(
    /<w:r>(<w:rPr>(?:(?!<\/w:rPr>).)*<\/w:rPr>)<w:t xml:space="preserve">\{\{opt:(\w+)\}\}<\/w:t><\/w:r>/g,
    (_m, rPr: string, key: string) => {
      const def = OPTIONS[key];
      if (!def) throw new Error(`unknown option placeholder ${key}`);
      const { options, selected } = def(b);
      return options
        .map((o, i) => {
          const text = o + (i < options.length - 1 ? " / " : "");
          const rp = o === selected ? rPr : addStrike(rPr);
          return `<w:r>${rp}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
        })
        .join("");
    },
  );
  // 2) plain values
  const values = templateValues(b);
  xml = xml.replace(/\{\{([\w:]+)\}\}/g, (_m, key: string) => {
    if (!(key in values)) throw new Error(`unknown placeholder ${key}`);
    return esc(values[key]);
  });
  return xml;
}

export async function renderDocx(b: Bast): Promise<Buffer> {
  const zip = new PizZip(await readFile(TEMPLATE));
  for (const name of ["word/document.xml", "word/header1.xml"]) {
    zip.file(name, fill(zip.file(name)!.asText(), b));
  }
  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
}
