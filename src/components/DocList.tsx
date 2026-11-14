"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getForm } from "@/forms/registry";

type Row = { id: number; doc_no: string; summary: string; updated_at: string };

export default function DocList({ formId }: { formId: string }) {
  const def = getForm(formId)!;
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/docs/${formId}${q ? `?q=${encodeURIComponent(q)}` : ""}`)
        .then(async (r) => {
          if (!r.ok) throw new Error(`Gagal memuat data (${r.status})`);
          setRows(await r.json());
          setErr(null);
        })
        .catch((e) => setErr(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [formId, q]);

  async function remove(r: Row) {
    if (!confirm(`Hapus ${def.short} ${r.doc_no || `#${r.id}`}? Data tidak bisa dikembalikan.`)) return;
    const res = await fetch(`/api/docs/${formId}/${r.id}`, { method: "DELETE" });
    if (res.ok) setRows((p) => p?.filter((x) => x.id !== r.id) ?? null);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
        ← Semua form
      </Link>
      <div className="mb-6 mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{def.code}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{def.title}</h1>
          <p className="text-sm text-slate-600">{def.description}</p>
        </div>
        <Link href={`/f/${formId}/new`} className="btn-primary">
          + Buat {def.short}
        </Link>
      </div>

      <input className="input mb-4 max-w-sm" placeholder="Cari nomor atau isi…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari" />
      {err && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{err}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">{def.number.label}</th>
              <th className="px-4 py-3">Keterangan</th>
              <th className="px-4 py-3">Diubah</th>
              <th className="px-4 py-3 text-right">Unduh</th>
            </tr>
          </thead>
          <tbody>
            {rows === null && !err && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                  Memuat…
                </td>
              </tr>
            )}
            {rows?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                  {q ? "Tidak ada hasil." : `Belum ada ${def.short}. Klik “Buat ${def.short}” untuk mulai.`}
                </td>
              </tr>
            )}
            {rows?.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-mono">
                  <Link href={`/f/${formId}/${r.id}`} className="font-medium text-slate-900 underline-offset-2 hover:underline">
                    {r.doc_no || `#${r.id}`}
                  </Link>
                </td>
                <td className="px-4 py-3">{r.summary || <span className="text-slate-400">—</span>}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(r.updated_at).toLocaleDateString("id-ID")}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <a className="mr-3 text-slate-700 hover:underline" href={`/api/docs/${formId}/${r.id}/docx`}>
                    DOCX
                  </a>
                  <a className="mr-3 text-slate-700 hover:underline" href={`/api/docs/${formId}/${r.id}/pdf`}>
                    PDF
                  </a>
                  <button className="text-red-600 hover:underline" onClick={() => remove(r)}>
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
