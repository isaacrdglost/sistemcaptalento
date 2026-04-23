import type { VagaAlerta } from "@/lib/flows";

interface AlertaVagaProps {
  alertas: VagaAlerta[];
}

export function AlertaVaga({ alertas }: AlertaVagaProps) {
  if (!alertas || alertas.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {alertas.map((alerta, idx) => {
        const className =
          alerta.nivel === "danger" ? "badge-red" : "badge-amber";
        return (
          <div
            key={`${alerta.titulo}-${idx}`}
            className={`${className} w-full items-start justify-start whitespace-normal px-3 py-2 text-left`}
          >
            <span className="flex flex-col gap-0.5">
              <span className="font-bold">{alerta.titulo}</span>
              <span className="font-normal">{alerta.descricao}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
