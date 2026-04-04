import { describe, expect, test } from "bun:test";

import {
  buildWorkGenerationPrompt,
  getWorkGenerationProfile,
  parseGeneratedWorkContent,
  type SectionTemplate,
} from "@/lib/work-generation-prompts";
import type { WorkBriefInput } from "@/types/editor";

const schoolTemplates: SectionTemplate[] = [
  { title: "1. Introdução", order: 3 },
  { title: "2. Desenvolvimento", order: 4 },
  { title: "3. Conclusão", order: 5 },
];

const higherEducationTemplates: SectionTemplate[] = [
  { title: "1. Introdução", order: 3 },
  { title: "2. Revisão da Literatura", order: 4 },
  { title: "3. Metodologia", order: 5 },
  { title: "4. Desenvolvimento", order: 6 },
  { title: "5. Conclusão", order: 7 },
];

describe("work generation prompts", () => {
  test("uses Mozambique-aligned school word budgets and no abstract", () => {
    const brief: WorkBriefInput = {
      educationLevel: "SECONDARY",
      institutionName: "Escola Secundária da Polana",
      subjectName: "Português",
    };

    const profile = getWorkGenerationProfile("SCHOOL_WORK", brief, schoolTemplates);

    expect(profile.abstract.required).toBe(false);
    expect(profile.totalRange.min).toBeGreaterThanOrEqual(2000);
    expect(profile.sections[1]?.title).toBe("2. Desenvolvimento");
    expect(profile.sections[1]?.range.min).toBeGreaterThanOrEqual(1500);
  });

  test("requires abstract for higher education and larger section plans", () => {
    const brief: WorkBriefInput = {
      educationLevel: "HIGHER_EDUCATION",
      institutionName: "Universidade Eduardo Mondlane",
      courseName: "Sociologia",
    };

    const profile = getWorkGenerationProfile("MONOGRAPHY", brief, higherEducationTemplates);

    expect(profile.abstract.required).toBe(true);
    expect(profile.abstract.range?.min).toBeGreaterThanOrEqual(180);
    expect(profile.totalRange.min).toBeGreaterThanOrEqual(2500);
  });

  test("builds prompts with anti-generic and Mozambique-specific instructions", () => {
    const brief: WorkBriefInput = {
      educationLevel: "SECONDARY",
      institutionName: "Escola Secundária de Maputo",
      subjectName: "Geografia",
      city: "Maputo",
    };

    const profile = getWorkGenerationProfile("SCHOOL_WORK", brief, schoolTemplates);
    const prompt = buildWorkGenerationPrompt({
      title: "Mudanças climáticas em Moçambique",
      typeLabel: "Trabalho Escolar",
      brief,
      templates: schoolTemplates,
      profile,
    });

    expect(prompt).toContain("Conteúdo total esperado nas secções");
    expect(prompt).toContain("realidade moçambicana");
    expect(prompt).toContain("Evite introduções vagas");
    expect(prompt).toContain("subtítulos curtos");
    expect(prompt).toContain("realidade moçambicana");
    expect(prompt).toContain("Markdown");
    expect(prompt).not.toContain('"abstract"');
    expect(prompt).toContain("nunca use tags HTML");
  });

  test("treats school work as school-context even when education level is missing", () => {
    const brief: WorkBriefInput = {
      institutionName: "Escola Secundária da Machava",
      subjectName: "História",
    };

    const profile = getWorkGenerationProfile("SCHOOL_WORK", brief, schoolTemplates);

    expect(profile.abstract.required).toBe(false);
    expect(profile.totalRange.min).toBeGreaterThanOrEqual(2000);
    expect(profile.sections[1]?.range.min).toBeGreaterThanOrEqual(1500);
  });

  test("parses school work without abstract when structure is valid", () => {
    const brief: WorkBriefInput = {
      educationLevel: "SECONDARY",
      institutionName: "Escola Secundária Josina Machel",
    };
    const profile = getWorkGenerationProfile("SCHOOL_WORK", brief, schoolTemplates);
    const introductionContent = (
      "O presente trabalho aborda um tema relevante para o contexto escolar moçambicano e procura explicar a sua importância para os estudantes, professores e comunidade educativa. " +
      "Além de apresentar o assunto principal, a introdução mostra por que razão o tema merece atenção no quotidiano da escola e da comunidade. " +
      "O texto também indica o objectivo do estudo, a forma de organização das secções e a necessidade de relacionar a análise com exemplos claros e próximos da realidade do aluno. " +
      "A análise proposta visa contribuir para a compreensão do fenómeno e para a reflexão crítica sobre o seu impacto na vida dos cidadãos e no desenvolvimento do país. "
    ).repeat(3);
    const developmentParagraph =
      "A escola moçambicana enfrenta desafios concretos ligados ao acesso à informação, à organização do estudo e ao contacto com tecnologias digitais. " +
      "Neste sentido, o trabalho escolar precisa explicar o tema com clareza, relacionando conceitos, exemplos e situações do quotidiano. ";
    const developmentContent = developmentParagraph.repeat(40);
    const conclusionContent = (
      "Em conclusão, o tema analisado mostra que a escola desempenha papel central na formação do estudante e que o estudo organizado ajuda a compreender melhor os desafios actuais. " +
      "As ideias apresentadas ao longo do desenvolvimento confirmam que a aprendizagem melhora quando o aluno entende o assunto de forma clara, contextualizada e ligada à realidade de Moçambique. " +
      "Assim, torna-se importante continuar a aprofundar o tema com responsabilidade, espírito crítico e atenção às necessidades concretas da comunidade escolar. " +
      "O estudo realizado permite concluir que a reflexão sobre este assunto é fundamental para a formação de cidadãos conscientes e preparados para os desafios do futuro. "
    ).repeat(3);
    const raw = JSON.stringify({
      sections: [
        {
          title: "1. Introdução",
          content: introductionContent,
        },
        {
          title: "2. Desenvolvimento",
          content: developmentContent,
        },
        {
          title: "3. Conclusão",
          content: conclusionContent,
        },
      ],
    });

    const parsed = parseGeneratedWorkContent(raw, schoolTemplates, profile);

    expect(parsed.abstract).toBe("");
    expect(parsed.sections).toHaveLength(3);
  });

  test("rejects school work that is far below the expected depth", () => {
    const brief: WorkBriefInput = {
      educationLevel: "SECONDARY",
      institutionName: "Escola Secundária da Matola",
    };
    const profile = getWorkGenerationProfile("SCHOOL_WORK", brief, schoolTemplates);
    const introductionContent = (
      "O trabalho apresenta um tema importante para a escola, explica o objectivo do estudo e indica que a análise será feita com base na realidade do estudante e da comunidade educativa. "
    ).repeat(15);
    const conclusionContent = (
      "Conclui-se que o tema é importante para a escola e que o seu estudo pode ajudar o aluno a compreender melhor a realidade que o rodeia e a agir com maior responsabilidade. "
    ).repeat(12);
    const raw = JSON.stringify({
      sections: [
        { title: "1. Introdução", content: introductionContent },
        { title: "2. Desenvolvimento", content: "Breve explicação com pouca profundidade." },
        { title: "3. Conclusão", content: conclusionContent },
      ],
    });

    expect(() => parseGeneratedWorkContent(raw, schoolTemplates, profile)).toThrow(
      "A secção \"2. Desenvolvimento\" ficou com",
    );
  });
});
