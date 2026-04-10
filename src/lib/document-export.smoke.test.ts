import { describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import mammoth from "mammoth";

import { DocumentExportService } from "@/lib/document-export";
import { buildReferenceReviewNotice } from "@/lib/reference-section";

function quotePowerShellLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

async function extractDocxArtifacts(buffer: Buffer<ArrayBufferLike>) {
  const rootDir = await mkdtemp(join(tmpdir(), "appto-docx-"));
  const docxPath = join(rootDir, "fixture.docx");
  const zipPath = join(rootDir, "fixture.zip");
  const extractDir = join(rootDir, "unzipped");

  try {
    await Bun.write(docxPath, buffer);
    await Bun.write(zipPath, buffer);
    await mkdir(extractDir, { recursive: true });

    const commands =
      process.platform === "win32"
        ? [[
            "powershell",
            "-NoProfile",
            "-Command",
            `Expand-Archive -LiteralPath ${quotePowerShellLiteral(zipPath)} -DestinationPath ${quotePowerShellLiteral(extractDir)} -Force`,
          ]]
        : [["unzip", "-oq", zipPath, "-d", extractDir]];

    let extracted = false;

    for (const command of commands) {
      const result = Bun.spawnSync({
        cmd: command,
        stdout: "pipe",
        stderr: "pipe",
      });

      if (result.exitCode === 0) {
        extracted = true;
        break;
      }
    }

    if (!extracted) {
      throw new Error("Não foi possível extrair o DOCX para inspeção.");
    }

    const documentXml = await readFile(join(extractDir, "word", "document.xml"), "utf8");
    const rawText = (await mammoth.extractRawText({ path: docxPath })).value;

    return { documentXml, rawText };
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
}

describe("document export smoke", () => {
  const cases = [
    {
      name: "secondary profile",
      project: {
        title: "A Origem da Terra",
        description: null,
        type: "SECONDARY_WORK",
        brief: {
          educationLevel: "SECONDARY",
          institutionName: "Escola Secundária de Laulane",
          subjectName: "Ciências Naturais",
          className: "10ª Classe",
          turma: "A",
          studentName: "João André",
          advisorName: "Armando Joaquim",
          city: "Maputo",
          academicYear: 2026,
        },
        sections: [
          {
            id: "cover",
            title: "Capa",
            content: "<style>.cover-page{box-sizing:border-box;}</style>",
            order: 1,
          },
          {
            id: "intro",
            title: "1. Introdução",
            content: "Introdução ao tema da origem da Terra.",
            order: 2,
          },
          {
            id: "dev",
            title: "2. Desenvolvimento",
            content: "Desenvolvimento com explicações científicas e contexto moçambicano.",
            order: 3,
          },
          {
            id: "conclusion",
            title: "3. Conclusão",
            content: "Conclusão sintética do trabalho.",
            order: 4,
          },
          {
            id: "references",
            title: "Referências",
            content: "COUTO, 2020. Título Um.\nSANTOS, 2021. Título Dois.",
            order: 5,
          },
        ],
      },
      mustContain: ["República de Moçambique", "Escola Secundária de Laulane", "COUTO, 2020. Título Um."],
    },
    {
      name: "technical profile",
      project: {
        title: "Instalações Elétricas Básicas",
        description: null,
        type: "TECHNICAL_WORK",
        brief: {
          educationLevel: "TECHNICAL",
          institutionName: "Instituto Industrial de Maputo",
          courseName: "Eletricidade Industrial",
          subjectName: "Oficina Elétrica",
          studentName: "Carlos Mussa",
          advisorName: "Nelson Tembe",
          city: "Matola",
          academicYear: 2026,
        },
        sections: [
          {
            id: "intro",
            title: "1. Introdução",
            content: "Introdução ao trabalho técnico.",
            order: 1,
          },
          {
            id: "theory",
            title: "2. Fundamentação Teórica",
            content: "Fundamentação teórica do sistema.",
            order: 2,
          },
          {
            id: "references",
            title: "Referências",
            content: buildReferenceReviewNotice(true),
            order: 3,
          },
        ],
      },
      mustContain: ["Instituto Industrial de Maputo", "Trabalho Técnico", "Pendência de revisão manual"],
    },
    {
      name: "higher education profile",
      project: {
        title: "Gestão de Resíduos Sólidos",
        description: null,
        type: "HIGHER_EDUCATION_WORK",
        brief: {
          educationLevel: "HIGHER_EDUCATION",
          institutionName: "Universidade Eduardo Mondlane",
          facultyName: "Faculdade de Engenharia",
          courseName: "Engenharia Ambiental",
          studentName: "Maria Tomás",
          advisorName: "Dra. Paula Cossa",
          city: "Maputo",
          academicYear: 2026,
          studentNumber: "20260001",
        },
        sections: [
          { id: "cover", title: "Capa", content: "<div class='cover-page'>legacy</div>", order: 1 },
          { id: "title-page", title: "Folha de Rosto", content: "<div>legacy</div>", order: 2 },
          { id: "summary", title: "Resumo", content: "Resumo formal do trabalho.", order: 3 },
          { id: "intro", title: "1. Introdução", content: "Introdução académica.", order: 4 },
          {
            id: "references",
            title: "Referências",
            content: JSON.stringify([
              { type: "book", authors: "Mia Couto", title: "Terra Sonâmbula", year: "1992", publisher: "Ndjira" },
            ]),
            order: 5,
          },
        ],
      },
      mustContain: ["UNIVERSIDADE EDUARDO MONDLANE", "Faculdade de Engenharia", "Trabalho Académico", "Mia Couto"],
    },
  ] as const;

  for (const testCase of cases) {
    test(`generates a real docx without leaked front matter for ${testCase.name}`, async () => {
      const project = JSON.parse(JSON.stringify(testCase.project));
      const model = DocumentExportService.createModel(project);
      const buffer = await DocumentExportService.generateDocx(model);
      const { documentXml, rawText } = await extractDocxArtifacts(buffer);

      expect(rawText).toContain("ÍNDICE");
      expect(rawText).toMatch(/ÍNDICE[\s\S]*1\. Introdução/);
      expect(documentXml).not.toContain("TOC \\\\o");

      for (const expectedText of testCase.mustContain) {
        expect(rawText).toContain(expectedText);
      }

      expect(rawText).not.toContain("box-sizing");
      expect(rawText).not.toContain(".cover-page");
      expect(rawText).not.toContain("<style>");
      expect(rawText).not.toContain("Folha de Rosto legacy");
      expect(rawText).not.toContain("Capa legacy");
      expect(rawText).not.toContain("SECONDARY_WORK");
      expect(rawText).not.toContain("TECHNICAL_WORK");
      expect(rawText).not.toContain("HIGHER_EDUCATION_WORK");
    }, 20_000);
  }
});
