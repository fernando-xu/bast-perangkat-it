import { docNumber, formSchema } from "./schema";
import { getForm } from "./registry";
import type { FormData, FormDef } from "./types";

/** Validate a request body against a form definition. */
export function parseForm(def: FormDef, body: unknown) {
  return formSchema(def).safeParse(body);
}

export function meta(def: FormDef, data: FormData) {
  return { docNo: docNumber(def, data), summary: def.summary(data).slice(0, 300) };
}

/** Resolve [type] and [id] route params; null when unknown. */
export async function resolve(params: Promise<{ type: string; id?: string }>) {
  const { type, id } = await params;
  const def = getForm(type);
  const num = id !== undefined ? (/^\d+$/.test(id) ? Number(id) : null) : undefined;
  return { def, id: num };
}

export const notFound = () => Response.json({ error: "Not found" }, { status: 404 });
