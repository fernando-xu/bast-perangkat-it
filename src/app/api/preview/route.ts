import { renderHtml } from "@/lib/html";
import { bastSchema } from "@/lib/schema";

/** Live HTML preview of the unsaved form (same markup used for the PDF). */
export async function POST(req: Request) {
  const parsed = bastSchema.safeParse(await req.json());
  if (!parsed.success) return new Response("Data belum lengkap", { status: 400 });
  return new Response(await renderHtml(parsed.data), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
