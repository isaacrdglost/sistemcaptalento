import type { Metadata } from "next";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = {
  title: "Abrir vaga",
  description:
    "Conte pra CapTalento RH a vaga que você precisa preencher. Em poucos minutos um especialista entra em contato.",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Layout isolado da página pública `/abrir-vaga`. Não usa o AppShell —
 * fica fora da área autenticada — então monta o próprio header minimalista
 * só com a logo, área principal centralizada e footer discreto.
 *
 * Fundo `bg-gradient-mesh` reaproveita o mesmo gradient sutil usado nas
 * heros internas, mantendo coerência visual entre o site público e o app.
 */
export default function AbrirVagaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-mesh flex flex-col">
      <header className="px-6 py-5 sm:px-10">
        <Logo size={32} variant="brand" />
      </header>
      <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
      <footer className="px-6 py-4 text-center text-xs text-slate-400">
        CapTalento RH · plataforma interna
      </footer>
    </div>
  );
}
