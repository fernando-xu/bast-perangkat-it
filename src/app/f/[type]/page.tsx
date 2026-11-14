import { notFound } from "next/navigation";
import DocList from "@/components/DocList";
import { getForm } from "@/forms/registry";

export default async function FormList({ params }: PageProps<"/f/[type]">) {
  const { type } = await params;
  const def = getForm(type);
  if (!def || def.stub) notFound();
  return <DocList formId={def.id} />;
}
