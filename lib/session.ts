import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, type AppRole } from "./auth";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "admin") redirect("/dashboard");
  return session;
}

/**
 * Aceita comercial e admin. Recruiter cai pra /dashboard. Usado em /comercial/*.
 */
export async function requireComercial() {
  const session = await requireSession();
  if (session.user.role !== "comercial" && session.user.role !== "admin") {
    redirect("/dashboard");
  }
  return session;
}

/**
 * Aceita recruiter e admin (operação de R&S). Comercial cai em /comercial.
 * Usado em /vagas, /talentos, /dashboard.
 */
export async function requireOperacional() {
  const session = await requireSession();
  if (session.user.role === "comercial") redirect("/comercial");
  return session;
}

export async function currentRole(): Promise<AppRole | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.role ?? null;
}

/**
 * Cliente é compartilhado entre as duas áreas:
 *  - recruiter/admin podem ler e editar
 *  - comercial só pode ler (forms desabilitados na UI + guard server-side nas actions)
 */
export function podeEditarCliente(role: AppRole): boolean {
  return role === "admin" || role === "recruiter";
}
