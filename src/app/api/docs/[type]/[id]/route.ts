import { deleteDoc, getDoc, updateDoc } from "@/lib/documents";
import { meta, notFound, parseForm, resolve } from "@/forms/server";

type Ctx = RouteContext<"/api/docs/[type]/[id]">;

export async function GET(_req: Request, ctx: Ctx) {
  const { def, id } = await resolve(ctx.params);
  const data = def && id && (await getDoc(def.id, id));
  return data ? Response.json(data) : notFound();
}

export async function PUT(req: Request, ctx: Ctx) {
  const { def, id } = await resolve(ctx.params);
  if (!def || !id) return notFound();
  const parsed = parseForm(def, await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  return (await updateDoc(def.id, id, parsed.data, meta(def, parsed.data))) ? Response.json({ id }) : notFound();
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { def, id } = await resolve(ctx.params);
  return def && id && (await deleteDoc(def.id, id)) ? new Response(null, { status: 204 }) : notFound();
}
