import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { DocumentPreview } from "@/components/workspace/DocumentPreview";
import type { WorkBrief, WorkSection } from "@/types/workspace";

const brief: WorkBrief = {
  title: "O patriarcado moçambicano",
  workType: "SECONDARY_WORK",
  educationLevel: "SECONDARY",
  institutionName: "Escola Secundária Josina Machel",
  subjectName: "História",
  studentName: "Estudante Teste",
  advisorName: "Professora Ana",
  city: "Maputo",
  year: "2026",
};

describe("DocumentPreview", () => {
  test("renders front matter from brief instead of stored html", () => {
    const sections: WorkSection[] = [
      {
        id: "cover",
        title: "Capa",
        status: "done",
        content: "<style>* { box-sizing: border-box; }</style><div>Logo</div>",
        order: 1,
      },
      {
        id: "title",
        title: "Folha de Rosto",
        status: "done",
        content: "<div style=\"font-size: 12pt;\">Folha em HTML</div>",
        order: 2,
      },
      {
        id: "intro",
        title: "1. Introdução",
        status: "done",
        content: "Conteúdo final da introdução.",
        order: 3,
      },
    ];

    const markup = renderToStaticMarkup(
      <DocumentPreview brief={brief} isGenerating={false} sections={sections} />,
    );

    expect(markup).toContain("Escola Secundária Josina Machel");
    expect(markup).toContain("Trabalho Escolar");
    expect(markup).toContain("Estudante Teste");
    expect(markup).toContain("Professora Ana");
    expect(markup).toContain("Conteúdo final da introdução.");
    expect(markup).not.toContain("box-sizing");
    expect(markup).not.toContain("Folha em HTML");
    expect(markup).not.toContain("Secondary Work");
  });
});
