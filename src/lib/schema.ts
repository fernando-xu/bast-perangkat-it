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
  spek1: str,
  spek2: str,
  spek3: str,
  kelengkapan: str,
  lokasi: str,
  penerima: str,
  perusahaan: str,
  departemen: str,

  perangkatLama: z.boolean().default(false),
  lamaKode: str,
  lamaMerk: str,
  lamaSpek1: str,
  lamaSpek2: str,
  lamaKelengkapan: str,

  keterangan: str,
  keterangan2: str,
  keterangan3: str,

  tglTerima: str,
  tglSerah: str,
  tglTahu: str,
  namaTerima: str,
  namaSerah: str,
  namaTahu: str,

  tgl2Tahu: str,
  nama2Terima: str,
  nama2Info: str,
  nama2Tahu: str,

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
    lamaSpek1: "",
    lamaSpek2: "",
    lamaKelengkapan: "",
    keterangan: "",
    keterangan2: "",
    keterangan3: "",
    tglTerima: "",
    tglSerah: "",
    tglTahu: "",
    namaTerima: "",
    namaSerah: "Yoan A.",
    namaTahu: "",
    tgl2Tahu: "",
    nama2Terima: "",
    nama2Info: "Yoan A.",
    nama2Tahu: "",
    checklist: DEFAULT_CHECKLIST.map((nama) => ({ nama, kondisi: "", keterangan: "" })),
  };
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
