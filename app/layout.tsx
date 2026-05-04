import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CapTalento RH",
    template: "%s · CapTalento RH",
  },
  description:
    "Plataforma interna da CapTalento RH para gestão de vagas, talentos, clientes e o pipeline comercial.",
  applicationName: "CapTalento RH",
  authors: [{ name: "CapTalento RH" }],
  // Open Graph pra preview ao compartilhar link
  openGraph: {
    title: "CapTalento RH",
    description:
      "Plataforma interna de recrutamento e seleção da CapTalento RH.",
    type: "website",
    locale: "pt_BR",
    siteName: "CapTalento RH",
  },
  // Robots: sistema interno, evita indexação
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#2B2DFF",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={sora.variable}>
      <body className="font-sans min-h-screen bg-surface text-ink">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
