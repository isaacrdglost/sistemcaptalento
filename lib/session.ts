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

export async function currentRole(): Promise<AppRole | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.role ?? null;
}
