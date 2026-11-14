import { getDoc } from "@/lib/documents";
import { renderFormDocx } from "@/lib/docgen";
import { docxToPdf } from "@/lib/docx-pdf";
import { fileName, formSchema } from "@/forms/schema";
import { notFound, resolve } from "@/forms/server";

export const maxDuration = 60;

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function GET(req: Request, ctx: RouteContext<"/api/docs/[type]/[id]/[format]">) {
  const { format } = await ctx.params;
  const { def, id } = await resolve(ctx.params);
  if (!def || !id || (format !== "docx" && format !== "pdf")) return notFound();
  const raw = await getDoc(def.id, id);
  if (!raw) return notFound();
  const data = formSchema(def).parse(raw);
  const docx = await renderFormDocx(def, data);
  const name = fileName(def, data);
  const inline = new URL(req.url).searchParams.has("inline");
  const disp = (ext: string) => `${inline ? "inline" : "attachment"}; filename="${name}.${ext}"`;
  if (format === "docx")
    return new Response(new Uint8Array(docx), { headers: { "Content-Type": DOCX, "Content-Disposition": disp("docx") } });
  const pdf = await docxToPdf(docx);
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": disp("pdf") } });
}
