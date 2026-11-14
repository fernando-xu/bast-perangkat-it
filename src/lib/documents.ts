import { neon } from "@neondatabase/serverless";
import type { FormData } from "@/forms/types";

/** Storage for every non-BAST form: one row per document, form data as JSONB. */

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
}

let ready: Promise<unknown> | null = null;
function ensureSchema() {
  ready ??= (async () => {
    const q = sql();
    await q`
      CREATE TABLE IF NOT EXISTS documents (
        id          SERIAL PRIMARY KEY,
        form_type   TEXT NOT NULL,
        doc_no      TEXT NOT NULL DEFAULT '',
        tahun       INTEGER NOT NULL,
        no_urut     INTEGER NOT NULL DEFAULT 0,
        summary     TEXT NOT NULL DEFAULT '',
        data        JSONB NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
    await q`CREATE INDEX IF NOT EXISTS documents_type_idx ON documents (form_type, tahun DESC, no_urut DESC)`;
  })().catch((err) => {
    ready = null;
    throw err;
  });
  return ready;
}

export type DocRow = {
  id: number;
  form_type: string;
  doc_no: string;
  summary: string;
  created_at: string;
  updated_at: string;
};

type Meta = { docNo: string; summary: string };

export async function listDocs(type: string, q?: string): Promise<DocRow[]> {
  await ensureSchema();
  const like = `%${q ?? ""}%`;
  return (await sql()`
    SELECT id, form_type, doc_no, summary, created_at, updated_at FROM documents
    WHERE form_type = ${type} AND (${!q} OR doc_no ILIKE ${like} OR summary ILIKE ${like})
    ORDER BY tahun DESC, no_urut DESC, id DESC LIMIT 500`) as DocRow[];
}

export async function countByType(): Promise<Record<string, number>> {
  await ensureSchema();
  const rows = await sql()`SELECT form_type, COUNT(*)::int AS n FROM documents GROUP BY form_type`;
  return Object.fromEntries(rows.map((r) => [r.form_type, r.n]));
}

export async function getDoc(type: string, id: number): Promise<unknown | null> {
  await ensureSchema();
  const rows = await sql()`SELECT data FROM documents WHERE id = ${id} AND form_type = ${type}`;
  return rows.length ? rows[0].data : null;
}

export async function createDoc(type: string, data: FormData, m: Meta): Promise<number> {
  await ensureSchema();
  const rows = await sql()`
    INSERT INTO documents (form_type, doc_no, tahun, no_urut, summary, data)
    VALUES (${type}, ${m.docNo}, ${data.no.tahun}, ${data.no.urut}, ${m.summary}, ${JSON.stringify(data)}::jsonb)
    RETURNING id`;
  return rows[0].id as number;
}

export async function updateDoc(type: string, id: number, data: FormData, m: Meta): Promise<boolean> {
  await ensureSchema();
  const rows = await sql()`
    UPDATE documents SET doc_no = ${m.docNo}, tahun = ${data.no.tahun}, no_urut = ${data.no.urut},
      summary = ${m.summary}, data = ${JSON.stringify(data)}::jsonb, updated_at = now()
    WHERE id = ${id} AND form_type = ${type} RETURNING id`;
  return rows.length > 0;
}

export async function deleteDoc(type: string, id: number): Promise<boolean> {
  await ensureSchema();
  const rows = await sql()`DELETE FROM documents WHERE id = ${id} AND form_type = ${type} RETURNING id`;
  return rows.length > 0;
}

export async function nextUrut(type: string, tahun: number): Promise<number> {
  await ensureSchema();
  const rows = await sql()`SELECT COALESCE(MAX(no_urut), 0) + 1 AS n FROM documents WHERE form_type = ${type} AND tahun = ${tahun}`;
  return Number(rows[0].n);
}
