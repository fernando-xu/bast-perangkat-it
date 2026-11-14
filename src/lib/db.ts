import { neon } from "@neondatabase/serverless";
import { type Bast, bastSchema } from "./schema";

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
}

let ready: Promise<unknown> | null = null;
function ensureSchema() {
  ready ??= sql()`
    CREATE TABLE IF NOT EXISTS bast (
      id          SERIAL PRIMARY KEY,
      no_urut     INTEGER NOT NULL,
      lokasi_area TEXT NOT NULL,
      bulan       TEXT NOT NULL,
      tahun       INTEGER NOT NULL,
      penerima    TEXT NOT NULL DEFAULT '',
      data        JSONB NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`.catch((err) => {
    ready = null;
    throw err;
  });
  return ready;
}

export type BastRow = {
  id: number;
  no_urut: number;
  lokasi_area: string;
  bulan: string;
  tahun: number;
  penerima: string;
  created_at: string;
  updated_at: string;
};

export async function listBast(q?: string): Promise<(BastRow & { penyerahan: string; merk: string })[]> {
  await ensureSchema();
  const like = `%${q ?? ""}%`;
  return (await sql()`
    SELECT id, no_urut, lokasi_area, bulan, tahun, penerima, created_at, updated_at,
           data->>'penyerahan' AS penyerahan, data->>'merk' AS merk
    FROM bast
    WHERE ${!q} OR penerima ILIKE ${like} OR data->>'merk' ILIKE ${like}
       OR data->>'kode' ILIKE ${like} OR lokasi_area ILIKE ${like}
       OR (lpad(no_urut::text, 3, '0') || '/' || lokasi_area || '/' || bulan || '/' || tahun) ILIKE ${like}
    ORDER BY tahun DESC, no_urut DESC, id DESC
    LIMIT 500`) as (BastRow & { penyerahan: string; merk: string })[];
}

export async function getBast(id: number): Promise<Bast | null> {
  await ensureSchema();
  const rows = await sql()`SELECT data FROM bast WHERE id = ${id}`;
  if (!rows.length) return null;
  return bastSchema.parse(rows[0].data);
}

export async function createBast(b: Bast): Promise<number> {
  await ensureSchema();
  const rows = await sql()`
    INSERT INTO bast (no_urut, lokasi_area, bulan, tahun, penerima, data)
    VALUES (${b.noUrut}, ${b.lokasiArea}, ${b.bulan}, ${b.tahun}, ${b.penerima}, ${JSON.stringify(b)}::jsonb)
    RETURNING id`;
  return rows[0].id as number;
}

export async function updateBast(id: number, b: Bast): Promise<boolean> {
  await ensureSchema();
  const rows = await sql()`
    UPDATE bast SET no_urut = ${b.noUrut}, lokasi_area = ${b.lokasiArea}, bulan = ${b.bulan},
      tahun = ${b.tahun}, penerima = ${b.penerima}, data = ${JSON.stringify(b)}::jsonb, updated_at = now()
    WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

export async function deleteBast(id: number): Promise<boolean> {
  await ensureSchema();
  const rows = await sql()`DELETE FROM bast WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

/** Next running number for a year (max + 1). */
export async function nextNoUrut(tahun: number): Promise<number> {
  await ensureSchema();
  const rows = await sql()`SELECT COALESCE(MAX(no_urut), 0) + 1 AS n FROM bast WHERE tahun = ${tahun}`;
  return Number(rows[0].n);
}
