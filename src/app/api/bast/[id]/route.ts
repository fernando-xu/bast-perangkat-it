import { deleteBast, getBast, updateBast } from "@/lib/db";
import { bastSchema } from "@/lib/schema";

type Ctx = RouteContext<"/api/bast/[id]">;

const parseId = (s: string) => (/^\d+$/.test(s) ? Number(s) : null);
const notFound = () => Response.json({ error: "Not found" }, { status: 404 });

export async function GET(_req: Request, ctx: Ctx) {
  const id = parseId((await ctx.params).id);
  const b = id && (await getBast(id));
  return b ? Response.json(b) : notFound();
}

export async function PUT(req: Request, ctx: Ctx) {
  const id = parseId((await ctx.params).id);
  if (!id) return notFound();
  const parsed = bastSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  return (await updateBast(id, parsed.data)) ? Response.json({ id }) : notFound();
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const id = parseId((await ctx.params).id);
  return id && (await deleteBast(id)) ? new Response(null, { status: 204 }) : notFound();
}
