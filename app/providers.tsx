"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { CommandMenuProvider } from "@/components/CommandMenuProvider";
import { ConfirmProvider } from "@/components/ConfirmDialog";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ConfirmProvider>
        <CommandMenuProvider>
          {children}
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            theme="light"
            toastOptions={{
              style: {
                fontFamily: "var(--font-sora)",
                borderRadius: "12px",
              },
            }}
          />
        </CommandMenuProvider>
      </ConfirmProvider>
    </SessionProvider>
  );
}
