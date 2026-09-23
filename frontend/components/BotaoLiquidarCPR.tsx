import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { prepareContractCall, sendTransaction } from "thirdweb";

export default function BotaoLiquidarCPR({
  tokenId,
  contract,
  onSuccess,
}: {
  tokenId: bigint;
  contract: any;
  onSuccess: () => void;
}) {
  const account = useActiveAccount();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  const handleLiquidar = async () => {
    if (!account) {
      setError("Carteira não conectada.");
      return;
    }

    try {
      setIsPending(true);
      setError("");

      const transaction = prepareContractCall({
        contract,
        method: "function liquidarCPR(uint256 _tokenId)",
        params: [tokenId],
      });

      const res = await sendTransaction({ transaction, account });
      if (res?.transactionHash) {
        console.log("CPR liquidada com sucesso, hash:", res.transactionHash);
      }

      setIsPending(false);
      onSuccess();
    } catch (err: any) {
      if (err?.transactionHash || err?.hash) {
        console.warn("Transação transmitida com hash, ignorando erro secundário de recibo:", err);
        setIsPending(false);
        onSuccess();
        return;
      }

      if (
        err?.message?.toLowerCase().includes("user rejected") ||
        err?.code === 4001 ||
        err?.name === "UserRejectedRequestError"
      ) {
        console.warn("Transação cancelada pelo usuário na MetaMask.");
        setIsPending(false);
        setError("Transação cancelada pelo usuário.");
        return;
      }

      console.error(err);
      setIsPending(false);
      setError("Erro ao liquidar CPR. Tente novamente.");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleLiquidar}
        disabled={isPending}
        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
      >
        {isPending ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            Processando...
          </>
        ) : (
          "Liquidar CPR"
        )}
      </button>
      {error && <span className="text-xs text-red-600 font-medium">{error}</span>}
    </div>
  );
}
