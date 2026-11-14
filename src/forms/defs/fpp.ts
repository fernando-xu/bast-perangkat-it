import { checkFlags, pad3 } from "../schema";
import type { Field, FormData, FormDef, TemplateHelpers } from "../types";

/**
 * FPP / ITRF — IT Request Form (FRM.IT.001). One web form, three company templates
 * (scripts/tpl/fpp.py builds templates/fpp-{bmss,di,dsi}.docx):
 *  - BMSS / DSI: software checkbox grid in section 2.
 *  - DI: "Detail Pengajuan Perangkat" item table instead of the grid; Evaluasi has a Penjelasan line.
 *  - Signatures: BMSS … HR / CHRO / CFO;  DI & DSI … HR / Director.
 */

type Row = Record<string, string>;
type Variant = "BMSS" | "DI" | "DSI";

const PERUSAHAAN: Variant[] = ["BMSS", "DI", "DSI"];
const STATUS_PEGAWAI = [
  "Pegawai Lama",
  "Pegawai Baru - Bukan Pengganti",
  "Pegawai Baru - Pengganti",
];
const KATEGORI = [
  "Teknikal / Mekanikal",
  "Administrasi umum",
  "Data Analyst / Finance Modeler / Statistician",
  "Operasional kompleks / Pengguna dengan lebih dari 1 program sekaligus bersamaan",
  "Executive / Strategic Decision / Pengguna mobilitas tinggi dengan reporting top management",
  "Reproduksi warna / Color grading / Desain grafis / Video editing / Fotografi",
  "Engineer workstation / CAD / GPU acceleration",
  "High Performance Specialist / Data Science / Simulasi 3D / Rendering",
  "CIST / Programing development / System Engineer",
];
const PENGAJUAN = [
  "Perangkat Keras",
  "Perangkat Lunak",
  "Perangkat IT Lainnya",
];
/** template order (BMSS/DSI); must match SOFTWARE in scripts/tpl/fpp.py */
const SOFTWARE = [
  "RPMGlobal XPAC",
  "Autodesk Civil 3D",
  "GEOVIA Surpac",
  "GEOVIA Minex",
  "Bentley STAAD Pro",
  "Bentley PLAXIS 2D",
  "Waterloo Hydrogeologic Modflow Flex",
  "Rocscience RS2",
  "Rocscience Slide2",
  "Inim SmartLook",
  "Autodesk AutoCAD",
  "Autodesk AutoCAD Map 3D",
  "Autodesk AutoCAD LT",
  "Datamine Minescape",
  "Agisoft Metashape",
  "Global Mapper",
  "Esri ArcGIS Pro",
  "SketchUp Studio",
  "SketchUp Pro",
  "Chaos V-Ray",
  "Golden Software Surfer",
  "Google Android Studio",
  "PostHog",
  "Microsoft Visual Studio",
  "Microsoft Visual Studio Code",
  "Jaspersoft",
  "PremiumSoft Navicat",
  "Oracle MySQL",
  "Adobe Creative Cloud Pro",
  "Adobe Photoshop",
  "Adobe Illustrator",
  "Microsoft Power BI Report Server",
  "Microsoft Power BI Desktop",
  "Microsoft SQL Server Management Studio",
  "ZionStar Sublime LMS",
  "Microsoft Office 2024",
  "Microsoft Windows 11",
];
const STATUS_PENGAJUAN = [
  { value: "Pemberian Pertama", label: "Pemberian Pertama" },
  { value: "Pemberian Tambahan", label: "Pemberian Tambahan ke- …" },
  {
    value: "Penggantian",
    label:
      "Penggantian akibat kerusakan (lampirkan BA Pemeriksaan Perangkat lama dari IT)",
  },
  {
    value: "Kumulatif",
    label:
      "Kumulatif penggunaan Perangkat Lama di Baramulti Group > 10 tahun (lampirkan BAST)",
  },
  { value: "Lainnya", label: "Lainnya" },
];
const EVALUASI = [
  "Tidak ada masalah",
  "Produk Cacat dan/atau Desain Gagal",
  "Keausan dan/atau Kerusakan Wajar",
  "Kesalahan dan/atau Kelalaian Manusia",
];
const VERIFIKASI = [
  "Persediaan perangkat tak terpakai di Departemen IT tidak sesuai kebutuhan",
  "Tidak ada persediaan perangkat tak terpakai di Departemen IT",
];
const HW_ITEMS = ["Unit", "Display", "CPU", "GPU", "RAM", "Storage", "Lainnya"];

/** names printed in each original; used when the signature field is left empty */
const SIG_DEFAULTS: Record<Variant, Record<string, string>> = {
  BMSS: {
    sigHr: "Limiana",
    sigChro: "Angela Soedjana",
    sigCfo: "Bernard Satria N",
  },
  DI: { sigItCorp: "Mikha M Kurniawan" },
  DSI: {},
};

const variantOf = (d: FormData): Variant =>
  PERUSAHAAN.includes(d.perusahaan as Variant)
    ? (d.perusahaan as Variant)
    : "BMSS";

const hasRow = (r: Row) =>
  Object.entries(r).some(([k, v]) => k !== "item" && String(v ?? "").trim());
/** keep filled rows, then pad with blank rows so the printed table keeps its writing space */
function padRows(rows: unknown, min: number, label?: (i: number) => string) {
  const out = ((rows as Row[]) ?? [])
    .filter((r) => hasRow(r) || r.item?.trim())
    .map((r) => ({ ...r }));
  while (out.length < min) out.push({});
  return out.map((r, i) => ({ ...r, item: r.item || label?.(i) || "" }));
}

const hwTable = (key: string, label: string): Field => ({
  type: "table",
  key,
  label,
  fixed: true,
  maxRows: HW_ITEMS.length,
  defaultRows: HW_ITEMS.map((item) => ({ item })),
  columns: [
    { key: "item", label: "Item", type: "text", width: "14%" },
    { key: "brand", label: "Brand", type: "text", width: "18%" },
    { key: "model", label: "Model", type: "text", width: "20%" },
    { key: "spek", label: "Spesifikasi", type: "text", width: "28%" },
    { key: "note", label: "Note", type: "text", width: "20%" },
  ],
});

const swTable = (
  key: string,
  label: string,
  last: { key: string; label: string },
  hint?: string,
): Field => ({
  type: "table",
  key,
  label,
  maxRows: 20,
  minRows: 1,
  hint,
  columns: [
    { key: "item", label: "Item", type: "text", width: "20%" },
    { key: "brand", label: "Brand", type: "text", width: "18%" },
    { key: "model", label: "Model", type: "text", width: "20%" },
    { key: "spek", label: "Spesifikasi", type: "text", width: "27%" },
    { key: last.key, label: last.label, type: "text", width: "15%" },
  ],
});

function signatures(d: FormData, v: Variant) {
  const keys = [
    "sigUser",
    "sigAtasan",
    "sigItss",
    "sigItCorp",
    "sigHr",
    "sigChro",
    "sigCfo",
    "sigDirector",
  ];
  return Object.fromEntries(
    keys.map((k) => [k, String(d[k] ?? "").trim() || SIG_DEFAULTS[v][k] || ""]),
  );
}

function toTemplate(d: FormData, h: TemplateHelpers) {
  const v = variantOf(d);
  const pengajuan = d.pengajuan as string[];
  const status = String(d.statusPengajuan ?? "");
  const evaluasiLain = String(d.evaluasiLainnya ?? "");
  const lainLabel = (i: number) =>
    i < 5 ? `Perangkat Lunak ${i + 1}` : i === 5 ? "Lainnya" : "";
  return {
    noDok: fpp.number.kind === "standard" ? fpp.number.format(d.no) : "",
    // 1
    nama: d.nama,
    sbu: d.sbu,
    departemen: d.departemen,
    posisi: d.posisi,
    ...checkFlags("stp", STATUS_PEGAWAI, d.statusPegawai),
    pgNama: d.statusPegawai === STATUS_PEGAWAI[2] ? d.pgNama : "",
    pgDepartemen: d.statusPegawai === STATUS_PEGAWAI[2] ? d.pgDepartemen : "",
    pgPosisi: d.statusPegawai === STATUS_PEGAWAI[2] ? d.pgPosisi : "",
    ...checkFlags("kat", KATEGORI, d.kategori),
    katLainCb: h.cb(d.kategori === "Lainnya"),
    katLainnya: d.kategori === "Lainnya" ? d.kategoriLainnya : "",
    // 2
    ...checkFlags("pj", PENGAJUAN, pengajuan),
    ketKeras: d.ketKeras,
    ketLunak: d.ketLunak,
    ketLainnya: d.ketLainnya || "……………………………",
    ...checkFlags("sw", SOFTWARE, d.software),
    swLainCb: h.cb(String(d.softwareLainnya ?? "").trim()),
    swLainnya: d.softwareLainnya,
    detail: padRows(d.detailPengajuan, 6),
    ...checkFlags(
      "sp",
      STATUS_PENGAJUAN.slice(0, 4).map((o) => o.value),
      status,
    ),
    tambahanKe:
      status === "Pemberian Tambahan" && d.tambahanKe
        ? ` ${d.tambahanKe} `
        : "…………… ",
    spLainCb: h.cb(status === "Lainnya"),
    spLainnya: status === "Lainnya" ? d.statusLainnya : "",
    latarBelakang: d.latarBelakang,
    alasan: d.alasan,
    tujuan: d.tujuan,
    risikoTidak: d.risikoTidak,
    risikoSetuju: d.risikoSetuju,
    // 3
    rkJenis: d.rkJenis,
    rkGroup: d.rkGroup || "(Diisi apabila pengajuan Laptop)",
    rkKeras: padRows(d.rkKeras, 0),
    rkLunak: padRows(d.rkLunak, 6),
    // 4
    lmJenis: d.lmJenis,
    lmGroup: d.lmGroup,
    lmKeras: padRows(d.lmKeras, 0),
    lmLunak:
      v === "BMSS" ? padRows(d.lmLunak, 5) : padRows(d.lmLunak, 6, lainLabel),
    // 5
    ...checkFlags("ev", EVALUASI, d.evaluasi),
    evLainCb: h.cb(evaluasiLain.trim()),
    evLainnya: evaluasiLain,
    evPenjelasan: d.evPenjelasan,
    // 6
    ...checkFlags("vf", VERIFIKASI, d.verifikasi),
    ...signatures(d, v),
  };
}

export const fpp: FormDef = {
  id: "fpp",
  code: "FRM.IT.001",
  title: "Formulir Permintaan Perangkat IT (IT Request Form)",
  short: "ITRF",
  description:
    "Permintaan perangkat keras/lunak IT oleh user, rekomendasi & evaluasi Dept. IT (BMSS / DI / DSI).",
  number: {
    kind: "standard",
    label: "No. ITRF",
    format: (n) => `${pad3(n.urut)}/${n.lokasi}/${n.bulan}/${n.tahun}`,
  },
  sections: [
    {
      title: "Perusahaan",
      fields: [
        {
          type: "select",
          key: "perusahaan",
          label: "Template perusahaan",
          options: [
            { value: "BMSS", label: "BMSS (Rev06)" },
            { value: "DI", label: "DI (Rev05)" },
            { value: "DSI", label: "DSI (Rev06)" },
          ],
          hint: "Menentukan format dokumen, daftar software dan kolom tanda tangan",
        },
      ],
    },
    {
      title: "1. Detail Pengguna",
      hint: "Diisi oleh user/PIC",
      fields: [
        { type: "text", key: "nama", label: "Nama" },
        { type: "text", key: "sbu", label: "SBU" },
        { type: "text", key: "departemen", label: "Departemen" },
        { type: "text", key: "posisi", label: "Posisi" },
        {
          type: "radio",
          key: "statusPegawai",
          label: "Status",
          options: STATUS_PEGAWAI,
          span: 6,
        },
        {
          type: "text",
          key: "pgNama",
          label: "Nama pegawai yang digantikan",
          span: 2,
          hint: "Hanya jika Pegawai Baru - Pengganti",
        },
        {
          type: "text",
          key: "pgDepartemen",
          label: "Departemen (yang digantikan)",
          span: 2,
        },
        {
          type: "text",
          key: "pgPosisi",
          label: "Posisi (yang digantikan)",
          span: 2,
        },
        {
          type: "radio",
          key: "kategori",
          label: "Kategori Pekerjaan",
          options: [...KATEGORI, "Lainnya"],
          span: 6,
          hint: "Disesuaikan dengan workload",
        },
        {
          type: "text",
          key: "kategoriLainnya",
          label: "Kategori lainnya",
          span: 6,
          hint: "Diisi jika Kategori = Lainnya",
        },
      ],
    },
    {
      title: "2. Pengajuan Perangkat IT",
      hint: "Diisi oleh user/PIC",
      fields: [
        {
          type: "checkboxes",
          key: "pengajuan",
          label: "Jenis pengajuan",
          options: PENGAJUAN,
          columns: 3,
        },
        {
          type: "text",
          key: "ketKeras",
          label: "Keterangan Perangkat Keras",
          span: 2,
        },
        {
          type: "text",
          key: "ketLunak",
          label: "Keterangan Perangkat Lunak",
          span: 2,
        },
        {
          type: "text",
          key: "ketLainnya",
          label: "Keterangan Perangkat IT Lainnya",
          span: 2,
        },
        {
          type: "checkboxes",
          key: "software",
          label: "Software yang dibutuhkan (pengajuan laptop)",
          options: SOFTWARE,
          other: "Lainnya",
          columns: 3,
          hint: "Template BMSS & DSI. Pilihan hanya untuk pengajuan laptop.",
        },
        swTable(
          "detailPengajuan",
          "Detail Pengajuan Perangkat",
          { key: "jumlah", label: "Jumlah" },
          "Hanya dicetak pada template DI",
        ),
        {
          type: "radio",
          key: "statusPengajuan",
          label: "Status Pengajuan",
          options: STATUS_PENGAJUAN,
          span: 6,
        },
        {
          type: "number",
          key: "tambahanKe",
          label: "Pemberian Tambahan ke-",
          span: 2,
        },
        {
          type: "text",
          key: "statusLainnya",
          label: "Status pengajuan lainnya",
          span: 4,
        },
        {
          type: "textarea",
          key: "latarBelakang",
          label: "Latar belakang / kondisi saat ini",
        },
        {
          type: "textarea",
          key: "alasan",
          label: "Kenapa dibutuhkan perangkat ini",
        },
        {
          type: "textarea",
          key: "tujuan",
          label: "Tujuan penggunaan perangkat ini",
        },
        {
          type: "textarea",
          key: "risikoTidak",
          label: "Analisa risiko: jika pengajuan tidak disetujui",
        },
        {
          type: "textarea",
          key: "risikoSetuju",
          label: "Analisa risiko: jika pengajuan disetujui",
        },
      ],
    },
    {
      title: "3. Rekomendasi Pengajuan Perangkat IT",
      hint: "Diisi oleh Dept. IT",
      fields: [
        { type: "text", key: "rkJenis", label: "Jenis" },
        {
          type: "text",
          key: "rkGroup",
          label: "Group Laptop",
          hint: "Diisi apabila pengajuan Laptop",
        },
        hwTable("rkKeras", "Perangkat Keras"),
        swTable("rkLunak", "Perangkat Lunak", { key: "note", label: "Note" }),
      ],
    },
    {
      title: "4. Data Perangkat Lama",
      hint: "Diisi oleh Dept. IT",
      fields: [
        { type: "text", key: "lmJenis", label: "Jenis" },
        { type: "text", key: "lmGroup", label: "Group Laptop" },
        hwTable("lmKeras", "Perangkat Keras"),
        swTable("lmLunak", "Perangkat Lunak", {
          key: "jumlah",
          label: "Jumlah",
        }),
      ],
    },
    {
      title: "5. Evaluasi Dept. IT terhadap Perangkat Lama",
      fields: [
        {
          type: "checkboxes",
          key: "evaluasi",
          label: "Evaluasi",
          options: EVALUASI,
          other: "Lainnya",
          columns: 2,
          hint: "Disesuaikan dengan alasan historis pembelian",
        },
        {
          type: "textarea",
          key: "evPenjelasan",
          label: "Penjelasan",
          hint: "Hanya dicetak pada template DI",
        },
      ],
    },
    {
      title: "6. Verifikasi Pembelian dengan Persediaan Perangkat di Dept. IT",
      fields: [
        {
          type: "checkboxes",
          key: "verifikasi",
          label: "Verifikasi",
          options: VERIFIKASI,
          columns: 1,
        },
      ],
    },
    {
      title: "Tanda Tangan",
      hint: "Nama yang dikosongkan memakai nama bawaan template (BMSS: HR Limiana, CHRO Angela Soedjana, CFO Bernard Satria N; DI: IT Corp. Mikha M Kurniawan).",
      fields: [
        { type: "text", key: "sigUser", label: "Diajukan — PIC/User", span: 2 },
        {
          type: "text",
          key: "sigAtasan",
          label: "Diajukan — Atasan (min. Kepala Divisi / Direksi SBU)",
          span: 2,
        },
        {
          type: "text",
          key: "sigItss",
          label: "Diperiksa — IT Service & Support",
          span: 2,
        },
        {
          type: "text",
          key: "sigItCorp",
          label: "Diperiksa — IT Corp.",
          span: 2,
        },
        {
          type: "text",
          key: "sigHr",
          label: "Diperiksa — HR (Optional)",
          span: 2,
        },
        {
          type: "text",
          key: "sigChro",
          label: "Disetujui — CHRO (BMSS)",
          span: 2,
        },
        {
          type: "text",
          key: "sigCfo",
          label: "Disetujui — CFO (BMSS)",
          span: 2,
        },
        {
          type: "text",
          key: "sigDirector",
          label: "Disetujui — Director (DI / DSI)",
          span: 2,
        },
      ],
    },
  ],
  defaults: () => ({
    perusahaan: "BMSS",
    ketKeras: "(Laptop/PC Desktop/Monitor/Printer/dll)",
    ketLunak: "(Aplikasi/Software subscription/dll)",
    ketLainnya: "Email",
  }),
  template: (d) => `fpp-${variantOf(d).toLowerCase()}.docx`,
  toTemplate,
  summary: (d) =>
    [
      variantOf(d),
      d.nama,
      d.departemen,
      ((d.pengajuan as string[]) ?? []).join(", "),
    ]
      .filter(Boolean)
      .join(" · "),
  sample: () => ({
    perusahaan: "BMSS",
    nama: "Rina Kartika",
    sbu: "Mining Services",
    departemen: "Mine Planning",
    posisi: "Mine Planning Engineer",
    statusPegawai: "Pegawai Baru - Pengganti",
    pgNama: "Andi Wijaya",
    pgDepartemen: "Mine Planning",
    pgPosisi: "Mine Planning Engineer",
    kategori: "Engineer workstation / CAD / GPU acceleration",
    pengajuan: ["Perangkat Keras", "Perangkat Lunak"],
    ketKeras: "(Laptop)",
    ketLunak: "(Software subscription)",
    software: [
      "Autodesk Civil 3D",
      "GEOVIA Surpac",
      "Microsoft Office 2024",
      "Microsoft Windows 11",
    ],
    softwareLainnya: "Leapfrog Geo",
    detailPengajuan: [
      {
        item: "Annual subscription",
        brand: "SketchUp",
        model: "SketchUp 2026",
        spek: "SketchUp Pro 2026",
        jumlah: "1",
      },
    ],
    statusPengajuan: "Penggantian",
    latarBelakang:
      "Pegawai baru menggantikan pegawai yang resign; laptop lama sudah berusia 6 tahun dan sering overheat.",
    alasan:
      "Pekerjaan perencanaan tambang membutuhkan pemodelan 3D dan rendering yang berat.",
    tujuan:
      "Menjalankan Surpac dan Civil 3D untuk desain pit dan jalan tambang.",
    risikoTidak:
      "Proses desain terlambat dan laporan perencanaan bulanan tidak tepat waktu.",
    risikoSetuju:
      "Produktivitas meningkat dan model dapat diproses tanpa gangguan.",
    rkJenis: "Laptop",
    rkGroup: "Engineer Workstation",
    rkKeras: [
      {
        item: "Unit",
        brand: "Lenovo",
        model: "ThinkPad P16s Gen 3",
        spek: "Mobile workstation",
        note: "",
      },
      {
        item: "Display",
        brand: "",
        model: "",
        spek: '16" WUXGA IPS',
        note: "",
      },
      {
        item: "CPU",
        brand: "Intel",
        model: "Core Ultra 7 165H",
        spek: "16 core",
        note: "",
      },
      {
        item: "GPU",
        brand: "NVIDIA",
        model: "RTX 500 Ada",
        spek: "4 GB GDDR6",
        note: "",
      },
      { item: "RAM", brand: "", model: "", spek: "32 GB DDR5", note: "" },
      {
        item: "Storage",
        brand: "",
        model: "",
        spek: "1 TB NVMe SSD",
        note: "",
      },
      { item: "Lainnya", brand: "", model: "", spek: "Tas & mouse", note: "" },
    ],
    rkLunak: [
      {
        item: "Software",
        brand: "Autodesk",
        model: "Civil 3D 2026",
        spek: "Annual subscription",
        note: "",
      },
      {
        item: "Software",
        brand: "Dassault",
        model: "GEOVIA Surpac",
        spek: "Network license",
        note: "Pakai pool lisensi",
      },
    ],
    lmJenis: "Laptop",
    lmGroup: "Administrasi",
    lmKeras: [
      {
        item: "Unit",
        brand: "Dell",
        model: "Latitude 5490",
        spek: "",
        note: "Pembelian 2020",
      },
      { item: "Display", brand: "", model: "", spek: '14" HD', note: "" },
      {
        item: "CPU",
        brand: "Intel",
        model: "Core i5-8250U",
        spek: "",
        note: "",
      },
      { item: "GPU", brand: "Intel", model: "UHD 620", spek: "", note: "" },
      { item: "RAM", brand: "", model: "", spek: "8 GB", note: "" },
      { item: "Storage", brand: "", model: "", spek: "256 GB SSD", note: "" },
      { item: "Lainnya", brand: "", model: "", spek: "", note: "" },
    ],
    lmLunak: [
      {
        item: "Software",
        brand: "Microsoft",
        model: "Office 2019",
        spek: "OEM",
        jumlah: "1",
      },
    ],
    evaluasi: ["Keausan dan/atau Kerusakan Wajar"],
    evaluasiLainnya: "",
    evPenjelasan: "Baterai drop dan engsel layar retak karena usia pemakaian.",
    verifikasi: [
      "Tidak ada persediaan perangkat tak terpakai di Departemen IT",
    ],
    sigUser: "Rina Kartika",
    sigAtasan: "Budi Santoso",
    sigItss: "Yoan A.",
    sigItCorp: "Adrian L.",
  }),
};
