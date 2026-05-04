import { Breadcrumbs, type BreadcrumbItem } from "./Breadcrumbs";
import { UserMenu } from "./UserMenu";
import { CommandMenuTrigger } from "../CommandMenuTrigger";
import type { AppRole } from "@/lib/auth";

interface TopbarProps {
  breadcrumbs?: BreadcrumbItem[];
  user: {
    name: string;
    email: string;
    role: AppRole;
  };
}

export function Topbar({ breadcrumbs = [], user }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-white/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-4 px-6">
        <div className="min-w-0 flex-1">
          <Breadcrumbs items={breadcrumbs} />
        </div>

        <div className="flex items-center gap-3">
          <CommandMenuTrigger />
          <div className="hidden h-6 w-px bg-line md:block" />
          <UserMenu name={user.name} email={user.email} role={user.role} />
        </div>
      </div>
    </header>
  );
}
