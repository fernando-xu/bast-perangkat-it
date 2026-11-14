"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Row = {
  id: number;
  no_urut: number;
  lokasi_area: string;
  bulan: string;
  tahun: number;
  penerima: string;
  penyerahan: string;
  merk: string;
  updated_at: string;
};

export default function BastList() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/bast${q ? `?q=${encodeURIComponent(q)}` : ""}`)
        .then(async (r) => {
          if (!r.ok) throw new Error(`Gagal memuat data (${r.status})`);
          setRows(await r.json());
          setErr(null);
        })
        .catch((e) => setErr(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  async function remove(r: Row) {
    if (!confirm(`Hapus BAST ${no(r)}? Data tidak bisa dikembalikan.`)) return;
    const res = await fetch(`/api/bast/${r.id}`, { method: "DELETE" });
    if (res.ok) setRows((p) => p?.filter((x) => x.id !== r.id) ?? null);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">FRM.IT.003 · Rev02</p>
          <h1 className="text-2xl font-semibold tracking-tight">Berita Acara Serah Terima Perangkat IT</h1>
        </div>
        <Link href="/new" className="btn-primary">
          + Buat BAST
        </Link>
      </div>

      <input
        className="input mb-4 max-w-sm"
        placeholder="Cari no. BAST, penerima, merk, kode…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Cari"
      />

      {err && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{err}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">No. BAST</th>
              <th className="px-4 py-3">Penerima</th>
              <th className="px-4 py-3">Perangkat</th>
              <th className="px-4 py-3">Diubah</th>
              <th className="px-4 py-3 text-right">Unduh</th>
            </tr>
          </thead>
          <tbody>
            {rows === null && !err && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  Memuat…
                </td>
              </tr>
            )}
            {rows?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  {q ? "Tidak ada hasil." : "Belum ada BAST. Klik “Buat BAST” untuk mulai."}
                </td>
              </tr>
            )}
            {rows?.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-mono">
                  <Link href={`/bast/${r.id}`} className="font-medium text-slate-900 underline-offset-2 hover:underline">
                    {no(r)}
                  </Link>
                </td>
                <td className="px-4 py-3">{r.penerima || <span className="text-slate-400">—</span>}</td>
                <td className="px-4 py-3">
                  <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs">{r.penyerahan}</span>
                  {r.merk}
                </td>
                <td className="px-4 py-3 text-slate-500">{new Date(r.updated_at).toLocaleDateString("id-ID")}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <a className="mr-3 text-slate-700 hover:underline" href={`/api/bast/${r.id}/docx`}>
                    DOCX
                  </a>
                  <a className="mr-3 text-slate-700 hover:underline" href={`/api/bast/${r.id}/pdf`}>
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

function no(r: Row) {
  return `${String(r.no_urut).padStart(3, "0")}/${r.lokasi_area}/${r.bulan}/${r.tahun}`;
}
