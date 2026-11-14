import { pad3 } from "../schema";
import type { FormDef } from "../types";

type Point = { poin: string };
type Action = { rencana: string; pic: string; dueDate: string };
type Party = { pihak: string; nama: string };

/** "IT:\n- Pak Harry" -> [{text:"IT:",bullet:false},{text:"Pak Harry",bullet:true}] (bullets print as the "- " list) */
function lines(text: unknown) {
  const out = String(text ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => {
      const m = /^\s*[-•*–]\s*(.*)$/.exec(l);
      return m ? { text: m[1], bullet: true } : { text: l.trimEnd(), bullet: false };
    });
  while (out.length > 1 && !out[out.length - 1].text && !out[out.length - 1].bullet) out.pop();
  return out;
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const RPR = `<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:lang w:val="sv-SE"/></w:rPr>`;
const RPR_B = `<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:b/><w:bCs/><w:lang w:val="sv-SE"/></w:rPr>`;
const par = (text: string, center = true, rpr = RPR) =>
  `<w:p><w:pPr>${center ? `<w:jc w:val="center"/>` : ""}${rpr}</w:pPr>${
    text ? `<w:r>${rpr}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>` : ""
  }</w:p>`;

/** The original "Tanda Tangan" table (3 × 3113 dxa columns), with one column per party. */
function ttdTable(parties: Party[]) {
  const list = parties.length ? parties : [{ pihak: "", nama: "" }];
  const total = 9339;
  const w = Math.floor(total / list.length);
  const grid = list.map(() => `<w:gridCol w:w="${w}"/>`).join("");
  const trPr = (h: number) => `<w:trPr><w:trHeight w:val="${h}"/><w:jc w:val="center"/></w:trPr>`;
  const bottom = `<w:tcBorders><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tcBorders>`;
  const title =
    `<w:tr>${trPr(323)}<w:tc><w:tcPr><w:tcW w:w="${total}" w:type="dxa"/><w:gridSpan w:val="${list.length}"/>${bottom}` +
    `<w:shd w:val="clear" w:color="auto" w:fill="D0CECE" w:themeFill="background2" w:themeFillShade="E6"/></w:tcPr>` +
    `${par("Tanda Tangan", true, RPR_B)}</w:tc></w:tr>`;
  // signature space: 3 lines, the name (if any) on the last one
  const sign = `<w:tr>${trPr(45)}${list
    .map((p) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/></w:tcPr>${par("")}${par("")}${par(p.nama)}</w:tc>`)
    .join("")}</w:tr>`;
  const labels = `<w:tr>${trPr(45)}${list
    .map((p) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${bottom}</w:tcPr>${par(p.pihak)}</w:tc>`)
    .join("")}</w:tr>`;
  return (
    `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="${total}" w:type="dxa"/><w:jc w:val="center"/>` +
    `<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>` +
    `</w:tblPr><w:tblGrid>${grid}</w:tblGrid>${title}${sign}${labels}</w:tbl>`
  );
}

export const mom: FormDef = {
  id: "mom",
  code: "FRM.IT.015",
  title: "Minutes of Meeting",
  short: "MOM",
  description: "Notulen rapat: peserta, poin pembahasan, action points dan tanda tangan.",
  number: {
    kind: "standard",
    label: "No. Dok",
    format: (n) => `MOM-${pad3(n.urut)}-${n.lokasi}-${n.bulan}-${n.tahun}`,
    defaultLokasi: "HO",
  },
  sections: [
    {
      title: "Meeting Details",
      fields: [
        { type: "date", key: "tanggal", label: "Hari / Tanggal" },
        { type: "text", key: "lokasiMeeting", label: "Lokasi Meeting" },
        { type: "text", key: "judul", label: "Judul Meeting", span: 6, hint: "Juga dicetak di header dokumen" },
        {
          type: "textarea",
          key: "peserta",
          label: "Peserta Meeting",
          placeholder: "IT:\n- Pak ...\n- Bu ...\nGA:\n- Pak ...",
          hint: 'Satu baris per nama. Baris yang diawali "-" dicetak sebagai daftar.',
        },
      ],
    },
    {
      title: "Discussion Points",
      fields: [
        {
          type: "table",
          key: "points",
          label: "Poin Pembahasan",
          maxRows: 30,
          minRows: 1,
          columns: [{ key: "poin", label: "Poin Pembahasan", type: "textarea" }],
          hint: 'Nomor otomatis. Baris yang diawali "-" dicetak sebagai sub-poin.',
        },
      ],
    },
    {
      title: "Action Points",
      fields: [
        {
          type: "table",
          key: "actions",
          label: "Action Points",
          maxRows: 30,
          minRows: 1,
          columns: [
            { key: "rencana", label: "Rencana Aksi", type: "textarea", width: "50%" },
            { key: "pic", label: "PIC", type: "text", width: "20%" },
            { key: "dueDate", label: "Due Date", type: "date", width: "25%" },
          ],
          hint: "Nomor otomatis.",
        },
      ],
    },
    {
      title: "Tanda Tangan",
      fields: [
        {
          type: "table",
          key: "penandatangan",
          label: "Pihak penandatangan",
          maxRows: 5,
          minRows: 1,
          defaultRows: [
            { pihak: "IT", nama: "" },
            { pihak: "CMH", nama: "" },
            { pihak: "GA", nama: "" },
          ],
          columns: [
            { key: "pihak", label: "Pihak / Departemen", type: "text", width: "40%" },
            { key: "nama", label: "Nama (opsional)", type: "text", width: "55%" },
          ],
          hint: "Satu kolom tanda tangan per baris.",
        },
      ],
    },
  ],
  template: () => "mom.docx",
  toTemplate: (d, h) => {
    const points = (d.points as Point[]).filter((p) => p.poin.trim());
    const actions = (d.actions as Action[]).filter((a) => a.rencana || a.pic || a.dueDate);
    const parties = (d.penandatangan as Party[]).filter((p) => p.pihak || p.nama);
    return {
      noDok: mom.number.kind === "standard" ? mom.number.format(d.no) : "",
      hariTgl: h.tanggal(d.tanggal),
      judul: d.judul,
      peserta: lines(d.peserta),
      lokasiMeeting: d.lokasiMeeting,
      points: points.map((p, i) => ({ no: i + 1, lines: lines(p.poin) })),
      actions: actions.map((a, i) => ({ no: i + 1, rencana: a.rencana, pic: a.pic, dueDate: h.tanggal(a.dueDate) })),
      ttd: ttdTable(parties),
    };
  },
  summary: (d) => [d.judul, d.lokasiMeeting].filter(Boolean).join(" · "),
  sample: () => ({
    tanggal: "2026-11-12",
    judul: "Koordinasi Pemeliharaan Ruang Server",
    lokasiMeeting: "Ruang Meeting Lt. 3",
    peserta: "IT:\n- Contoh Peserta IT 1\n- Contoh Peserta IT 2\nGA:\n- Contoh Peserta GA",
    points: [
      {
        poin: "Jadwal pemeliharaan rutin perangkat ruang server\n- Pemeriksaan PAC dan UPS dilakukan setiap bulan\n- Laporan hasil pemeriksaan dikirim ke IT dan GA",
      },
      { poin: "Kebutuhan penggantian baterai UPS" },
      { poin: "Prosedur akses ruang server\n- Akses hanya untuk personel terdaftar" },
    ],
    actions: [
      { rencana: "Menyusun jadwal pemeliharaan", pic: "IT", dueDate: "2026-11-20" },
      { rencana: "Permintaan penawaran baterai UPS", pic: "GA", dueDate: "2026-11-25" },
      { rencana: "Update daftar akses ruang server", pic: "IT, GA", dueDate: "2026-11-30" },
    ],
    penandatangan: [
      { pihak: "IT", nama: "Contoh Nama IT" },
      { pihak: "GA", nama: "" },
    ],
  }),
};
