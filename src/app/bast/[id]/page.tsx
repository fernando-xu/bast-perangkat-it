import { notFound } from "next/navigation";
import BastForm from "@/components/BastForm";
import { getBast } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditBast({ params }: PageProps<"/bast/[id]">) {
  const { id } = await params;
  const b = /^\d+$/.test(id) ? await getBast(Number(id)) : null;
  if (!b) notFound();
  return <BastForm key={id} id={Number(id)} initial={b} />;
}
