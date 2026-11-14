import { optionFlags, pad3 } from "../schema";
import type { FormDef } from "../types";

type Item = { deskripsi: string; jumlah: string; satuan: string; hargaSatuan: string };

const PERIHAL = ["Laptop", "Desktop", "Printer"];
const DOTS = ".............................";

export const rkd: FormDef = {
  id: "rkd",
  code: "FRM.IT.005",
  title: "Rekomendasi Perangkat IT",
  short: "RKD",
  description: "Rekomendasi pengadaan perangkat dari Dept. IT untuk PIC/user.",
  number: {
    kind: "standard",
    label: "No. RKD",
    format: (n) => `${pad3(n.urut)}/${n.lokasi}/${n.bulan}/${n.tahun}`,
  },
  sections: [
    {
      title: "Kepada",
      fields: [
        { type: "text", key: "kepada", label: "Kepada", span: 6 },
        { type: "text", key: "nama", label: "Nama / PIC" },
        { type: "text", key: "departemen", label: "Departemen" },
        { type: "text", key: "perusahaan", label: "Perusahaan" },
        { type: "text", key: "lokasiPekerjaan", label: "Lokasi Pekerjaan" },
        { type: "date", key: "tanggal", label: "Tanggal" },
        { type: "radio", key: "perihal", label: "Perihal", options: [...PERIHAL, "Lainnya"] },
        { type: "text", key: "perihalLain", label: "Perihal lainnya", hint: "Diisi jika Perihal = Lainnya" },
      ],
    },
    {
      title: "Rincian Rekomendasi",
      fields: [
        {
          type: "table",
          key: "items",
          label: "Item",
          maxRows: 30,
          minRows: 1,
          columns: [
            { key: "deskripsi", label: "Deskripsi", type: "textarea", width: "40%" },
            { key: "jumlah", label: "Jumlah", type: "number", width: "10%" },
            { key: "satuan", label: "Satuan", type: "text", width: "12%", placeholder: "unit" },
            { key: "hargaSatuan", label: "Estimasi Harga Satuan (Rp)", type: "number", width: "20%" },
          ],
          hint: "Estimasi Harga dihitung otomatis (Jumlah × Harga Satuan).",
        },
        { type: "textarea", key: "alasan", label: "Alasan Permintaan", hint: "Lampirkan bukti permohonan rekomendasi dari PIC" },
      ],
    },
    {
      title: "Tanda Tangan",
      fields: [
        { type: "text", key: "dibuatOleh", label: "Dibuat Oleh", span: 2 },
        { type: "text", key: "diperiksaOleh", label: "Diperiksa Oleh", span: 2 },
        { type: "text", key: "disetujuiOleh", label: "Disetujui Oleh", span: 2 },
        { type: "date", key: "tglDibuat", label: "Tgl Dibuat", span: 2 },
        { type: "date", key: "tglDiperiksa", label: "Tgl Diperiksa", span: 2 },
        { type: "date", key: "tglDisetujui", label: "Tgl Disetujui", span: 2 },
      ],
    },
    {
      title: "Lampiran",
      fields: [
        {
          type: "checkboxes",
          key: "lampiranCek",
          label: "Ceklist Lampiran",
          options: ["Foto", "Penawaran harga", "Data/Dokumen pendukung lain-lain"],
        },
        { type: "images", key: "lampiran", label: "Foto / scan lampiran", max: 6, hint: "Dicetak di halaman LAMPIRAN" },
      ],
    },
  ],
  defaults: () => ({ dibuatOleh: "Dept. IT" }),
  template: () => "rkd.docx",
  toTemplate: (d, h) => {
    const items = (d.items as Item[]).filter((i) => i.deskripsi || i.jumlah || i.hargaSatuan);
    const cek = d.lampiranCek as string[];
    return {
      noDok: rkd.number.kind === "standard" ? rkd.number.format(d.no) : "",
      kepada: d.kepada,
      nama: d.nama,
      departemen: d.departemen,
      perusahaan: d.perusahaan,
      lokasiPekerjaan: d.lokasiPekerjaan,
      tanggal: h.tanggal(d.tanggal),
      ...optionFlags("perihal", PERIHAL, d.perihal === "Lainnya" ? "-" : d.perihal),
      perihalLain: d.perihal === "Lainnya" ? d.perihalLain : "",
      items: items.map((it, i) => ({
        no: i + 1,
        deskripsi: it.deskripsi,
        jumlah: it.jumlah,
        satuan: it.satuan,
        hargaSatuan: h.rupiah(it.hargaSatuan),
        estimasi: it.hargaSatuan ? h.rupiah(h.num(it.jumlah || 1) * h.num(it.hargaSatuan)) : "",
      })),
      alasan: d.alasan,
      dibuatOleh: d.dibuatOleh || DOTS,
      diperiksaOleh: d.diperiksaOleh || DOTS,
      disetujuiOleh: d.disetujuiOleh || DOTS,
      tglDibuat: h.tanggal(d.tglDibuat),
      tglDiperiksa: h.tanggal(d.tglDiperiksa),
      tglDisetujui: h.tanggal(d.tglDisetujui),
      cbFoto: h.cb(cek.includes("Foto")),
      cbPenawaran: h.cb(cek.includes("Penawaran harga")),
      cbLain: h.cb(cek.includes("Data/Dokumen pendukung lain-lain")),
      lampiran: h.images(d.lampiran, 15, 10),
    };
  },
  summary: (d) => [d.nama, d.departemen, d.perihal === "Lainnya" ? d.perihalLain : d.perihal].filter(Boolean).join(" · "),
  sample: () => ({
    kepada: "Bpk. Kepala Departemen Finance",
    nama: "Contoh PIC",
    departemen: "Finance",
    perusahaan: "PT BMSS",
    lokasiPekerjaan: "HO Jakarta",
    tanggal: "2026-11-14",
    perihal: "Laptop",
    items: [
      { deskripsi: "Laptop Lenovo ThinkPad E14 Gen 6, i5, 16GB, 512GB SSD", jumlah: "2", satuan: "unit", hargaSatuan: "15500000" },
      { deskripsi: "Tas laptop", jumlah: "2", satuan: "pcs", hargaSatuan: "350000" },
    ],
    alasan: "Penggantian laptop lama yang sudah berusia lebih dari 5 tahun dan sering hang.",
    dibuatOleh: "Yoan A.",
    diperiksaOleh: "Adrian L.",
    tglDibuat: "2026-11-14",
    lampiranCek: ["Foto", "Penawaran harga"],
  }),
};
