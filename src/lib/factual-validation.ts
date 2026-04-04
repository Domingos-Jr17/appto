import type { AIAction } from "@/lib/subscription";

const FACTUAL_SIGNAL_REGEX = /\b(lei|decreto|estat[ií]stic|dados|ine|percentagem|percentual|taxa|relat[oó]rio|boletim|fonte oficial)\b/i;

export function evaluateFactualValidation(input: {
  action: AIAction;
  text: string;
  hasGroundedSources: boolean;
  hasReferenceSeed: boolean;
}) {
  const warnings: string[] = [];

  if (
    (input.action === "references" || input.action === "citations") &&
    !input.hasGroundedSources &&
    !input.hasReferenceSeed
  ) {
    return {
      blocked: true,
      message:
        "Para gerar referências ou citações com segurança, adicione fontes reais ao projecto ou informe referências iniciais verificáveis.",
      warnings,
    };
  }

  if (!input.hasGroundedSources && FACTUAL_SIGNAL_REGEX.test(input.text)) {
    warnings.push(
      "Este pedido parece depender de dados factuais ou normativos. Revise cuidadosamente qualquer número, lei ou citação antes de submeter o trabalho.",
    );
  }

  return {
    blocked: false,
    warnings,
  };
}
