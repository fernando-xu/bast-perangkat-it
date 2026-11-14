import { getBast } from "@/lib/db";
import { renderDocx } from "@/lib/docx";
import { fileBaseName } from "@/lib/schema";

export async function GET(_req: Request, ctx: RouteContext<"/api/bast/[id]/docx">) {
  const { id } = await ctx.params;
  const b = /^\d+$/.test(id) ? await getBast(Number(id)) : null;
  if (!b) return Response.json({ error: "Not found" }, { status: 404 });
  const buf = await renderDocx(b);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileBaseName(b)}.docx"`,
    },
  });
}
