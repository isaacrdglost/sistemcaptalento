import { Search } from "lucide-react";
import { Breadcrumbs, type BreadcrumbItem } from "./Breadcrumbs";
import { UserMenu } from "./UserMenu";
import { CommandMenuTrigger } from "../CommandMenuTrigger";

interface TopbarProps {
  breadcrumbs?: BreadcrumbItem[];
  user: {
    name: string;
    email: string;
    role: "recruiter" | "admin";
  };
}

export function Topbar({ breadcrumbs = [], user }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-4 px-6">
        <div className="min-w-0 flex-1">
          <Breadcrumbs items={breadcrumbs} />
        </div>

        <CommandMenuTrigger />

        <UserMenu name={user.name} email={user.email} role={user.role} />
      </div>
    </header>
  );
}
