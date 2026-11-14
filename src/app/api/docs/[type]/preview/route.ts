import { renderFormDocx } from "@/lib/docgen";
import { docxToPdf } from "@/lib/docx-pdf";
import { notFound, parseForm, resolve } from "@/forms/server";

export const maxDuration = 60;

/** PDF preview of unsaved form data. */
export async function POST(req: Request, ctx: RouteContext<"/api/docs/[type]/preview">) {
  const { def } = await resolve(ctx.params);
  if (!def) return notFound();
  const parsed = parseForm(def, await req.json());
  if (!parsed.success) return new Response("Data belum lengkap", { status: 400 });
  const pdf = await docxToPdf(await renderFormDocx(def, parsed.data));
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf" } });
}
