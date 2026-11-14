import { pad3 } from "../schema";
import type { FormDef } from "../types";

type Item = { nama: string; noAset: string; merk: string; sn: string; tahun: string; kondisi: string };

/** Disposal methods in template order (tags cb0..cb4). */
const CARA = [
  "Dijual sebagai satuan unit yang utuh",
  "Dijual sebagai material terurai (scrap)",
  "Disumbangkan",
  "Dihibahkan",
  "Dimusnahkan/dihancurkan",
];
const DOTS_SUMBANG = "…………………………......";
const DOTS_HIBAH = "………………………………….";

/** small gradient PNG used by sample() so the photo path is exercised */
const SAMPLE_IMG = {
  src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAMCAIAAADkharWAAABTklEQVR42g3LoY7FIBBA0f3Ep6tHE2QFCoVAkurRN0gECoWoJNWjGz5je/z5+wmHIIITTiEKWbgEFRCaMIRbeAQTXuHv5zk84nGe0xM92XN51IOneYbn9jwe87z+C4EjIAEXOAMxkANXQAMEWmAE7sATsMAbvpA4EpJwiTMREzlxJTRBoiVG4k48CUu86QuFoyAFVzgLsZALV0ELFFphFO7CU7DCW76gHIooTjmVqGTlUlRBacpQbuVRTHn1C5WjIhVXOSuxkitXRStUWmVU7spTscpbv9A5OtJxnbMTO7lzdbRDp3VG5+48Heu8/QuTYyITNzkncZIn10QnTNpkTO7JM7HJO7+wOBaycItzERd5cS10waItxuJePAtbvOsLxmGI4YzTiEY2LkMNjGYM4zYew4zXvrA5NrJxm3MTN3lzbXTDpm3G5t48G9u8m3+SnHBQgr2t2gAAAABJRU5ErkJggg==",
  w: 480,
  h: 360,
  name: "contoh.png",
};

export const fdia: FormDef = {
  id: "fdia",
  code: "FRM.IT.004",
  title: "Form Disposal Aset IT",
  short: "FDIA",
  description: "Proposal for Plan of Disposal Non Equipment (PPD-NE) beserta Lampiran 1 – Daftar Disposal.",
  number: {
    kind: "standard",
    label: "No. FPP",
    format: (n) => `${pad3(n.urut)}/${n.lokasi}/${n.bulan}/${n.tahun}`,
  },
  sections: [
    {
      title: "Pengajuan",
      fields: [
        { type: "text", key: "perusahaan", label: "Perusahaan (District)" },
        { type: "text", key: "lokasiSite", label: "Lokasi / Site" },
        { type: "text", key: "departemen", label: "Departemen" },
        { type: "date", key: "tanggal", label: "Tanggal Pengajuan" },
      ],
    },
    {
      title: "Cara Disposal",
      fields: [
        { type: "checkboxes", key: "cara", label: "Diusulkan disposal dengan cara", options: CARA, columns: 1 },
        { type: "text", key: "disumbangkanKepada", label: "Disumbangkan kepada", hint: "Diisi jika memilih Disumbangkan" },
        { type: "text", key: "dihibahkanKepada", label: "Dihibahkan kepada", hint: "Diisi jika memilih Dihibahkan" },
      ],
    },
    {
      title: "Tanda Tangan",
      fields: [
        { type: "text", key: "diajukan", label: "Diajukan Oleh", span: 2 },
        { type: "text", key: "diketahui1", label: "Diketahui Oleh (1)", span: 2 },
        { type: "text", key: "diketahui2", label: "Diketahui Oleh (2)", span: 2 },
        { type: "text", key: "disetujui1", label: "Disetujui Oleh (1)", span: 3 },
        { type: "text", key: "disetujui2", label: "Disetujui Oleh (2)", span: 3 },
        { type: "note", text: "CC: Dept. Finance & Accounting (tercetak tetap di formulir)." },
      ],
    },
    {
      title: "Lampiran 1 – Daftar Disposal",
      fields: [
        {
          type: "table",
          key: "items",
          label: "Daftar Disposal",
          minRows: 1,
          maxRows: 50,
          columns: [
            { key: "nama", label: "Nama / Deskripsi Aset", type: "textarea", width: "26%" },
            { key: "noAset", label: "No. Aset", type: "text", width: "12%" },
            { key: "merk", label: "Merk / Tipe", type: "text", width: "14%" },
            { key: "sn", label: "Serial Number", type: "text", width: "14%" },
            { key: "tahun", label: "Tahun Perolehan", type: "text", width: "9%" },
            { key: "kondisi", label: "Kondisi / Alasan Disposal", type: "textarea" },
          ],
        },
        { type: "images", key: "foto", label: "Foto aset", max: 8, hint: "Dicetak di bawah Daftar Disposal" },
      ],
    },
  ],
  defaults: () => ({
    diketahui2: "Richard Pardede",
    disetujui1: "Agatha Siem Yin",
    disetujui2: "Bernard Satria N.",
  }),
  template: () => "fdia.docx",
  toTemplate: (d, h) => {
    const cara = (d.cara as string[]) ?? [];
    const items = ((d.items as Item[]) ?? []).filter((i) => Object.values(i).some(Boolean));
    const foto = Array.isArray(d.foto) ? d.foto : [];
    return {
      noDok: fdia.number.kind === "standard" ? fdia.number.format(d.no) : "",
      perusahaan: d.perusahaan,
      lokasiSite: d.lokasiSite,
      departemen: d.departemen,
      tanggal: h.tanggal(d.tanggal),
      ...Object.fromEntries(CARA.map((c, i) => [`cb${i}`, h.cb(cara.includes(c))])),
      disumbangkanKepada: (cara.includes("Disumbangkan") && d.disumbangkanKepada) || DOTS_SUMBANG,
      dihibahkanKepada: (cara.includes("Dihibahkan") && d.dihibahkanKepada) || DOTS_HIBAH,
      diajukan: d.diajukan,
      diketahui1: d.diketahui1,
      diketahui2: d.diketahui2,
      disetujui1: d.disetujui1,
      disetujui2: d.disetujui2,
      items: items.map((it, i) => ({ no: i + 1, ...it })),
      adaFoto: foto.length > 0,
      foto: h.images(foto, 7.5, 5.5),
    };
  },
  summary: (d) => {
    const n = ((d.items as Item[]) ?? []).filter((i) => i.nama).length;
    return [d.perusahaan, d.lokasiSite, n ? `${n} aset` : ""].filter(Boolean).join(" · ");
  },
  sample: () => ({
    perusahaan: "PT BMSS",
    lokasiSite: "HO Jakarta",
    departemen: "IT",
    tanggal: "2026-11-14",
    cara: ["Dijual sebagai material terurai (scrap)", "Disumbangkan"],
    disumbangkanKepada: "Yayasan Pendidikan Contoh",
    diajukan: "Staff IT",
    diketahui1: "IT Supervisor",
    items: [
      { nama: "Laptop Lenovo ThinkPad T440", noAset: "IT-LT-0123", merk: "Lenovo T440", sn: "PB0ABC12", tahun: "2015", kondisi: "Mainboard rusak, sparepart tidak tersedia" },
      { nama: "Printer HP LaserJet P1102", noAset: "IT-PR-0045", merk: "HP P1102", sn: "VNC3X01234", tahun: "2014", kondisi: "Fuser rusak, biaya perbaikan > nilai buku" },
      { nama: "Monitor Dell 19\"", noAset: "IT-MN-0210", merk: "Dell E1914H", sn: "CN-0XYZ12", tahun: "2016", kondisi: "Layar bergaris" },
    ],
    foto: [SAMPLE_IMG, SAMPLE_IMG],
  }),
};
