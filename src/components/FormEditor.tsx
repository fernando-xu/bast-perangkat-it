"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getForm } from "@/forms/registry";
import { docNumber, emptyRow, optLabel, optValue } from "@/forms/schema";
import type { Column, Field, FormData, ImageValue, Option } from "@/forms/types";
import { ROMAN } from "@/lib/schema";

type Props = { formId: string; id?: number; initial: FormData };

export default function FormEditor({ formId, id, initial }: Props) {
  const def = getForm(formId)!;
  const router = useRouter();
  const [d, setD] = useState<FormData>(initial);
  const [savedId, setSavedId] = useState<number | undefined>(id);
  const [dirty, setDirty] = useState(!id);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const autoNo = useRef(!id && def.number.kind === "standard");

  useEffect(() => {
    if (!autoNo.current) return;
    fetch(`/api/docs/${formId}?nextNo=${d.no.tahun}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j && autoNo.current) setD((p) => ({ ...p, no: { ...p.no, urut: j.urut } }));
      })
      .catch(() => {});
  }, [formId, d.no.tahun]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (key: string, value: unknown) => {
    setDirty(true);
    setD((p) => ({ ...p, [key]: value }));
  };
  const setNo = (patch: Partial<FormData["no"]>) => {
    setDirty(true);
    setD((p) => ({ ...p, no: { ...p.no, ...patch } }));
  };

  async function save(): Promise<number | null> {
    setBusy("save");
    setMsg(null);
    try {
      const res = await fetch(savedId ? `/api/docs/${formId}/${savedId}` : `/api/docs/${formId}`, {
        method: savedId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 413) throw new Error("Data terlalu besar — kurangi jumlah/ukuran foto.");
      if (!res.ok) throw new Error(j.error ? "Periksa kembali isian form." : `Gagal menyimpan (${res.status})`);
      setDirty(false);
      autoNo.current = false;
      const newId = savedId ?? (j.id as number);
      if (!savedId) {
        setSavedId(newId);
        router.replace(`/f/${formId}/${newId}`);
      }
      setMsg({ kind: "ok", text: "Tersimpan." });
      return newId;
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
      const res = await fetch(`/api/docs/${formId}/${theId}/${kind}`);
      if (!res.ok) throw new Error(`Gagal membuat ${kind.toUpperCase()} (${res.status})`);
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? `${def.short}.${kind}`;
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
    setMsg(null);
    try {
      const res = await fetch(`/api/docs/${formId}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
      });
      if (!res.ok) throw new Error((await res.text()) || `Gagal membuat preview (${res.status})`);
      setPreview(URL.createObjectURL(await res.blob()));
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-32 pt-6 sm:px-6">
      <div className="mb-6">
        <Link href={`/f/${formId}`} className="text-sm text-slate-500 hover:text-slate-800">
          ← Daftar {def.short}
        </Link>
        <p className="mt-2 text-xs font-medium uppercase tracking-wider text-slate-500">{def.code}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {savedId ? "Edit" : "Buat"} {def.title}
        </h1>
        <p className="font-mono text-sm text-slate-600">
          {def.number.label} : {docNumber(def, d) || "—"}
        </p>
      </div>

      <Card title={def.number.label} hint={def.number.kind === "standard" ? "No.Urut / Lokasi Area / Bulan Romawi / Tahun" : undefined}>
        {def.number.kind === "free" ? (
          <Labeled label={def.number.label}>
            <input className="input" value={d.noBebas ?? ""} placeholder={def.number.placeholder} onChange={(e) => set("noBebas", e.target.value)} />
          </Labeled>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Labeled label="No. Urut">
              <input
                type="number"
                min={0}
                className="input"
                value={d.no.urut}
                onChange={(e) => {
                  autoNo.current = false;
                  setNo({ urut: Number(e.target.value) });
                }}
              />
            </Labeled>
            <Labeled label="Lokasi Area">
              <input className="input" value={d.no.lokasi} onChange={(e) => setNo({ lokasi: e.target.value })} />
            </Labeled>
            <Labeled label="Bulan">
              <select className="input" value={d.no.bulan} onChange={(e) => setNo({ bulan: e.target.value })}>
                {ROMAN.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Labeled>
            <Labeled label="Tahun">
              <input type="number" className="input" value={d.no.tahun} onChange={(e) => setNo({ tahun: Number(e.target.value) })} />
            </Labeled>
          </div>
        )}
      </Card>

      {def.sections.map((sec) => (
        <Card key={sec.title} title={sec.title} hint={sec.hint}>
          <div className="grid grid-cols-6 gap-4">
            {sec.fields.map((f, i) => (
              <FieldView key={"key" in f ? f.key : i} f={f} d={d} set={set} />
            ))}
          </div>
        </Card>
      ))}

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
        <div
          className="fixed inset-0 z-20 flex flex-col bg-slate-900/70 p-2 sm:p-6"
          onClick={() => {
            URL.revokeObjectURL(preview);
            setPreview(null);
          }}
        >
          <div className="mx-auto flex h-full w-full max-w-[900px] flex-col overflow-hidden rounded-lg bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-2">
              <span className="text-sm font-medium">Preview (perkiraan tampilan PDF — DOCX sesuai template asli)</span>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  URL.revokeObjectURL(preview);
                  setPreview(null);
                }}
              >
                Tutup
              </button>
            </div>
            <iframe title="Preview" src={preview} className="w-full flex-1 bg-slate-200" />
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ fields

const SPAN: Record<number, string> = {
  1: "col-span-6 sm:col-span-1",
  2: "col-span-6 sm:col-span-2",
  3: "col-span-6 sm:col-span-3",
  4: "col-span-6 sm:col-span-4",
  5: "col-span-6 sm:col-span-5",
  6: "col-span-6",
};

function FieldView({ f, d, set }: { f: Field; d: FormData; set: (k: string, v: unknown) => void }) {
  if (f.type === "note")
    return <p className="col-span-6 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">{f.text}</p>;
  const v = d[f.key];
  switch (f.type) {
    case "text":
    case "date":
    case "number":
      return (
        <Labeled label={f.label} hint={f.hint} className={SPAN[f.span ?? 3]}>
          <input
            type={f.type === "date" ? "date" : "text"}
            inputMode={f.type === "number" ? "decimal" : undefined}
            className="input"
            value={String(v ?? "")}
            placeholder={f.placeholder}
            maxLength={f.max}
            onChange={(e) => set(f.key, e.target.value)}
          />
        </Labeled>
      );
    case "textarea":
      return (
        <Labeled label={f.label} hint={f.hint} className={SPAN[f.span ?? 6]}>
          <textarea
            className="input min-h-24 resize-y leading-relaxed"
            value={String(v ?? "")}
            placeholder={f.placeholder}
            maxLength={f.max}
            onChange={(e) => set(f.key, e.target.value)}
          />
        </Labeled>
      );
    case "select":
      return (
        <Labeled label={f.label} hint={f.hint} className={SPAN[f.span ?? 3]}>
          <select className="input" value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)}>
            <option value="">— pilih —</option>
            {f.options.map((o) => (
              <option key={optValue(o)} value={optValue(o)}>
                {optLabel(o)}
              </option>
            ))}
          </select>
        </Labeled>
      );
    case "radio":
      return (
        <fieldset className={SPAN[f.span ?? 6]}>
          <legend className="mb-1 text-xs font-medium text-slate-600">{f.label}</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {f.options.map((o) => {
              const on = v === optValue(o);
              return (
                <button
                  key={optValue(o)}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set(f.key, on ? "" : optValue(o))}
                  className={`rounded-md border px-3 py-1.5 text-left text-sm transition-colors ${on ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}
                >
                  {optLabel(o)}
                </button>
              );
            })}
          </div>
          {f.hint && <p className="mt-1 text-xs text-slate-500">{f.hint}</p>}
        </fieldset>
      );
    case "boolean":
      return (
        <label className={`${SPAN[f.span ?? 6]} flex items-center gap-2 text-sm`}>
          <input type="checkbox" className="size-4 accent-slate-900" checked={!!v} onChange={(e) => set(f.key, e.target.checked)} />
          {f.label}
        </label>
      );
    case "checkboxes":
      return <Checkboxes f={f} d={d} set={set} />;
    case "table":
      return <TableField f={f} rows={(v as Record<string, unknown>[]) ?? []} set={(rows) => set(f.key, rows)} />;
    case "images":
      return (
        <div className="col-span-6">
          <span className="mb-1 block text-xs font-medium text-slate-600">{f.label}</span>
          <ImagesInput value={(v as ImageValue[]) ?? []} max={f.max} onChange={(imgs) => set(f.key, imgs)} />
          {f.hint && <p className="mt-1 text-xs text-slate-500">{f.hint}</p>}
        </div>
      );
  }
}

function Checkboxes({ f, d, set }: { f: Extract<Field, { type: "checkboxes" }>; d: FormData; set: (k: string, v: unknown) => void }) {
  const sel = (d[f.key] as string[]) ?? [];
  const cols = f.columns === 3 ? "sm:grid-cols-3" : f.columns === 1 ? "" : "sm:grid-cols-2";
  const toggle = (o: Option, on: boolean) =>
    set(f.key, on ? [...sel, optValue(o)] : sel.filter((x) => x !== optValue(o)));
  return (
    <fieldset className="col-span-6">
      <legend className="mb-1 text-xs font-medium text-slate-600">{f.label}</legend>
      <div className={`grid gap-x-4 gap-y-1.5 ${cols}`}>
        {f.options.map((o) => (
          <label key={optValue(o)} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 accent-slate-900"
              checked={sel.includes(optValue(o))}
              onChange={(e) => toggle(o, e.target.checked)}
            />
            {optLabel(o)}
          </label>
        ))}
      </div>
      {f.other && (
        <input
          className="input mt-2"
          placeholder={f.other}
          value={String(d[`${f.key}Lainnya`] ?? "")}
          onChange={(e) => set(`${f.key}Lainnya`, e.target.value)}
        />
      )}
      {f.hint && <p className="mt-1 text-xs text-slate-500">{f.hint}</p>}
    </fieldset>
  );
}

function TableField({
  f,
  rows,
  set,
}: {
  f: Extract<Field, { type: "table" }>;
  rows: Record<string, unknown>[];
  set: (rows: Record<string, unknown>[]) => void;
}) {
  const update = (i: number, key: string, value: unknown) => set(rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    set(next);
  };
  const fixedLabel = f.fixed ? f.columns[0] : null;
  return (
    <div className="col-span-6">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-medium text-slate-600">{f.label}</span>
        {f.hint && <span className="text-xs text-slate-500">{f.hint}</span>}
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="w-8 px-2 py-2">#</th>
              {f.columns.map((c) => (
                <th key={c.key} className="px-2 py-2 font-medium" style={{ width: c.width }}>
                  {c.label}
                </th>
              ))}
              {!f.fixed && <th className="w-16" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-100 align-top">
                <td className="px-2 py-1.5 text-slate-400">{i + 1}</td>
                {f.columns.map((c) => (
                  <td key={c.key} className="px-1 py-1">
                    {fixedLabel && c.key === fixedLabel.key ? (
                      <span className="block px-2 py-1.5">{String(r[c.key] ?? "")}</span>
                    ) : (
                      <Cell c={c} v={r[c.key]} on={(v) => update(i, c.key, v)} />
                    )}
                  </td>
                ))}
                {!f.fixed && (
                  <td className="whitespace-nowrap px-1 py-1 text-right">
                    <button type="button" aria-label="Naik" className="rounded px-1.5 text-slate-400 hover:bg-slate-100" onClick={() => move(i, -1)}>
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label="Hapus baris"
                      className="rounded px-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                      disabled={rows.length <= (f.minRows ?? 0)}
                      onClick={() => set(rows.filter((_, j) => j !== i))}
                    >
                      ×
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!f.fixed && rows.length < f.maxRows && (
        <button type="button" className="btn-ghost mt-2" onClick={() => set([...rows, emptyRow(f.columns)])}>
          + Tambah baris
        </button>
      )}
    </div>
  );
}

function Cell({ c, v, on }: { c: Column; v: unknown; on: (v: unknown) => void }) {
  switch (c.type) {
    case "checkbox":
      return (
        <div className="flex justify-center py-1.5">
          <input type="checkbox" aria-label={c.label} className="size-4 accent-slate-900" checked={!!v} onChange={(e) => on(e.target.checked)} />
        </div>
      );
    case "select":
      return (
        <select className="input py-1" aria-label={c.label} value={String(v ?? "")} onChange={(e) => on(e.target.value)}>
          <option value="">—</option>
          {c.options.map((o) => (
            <option key={optValue(o)} value={optValue(o)}>
              {optLabel(o)}
            </option>
          ))}
        </select>
      );
    case "image":
      return <ImagesInput value={(v as ImageValue[]) ?? []} max={c.max ?? 1} onChange={on} compact />;
    case "textarea":
      return (
        <textarea
          className="input min-h-16 resize-y py-1"
          aria-label={c.label}
          value={String(v ?? "")}
          placeholder={"placeholder" in c ? c.placeholder : undefined}
          onChange={(e) => on(e.target.value)}
        />
      );
    default:
      return (
        <input
          type={c.type === "date" ? "date" : "text"}
          inputMode={c.type === "number" ? "decimal" : undefined}
          className="input py-1"
          aria-label={c.label}
          value={String(v ?? "")}
          placeholder={"placeholder" in c ? c.placeholder : undefined}
          onChange={(e) => on(e.target.value)}
        />
      );
  }
}

// ------------------------------------------------------------------ images

const MAX_SIDE = 1280;
const MAX_BYTES = 450_000; // keep the whole document well under the 4.5 MB request limit

async function compress(file: File): Promise<ImageValue> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  let q = 0.8;
  let src = canvas.toDataURL("image/jpeg", q);
  while (src.length > MAX_BYTES && q > 0.35) {
    q -= 0.1;
    src = canvas.toDataURL("image/jpeg", q);
  }
  return { src, w, h, name: file.name };
}

function ImagesInput({ value, max, onChange, compact }: { value: ImageValue[]; max: number; onChange: (v: ImageValue[]) => void; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setErr(null);
    try {
      const room = max - value.length;
      const picked = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, room);
      const imgs = await Promise.all(picked.map(compress));
      onChange([...value, ...imgs]);
      if (files.length > room) setErr(`Maksimal ${max} foto.`);
    } catch {
      setErr("Gagal memproses gambar.");
    } finally {
      setBusy(false);
    }
  }
  const size = compact ? "size-16" : "size-24";
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((img, i) => (
          <div key={i} className={`group relative ${size} overflow-hidden rounded-md border border-slate-200 bg-slate-50`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.src} alt={img.name ?? `Foto ${i + 1}`} className="size-full object-cover" />
            <button
              type="button"
              aria-label="Hapus foto"
              className="absolute right-0.5 top-0.5 rounded bg-white/90 px-1.5 text-xs text-red-600 shadow"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </div>
        ))}
        {value.length < max && (
          <label
            className={`${size} flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 text-center text-xs text-slate-500 hover:bg-slate-50`}
          >
            {busy ? "Memproses…" : "+ Foto"}
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => add(e.target.files).then(() => (e.target.value = ""))} />
          </label>
        )}
      </div>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}

// ------------------------------------------------------------------ layout

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-semibold">
        {title}
        {hint && <span className="ml-2 text-xs font-normal text-slate-500">{hint}</span>}
      </h2>
      {children}
    </section>
  );
}

function Labeled({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
