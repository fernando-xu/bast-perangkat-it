import type { FormDef } from "../types";

type Item = { deskripsi: string; jumlah: string; satuan: string; hargaSatuan: string };

const LAMPIRAN = [
  "Technical Service Report, Kondisi Alat yang hendak diperbaiki. Foto, Penawaran dari Supplier",
  "RAB - Estimasi Biaya Perbaikan",
];
const BLANK_NAME = "                         ";

export const pr: FormDef = {
  id: "pr",
  code: "FRM.IT.000",
  title: "Purchase Request IT",
  short: "PR",
  description: "Purchase Requisition – Goods: permintaan pembelian barang/jasa IT (No. PR dari ERP).",
  number: { kind: "free", label: "PR No", placeholder: "PR002026100863" },
  sections: [
    {
      title: "Data Permintaan",
      fields: [
        { type: "text", key: "opu", label: "OPU" },
        { type: "text", key: "departemen", label: "Departemen" },
        { type: "date", key: "tglPermintaan", label: "Tanggal Permintaan / Request Date" },
        { type: "date", key: "tglDibutuhkan", label: "Tanggal Dibutuhkan / Delivery Date" },
      ],
    },
    {
      title: "Rincian Barang",
      fields: [
        {
          type: "table",
          key: "items",
          label: "Item",
          maxRows: 30,
          minRows: 1,
          columns: [
            { key: "deskripsi", label: "Deskripsi / Description", type: "textarea", width: "40%" },
            { key: "jumlah", label: "Jumlah", type: "number", width: "10%" },
            { key: "satuan", label: "Satuan", type: "text", width: "12%", placeholder: "unit" },
            { key: "hargaSatuan", label: "Harga Satuan (Rp)", type: "number", width: "20%" },
          ],
          hint: "Estimasi Harga dihitung otomatis (Jumlah × Harga Satuan).",
        },
        { type: "textarea", key: "alasan", label: "Alasan Permintaan / Reason for Request" },
        { type: "text", key: "referenceTsr", label: "Reference TSR No", span: 6 },
        { type: "text", key: "lokasiPekerjaan", label: "Lokasi Pekerjaan / Job Location" },
        { type: "text", key: "lokasiPengantaran", label: "Lokasi Pengantaran / Delivery Location" },
        {
          type: "textarea",
          key: "supplier",
          label: "Supplier List",
          hint: "Suppliers Name, Contact Person, Contact Number, Bank Account",
        },
      ],
    },
    {
      title: "Tanda Tangan",
      fields: [
        { type: "text", key: "dibuatOleh", label: "Dibuat Oleh", span: 2 },
        { type: "text", key: "pemintaJasa", label: "Peminta Jasa", span: 2 },
        { type: "text", key: "dicekOleh", label: "Dicek Oleh", span: 2 },
        { type: "date", key: "tglDibuat", label: "Date (Dibuat)", span: 2 },
        { type: "date", key: "tglPeminta", label: "Date (Peminta Jasa)", span: 2 },
        { type: "date", key: "tglDicek", label: "Date (Dicek)", span: 2 },
        { type: "text", key: "disetujuiOleh", label: "Disetujui Oleh (OPU)", span: 3 },
        { type: "text", key: "purchasing", label: "Purchasing", span: 3 },
        { type: "date", key: "tglDisetujui", label: "Date (Disetujui)", span: 3 },
        { type: "date", key: "tglPurchasing", label: "Date (Purchasing)", span: 3 },
      ],
    },
    {
      title: "Checklist Lampiran",
      fields: [
        {
          type: "checkboxes",
          key: "lampiranCek",
          label: "Checklist lampiran sesuai kategori permintaan",
          options: LAMPIRAN,
          columns: 1,
        },
      ],
    },
  ],
  defaults: () => ({ opu: "BMSS" }),
  template: () => "pr.docx",
  toTemplate: (d, h) => {
    const items = (d.items as Item[]).filter((i) => i.deskripsi || i.jumlah || i.hargaSatuan);
    const cek = d.lampiranCek as string[];
    const name = (v: unknown) => (v ? String(v) : BLANK_NAME);
    return {
      noPr: d.noBebas,
      opu: d.opu,
      departemen: d.departemen,
      tglPermintaan: h.tanggal(d.tglPermintaan),
      tglDibutuhkan: h.tanggal(d.tglDibutuhkan),
      items: items.map((it, i) => ({
        no: i + 1,
        deskripsi: it.deskripsi,
        jumlah: it.jumlah,
        satuan: it.satuan,
        hargaSatuan: h.rupiah(it.hargaSatuan),
        estimasi: it.hargaSatuan ? h.rupiah(h.num(it.jumlah || 1) * h.num(it.hargaSatuan)) : "",
      })),
      alasan: d.alasan,
      referenceTsr: d.referenceTsr,
      lokasiPekerjaan: d.lokasiPekerjaan,
      lokasiPengantaran: d.lokasiPengantaran,
      supplier: d.supplier,
      dibuatOleh: name(d.dibuatOleh),
      pemintaJasa: name(d.pemintaJasa),
      dicekOleh: name(d.dicekOleh),
      disetujuiOleh: name(d.disetujuiOleh),
      purchasing: name(d.purchasing),
      tglDibuat: h.tanggal(d.tglDibuat),
      tglPeminta: h.tanggal(d.tglPeminta),
      tglDicek: h.tanggal(d.tglDicek),
      tglDisetujui: h.tanggal(d.tglDisetujui),
      tglPurchasing: h.tanggal(d.tglPurchasing),
      cbTsr: h.cb(cek.includes(LAMPIRAN[0])),
      cbRab: h.cb(cek.includes(LAMPIRAN[1])),
    };
  },
  summary: (d) => {
    const items = (d.items as Item[]).map((i) => i.deskripsi).filter(Boolean);
    return [d.departemen, items.slice(0, 2).join(", ") + (items.length > 2 ? ", …" : "")].filter(Boolean).join(" · ");
  },
  sample: () => ({
    noBebas: "PR002026110871",
    opu: "BMSS",
    departemen: "Accounting & Tax",
    tglPermintaan: "2026-11-14",
    tglDibutuhkan: "2026-11-28",
    items: [
      { deskripsi: "Toner HP 107A", jumlah: "4", satuan: "unit", hargaSatuan: "650000" },
      { deskripsi: "Tinta Brother TN-B022", jumlah: "2", satuan: "unit", hargaSatuan: "425000" },
      { deskripsi: "Kabel LAN Cat6 UTP 305m", jumlah: "1", satuan: "roll", hargaSatuan: "1850000" },
    ],
    alasan: "Pengadaan toner untuk printer HP MFP 137fnw dan\ntinta untuk printer Brother DCP B7535DW di ruang Accounting & Tax",
    referenceTsr: "TSR-014/HO/XI/2026",
    lokasiPekerjaan: "HO Jakarta",
    lokasiPengantaran: "HO Jakarta",
    supplier: "PT Contoh Supplier – Budi (0812-0000-0000) – BCA 000-000-0000",
    dibuatOleh: "Contoh Staff IT",
    tglDibuat: "2026-11-14",
    pemintaJasa: "Contoh User",
    tglPeminta: "2026-11-14",
    lampiranCek: [LAMPIRAN[1]],
  }),
};
