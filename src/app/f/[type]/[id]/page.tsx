import { notFound } from "next/navigation";
import FormEditor from "@/components/FormEditor";
import { getForm } from "@/forms/registry";
import { defaultData, formSchema } from "@/forms/schema";
import { getDoc } from "@/lib/documents";

export const dynamic = "force-dynamic";

export default async function EditDoc({ params }: PageProps<"/f/[type]/[id]">) {
  const { type, id } = await params;
  const def = getForm(type);
  if (!def || def.stub || !/^\d+$/.test(id)) notFound();
  const raw = await getDoc(def.id, Number(id));
  if (!raw) notFound();
  // Merge with defaults so documents saved before a field was added still open.
  const data = formSchema(def).parse({ ...defaultData(def), ...(raw as object) });
  return <FormEditor key={id} formId={def.id} id={Number(id)} initial={data} />;
}
