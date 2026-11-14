import { createBast, listBast, nextNoUrut } from "@/lib/db";
import { bastSchema } from "@/lib/schema";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.has("nextNo")) {
    const tahun = Number(url.searchParams.get("nextNo")) || new Date().getFullYear();
    return Response.json({ noUrut: await nextNoUrut(tahun) });
  }
  return Response.json(await listBast(url.searchParams.get("q") ?? undefined));
}

export async function POST(req: Request) {
  const parsed = bastSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const id = await createBast(parsed.data);
  return Response.json({ id }, { status: 201 });
}
