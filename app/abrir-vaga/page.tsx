import { FormAbrirVaga } from "@/components/abrir-vaga/FormAbrirVaga";

export const dynamic = "force-dynamic";

/**
 * Página pública `/abrir-vaga`. Server component minimalista — toda a
 * lógica de form, steps e submissão fica no `<FormAbrirVaga>` (client).
 *
 * O middleware não matcheia esta rota, então é acessível sem login.
 */
export default function AbrirVagaPage() {
  return (
    <div className="container-narrow">
      <FormAbrirVaga />
    </div>
  );
}
