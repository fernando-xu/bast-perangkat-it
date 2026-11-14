import { pad3 } from "./schema";
import type { FormDef } from "./types";

/** Placeholder definition for a form whose template hasn't been built yet. */
export function stub(id: string, code: string, title: string, short: string): FormDef {
  return {
    id,
    code,
    title,
    short,
    description: "Belum tersedia",
    number: { kind: "standard", label: `No. ${short}`, format: (n) => `${pad3(n.urut)}/${n.lokasi}/${n.bulan}/${n.tahun}` },
    sections: [],
    template: () => `${id}.docx`,
    toTemplate: () => ({}),
    summary: () => "",
    sample: () => ({}),
    stub: true,
  } as FormDef;
}
