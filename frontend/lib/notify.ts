import toast from "react-hot-toast";

export function isUserRejection(err: any): boolean {
  const texto = String(err?.message ?? "").toLowerCase();
  return (
    err?.code === 4001 ||
    err?.name === "UserRejectedRequestError" ||
    texto.includes("user rejected") ||
    texto.includes("user denied")
  );
}

export const notify = {
  loading: (msg: string) => toast.loading(msg),
  success: (msg: string, id?: string) => toast.success(msg, { id }),
  error: (msg: string, id?: string) => toast.error(msg, { id }),
  fromError: (err: any, id?: string) => {
    // warn (e não error): evita o overlay vermelho do Next em erros esperados.
    // name/message separados porque o Next serializa Error como {}.
    console.warn("Erro tratado pelo notify:", err?.name, err?.message, err);

    const texto = String(err?.message ?? "").toLowerCase();
    let msg = "Algo deu errado. Tente novamente.";

    if (typeof err?.userMessage === "string") {
      msg = err.userMessage;
    } else if (isUserRejection(err)) {
      msg = "Você cancelou a assinatura na MetaMask.";
    } else if (texto.includes("insufficient funds")) {
      msg = "Saldo insuficiente para pagar a taxa da transação.";
    } else if (texto.includes("chain id") || texto.includes("wrong network") || texto.includes("chain mismatch")) {
      msg = "Rede incorreta. Conecte a MetaMask à rede LocalHost (Chain ID 31337).";
    } else if (texto.includes("failed to fetch")) {
      msg = "Sem conexão com o nó da blockchain ou com a API. Verifique se os terminais 1 e 3 estão rodando.";
    }

    toast.error(msg, { id });
  },
};