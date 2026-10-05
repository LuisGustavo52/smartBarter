import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { prepareContractCall, sendTransaction } from "thirdweb";

import { notify } from "@/lib/notify";

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

  const handleConfirmar = async () => {
    if (!account) {
      notify.error("Carteira não conectada.");
      return;
    }

    let toastId;
    try {
      setIsPending(true);
      toastId = notify.loading("Confirmando recebimento...");

      const transaction = prepareContractCall({
        contract,
        method: "function confirmarRecebimentoInsumo(uint256 _propostaId)",
        params: [propostaId],
      });

      const res = await sendTransaction({ transaction, account });
      if (res?.transactionHash) {
        console.log("Insumo confirmado com sucesso, hash:", res.transactionHash);
      }

      setIsPending(false);
      notify.success("Recebimento confirmado! O NFT foi emitido para o fornecedor.", toastId);
      onSuccess();
    } catch (err: any) {
      setIsPending(false);
      if (err?.transactionHash || err?.hash) {
        console.warn("Transação transmitida com hash, ignorando erro secundário de recibo:", err);
        notify.success("Recebimento confirmado! O NFT foi emitido para o fornecedor.", toastId);
        onSuccess();
        return;
      }
      notify.fromError(err, toastId);
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
    </div>
  );
}
