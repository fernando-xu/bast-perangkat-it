"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  type Bast,
  CHECKLIST_ROWS,
  CONDITIONS,
  DEVICE_TYPES,
  ROMAN,
  noBast,
} from "@/lib/schema";

type Props = { id?: number; initial: Bast };

export default function BastForm({ id, initial }: Props) {
  const router = useRouter();
  const [b, setB] = useState<Bast>(initial);
  const [savedId, setSavedId] = useState<number | undefined>(id);
  const [dirty, setDirty] = useState(!id);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const autoNo = useRef(!id);

  // Suggest the next running number for new documents.
  useEffect(() => {
    if (!autoNo.current) return;
    fetch(`/api/bast?nextNo=${b.tahun}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j && autoNo.current) setB((p) => ({ ...p, noUrut: j.noUrut }));
      })
      .catch(() => {});
  }, [b.tahun]);

  function set<K extends keyof Bast>(key: K, value: Bast[K]) {
    setDirty(true);
    setB((prev) => {
      return { ...prev, [key]: value };
    });
  }

  function setItem(i: number, patch: Partial<Bast["checklist"][number]>) {
    setDirty(true);
    setB((prev) => ({
      ...prev,
      checklist: prev.checklist.map((it, j) => (j === i ? { ...it, ...patch } : it)),
    }));
  }

  async function save(): Promise<number | null> {
    setBusy("save");
    setMsg(null);
    try {
      const res = await fetch(savedId ? `/api/bast/${savedId}` : "/api/bast", {
        method: savedId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(b),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ? "Periksa kembali isian form (No. urut, lokasi area wajib diisi)." : `Gagal menyimpan (${res.status})`);
      setDirty(false);
      autoNo.current = false;
      if (!savedId) {
        setSavedId(j.id);
        router.replace(`/bast/${j.id}`);
      }
      setMsg({ kind: "ok", text: "Tersimpan." });
      return savedId ?? j.id;
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function download(kind: "docx" | "pdf") {
    const theId = dirty || !savedId ? await save() : savedId;
    if (!theId) return;
    setBusy(kind);
    try {
      const res = await fetch(`/api/bast/${theId}/${kind}`);
      if (!res.ok) throw new Error(`Gagal membuat ${kind.toUpperCase()} (${res.status})`);
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? `BAST.${kind}`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function openPreview() {
    setBusy("preview");
    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(b),
      });
      if (!res.ok) throw new Error(await res.text());
      setPreview(await res.text());
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  const lama = b.perangkatLama;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-32 pt-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
            ← Daftar BAST
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {savedId ? "Edit" : "Buat"} Berita Acara Serah Terima
          </h1>
          <p className="font-mono text-sm text-slate-600">No.BAST : {noBast(b)}</p>
        </div>
      </div>

      <Section title="Nomor BAST" hint="No.Urut / Lokasi Area / Bulan Romawi / Tahun">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="No. Urut">
            <input
              type="number"
              min={1}
              className="input"
              value={b.noUrut}
              onChange={(e) => {
                autoNo.current = false;
                set("noUrut", Number(e.target.value));
              }}
            />
          </Field>
          <Field label="Lokasi Area">
            <input className="input" value={b.lokasiArea} onChange={(e) => set("lokasiArea", e.target.value)} />
          </Field>
          <Field label="Bulan">
            <select className="input" value={b.bulan} onChange={(e) => set("bulan", e.target.value as Bast["bulan"])}>
              {ROMAN.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
          <Field label="Tahun">
            <input type="number" className="input" value={b.tahun} onChange={(e) => set("tahun", Number(e.target.value))} />
          </Field>
        </div>
      </Section>

      <Section title="Perangkat yang diserahkan">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Penyerahan">
            <Segmented options={DEVICE_TYPES} value={b.penyerahan} onChange={(v) => set("penyerahan", v)} />
          </Field>
          <Field label="Jenis Perangkat">
            <Segmented options={CONDITIONS} value={b.jenis} onChange={(v) => set("jenis", v)} />
          </Field>
          <Text label="Kode Perangkat" v={b.kode} on={(v) => set("kode", v)} />
          <Text label="Merk / Tipe" v={b.merk} on={(v) => set("merk", v)} placeholder="Lenovo V14IL" />
          <Text label="Serial Number (SN)" v={b.sn} on={(v) => set("sn", v)} placeholder="PF2MZJP9" />
          <Text label="Spesifikasi (baris 1)" v={b.spek1} on={(v) => set("spek1", v)} placeholder="Intel i5 RAM 16GB SSD 512GB" />
          <Text label="Spesifikasi (baris 2)" v={b.spek2} on={(v) => set("spek2", v)} placeholder="Windows 11 PRO, Office" />
          <Text label="Spesifikasi (baris 3)" v={b.spek3} on={(v) => set("spek3", v)} />
          <Text label="Kelengkapan" v={b.kelengkapan} on={(v) => set("kelengkapan", v)} placeholder="Unit, Charger Adapter" />
          <Text label="Lokasi" v={b.lokasi} on={(v) => set("lokasi", v)} />
        </div>
      </Section>

      <Section title="Penerima">
        <div className="grid gap-4 sm:grid-cols-3">
          <Text label="Nama Penerima" v={b.penerima} on={(v) => set("penerima", v)} />
          <Text label="Perusahaan" v={b.perusahaan} on={(v) => set("perusahaan", v)} placeholder="PT BMSS" />
          <Text label="Departemen" v={b.departemen} on={(v) => set("departemen", v)} />
        </div>
      </Section>

      <Section title="Perangkat Lama">
        <Segmented
          options={["Ada", "Tidak Ada"] as const}
          value={lama ? "Ada" : "Tidak Ada"}
          onChange={(v) => set("perangkatLama", v === "Ada")}
        />
        {lama && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Text label="Kode Perangkat (lama)" v={b.lamaKode} on={(v) => set("lamaKode", v)} />
            <Text label="Merk / Tipe (lama)" v={b.lamaMerk} on={(v) => set("lamaMerk", v)} />
            <Text label="Serial Number (lama)" v={b.lamaSn} on={(v) => set("lamaSn", v)} />
            <Text label="Spesifikasi (lama, baris 1)" v={b.lamaSpek1} on={(v) => set("lamaSpek1", v)} />
            <Text label="Spesifikasi (lama, baris 2)" v={b.lamaSpek2} on={(v) => set("lamaSpek2", v)} />
            <Text label="Kelengkapan (lama)" v={b.lamaKelengkapan} on={(v) => set("lamaKelengkapan", v)} />
          </div>
        )}
      </Section>

      <Section title="Keterangan">
        <textarea
          className="input min-h-28 resize-y leading-relaxed"
          aria-label="Keterangan"
          maxLength={400}
          value={b.keterangan}
          onChange={(e) => set("keterangan", e.target.value)}
          placeholder="Contoh: Pengadaan PC Set untuk tim Finance menggantikan laptop lama yang sudah rusak."
        />
        <p className="mt-1 text-right text-xs text-slate-500">{b.keterangan.length}/400</p>
      </Section>

      <Section title="Penandatangan" hint="Nama dipakai di tabel tanda tangan halaman 1 dan 2">
        <div className="grid gap-4 sm:grid-cols-3">
          <SignCol title="Penerima (User / PIC)">
            <Field label="Nama">
              <div className="input bg-slate-50 text-slate-700">{b.penerima || <span className="text-slate-400">Isi di bagian Penerima</span>}</div>
            </Field>
            <DateField label="Tanggal diterima" v={b.tglTerima} on={(v) => set("tglTerima", v)} />
          </SignCol>
          <SignCol title="IT In Charge">
            <Text label="Nama" v={b.namaIT} on={(v) => set("namaIT", v)} />
            <DateField label="Tanggal diserahkan" v={b.tglSerah} on={(v) => set("tglSerah", v)} />
          </SignCol>
          <SignCol title="Mengetahui (IT / HR)">
            <Text label="Nama" v={b.namaTahu} on={(v) => set("namaTahu", v)} />
            <DateField label="Tanggal (halaman 1)" v={b.tglTahu} on={(v) => set("tglTahu", v)} />
            <DateField label="Tanggal (halaman 2)" v={b.tgl2Tahu} on={(v) => set("tgl2Tahu", v)} />
          </SignCol>
        </div>
      </Section>

      <Section
        title="Ceklist perangkat baru"
        hint="Halaman 2"
        action={
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={() => b.checklist.forEach((it, i) => it.nama && setItem(i, { kondisi: "baik" }))}>
              Tandai semua Baik
            </button>
            <button type="button" className="btn-ghost" onClick={() => b.checklist.forEach((_, i) => setItem(i, { kondisi: "" }))}>
              Kosongkan
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="w-8 py-2">No</th>
                <th className="py-2">Nama Item</th>
                <th className="w-16 py-2 text-center">Baik</th>
                <th className="w-16 py-2 text-center">Kurang</th>
                <th className="py-2">Keterangan</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {b.checklist.map((it, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-1 text-slate-500">{i + 1}</td>
                  <td className="py-1 pr-2">
                    <input className="input py-1" value={it.nama} onChange={(e) => setItem(i, { nama: e.target.value })} />
                  </td>
                  {(["baik", "kurang"] as const).map((k) => (
                    <td key={k} className="py-1 text-center">
                      <input
                        type="checkbox"
                        aria-label={`${it.nama || `Item ${i + 1}`} ${k}`}
                        className="size-4 accent-slate-900"
                        checked={it.kondisi === k}
                        onChange={(e) => setItem(i, { kondisi: e.target.checked ? k : "" })}
                      />
                    </td>
                  ))}
                  <td className="py-1 pl-2">
                    <input className="input py-1" value={it.keterangan} onChange={(e) => setItem(i, { keterangan: e.target.value })} />
                  </td>
                  <td className="py-1 text-right">
                    <button
                      type="button"
                      aria-label="Hapus baris"
                      className="rounded px-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      onClick={() => {
                        setDirty(true);
                        setB((p) => ({ ...p, checklist: p.checklist.filter((_, j) => j !== i) }));
                      }}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {b.checklist.length < CHECKLIST_ROWS && (
          <button
            type="button"
            className="btn-ghost mt-3"
            onClick={() => {
              setDirty(true);
              setB((p) => ({ ...p, checklist: [...p.checklist, { nama: "", kondisi: "", keterangan: "" }] }));
            }}
          >
            + Tambah baris ({b.checklist.length}/{CHECKLIST_ROWS})
          </button>
        )}
      </Section>


      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          <span className={`mr-auto text-sm ${msg?.kind === "err" ? "text-red-600" : "text-slate-500"}`} role="status">
            {msg?.text ?? (dirty ? "Belum disimpan" : "Semua perubahan tersimpan")}
          </span>
          <button type="button" className="btn-ghost" onClick={openPreview} disabled={!!busy}>
            {busy === "preview" ? "Memuat…" : "Preview"}
          </button>
          <button type="button" className="btn-ghost" onClick={() => download("docx")} disabled={!!busy}>
            {busy === "docx" ? "Membuat…" : "Download DOCX"}
          </button>
          <button type="button" className="btn-ghost" onClick={() => download("pdf")} disabled={!!busy}>
            {busy === "pdf" ? "Membuat…" : "Download PDF"}
          </button>
          <button type="button" className="btn-primary" onClick={save} disabled={!!busy}>
            {busy === "save" ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-20 flex flex-col bg-slate-900/70 p-2 sm:p-6" onClick={() => setPreview(null)}>
          <div className="mx-auto flex h-full w-full max-w-[880px] flex-col overflow-hidden rounded-lg bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-2">
              <span className="text-sm font-medium">Preview dokumen</span>
              <button type="button" className="btn-ghost" onClick={() => setPreview(null)}>
                Tutup
              </button>
            </div>
            <iframe title="Preview BAST" srcDoc={preview} className="w-full flex-1 bg-slate-200" />
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, hint, action, children }: { title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">
          {title}
          {hint && <span className="ml-2 text-xs font-normal text-slate-500">{hint}</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Text({ label, v, on, placeholder }: { label: string; v: string; on: (v: string) => void; placeholder?: string }) {
  return (
    <Field label={label}>
      <input className="input" value={v} placeholder={placeholder} onChange={(e) => on(e.target.value)} />
    </Field>
  );
}

function Segmented<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-300 p-0.5" role="radiogroup">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={o === value}
          onClick={() => onChange(o)}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${o === value ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function SignCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 p-3">
      <div className="text-sm font-medium">{title}</div>
      {children}
    </div>
  );
}

function DateField({ label, v, on }: { label: string; v: string; on: (v: string) => void }) {
  return (
    <Field label={label}>
      <input type="date" className="input" value={v} onChange={(e) => on(e.target.value)} />
    </Field>
  );
}
