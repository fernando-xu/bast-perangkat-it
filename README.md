# BAST Perangkat IT

Web form untuk **Berita Acara Serah Terima Perangkat IT** (FRM.IT.003;Rev02). Isi form di website, data tersimpan di Neon Postgres, lalu unduh sebagai DOCX (dari template Word asli) atau PDF.

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

## Template DOCX

`templates/bast-template.docx` dibuat dari file BAST Word asli:

```bash
python3 -I scripts/build_template.py <BAST-asli.docx> templates/bast-template.docx
```

## Password (opsional)

Set env `APP_PASSWORD` (dan opsional `APP_USER`, default `admin`) di Vercel untuk mengaktifkan HTTP Basic Auth di seluruh situs.
