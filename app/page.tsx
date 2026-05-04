import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function RootPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  // Comercial cai direto no painel de vendas; demais roles seguem pro dashboard
  if (session.user.role === "comercial") redirect("/comercial");
  redirect("/dashboard");
}
