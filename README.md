# Form IT — Baramulti Group

Web form untuk form IT resmi: PR (FRM.IT.000), IT Request Form / FPP (001, varian BMSS/DI/DSI), BAPP (002), BAST (003), Disposal Aset IT (004), Rekomendasi Perangkat (005), Instruksi Kerja (007), Laporan Insiden (011), Minutes of Meeting (015). Isi form di website, data tersimpan di Neon Postgres, lalu unduh sebagai DOCX (dari template Word asli) atau PDF.

Live: https://bast-perangkat-it.vercel.app

## Stack

- Next.js 16 (App Router) di Vercel
- Neon Postgres (`@neondatabase/serverless`), tabel `bast` dibuat otomatis saat request pertama
- DOCX: `templates/bast-template.docx` diisi oleh `src/lib/docx.ts` (placeholder `{{key}}` / `{{opt:key}}`)
- PDF: replika HTML (`src/lib/html.ts`) dirender oleh headless Chromium (`src/lib/pdf.ts`, `@sparticuz/chromium` di Vercel, Chrome lokal saat development)

## Development

```bash
npm install
vercel env pull --yes   # ambil DATABASE_URL dari project Vercel
npm run dev
```

Render contoh dokumen ke `out/`: `npx tsx scripts/render-sample.mts`

## Menambah / mengubah form

Form selain BAST didefinisikan di `src/forms/defs/<id>.ts` (field, nomor dokumen, mapping ke template) dan didaftarkan di `src/forms/registry.ts`. Template Word dibuat dari file asli dengan script python-docx di `scripts/tpl/<id>.py` (helper di `scripts/tpl/lib.py`, tag docxtemplater):

```bash
python3 -m venv .venv && .venv/bin/pip install python-docx==1.1.2
.venv/bin/python scripts/tpl/rkd.py "<file asli>.docx"     # -> templates/rkd.docx
npx tsx scripts/render-form.mts rkd                         # -> out/rkd.{docx,png,pdf}
```

PDF form generik dibuat dari DOCX dengan docx-preview di Chromium (perkiraan tampilan; DOCX tetap identik dengan template). BAST memakai replika HTML khusus.

## Template DOCX (BAST)

`templates/bast-template.docx` dibuat dari file BAST Word asli:

```bash
python3 -I scripts/build_template.py <BAST-asli.docx> templates/bast-template.docx
```

## Password (opsional)

Set env `APP_PASSWORD` (dan opsional `APP_USER`, default `admin`) di Vercel untuk mengaktifkan HTTP Basic Auth di seluruh situs.
