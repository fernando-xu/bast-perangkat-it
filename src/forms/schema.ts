import { z } from "zod";
import { ROMAN } from "@/lib/schema";
import type { Column, Field, FormData, FormDef, Option } from "./types";

export const optValue = (o: Option) => (typeof o === "string" ? o : o.value);
export const optLabel = (o: Option) => (typeof o === "string" ? o : o.label);

const IMAGE = z.object({
  src: z.string().regex(/^data:image\/(jpeg|png);base64,/).max(1_400_000),
  w: z.number().positive(),
  h: z.number().positive(),
  name: z.string().max(200).optional(),
});

function columnSchema(c: Column): z.ZodType {
  switch (c.type) {
    case "checkbox":
      return z.boolean().default(false);
    case "image":
      return z.array(IMAGE).max(c.max ?? 1).default([]);
    case "textarea":
      return z.string().max(4000).default("");
    default:
      return z.string().max(500).default("");
  }
}

function fieldSchema(f: Field): [string, z.ZodType][] {
  switch (f.type) {
    case "note":
      return [];
    case "text":
    case "date":
    case "number":
      return [[f.key, z.string().max(f.max ?? 500).default("")]];
    case "textarea":
      return [[f.key, z.string().max(f.max ?? 4000).default("")]];
    case "select":
    case "radio":
      return [[f.key, z.string().max(200).default("")]];
    case "boolean":
      return [[f.key, z.boolean().default(false)]];
    case "checkboxes": {
      const out: [string, z.ZodType][] = [[f.key, z.array(z.string().max(200)).max(f.options.length).default([])]];
      if (f.other) out.push([`${f.key}Lainnya`, z.string().max(500).default("")]);
      return out;
    }
    case "table": {
      const row = z.object(Object.fromEntries(f.columns.map((c) => [c.key, columnSchema(c)])));
      return [[f.key, z.array(row).max(f.maxRows).default([])]];
    }
    case "images":
      return [[f.key, z.array(IMAGE).max(f.max).default([])]];
  }
}

const schemaCache = new Map<string, z.ZodType<FormData>>();

export function formSchema(def: FormDef): z.ZodType<FormData> {
  let s = schemaCache.get(def.id);
  if (!s) {
    const shape: Record<string, z.ZodType> = {
      no: z.object({
        urut: z.coerce.number().int().min(0).max(99999),
        lokasi: z.string().max(100),
        bulan: z.enum(ROMAN),
        tahun: z.coerce.number().int().min(2000).max(2100),
      }),
      noBebas: z.string().max(100).default(""),
    };
    for (const sec of def.sections) for (const f of sec.fields) for (const [k, v] of fieldSchema(f)) shape[k] = v;
    s = z.object(shape) as unknown as z.ZodType<FormData>;
    schemaCache.set(def.id, s);
  }
  return s;
}

function emptyRow(columns: Column[]) {
  return Object.fromEntries(
    columns.map((c) => [c.key, c.type === "checkbox" ? false : c.type === "image" ? [] : ""]),
  );
}
export { emptyRow };

export function defaultData(def: FormDef, now = new Date()): FormData {
  const data: Record<string, unknown> = {
    no: {
      urut: 1,
      lokasi: def.number.kind === "standard" ? (def.number.defaultLokasi ?? "HO Jakarta") : "",
      bulan: ROMAN[now.getMonth()],
      tahun: now.getFullYear(),
    },
    noBebas: "",
  };
  for (const sec of def.sections)
    for (const f of sec.fields) {
      switch (f.type) {
        case "note":
          break;
        case "boolean":
          data[f.key] = false;
          break;
        case "checkboxes":
          data[f.key] = [];
          if (f.other) data[`${f.key}Lainnya`] = "";
          break;
        case "images":
          data[f.key] = [];
          break;
        case "table": {
          const rows = f.defaultRows ?? Array.from({ length: f.minRows ?? 1 }, () => ({}));
          data[f.key] = rows.map((r) => ({ ...emptyRow(f.columns), ...r }));
          break;
        }
        default:
          data[f.key] = "";
      }
    }
  return { ...data, ...(def.defaults?.() ?? {}) } as FormData;
}

export function docNumber(def: FormDef, data: FormData) {
  return def.number.kind === "free" ? (data.noBebas ?? "") : def.number.format(data.no);
}

export function fileName(def: FormDef, data: FormData) {
  const n = docNumber(def, data).replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "");
  return `${def.short}${n ? `-${n}` : ""}`;
}

/**
 * Flags for scripts/tpl/lib.py option_runs(): { tipe_0: true, tipe_1: false, ... } —
 * selected option prints normally, the others struck through. Nothing selected -> none struck.
 */
export function optionFlags(key: string, options: readonly string[], selected: unknown) {
  const sel = String(selected ?? "");
  return Object.fromEntries(options.map((o, i) => [`${key}_${i}`, !sel || o === sel]));
}

/** { prefix_0: "☒", prefix_1: "☐", ... } for a checkbox list in template order. */
export function checkFlags(prefix: string, options: readonly string[], selected: unknown) {
  const set = new Set(Array.isArray(selected) ? selected.map(String) : [String(selected ?? "")]);
  return Object.fromEntries(options.map((o, i) => [`${prefix}_${i}`, set.has(o) ? "☒" : "☐"]));
}

/** "001" style zero padding used by most numbering formats. */
export const pad3 = (n: number) => String(n).padStart(3, "0");
