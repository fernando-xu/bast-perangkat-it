/**
 * Declarative definition of a form. The UI, validation, defaults and DOCX/PDF
 * generation are all derived from a FormDef — adding a form means writing one
 * definition file plus a DOCX template with docxtemplater tags.
 */

export type Option = string | { value: string; label: string };

/** An image uploaded from the browser (already compressed to JPEG). */
export type ImageValue = { src: string; w: number; h: number; name?: string };

export type Column =
  | { key: string; label: string; type: "text" | "textarea" | "date" | "number"; width?: string; placeholder?: string }
  | { key: string; label: string; type: "select"; options: Option[]; width?: string }
  | { key: string; label: string; type: "checkbox"; width?: string }
  | { key: string; label: string; type: "image"; width?: string; max?: number };

export type Field =
  | {
      type: "text" | "textarea" | "date" | "number";
      key: string;
      label: string;
      placeholder?: string;
      /** grid span in a 6-column grid (default 3 = half width, textarea default 6) */
      span?: 1 | 2 | 3 | 4 | 5 | 6;
      max?: number;
      hint?: string;
    }
  | { type: "select" | "radio"; key: string; label: string; options: Option[]; span?: 1 | 2 | 3 | 4 | 5 | 6; hint?: string }
  | {
      type: "checkboxes";
      key: string;
      label: string;
      options: Option[];
      /** adds a free-text input stored under `${key}Lainnya` */
      other?: string;
      columns?: 1 | 2 | 3;
      hint?: string;
    }
  | { type: "boolean"; key: string; label: string; span?: 1 | 2 | 3 | 4 | 5 | 6; hint?: string }
  | {
      type: "table";
      key: string;
      label: string;
      columns: Column[];
      /** rows shown for a new document */
      defaultRows?: Record<string, unknown>[];
      minRows?: number;
      maxRows: number;
      /** rows can't be added/removed (e.g. a fixed checklist) */
      fixed?: boolean;
      hint?: string;
    }
  | { type: "images"; key: string; label: string; max: number; hint?: string }
  | { type: "note"; text: string };

export type Section = { title: string; hint?: string; fields: Field[] };

/** Number parts shared by most forms: No.Urut / Lokasi Area / Bulan Romawi / Tahun. */
export type DocNumber = { urut: number; lokasi: string; bulan: string; tahun: number };

export type FormData = Record<string, unknown> & { no: DocNumber; noBebas?: string };

export type TemplateHelpers = {
  /** "2026-06-14" -> "14 Juni 2026" */
  tanggal: (iso: unknown) => string;
  /** checked -> ☒ / ☐ */
  cb: (checked: unknown) => string;
  /** 1500000 -> "Rp 1.500.000" (empty for blank) */
  rupiah: (n: unknown) => string;
  num: (v: unknown) => number;
  /** raw OOXML paragraphs embedding the images, for a {@tag} placeholder */
  images: (imgs: unknown, maxWidthCm?: number, maxHeightCm?: number) => string;
};

export type FormDef = {
  id: string;
  /** e.g. "FRM.IT.005" */
  code: string;
  title: string;
  short: string;
  description: string;
  /**
   * standard: urut/lokasi/bulan/tahun parts formatted by `format`.
   * free: a single free-text number (e.g. PR No from the ERP).
   */
  number:
    | { kind: "standard"; label: string; format: (n: DocNumber) => string; defaultLokasi?: string }
    | { kind: "free"; label: string; placeholder?: string };
  sections: Section[];
  /** template file under templates/ to use for this data (lets one form have variants) */
  template: (data: FormData) => string;
  /** docxtemplater data for the template */
  toTemplate: (data: FormData, h: TemplateHelpers) => Record<string, unknown>;
  /** one-line description shown in the list */
  summary: (data: FormData) => string;
  /** example data used by scripts/render-form.mts */
  sample: () => Record<string, unknown>;
  /** extra defaults applied on top of generated ones */
  defaults?: () => Record<string, unknown>;
  /** placeholder while the template isn't built yet (hidden from the UI) */
  stub?: boolean;
};
