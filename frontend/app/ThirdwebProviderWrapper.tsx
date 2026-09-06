"use client";

import { ThirdwebProvider, AutoConnect } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "d3690d56bdafa6a3cd84d948259dbbe0",
});

export function ThirdwebProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThirdwebProvider>
      <AutoConnect client={client} />
      {children}
    </ThirdwebProvider>
  );
}
