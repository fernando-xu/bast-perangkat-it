import { getBast } from "@/lib/db";
import { renderPdf } from "@/lib/pdf";
import { fileBaseName } from "@/lib/schema";

export const maxDuration = 60;

export async function GET(req: Request, ctx: RouteContext<"/api/bast/[id]/pdf">) {
  const { id } = await ctx.params;
  const b = /^\d+$/.test(id) ? await getBast(Number(id)) : null;
  if (!b) return Response.json({ error: "Not found" }, { status: 404 });
  const pdf = await renderPdf(b);
  const inline = new URL(req.url).searchParams.has("inline");
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${fileBaseName(b)}.pdf"`,
    },
  });
}
