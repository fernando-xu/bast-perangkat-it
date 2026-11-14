import BastForm from "@/components/BastForm";
import { emptyBast } from "@/lib/schema";

export const dynamic = "force-dynamic";

export default function NewBast() {
  // Default month/year follow Jakarta time.
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  return <BastForm initial={emptyBast(now)} />;
}
