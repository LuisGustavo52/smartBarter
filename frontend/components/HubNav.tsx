"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function HubNav() {
  const pathname = usePathname();

  const getLinkClass = (path: string) => {
    return pathname === path
      ? "text-emerald-400 font-bold border-b-2 border-emerald-400 pb-1"
      : "text-white hover:text-emerald-300 transition-colors pb-1";
  };

  return (
    <nav className="flex gap-6">
      <Link href="/hub/meus-ativos" className={getLinkClass("/hub/meus-ativos")}>Meus Ativos</Link>
      <Link href="/hub/novo-ativo" className={getLinkClass("/hub/novo-ativo")}>Novo Ativo</Link>
      <Link href="/hub/propostas" className={getLinkClass("/hub/propostas")}>Propostas CPR</Link>
      <Link href="/hub/vitrine" className={getLinkClass("/hub/vitrine")}>Vitrine de Insumos</Link>
    </nav>
  );
}
