import { generateCoverHTML } from "@/lib/cover-templates";
import type { CoverTemplate, WorkBriefInput } from "@/types/editor";

export function formatProjectType(type: string): string {
  const types: Record<string, string> = {
    SECONDARY_WORK: "Trabalho Escolar",
    TECHNICAL_WORK: "Trabalho Técnico",
    HIGHER_EDUCATION_WORK: "Trabalho Académico",
  };
  return types[type] || "Trabalho Académico";
}

export function generateCover(title: string, type: string, brief: WorkBriefInput) {
  const coverTemplate = brief.coverTemplate || "UEM_STANDARD";

  if (coverTemplate) {
    return generateCoverHTML(coverTemplate as CoverTemplate, {
      title,
      type: formatProjectType(type),
      institutionName: brief.institutionName,
      courseName: brief.courseName,
      subjectName: brief.subjectName,
      advisorName: brief.advisorName,
      studentName: brief.studentName,
      city: brief.city,
      academicYear: brief.academicYear,
      subtitle: brief.subtitle,
      className: brief.className,
      turma: brief.turma,
      facultyName: brief.facultyName,
      departmentName: brief.departmentName,
      studentNumber: brief.studentNumber,
      semester: brief.semester,
    });
  }

  const kind = formatProjectType(type).toUpperCase();
  const institution = brief.institutionName || "INSTITUIÇÃO DE ENSINO";
  const student = brief.studentName || "Nome do estudante";
  const advisor = brief.advisorName ? `Orientador: ${brief.advisorName}` : null;
  const city = brief.city || "Cidade";
  const year = brief.academicYear || new Date().getFullYear();
  const subtitle = brief.subtitle ? `\n${brief.subtitle}` : "";

  return [
    institution,
    brief.courseName || null,
    brief.subjectName || null,
    "",
    kind,
    "",
    `${title.toUpperCase()}${subtitle ? subtitle.toUpperCase() : ""}`,
    "",
    `Autor: ${student}`,
    advisor,
    "",
    `${city}`,
    `${year}`,
  ]
    .filter((line) => line !== null)
    .join("\n")
    .trim();
}

export function generateTitlePage(title: string, type: string, brief: WorkBriefInput) {
  const kind = formatProjectType(type);
  const institution = brief.institutionName || "INSTITUIÇÃO DE ENSINO";
  const faculty = brief.facultyName || "";
  const course = brief.courseName || "";
  const student = brief.studentName || "Nome do estudante";
  const studentNumber = brief.studentNumber ? `Nº ${brief.studentNumber}` : "";
  const advisor = brief.advisorName ? `Orientador: ${brief.advisorName}` : "";
  const city = brief.city || "Cidade";
  const year = brief.academicYear || new Date().getFullYear();
  const subtitle = brief.subtitle || "";

  return [
    `<div style="text-align: center; font-family: 'Times New Roman', serif; padding: 40mm 30mm; min-height: 297mm; display: flex; flex-direction: column; justify-content: space-between;">`,
    `<div>`,
    `<p style="font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 8px 0;">${institution}</p>`,
    faculty ? `<p style="font-size: 12pt; margin: 8px 0;">${faculty}</p>` : "",
    course ? `<p style="font-size: 12pt; margin: 8px 0;">${course}</p>` : "",
    `</div>`,
    `<div style="margin: 40px 0;">`,
    `<p style="font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 8px 0;">${title}</p>`,
    subtitle ? `<p style="font-size: 12pt; font-style: italic; margin: 8px 0;">${subtitle}</p>` : "",
    `<p style="font-size: 12pt; margin: 16px 0;">${kind}</p>`,
    `</div>`,
    `<div>`,
    `<p style="font-size: 12pt; margin: 8px 0;">${student} ${studentNumber}</p>`,
    advisor ? `<p style="font-size: 12pt; margin: 8px 0;">${advisor}</p>` : "",
    `</div>`,
    `<p style="font-size: 12pt; margin-top: 32px;">${city} — ${year}</p>`,
    `</div>`,
  ]
    .filter((line) => line !== "")
    .join("\n")
    .trim();
}
