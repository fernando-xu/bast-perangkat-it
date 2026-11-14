import Link from "next/link";
import { FORMS } from "@/forms/registry";

const BAST = {
  href: "/bast",
  code: "FRM.IT.003",
  title: "Berita Acara Serah Terima Perangkat IT",
  short: "BAST",
  description: "Serah terima perangkat IT ke user, dengan ceklist kondisi perangkat baru.",
};

export default function Home() {
  const cards = [
    ...FORMS.filter((f) => !f.stub).map((f) => ({ href: `/f/${f.id}`, code: f.code, title: f.title, short: f.short, description: f.description })),
    BAST,
  ].sort((a, b) => a.code.localeCompare(b.code));
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Baramulti Group · IT Department</p>
      <h1 className="text-2xl font-semibold tracking-tight">Form IT</h1>
      <p className="mb-8 text-sm text-slate-600">Isi form di website, simpan, lalu unduh sebagai DOCX atau PDF sesuai template resmi.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-400 hover:shadow"
          >
            <span className="font-mono text-xs text-slate-500">{c.code}</span>
            <span className="mt-1 font-semibold leading-snug">{c.title}</span>
            <span className="mt-2 flex-1 text-sm text-slate-600">{c.description}</span>
            <span className="mt-4 text-sm font-medium text-slate-900 group-hover:underline">Buka {c.short} →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
