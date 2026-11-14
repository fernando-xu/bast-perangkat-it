import { pad3 } from "../schema";
import type { FormDef, ImageValue, TemplateHelpers } from "../types";

type Kronologi = { waktu: string; deskripsi: string };
type Solusi = { solusi: string; status: string };
type Tindakan = { tanggal: string; deskripsi: string; pic: string; status: string };
type Foto = { tanggal: string; gambar: ImageValue[]; keterangan: string };

const KATEGORI = ["Low", "Medium", "High", "Critical"];
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** "2026-02-18" -> "Rabu, 18 Februari 2026" */
function hariTanggal(iso: unknown, h: TemplateHelpers) {
  const s = String(iso ?? "");
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return h.tanggal(s);
  const day = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay();
  return `${HARI[day]}, ${h.tanggal(s)}`;
}

/** textarea -> [{ t }] per non-empty line (leading "-", "•", "*" dropped: the template prints bullets) */
const bullets = (v: unknown) =>
  String(v ?? "")
    .split("\n")
    .map((l) => l.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean)
    .map((t) => ({ t }));

const filled = <T extends Record<string, unknown>>(rows: unknown) =>
  ((rows as T[]) ?? []).filter((r) => Object.values(r).some((v) => (Array.isArray(v) ? v.length : String(v ?? "").trim())));

const solusiCols = [
  { key: "solusi", label: "Solusi", type: "textarea" as const, width: "75%" },
  { key: "status", label: "Status", type: "text" as const, width: "25%", placeholder: "Done" },
];
const tindakanCols = [
  { key: "tanggal", label: "Tanggal", type: "date" as const, width: "18%" },
  { key: "deskripsi", label: "Deskripsi", type: "textarea" as const, width: "47%" },
  { key: "pic", label: "PIC", type: "text" as const, width: "18%" },
  { key: "status", label: "Status", type: "text" as const, width: "17%" },
];
const fotoCols = [
  { key: "tanggal", label: "Tanggal", type: "date" as const, width: "18%" },
  { key: "gambar", label: "Gambar", type: "image" as const, width: "47%", max: 3 },
  { key: "keterangan", label: "Keterangan", type: "textarea" as const, width: "35%" },
];

// tiny solid-colour JPEGs (32x24) for sample()
const JPEG_HEAD =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAGAAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgAGAAgAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMACQkJCQkJEAkJEBYQEBAWHhYWFhYeJh4eHh4eJi4mJiYmJiYuLi4uLi4uLjc3Nzc3N0BAQEBASEhISEhISEhISP/bAEMBCwwMEhESHxERH0szKjNLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS//dAAQAAv/aAAwDAQACEQMRAD8A";
const RED: ImageValue = { src: `${JPEG_HEAD}yKKKK84+zCiiigD/0MiiiivOPswooooA/9k=`, w: 32, h: 24, name: "sebelum.jpg" };
const BLUE: ImageValue = { src: `${JPEG_HEAD}jooor3z54KKKKAP/0I6KKK98+eCiiigD/9k=`, w: 32, h: 24, name: "setelah.jpg" };

export const li: FormDef = {
  id: "li",
  code: "FRM.IT.011",
  title: "Laporan Insiden",
  short: "LI",
  description: "Laporan insiden IT: kronologi, root cause, impact, solusi, tindakan dan foto sebelum/sesudah perbaikan.",
  number: {
    kind: "standard",
    label: "No. Dok",
    format: (n) => `LI-${pad3(n.urut)}-${n.lokasi}-${n.bulan}-${n.tahun}`,
    defaultLokasi: "HO",
  },
  sections: [
    {
      title: "Laporan",
      fields: [{ type: "date", key: "tanggal", label: "Hari / Tanggal Laporan" }],
    },
    {
      title: "Detail Informasi Laporan Insiden",
      fields: [
        { type: "textarea", key: "namaKaryawan", label: "Nama Karyawan", hint: "Karyawan yang terdampak / melapor" },
        { type: "text", key: "insiden", label: "Insiden", span: 6, hint: "Juga dipakai sebagai judul laporan di header" },
        { type: "text", key: "lokasi", label: "Lokasi" },
        { type: "date", key: "tglInsiden", label: "Tanggal Insiden" },
        { type: "text", key: "waktuInsiden", label: "Waktu Insiden", placeholder: "08:30 WIB" },
        { type: "select", key: "kategori", label: "Kategori Insiden", options: KATEGORI },
        { type: "text", key: "durasi", label: "Durasi Gangguan", placeholder: "2 jam" },
        { type: "radio", key: "sla", label: "Melanggar SLA", options: ["Ya", "Tidak"] },
      ],
    },
    {
      title: "Kronologi",
      fields: [
        { type: "text", key: "judulKronologi", label: "Judul", span: 6 },
        {
          type: "table",
          key: "kronologi",
          label: "Kronologi",
          maxRows: 20,
          minRows: 1,
          columns: [
            { key: "waktu", label: "Waktu", type: "text", width: "20%", placeholder: "Week 1 Jan" },
            { key: "deskripsi", label: "Deskripsi", type: "textarea", width: "80%" },
          ],
        },
      ],
    },
    {
      title: "Analisa & Solusi",
      fields: [
        { type: "textarea", key: "rootCause", label: "Root Cause", hint: "Satu poin per baris" },
        { type: "textarea", key: "impact", label: "Impact", hint: "Satu poin per baris" },
        { type: "table", key: "solusiPendek", label: "Solusi Jangka Pendek", maxRows: 10, minRows: 1, columns: solusiCols },
        { type: "table", key: "solusiPanjang", label: "Solusi Jangka Panjang", maxRows: 10, minRows: 1, columns: solusiCols },
      ],
    },
    {
      title: "Tindakan",
      fields: [
        { type: "table", key: "tindakan", label: "Tindakan", maxRows: 20, minRows: 1, columns: tindakanCols },
        { type: "table", key: "selanjutnya", label: "Tindakan Selanjutnya", maxRows: 20, minRows: 1, columns: tindakanCols },
      ],
    },
    {
      title: "Lampiran",
      hint: "Foto dicetak di tabel LAMPIRAN (maks. 3 foto per baris).",
      fields: [
        { type: "table", key: "sebelum", label: "Sebelum Perbaikan", maxRows: 10, minRows: 1, columns: fotoCols },
        { type: "table", key: "setelah", label: "Setelah Perbaikan", maxRows: 10, minRows: 1, columns: fotoCols },
      ],
    },
  ],
  template: () => "li.docx",
  toTemplate: (d, h) => {
    const kronologi = filled<Kronologi>(d.kronologi);
    const pendek = filled<Solusi>(d.solusiPendek);
    const panjang = filled<Solusi>(d.solusiPanjang);
    const tindakan = (rows: unknown) =>
      filled<Tindakan>(rows).map((r) => ({ ...r, tanggal: h.tanggal(r.tanggal) }));
    const foto = (rows: unknown) =>
      filled<Foto>(rows).map((r) => ({
        tanggal: h.tanggal(r.tanggal),
        gambar: h.images(r.gambar, 8, 5.5),
        keterangan: r.keterangan,
      }));
    return {
      noDok: li.number.kind === "standard" ? li.number.format(d.no) : "",
      hariTgl: hariTanggal(d.tanggal, h),
      judulLaporan: d.insiden,
      namaKaryawan: d.namaKaryawan,
      insiden: d.insiden,
      lokasi: d.lokasi,
      tglInsiden: h.tanggal(d.tglInsiden),
      waktuInsiden: d.waktuInsiden,
      kategori: d.kategori,
      durasi: d.durasi,
      sla: d.sla,
      judulKronologi: d.judulKronologi,
      kWaktu: kronologi[0]?.waktu ?? "",
      kDeskripsi: kronologi[0]?.deskripsi ?? "",
      kronologiRest: kronologi.slice(1),
      rootCause: bullets(d.rootCause),
      impact: bullets(d.impact),
      pSolusi: pendek[0]?.solusi ?? "",
      pStatus: pendek[0]?.status ?? "",
      pendekRest: pendek.slice(1),
      qSolusi: panjang[0]?.solusi ?? "",
      qStatus: panjang[0]?.status ?? "",
      panjangRest: panjang.slice(1),
      tindakan: tindakan(d.tindakan),
      selanjutnya: tindakan(d.selanjutnya),
      sebelum: foto(d.sebelum),
      setelah: foto(d.setelah),
    };
  },
  summary: (d) => [d.insiden, d.lokasi, d.kategori].filter(Boolean).join(" · "),
  sample: () => ({
    tanggal: "2026-11-14",
    namaKaryawan: "Budi Santoso, Rina Wulandari, Agus Pratama",
    insiden: "Server File – Akses Shared Folder Gagal",
    lokasi: "HO Jakarta",
    tglInsiden: "2026-11-10",
    waktuInsiden: "08:15 WIB",
    kategori: "Medium",
    durasi: "3 jam",
    sla: "Tidak",
    judulKronologi: "User tidak bisa membuka shared folder di server file",
    kronologi: [
      { waktu: "08:15", deskripsi: "Laporan dari Pak Budi bahwa drive mapping S: tidak dapat dibuka (Access denied)." },
      { waktu: "08:40", deskripsi: "Laporan serupa dari Bu Rina dan Pak Agus di lantai 3." },
      { waktu: "11:15", deskripsi: "Akses pulih setelah perbaikan permission dan restart service." },
    ],
    rootCause: "- Permission group FS-Users terhapus saat sinkronisasi AD\n- Service LanmanServer tertahan setelah update",
    impact: "Karyawan divisi Finance tidak bisa mengakses dokumen bersama\nProses closing harian tertunda ±3 jam",
    solusiPendek: [
      { solusi: "Mengembalikan permission group FS-Users pada shared folder", status: "Done" },
      { solusi: "Restart service LanmanServer", status: "Done" },
    ],
    solusiPanjang: [
      { solusi: "Monitoring perubahan permission melalui audit log mingguan", status: "On Progress" },
      { solusi: "Dokumentasi prosedur sinkronisasi AD", status: "Open" },
    ],
    tindakan: [
      { tanggal: "2026-11-10", deskripsi: "Perbaikan permission shared folder", pic: "Tim Infra", status: "Done" },
      { tanggal: "2026-11-11", deskripsi: "Pengecekan log sinkronisasi AD", pic: "Tim Infra", status: "Done" },
    ],
    selanjutnya: [{ tanggal: "2026-11-20", deskripsi: "Review audit log permission", pic: "IT Security", status: "Open" }],
    sebelum: [{ tanggal: "2026-11-10", gambar: [RED, RED], keterangan: "Error Access denied saat membuka drive S:" }],
    setelah: [
      { tanggal: "2026-11-10", gambar: [BLUE], keterangan: "Drive S: dapat diakses kembali" },
      { tanggal: "2026-11-11", gambar: [BLUE], keterangan: "Log audit permission aktif" },
    ],
  }),
};
