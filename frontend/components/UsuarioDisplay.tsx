"use client";

import { useEffect, useState } from "react";
import { truncateAddress } from "@/app/lib/web3/format";

// Cache global em memória para evitar chamadas duplicadas para o mesmo endereço
const userCache = new Map<string, Promise<any>>();

export function invalidateUserCache(address?: string) {
  if (address) {
    userCache.delete(address.toLowerCase());
  } else {
    userCache.clear();
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("userCacheInvalidated", { detail: { address } }));
  }
}

export function fetchUserByWallet(address: string) {
  if (!address) return Promise.resolve(null);
  
  const lowerAddress = address.toLowerCase();
  
  if (userCache.has(lowerAddress)) {
    return userCache.get(lowerAddress)!;
  }

  const promise = fetch(`http://localhost:3001/users/wallet/${lowerAddress}`)
    .then((res) => {
      if (!res.ok) throw new Error("Erro na API");
      return res.json();
    })
    .catch((err) => {
      console.error("Erro ao buscar usuário:", err);
      return null;
    });

  userCache.set(lowerAddress, promise);
  return promise;
}

interface UsuarioDisplayProps {
  address: string;
  className?: string;
  showIcon?: boolean;
}

export default function UsuarioDisplay({ address, className = "", showIcon = true }: UsuarioDisplayProps) {
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadUser = () => {
      if (!address) {
        setLoading(false);
        return;
      }
      setLoading(true);
      fetchUserByWallet(address).then((data) => {
        if (!mounted) return;
        if (data?.exists && data.user?.username) {
          setUsername(data.user.username);
        } else {
          setUsername(null);
        }
        setLoading(false);
      });
    };

    loadUser();

    const handleInvalidation = (e: Event) => {
      const customEv = e as CustomEvent;
      if (!customEv.detail?.address || customEv.detail.address.toLowerCase() === address.toLowerCase()) {
        loadUser();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("userCacheInvalidated", handleInvalidation);
    }

    return () => {
      mounted = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("userCacheInvalidated", handleInvalidation);
      }
    };
  }, [address]);

  if (!address) return <span className={className}>-</span>;

  // Enquanto carrega, mostra a carteira truncada esmaecida
  if (loading) {
    return (
      <span className={`inline-flex items-center gap-1.5 opacity-60 ${className}`}>
        {showIcon && (
          <div className="w-4 h-4 rounded-full bg-emerald-900/50 flex items-center justify-center border border-emerald-800/50">
            <svg className="w-2.5 h-2.5 text-emerald-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}
        <span className="font-mono text-sm">{truncateAddress(address)}</span>
      </span>
    );
  }

  // Se tiver username, mostra o @
  if (username) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-emerald-400 font-medium ${className}`}>
        {showIcon && (
          <div className="w-4 h-4 rounded-full bg-emerald-900/80 flex items-center justify-center border border-emerald-500/30">
            <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}
        <span className="hover:text-emerald-300 transition-colors">@{username}</span>
      </span>
    );
  }

  // Fallback para a carteira truncada se não tiver username
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {showIcon && (
        <div className="w-4 h-4 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">
          <svg className="w-2.5 h-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      <span className="font-mono text-sm text-gray-400">{truncateAddress(address)}</span>
    </span>
  );
}
