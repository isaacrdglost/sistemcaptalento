import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listarTagsLeads } from "@/app/comercial/actions";

/**
 * Endpoint usado pelo `<LeadTagInput>` e por filtros de tag — retorna a
 * lista de tags distintas já cadastradas em algum lead, ordenadas por
 * frequência. Requer apenas autenticação (qualquer role).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const tags = await listarTagsLeads();
  return NextResponse.json({ tags });
}
