import { pad3 } from "../schema";
import type { FormDef } from "../types";

type Langkah = { judul: string; detail: string };
type Revisi = { noRev: string; bagian: string; halaman: string; tanggal: string };

const lines = (v: unknown) =>
  String(v ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/** rows -> [{ no: "4.1", judul, items: [{ no: "4.1.1", t }] }] */
function numbered(section: number, rows: unknown) {
  return ((rows as Langkah[]) ?? [])
    .filter((r) => r.judul?.trim() || r.detail?.trim())
    .map((r, i) => ({
      no: `${section}.${i + 1}`,
      judul: r.judul,
      items: lines(r.detail).map((t, j) => ({ no: `${section}.${i + 1}.${j + 1}`, t })),
    }));
}

const langkahCols = [
  { key: "judul", label: "Judul", type: "text" as const, width: "35%" },
  { key: "detail", label: "Rincian (satu sub-poin per baris)", type: "textarea" as const, width: "65%" },
];

/** blank rows printed below the filled revision rows (the original has a 26-row grid) */
const MIN_REV_ROWS = 10;

export const ik: FormDef = {
  id: "ik",
  code: "FRM.IT.007",
  title: "Instruksi Kerja",
  short: "IK",
  description: "Dokumen instruksi kerja IT: deskripsi, ruang lingkup, uraian langkah, larangan, sanksi dan catatan perubahan.",
  number: {
    kind: "standard",
    label: "No. IK",
    format: (n) => `IK-${pad3(n.urut)}-${n.lokasi}-${n.bulan}-${n.tahun}`,
    defaultLokasi: "HO",
  },
  sections: [
    {
      title: "Identitas Dokumen",
      fields: [
        { type: "text", key: "judul", label: "Judul Instruksi Kerja", span: 6 },
        { type: "text", key: "revisi", label: "Revisi", span: 2 },
        { type: "date", key: "tanggal", label: "Tanggal", span: 2 },
      ],
    },
    {
      title: "Persetujuan",
      fields: [
        { type: "text", key: "siapNama", label: "Disiapkan Oleh — Nama", span: 2 },
        { type: "text", key: "siapJabatan", label: "Jabatan", span: 2 },
        { type: "date", key: "siapTgl", label: "Tanggal", span: 2 },
        { type: "text", key: "periksaNama", label: "Diperiksa Oleh — Nama", span: 2 },
        { type: "text", key: "periksaJabatan", label: "Jabatan", span: 2 },
        { type: "date", key: "periksaTgl", label: "Tanggal", span: 2 },
        { type: "text", key: "setujuNama", label: "Disetujui Oleh — Nama", span: 2 },
        { type: "text", key: "setujuJabatan", label: "Jabatan", span: 2 },
        { type: "date", key: "setujuTgl", label: "Tanggal", span: 2 },
      ],
    },
    {
      title: "Isi Instruksi Kerja",
      fields: [
        { type: "textarea", key: "deskripsi", label: "1. Deskripsi" },
        { type: "textarea", key: "ruangLingkup", label: "2. Ruang Lingkup" },
        { type: "textarea", key: "pelaksana", label: "3. Pelaksana" },
        {
          type: "table",
          key: "uraian",
          label: "4. Uraian Instruksi",
          maxRows: 30,
          minRows: 1,
          columns: langkahCols,
          hint: "Tiap baris jadi 4.n (judul); tiap baris rincian jadi 4.n.m.",
        },
        {
          type: "table",
          key: "larangan",
          label: "5. Larangan dan Pengecualian",
          maxRows: 20,
          minRows: 1,
          columns: langkahCols,
          hint: "Tiap baris jadi 5.n; tiap baris rincian jadi 5.n.m.",
        },
        { type: "textarea", key: "sanksi", label: "6. Sanksi Pelanggaran" },
        { type: "textarea", key: "dokumen", label: "7. Dokumen Terkait", hint: "Satu dokumen per baris (7.1, 7.2, …)" },
      ],
    },
    {
      title: "Catatan Perubahan",
      fields: [
        {
          type: "table",
          key: "revisiLog",
          label: "Catatan Perubahan",
          maxRows: 26,
          minRows: 1,
          columns: [
            { key: "noRev", label: "No. Revisi", type: "text", width: "15%" },
            { key: "bagian", label: "Bagian / Sub Bagian yang Direvisi", type: "textarea", width: "45%" },
            { key: "halaman", label: "Halaman", type: "text", width: "15%" },
            { key: "tanggal", label: "Tanggal", type: "date", width: "25%" },
          ],
        },
      ],
    },
  ],
  defaults: () => ({
    revisi: "00",
    siapNama: "Edy Warsito",
    siapJabatan: "Section Head IT Infra & Security",
    periksaNama: "Adrian Leonard L",
    periksaJabatan: "IT Departement Head",
    setujuNama: "Richard Pardede",
    setujuJabatan: "SC,IT & Risk Management Director",
  }),
  template: () => "ik.docx",
  toTemplate: (d, h) => {
    const rev = ((d.revisiLog as Revisi[]) ?? [])
      .filter((r) => r.noRev || r.bagian || r.halaman || r.tanggal)
      .map((r) => ({ noRev: r.noRev, bagian: r.bagian, halaman: r.halaman, tgl: h.tanggal(r.tanggal) }));
    while (rev.length < MIN_REV_ROWS) rev.push({ noRev: "", bagian: "", halaman: "", tgl: "" });
    return {
      noDok: ik.number.kind === "standard" ? ik.number.format(d.no) : "",
      judul: d.judul,
      revisi: d.revisi,
      tanggal: h.tanggal(d.tanggal),
      siapNama: d.siapNama,
      siapJabatan: d.siapJabatan,
      siapTgl: h.tanggal(d.siapTgl),
      periksaNama: d.periksaNama,
      periksaJabatan: d.periksaJabatan,
      periksaTgl: h.tanggal(d.periksaTgl),
      setujuNama: d.setujuNama,
      setujuJabatan: d.setujuJabatan,
      setujuTgl: h.tanggal(d.setujuTgl),
      deskripsi: d.deskripsi,
      ruangLingkup: d.ruangLingkup,
      pelaksana: d.pelaksana,
      uraian: numbered(4, d.uraian),
      larangan: numbered(5, d.larangan),
      sanksi: d.sanksi,
      dokumen: lines(d.dokumen).map((t, i) => ({ no: `7.${i + 1}`, t })),
      revisiRows: rev,
    };
  },
  summary: (d) => [d.judul, d.revisi ? `Rev ${d.revisi}` : ""].filter(Boolean).join(" · "),
  sample: () => ({
    judul: "Backup dan Restore Server File",
    revisi: "00",
    tanggal: "2026-11-14",
    siapTgl: "2026-11-14",
    periksaTgl: "2026-11-16",
    deskripsi:
      "Instruksi kerja ini menjelaskan langkah-langkah melakukan backup harian dan restore data pada server file kantor pusat.",
    ruangLingkup: "Berlaku untuk seluruh server file di HO Jakarta yang dikelola oleh Dept. IT.",
    pelaksana: "Staff IT Infrastructure\nSection Head IT Infra & Security",
    uraian: [
      {
        judul: "Persiapan Backup",
        detail: "Pastikan media backup (NAS) dalam kondisi online.\nCek kapasitas penyimpanan minimal 20% tersedia.",
      },
      {
        judul: "Pelaksanaan Backup",
        detail: "Jalankan job backup harian pada aplikasi backup.\nVerifikasi status job = Success.\nCatat hasil pada log backup.",
      },
      { judul: "Restore Data", detail: "Restore dilakukan hanya berdasarkan permintaan tertulis dari user (ITRF)." },
    ],
    larangan: [
      { judul: "Larangan", detail: "Dilarang menghapus file backup sebelum masa retensi 30 hari berakhir." },
      { judul: "Pengecualian", detail: "Restore darurat dapat dilakukan dengan persetujuan lisan IT Departement Head." },
    ],
    sanksi: "Pelanggaran terhadap instruksi kerja ini dikenakan sanksi sesuai Peraturan Perusahaan.",
    dokumen: "SOP Pengelolaan Data dan Backup\nFRM.IT.001 IT Request Form",
    revisiLog: [{ noRev: "00", bagian: "Dokumen baru", halaman: "Semua", tanggal: "2026-11-14" }],
  }),
};
