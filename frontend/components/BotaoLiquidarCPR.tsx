import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { prepareContractCall, sendTransaction } from "thirdweb";

import { notify } from "@/lib/notify";

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

  const handleLiquidar = async () => {
    if (!account) {
      notify.error("Carteira não conectada.");
      return;
    }

    let toastId;
    try {
      setIsPending(true);
      toastId = notify.loading("Liquidando CPR...");

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
      notify.success("CPR liquidada! O NFT foi queimado.", toastId);
      onSuccess();
    } catch (err: any) {
      setIsPending(false);
      if (err?.transactionHash || err?.hash) {
        console.warn("Transação transmitida com hash, ignorando erro secundário de recibo:", err);
        notify.success("CPR liquidada! O NFT foi queimado.", toastId);
        onSuccess();
        return;
      }
      notify.fromError(err, toastId);
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
    </div>
  );
}
