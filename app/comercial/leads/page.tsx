import { redirect } from "next/navigation";

interface PageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default function LeadsRedirectPage({ searchParams }: PageProps) {
  const qs = new URLSearchParams();
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (Array.isArray(value)) {
        for (const v of value) qs.append(key, v);
      } else if (typeof value === "string") {
        qs.set(key, value);
      }
    }
  }
  const suffix = qs.toString();
  redirect(suffix ? `/comercial?${suffix}` : "/comercial");
}
