import type { CoverTemplate } from "@/types/editor";

export interface CoverData {
  title: string;
  type: string;
  institutionName?: string | null;
  courseName?: string | null;
  subjectName?: string | null;
  advisorName?: string | null;
  studentName?: string | null;
  city?: string | null;
  academicYear?: number | null;
  subtitle?: string | null;
}

export type CoverTemplateRenderer = (data: CoverData) => string;

const baseStyles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Times New Roman", Times, serif; }
  .cover-page {
    width: 210mm;
    min-height: 297mm;
    padding: 40mm 30mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
  }
  .center { text-align: center; }
  .spacer { flex: 1; }
  .field { margin: 8px 0; font-size: 12pt; line-height: 1.5; }
  .institution { font-size: 14pt; font-weight: bold; text-transform: uppercase; }
  .department { font-size: 12pt; }
  .title-main { font-size: 14pt; font-weight: bold; margin: 24px 0 8px; text-transform: uppercase; }
  .subtitle { font-size: 12pt; font-style: italic; }
  .type-label { font-size: 12pt; margin: 4px 0; }
  .author { font-size: 12pt; margin-top: 32px; }
  .advisor { font-size: 12pt; margin-top: 8px; }
  .location-year { font-size: 12pt; margin-top: 32px; }
  .divider { width: 60%; height: 1px; background: #000; margin: 16px auto; }
  .divider-double { width: 60%; height: 3px; border-top: 1px solid #000; border-bottom: 1px solid #000; margin: 16px auto; }
  .logo-placeholder {
    width: 80px; height: 80px;
    border: 1px dashed #999;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 9pt; color: #999;
    margin-bottom: 16px;
  }
  .accent-bar { width: 100%; height: 6px; background: #1D9E75; position: absolute; top: 0; left: 0; }
  .border-frame {
    border: 2px double #000;
    padding: 30mm 25mm;
    width: 210mm;
    min-height: 297mm;
  }
`;

function fallback(value: string | null | undefined, placeholder: string): string {
  return value || placeholder;
}

export function generateCoverHTML(template: CoverTemplate, data: CoverData): string {
  const renderer = renderers[template];
  if (!renderer) return renderers["UEM_STANDARD"](data);
  return renderer(data);
}

const renderers: Record<string, CoverTemplateRenderer> = {
  UEM_STANDARD(data) {
    return `<!DOCTYPE html>
<html lang="pt"><head><meta charset="utf-8"><style>${baseStyles}</style></head>
<body><div class="cover-page center">
  <div>
    <div class="logo-placeholder">Logo</div>
    <div class="institution">${fallback(data.institutionName, "Universidade Eduardo Mondlane")}</div>
    <div class="department">${fallback(data.courseName, "Faculdade / Departamento")}</div>
  </div>
  <div class="spacer"></div>
  <div>
    <div class="divider-double"></div>
    <div class="title-main">${data.title}</div>
    ${data.subtitle ? `<div class="subtitle">${data.subtitle}</div>` : ""}
    <div class="type-label">${data.type}</div>
    <div class="divider-double"></div>
  </div>
  <div class="spacer"></div>
  <div>
    <div class="author">${fallback(data.studentName, "Nome do Autor")}</div>
    <div class="advisor">${data.advisorName ? `Orientador: ${data.advisorName}` : ""}</div>
    <div class="location-year">${fallback(data.city, "Maputo")} — ${data.academicYear || new Date().getFullYear()}</div>
  </div>
</div></body></html>`;
  },

  UCM_STANDARD(data) {
    return `<!DOCTYPE html>
<html lang="pt"><head><meta charset="utf-8"><style>${baseStyles}</style></head>
<body><div class="cover-page center">
  <div>
    <div class="logo-placeholder">Brasão</div>
    <div class="institution">${fallback(data.institutionName, "Universidade Católica de Moçambique")}</div>
    <div class="department">${fallback(data.courseName, "Faculdade")}</div>
  </div>
  <div class="spacer"></div>
  <div>
    <div class="divider"></div>
    <p class="field">Em cumprimento parcial dos requisitos para obtenção do grau de</p>
    <p class="field" style="font-weight:500">${fallback(data.courseName, "Licenciatura")}</p>
    <div class="divider"></div>
    <div class="title-main">${data.title}</div>
    ${data.subtitle ? `<div class="subtitle">${data.subtitle}</div>` : ""}
  </div>
  <div class="spacer"></div>
  <div>
    <div class="author">${fallback(data.studentName, "Nome do Autor")}</div>
    <div class="advisor">${data.advisorName ? `Orientador: ${data.advisorName}` : ""}</div>
    <div class="location-year">${fallback(data.city, "Beira")} — ${data.academicYear || new Date().getFullYear()}</div>
  </div>
</div></body></html>`;
  },

  ISRI(data) {
    return `<!DOCTYPE html>
<html lang="pt"><head><meta charset="utf-8"><style>${baseStyles}</style></head>
<body><div class="cover-page center">
  <div>
    <p class="field" style="font-size:11pt">República de Moçambique</p>
    <div class="logo-placeholder">Logo</div>
    <div class="institution">${fallback(data.institutionName, "Instituto Superior de Relações Internacionais")}</div>
    <div class="department">${fallback(data.courseName, "Curso de Relações Internacionais")}</div>
  </div>
  <div class="spacer"></div>
  <div>
    <div class="divider-double"></div>
    <div class="title-main">${data.title}</div>
    ${data.subtitle ? `<div class="subtitle">${data.subtitle}</div>` : ""}
    <div class="type-label">${data.type}</div>
    <div class="divider-double"></div>
  </div>
  <div class="spacer"></div>
  <div>
    <div class="author">${fallback(data.studentName, "Nome do Autor")}</div>
    <div class="advisor">${data.advisorName ? `Orientador: ${data.advisorName}` : ""}</div>
    <div class="location-year">${fallback(data.city, "Maputo")} — ${data.academicYear || new Date().getFullYear()}</div>
  </div>
</div></body></html>`;
  },

  ABNT_GENERIC(data) {
    return `<!DOCTYPE html>
<html lang="pt"><head><meta charset="utf-8"><style>${baseStyles}
  .abnt-page {
    width: 210mm; min-height: 297mm;
    padding: 30mm 30mm 20mm 30mm;
    display: flex; flex-direction: column;
  }
  .abnt-center { text-align: center; margin: auto 0; }
  .abnt-bottom { margin-top: auto; text-align: center; }
</style></head>
<body><div class="abnt-page">
  <div class="abnt-center">
    <div class="institution">${fallback(data.institutionName, "Instituição")}</div>
    <div class="department">${fallback(data.courseName, "Curso")}</div>
    <div style="height:80px"></div>
    <div class="author" style="margin:0">${fallback(data.studentName, "Nome do Autor")}</div>
    <div style="height:60px"></div>
    <div class="title-main">${data.title}</div>
    ${data.subtitle ? `<div class="subtitle">${data.subtitle}</div>` : ""}
  </div>
  <div class="abnt-bottom">
    <div class="location-year">${fallback(data.city, "Maputo")}</div>
    <div class="field">${data.academicYear || new Date().getFullYear()}</div>
  </div>
</div></body></html>`;
  },

  MODERNA(data) {
    return `<!DOCTYPE html>
<html lang="pt"><head><meta charset="utf-8"><style>${baseStyles}
  .modern-page {
    width: 210mm; min-height: 297mm;
    display: flex; flex-direction: column;
    position: relative; overflow: hidden;
  }
  .accent-bar { width: 100%; height: 8px; background: #1D9E75; flex-shrink: 0; }
  .modern-body {
    flex: 1; display: flex; flex-direction: column;
    justify-content: center; align-items: center;
    padding: 40mm 30mm; text-align: center;
  }
  .modern-title {
    font-size: 16pt; font-weight: bold; color: #085041;
    margin-bottom: 12px; text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .modern-subtitle { font-size: 12pt; color: #555; font-style: italic; margin-bottom: 24px; }
  .modern-meta {
    font-size: 11pt; color: #666; margin-top: 4px;
  }
  .modern-accent-line {
    width: 40px; height: 3px; background: #1D9E75;
    margin: 16px auto;
  }
  .modern-footer {
    padding: 16px 30mm; border-top: 0.5px solid #e0e0e0;
    display: flex; justify-content: space-between;
    font-size: 10pt; color: #888;
  }
</style></head>
<body><div class="modern-page">
  <div class="accent-bar"></div>
  <div class="modern-body">
    <div class="modern-title">${data.title}</div>
    ${data.subtitle ? `<div class="modern-subtitle">${data.subtitle}</div>` : ""}
    <div class="modern-accent-line"></div>
    <div class="modern-meta">${data.type}</div>
    <div style="height:40px"></div>
    <div class="modern-meta">${fallback(data.studentName, "Autor")}</div>
    <div class="modern-meta">${fallback(data.institutionName, "")}</div>
  </div>
  <div class="modern-footer">
    <span>${fallback(data.city, "Maputo")}</span>
    <span>${data.academicYear || new Date().getFullYear()}</span>
  </div>
</div></body></html>`;
  },

  CLASSICA(data) {
    return `<!DOCTYPE html>
<html lang="pt"><head><meta charset="utf-8"><style>${baseStyles}
  .classical-page {
    width: 210mm; min-height: 297mm;
    padding: 20mm;
    display: flex; align-items: center; justify-content: center;
  }
  .classical-frame {
    border: 3px double #000;
    padding: 35mm 30mm;
    width: 100%; min-height: 240mm;
    display: flex; flex-direction: column;
    align-items: center; justify-content: space-between;
    text-align: center;
  }
  .classical-corner {
    width: 12px; height: 12px;
    border: 1.5px solid #000; position: absolute;
  }
</style></head>
<body><div class="classical-page">
  <div class="classical-frame" style="position:relative">
    <div class="classical-corner" style="top:12px;left:12px;border-right:0;border-bottom:0"></div>
    <div class="classical-corner" style="top:12px;right:12px;border-left:0;border-bottom:0"></div>
    <div class="classical-corner" style="bottom:12px;left:12px;border-right:0;border-top:0"></div>
    <div class="classical-corner" style="bottom:12px;right:12px;border-left:0;border-top:0"></div>
    <div>
      <div class="institution">${fallback(data.institutionName, "Instituição")}</div>
      <div class="department">${fallback(data.courseName, "")}</div>
    </div>
    <div>
      <div class="divider-double"></div>
      <div class="title-main">${data.title}</div>
      ${data.subtitle ? `<div class="subtitle">${data.subtitle}</div>` : ""}
      <div class="divider-double"></div>
    </div>
    <div>
      <div class="author">${fallback(data.studentName, "Autor")}</div>
      <div class="advisor">${data.advisorName ? `Orientador: ${data.advisorName}` : ""}</div>
      <div class="location-year">${fallback(data.city, "Maputo")} — ${data.academicYear || new Date().getFullYear()}</div>
    </div>
  </div>
</div></body></html>`;
  },
};
