import { notFound } from "next/navigation";
import FormEditor from "@/components/FormEditor";
import { getForm } from "@/forms/registry";
import { defaultData } from "@/forms/schema";

export const dynamic = "force-dynamic";

export default async function NewDoc({ params }: PageProps<"/f/[type]/new">) {
  const { type } = await params;
  const def = getForm(type);
  if (!def || def.stub) notFound();
  // Default month/year follow Jakarta time.
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  return <FormEditor formId={def.id} initial={defaultData(def, now)} />;
}
