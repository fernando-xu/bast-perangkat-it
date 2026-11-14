import { optionFlags, pad3 } from "../schema";
import type { FormDef } from "../types";

type Cek = { item: string; cek: boolean; catatan: string };
type Lampiran = { gambar: unknown; deskripsi: string };

const TIPE = ["Laptop", "Desktop", "Printer", "TV"];
const SPAREPART = ["Ada", "Tidak ada"];
const REKOMENDASI = ["Perbaikan", "Penggantian", "Layak pakai"];
const DOTS = ".............................";
/** small gradient PNG used by sample() so the lampiran image path is exercised */
const SAMPLE_IMG = {
  src: "data:image/png;base64,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",
  w: 480,
  h: 320,
  name: "contoh.png",
};

/** PEMERIKSAAN grid rows, in template order (tags ck0..ck14 / cat0..cat14). Labels are printed by the template. */
const ITEMS = [
  "1. Suhu — Processor",
  "1. Suhu — Hard disk",
  "2. Utilisasi — Hard disk",
  "2. Utilisasi — RAM",
  "2. Utilisasi — Battery",
  "3. Komponen — Mainboard",
  "3. Komponen — LCD",
  "3. Komponen — Keyboard",
  "3. Komponen — Charger / Power",
  "3. Komponen — Body",
  "3. Komponen — Fan",
  "3. Komponen — Port",
  "4. Performance — Speed",
  "4. Performance — Multitasking",
  "5. Others — Others",
];

export const bapp: FormDef = {
  id: "bapp",
  code: "FRM.IT.002",
  title: "Berita Acara Pemeriksaan Perangkat IT",
  short: "BAPP",
  description: "Hasil pemeriksaan fisik perangkat IT (laptop/desktop/printer/TV) beserta rekomendasi IT.",
  number: {
    kind: "standard",
    label: "No. BAPP",
    format: (n) => `${pad3(n.urut)}/${n.lokasi}/${n.bulan}/${n.tahun}`,
  },
  sections: [
    {
      title: "Perangkat",
      fields: [
        { type: "date", key: "tanggal", label: "Tanggal Pemeriksaan Fisik" },
        { type: "text", key: "lokasi", label: "Lokasi Pemeriksaan Fisik" },
        { type: "radio", key: "tipe", label: "Tipe", options: TIPE, span: 6 },
        { type: "text", key: "merk", label: "Merk & Seri" },
        { type: "text", key: "kodePerangkat", label: "Kode Perangkat (SN)" },
        { type: "text", key: "tahunPembuatan", label: "Tahun Pembuatan" },
        { type: "text", key: "tahunPembelian", label: "Tahun Pembelian" },
        { type: "text", key: "user", label: "User" },
        { type: "text", key: "jabatan", label: "Posisi Jabatan" },
        { type: "text", key: "departemen", label: "Departemen" },
        { type: "text", key: "sbu", label: "SBU" },
      ],
    },
    {
      title: "Pemeriksaan",
      fields: [
        {
          type: "table",
          key: "pemeriksaan",
          label: "Pemeriksaan",
          fixed: true,
          maxRows: ITEMS.length,
          defaultRows: ITEMS.map((item) => ({ item, cek: false, catatan: "" })),
          columns: [
            { key: "item", label: "Item", type: "text", width: "35%" },
            { key: "cek", label: "✓", type: "checkbox", width: "8%" },
            { key: "catatan", label: "Catatan IT", type: "text" },
          ],
          hint: "Centang item yang diperiksa/bermasalah (dicetak \"x\" di kotak). Nama item tetap seperti di formulir.",
        },
        { type: "radio", key: "sparepart", label: "6. Ketersediaan Sparepart", options: SPAREPART, span: 6 },
        { type: "textarea", key: "hasil", label: "Hasil Pemeriksaan" },
        {
          type: "radio",
          key: "rekomendasi",
          label: "Rekomendasi",
          options: REKOMENDASI,
          span: 6,
          hint: "Perbaikan*: IT menyediakan perangkat back-up sementara bila perbaikan > 1 hari dan stok spare tersedia.",
        },
      ],
    },
    {
      title: "Tanda Tangan",
      fields: [
        { type: "text", key: "namaUser", label: "User", span: 2 },
        { type: "text", key: "namaPemeriksa", label: "Pemeriksa Oleh", span: 2 },
        { type: "text", key: "namaDiketahui", label: "Diketahui Oleh", span: 2 },
      ],
    },
    {
      title: "Lampiran",
      hint: "Halaman LAMPIRAN hanya dicetak bila ada baris lampiran.",
      fields: [
        {
          type: "table",
          key: "lampiran",
          label: "Foto",
          minRows: 0,
          maxRows: 10,
          columns: [
            { key: "gambar", label: "Gambar", type: "image", max: 2, width: "45%" },
            { key: "deskripsi", label: "Deskripsi", type: "textarea" },
          ],
        },
      ],
    },
  ],
  template: () => "bapp.docx",
  toTemplate: (d, h) => {
    const rows = (d.pemeriksaan as Cek[]) ?? [];
    const lampiran = ((d.lampiran as Lampiran[]) ?? []).filter(
      (l) => l.deskripsi || (Array.isArray(l.gambar) && l.gambar.length),
    );
    const x = (on: boolean) => (on ? "x" : "");
    return {
      noDok: bapp.number.kind === "standard" ? bapp.number.format(d.no) : "",
      tanggal: h.tanggal(d.tanggal),
      lokasi: d.lokasi,
      ...optionFlags("tipe", TIPE, d.tipe),
      merk: d.merk,
      kodePerangkat: d.kodePerangkat,
      tahunPembuatan: d.tahunPembuatan,
      tahunPembelian: d.tahunPembelian,
      user: d.user,
      jabatan: d.jabatan,
      departemen: d.departemen,
      sbu: d.sbu,
      ...Object.fromEntries(
        ITEMS.flatMap((_, i) => [
          [`ck${i}`, x(Boolean(rows[i]?.cek))],
          [`cat${i}`, rows[i]?.catatan ?? ""],
        ]),
      ),
      spAda: x(d.sparepart === "Ada"),
      spTidak: x(d.sparepart === "Tidak ada"),
      hasil: d.hasil,
      rkPerbaikan: x(d.rekomendasi === "Perbaikan"),
      rkPenggantian: x(d.rekomendasi === "Penggantian"),
      rkLayak: x(d.rekomendasi === "Layak pakai"),
      namaUser: d.namaUser || DOTS,
      namaPemeriksa: d.namaPemeriksa || DOTS,
      namaDiketahui: d.namaDiketahui || DOTS,
      adaLampiran: lampiran.length > 0,
      lampiran: lampiran.map((l, i) => ({
        no: `${i + 1}.`,
        gambar: h.images(l.gambar, 10, 7),
        deskripsi: l.deskripsi,
      })),
    };
  },
  summary: (d) => [d.tipe, d.merk, d.user, d.rekomendasi].filter(Boolean).join(" · "),
  sample: () => ({
    tanggal: "2026-11-14",
    lokasi: "HO Jakarta",
    tipe: "Laptop",
    merk: "Lenovo ThinkPad E14 Gen 2",
    kodePerangkat: "PF2XK9LM",
    tahunPembuatan: "2020",
    tahunPembelian: "2021",
    user: "Contoh User",
    jabatan: "Staff Accounting",
    departemen: "Finance",
    sbu: "BMSS",
    pemeriksaan: ITEMS.map((item, i) => ({
      item,
      cek: [1, 3, 4, 12, 13].includes(i),
      catatan:
        i === 1 ? "SSD 82°C saat idle" : i === 3 ? "RAM 8 GB terpakai 95%" : i === 4 ? "Battery health 41%" : i === 12 ? "Boot > 3 menit" : "",
    })),
    sparepart: "Tidak ada",
    hasil: "SSD melengkung dan panas berlebih.\nRAM penuh saat membuka aplikasi kerja standar.\nBattery drop.",
    rekomendasi: "Penggantian",
    namaUser: "Contoh User",
    namaPemeriksa: "Staff IT",
    namaDiketahui: "IT Supervisor",
    lampiran: [
      { gambar: [SAMPLE_IMG], deskripsi: "SSD melengkung" },
      { gambar: [SAMPLE_IMG, SAMPLE_IMG], deskripsi: "Detail SSD" },
    ],
  }),
};
