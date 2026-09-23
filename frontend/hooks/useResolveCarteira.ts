"use client";

import { useEffect, useState } from "react";

const API_BASE_URL = "http://localhost:3001";
const DIRECT_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export type ResolveCarteiraStatus =
  | "idle"
  | "invalid"
  | "checking"
  | "resolved"
  | "direct"
  | "not_found"
  | "error";

export interface ResolveCarteiraResult {
  status: ResolveCarteiraStatus;
  carteira: string | null;
  username: string | null;
  mensagem: string;
  error: string | null;
  isReady: boolean;
  isResolving: boolean;
}

export function useResolveCarteira(valor: string): ResolveCarteiraResult {
  const [status, setStatus] = useState<ResolveCarteiraStatus>("idle");
  const [carteira, setCarteira] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState("Digite um @username ou um endereço 0x...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const input = valor.trim();

    if (!input) {
      setStatus("idle");
      setCarteira(null);
      setUsername(null);
      setMensagem("Digite um @username ou um endereço 0x...");
      setError(null);
      return;
    }

    if (DIRECT_ADDRESS_REGEX.test(input)) {
      setStatus("direct");
      setCarteira(input);
      setUsername(null);
      setMensagem("Endereço válido pronto para a blockchain.");
      setError(null);
      return;
    }

    if (!input.startsWith("@")) {
      setStatus("invalid");
      setCarteira(null);
      setUsername(null);
      setMensagem("Use @username ou um endereço 0x válido.");
      setError(null);
      return;
    }

    const parsedUsername = input.slice(1).trim().toLowerCase();

    if (!USERNAME_REGEX.test(parsedUsername)) {
      setStatus("invalid");
      setCarteira(null);
      setUsername(null);
      setMensagem("O @username deve ter 3 a 20 caracteres: letras, números ou _.");
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      const fetchCarteira = async () => {
        setStatus("checking");
        setMensagem("Buscando usuário cadastrado...");
        setError(null);

        try {
          const response = await fetch(
            `${API_BASE_URL}/users/username/${encodeURIComponent(parsedUsername)}`,
            { signal: controller.signal }
          );

          if (!response.ok) {
            if (response.status === 404) {
              setStatus("not_found");
              setCarteira(null);
              setUsername(parsedUsername);
              setMensagem("Usuário não encontrado.");
              return;
            }

            throw new Error("Falha ao consultar o usuário.");
          }

          const data = await response.json();
          const carteiraDigital = typeof data?.carteira_digital === "string" ? data.carteira_digital.trim() : "";

          if (!DIRECT_ADDRESS_REGEX.test(carteiraDigital)) {
            throw new Error("Usuário encontrado, mas a carteira retornou inválida.");
          }

          setStatus("resolved");
          setCarteira(carteiraDigital);
          setUsername(parsedUsername);
          setMensagem(`@${parsedUsername} resolvido para ${carteiraDigital}.`);
        } catch (fetchError: any) {
          if (fetchError?.name === "AbortError") {
            return;
          }

          setStatus("error");
          setCarteira(null);
          setUsername(parsedUsername);
          setMensagem("Não foi possível resolver o @username agora.");
          setError(fetchError?.message ?? "Erro desconhecido.");
        }
      };

      fetchCarteira();
    }, 400);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [valor]);

  return {
    status,
    carteira,
    username,
    mensagem,
    error,
    isReady: status === "direct" || status === "resolved",
    isResolving: status === "checking",
  };
}