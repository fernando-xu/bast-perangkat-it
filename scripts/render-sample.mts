// Renders a sample BAST to out/ for visual checks: npx tsx scripts/render-sample.mts
import { mkdir, writeFile } from "node:fs/promises";
import { renderDocx } from "../src/lib/docx";
import { renderHtml } from "../src/lib/html";
import { renderPdf } from "../src/lib/pdf";
import { bastSchema, emptyBast } from "../src/lib/schema";

const b = bastSchema.parse({
  ...emptyBast(new Date(2026, 5, 1)),
  noUrut: 41,
  penyerahan: "Desktop",
  jenis: "Baru",
  merk: "Lenovo 12UDS05V00",
  sn: "GM18R5NG",
  spek1: "Intel i5-14400 RAM 16GB SSD 512GB",
  spek2: "Windows 11 PRO Ms. Office Home 2024",
  kelengkapan: "Unit, Charger Adapter",
  lokasi: "Site BMSS (Rantau)",
  penerima: "Contoh Penerima",
  perusahaan: "PT DI",
  departemen: "Finance",
  perangkatLama: true,
  lamaKode: "DI-PTPN-OP004",
  lamaKelengkapan: "Laptop, Unit Charger",
  keterangan:
    "Pengadaan PC Set untuk tim Finance sebagai pengganti laptop lama yang sudah tidak layak pakai. Perangkat lama dikembalikan ke IT untuk dicek dan dihapus datanya sebelum dialokasikan ulang.",
  tglSerah: "2026-06-14",
  namaTahu: "Contoh HR",
  lamaMerk: "HP 240 G8",
  lamaSn: "5CD1234XYZ",
  checklist: emptyBast().checklist.map((c, i) => ({ ...c, kondisi: i < 13 ? "baik" : "" })),
});

await mkdir("out", { recursive: true });
await writeFile("out/sample.docx", await renderDocx(b));
await writeFile("out/sample.html", await renderHtml(b));
await writeFile("out/sample.pdf", await renderPdf(b));
console.log("ok");
