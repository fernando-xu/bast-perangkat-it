import { createDoc, listDocs, nextUrut } from "@/lib/documents";
import { meta, notFound, parseForm, resolve } from "@/forms/server";

type Ctx = RouteContext<"/api/docs/[type]">;

export async function GET(req: Request, ctx: Ctx) {
  const { def } = await resolve(ctx.params);
  if (!def) return notFound();
  const url = new URL(req.url);
  if (url.searchParams.has("nextNo")) {
    const tahun = Number(url.searchParams.get("nextNo")) || new Date().getFullYear();
    return Response.json({ urut: await nextUrut(def.id, tahun) });
  }
  return Response.json(await listDocs(def.id, url.searchParams.get("q") ?? undefined));
}

export async function POST(req: Request, ctx: Ctx) {
  const { def } = await resolve(ctx.params);
  if (!def) return notFound();
  const parsed = parseForm(def, await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const id = await createDoc(def.id, parsed.data, meta(def, parsed.data));
  return Response.json({ id }, { status: 201 });
}
