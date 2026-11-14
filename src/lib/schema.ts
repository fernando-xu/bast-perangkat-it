import { z } from "zod";

export const DEVICE_TYPES = ["Laptop", "Desktop", "Printer"] as const;
export const CONDITIONS = ["Baru", "Bekas Pakai"] as const;
export const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"] as const;

export const DEFAULT_CHECKLIST = [
  "Casing",
  "LCD",
  "Engsel",
  "Keyboard",
  "Touchpad",
  "Charger/Kabel Power",
  "Port USB",
  "Port HDMI",
  "Port Audio",
  "Port USB-C",
  "Port VGA",
  "Port Lan",
  "Port Charger",
  "Additional Port",
];
export const CHECKLIST_ROWS = 20; // rows available in the template table

const str = z.string().max(300).default("");

export const checklistItem = z.object({
  nama: str,
  kondisi: z.enum(["", "baik", "kurang"]).default(""),
  keterangan: str,
});

export const bastSchema = z.object({
  noUrut: z.coerce.number().int().min(1).max(9999),
  lokasiArea: z.string().min(1).max(100),
  bulan: z.enum(ROMAN),
  tahun: z.coerce.number().int().min(2000).max(2100),

  penyerahan: z.enum(DEVICE_TYPES),
  jenis: z.enum(CONDITIONS),
  kode: str,
  merk: str,
  sn: str,
  spek1: str,
  spek2: str,
  spek3: str,
  kelengkapan: str,
  lokasi: str,
  /** Penerima — also printed as "Diterima Oleh" in both signature tables. */
  penerima: str,
  perusahaan: str,
  departemen: str,

  perangkatLama: z.boolean().default(false),
  lamaKode: str,
  lamaMerk: str,
  lamaSn: str,
  lamaSpek1: str,
  lamaSpek2: str,
  lamaKelengkapan: str,

  keterangan: z.string().max(400).default(""),

  /** IT In Charge — "Diserahkan Oleh" (page 1) and "Diinformasikan Oleh" (page 2). */
  namaIT: str,
  /** IT / HR — "Diketahui Oleh" on both pages. */
  namaTahu: str,

  tglTerima: str,
  tglSerah: str,
  tglTahu: str,
  tgl2Tahu: str,

  checklist: z.array(checklistItem).max(CHECKLIST_ROWS).default([]),
});

export type Bast = z.infer<typeof bastSchema>;
export type ChecklistItem = z.infer<typeof checklistItem>;

export function emptyBast(now = new Date()): Bast {
  return {
    noUrut: 1,
    lokasiArea: "HO Jakarta",
    bulan: ROMAN[now.getMonth()],
    tahun: now.getFullYear(),
    penyerahan: "Laptop",
    jenis: "Baru",
    kode: "",
    merk: "",
    sn: "",
    spek1: "",
    spek2: "",
    spek3: "",
    kelengkapan: "",
    lokasi: "HO Jakarta",
    penerima: "",
    perusahaan: "",
    departemen: "",
    perangkatLama: false,
    lamaKode: "",
    lamaMerk: "",
    lamaSn: "",
    lamaSpek1: "",
    lamaSpek2: "",
    lamaKelengkapan: "",
    keterangan: "",
    namaIT: "Yoan A.",
    namaTahu: "",
    tglTerima: "",
    tglSerah: "",
    tglTahu: "",
    tgl2Tahu: "",
    checklist: DEFAULT_CHECKLIST.map((nama) => ({ nama, kondisi: "", keterangan: "" })),
  };
}

/** "Lenovo V14" + "PF2MZJP9" -> "Lenovo V14 S/N. PF2MZJP9" (as printed on the form). */
export function merkSn(merk: string, sn: string) {
  return [merk.trim(), sn.trim() && `S/N. ${sn.trim()}`].filter(Boolean).join(" ");
}

export function noBast(b: Pick<Bast, "noUrut" | "lokasiArea" | "bulan" | "tahun">) {
  return `${String(b.noUrut).padStart(3, "0")}/${b.lokasiArea}/${b.bulan}/${b.tahun}`;
}

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** "2026-06-14" -> "14 Juni 2026"; empty stays empty. */
export function formatTanggal(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${MONTHS_ID[Number(m[2]) - 1]} ${m[1]}`;
}

export function fileBaseName(b: Bast) {
  return `BAST-${b.noUrut}_${b.lokasiArea.replace(/[^\w]+/g, "").toUpperCase()}_${b.bulan}_${b.tahun}`;
}
