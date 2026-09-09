import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { prepareContractCall, sendTransaction } from "thirdweb";

export default function BotaoConfirmarInsumo({
  propostaId,
  contract,
  onSuccess,
}: {
  propostaId: bigint;
  contract: any;
  onSuccess: () => void;
}) {
  const account = useActiveAccount();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  const handleConfirmar = async () => {
    if (!account) {
      setError("Carteira não conectada.");
      return;
    }

    try {
      setIsPending(true);
      setError("");

      const transaction = prepareContractCall({
        contract,
        method: "function confirmarRecebimentoInsumo(uint256 _propostaId)",
        params: [propostaId],
      });

      await sendTransaction({ transaction, account });

      setIsPending(false);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setIsPending(false);
      setError("Erro ao confirmar insumo. Tente novamente.");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleConfirmar}
        disabled={isPending}
        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
      >
        {isPending ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            Processando...
          </>
        ) : (
          "Confirmar Insumo"
        )}
      </button>
      {error && <span className="text-xs text-red-600 font-medium">{error}</span>}
    </div>
  );
}
