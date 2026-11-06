"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActiveAccount } from "thirdweb/react";
import { API_BASE_URL } from "@/lib/config";

export default function HubNav() {
  const pathname = usePathname();
  const account = useActiveAccount();
  const [tipoUsuario, setTipoUsuario] = useState<string | null>(null);

  useEffect(() => {
    if (!account?.address) {
      setTipoUsuario(null);
      return;
    }
    let ativo = true;
    fetch(`${API_BASE_URL}/users/wallet/${account.address}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!ativo) return;
        setTipoUsuario(data?.user?.tipo_usuario?.toUpperCase() ?? null);
      })
      .catch(() => {
        if (ativo) setTipoUsuario(null);
      });
    return () => {
      ativo = false;
    };
  }, [account?.address]);

  const isProdutor = tipoUsuario === "PRODUTOR";

  const getLinkClass = (path: string) => {
    return pathname === path
      ? "text-emerald-400 font-bold border-b-2 border-emerald-400 pb-1"
      : "text-white hover:text-emerald-300 transition-colors pb-1";
  };

  return (
    <nav className="flex gap-6">
      <Link href="/hub/meus-ativos" className={getLinkClass("/hub/meus-ativos")}>
        {isProdutor ? "Colheitas" : "Meus Ativos"}
      </Link>
      {!isProdutor && (
        <Link href="/hub/novo-ativo" className={getLinkClass("/hub/novo-ativo")}>
          Novo Ativo
        </Link>
      )}
      <Link href="/hub/propostas" className={getLinkClass("/hub/propostas")}>Propostas CPR</Link>
      <Link href="/hub/historico" className={getLinkClass("/hub/historico")}>Histórico</Link>
      <Link href="/hub/vitrine" className={getLinkClass("/hub/vitrine")}>Vitrine de Insumos</Link>
      <Link href="/hub/perfil" className={getLinkClass("/hub/perfil")}>Meu Perfil</Link>
    </nav>
  );
}
