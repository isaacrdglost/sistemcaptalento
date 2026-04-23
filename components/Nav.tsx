import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SignOutButton } from "./SignOutButton";

export async function Nav() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-royal text-white text-sm font-bold">
              C
            </span>
            <span className="text-sm font-bold tracking-tight">
              CapTalento <span className="text-royal">RH</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/dashboard"
              className="rounded-md px-3 py-1.5 font-medium text-ink hover:bg-slate-100"
            >
              Dashboard
            </Link>
            <Link
              href="/vagas/nova"
              className="rounded-md px-3 py-1.5 font-medium text-ink hover:bg-slate-100"
            >
              Nova vaga
            </Link>
            {user.role === "admin" && (
              <Link
                href="/admin"
                className="rounded-md px-3 py-1.5 font-medium text-ink hover:bg-slate-100"
              >
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-xs leading-tight">
            <div className="font-semibold">{user.name}</div>
            <div className="text-slate-500">
              {user.role === "admin" ? "Admin" : "Recrutadora"}
            </div>
          </div>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
