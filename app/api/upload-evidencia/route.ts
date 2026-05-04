import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put } from "@vercel/blob";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_SIZE = 8 * 1024 * 1024;
const MIME_ALLOWED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/**
 * Aceita um FormData com `file` e devolve a URL pública do blob armazenado
 * em `evidencias/`. Usado pra anexar print/PDF do cliente confirmando a
 * data de admissão (campo `Contratacao.admissaoEvidenciaUrl`).
 *
 * Comercial não acessa — operação restrita a recruiter/admin.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (session.user.role === "comercial") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        {
          error:
            "Storage de arquivos não configurado. O admin precisa definir BLOB_READ_WRITE_TOKEN nas variáveis de ambiente.",
        },
        { status: 500 },
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Arquivo não enviado" },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Arquivo maior que 8MB" },
        { status: 413 },
      );
    }

    const mime = file.type || "application/octet-stream";
    if (!MIME_ALLOWED.has(mime)) {
      return NextResponse.json(
        { error: "Formato não suportado. Envie PDF, JPG, PNG ou WEBP." },
        { status: 415 },
      );
    }

    const nomeSeguro = file.name
      .replace(/[^a-zA-Z0-9.\-_ ]+/g, "_")
      .slice(0, 120);
    const key = `evidencias/${nomeSeguro}`;

    const blob = await put(key, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: mime,
    });

    return NextResponse.json({
      ok: true,
      url: blob.url,
      nomeArquivo: file.name,
      tamanho: file.size,
      tipo: mime,
    });
  } catch (err) {
    console.error("[upload-evidencia] erro", err);
    return NextResponse.json(
      { error: "Erro ao enviar arquivo" },
      { status: 500 },
    );
  }
}
