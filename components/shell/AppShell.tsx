import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CommandMenu } from "../CommandMenu";
import { GlobalShortcuts } from "../GlobalShortcuts";
import type { BreadcrumbItem } from "./Breadcrumbs";

interface AppShellProps {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
    role: "recruiter" | "admin";
  };
  breadcrumbs?: BreadcrumbItem[];
}

export function AppShell({ children, user, breadcrumbs }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} breadcrumbs={breadcrumbs} />
        <main className="flex-1 px-6 py-6 md:px-8 md:py-8">{children}</main>
      </div>
      <CommandMenu />
      <GlobalShortcuts />
    </div>
  );
}
