// Visual check for a generic form: npx tsx scripts/render-form.mts <formId> [--no-pdf]
// Writes out/<id>.docx, out/<id>.pdf and out/<id>.png (full page render, all pages stacked).
import { mkdir, writeFile } from "node:fs/promises";
import { getForm } from "../src/forms/registry";
import { defaultData, formSchema } from "../src/forms/schema";
import { renderFormDocx } from "../src/lib/docgen";
import { docxToPdf, docxToPng } from "../src/lib/docx-pdf";

const id = process.argv[2];
const def = id && getForm(id);
if (!def) throw new Error(`usage: render-form.mts <formId>; unknown "${id}"`);
const data = formSchema(def).parse({ ...defaultData(def, new Date(2026, 10, 14)), ...def.sample() });
await mkdir("out", { recursive: true });
const docx = await renderFormDocx(def, data);
await writeFile(`out/${id}.docx`, docx);
await writeFile(`out/${id}.png`, await docxToPng(docx));
if (!process.argv.includes("--no-pdf")) await writeFile(`out/${id}.pdf`, await docxToPdf(docx));
console.log(`ok: out/${id}.docx out/${id}.png${process.argv.includes("--no-pdf") ? "" : ` out/${id}.pdf`}`);
