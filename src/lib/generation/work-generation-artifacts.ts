import {
  formatCanonicalProjectType,
  resolveDocumentCourseLabel,
  resolveDocumentInstitutionName,
  resolveDocumentProfile,
  resolveDocumentReferenceMeta,
} from "@/lib/document-profile";
import type { WorkBriefInput } from "@/types/editor";

export interface FrontMatterPayload {
  version: 2;
  kind: "cover" | "title-page";
  profile: {
    educationLevel: string;
    projectType: string;
    displayTypeLabel: string;
    coverTemplate: string;
  };
  document: {
    title: string;
    subtitle?: string;
    institution: string;
    courseLabel: string;
    referenceMeta?: string | null;
    studentName: string;
    advisorName?: string;
    advisorLabel: string;
    city: string;
    academicYear: number;
  };
}

export function formatProjectType(type: string): string {
  return formatCanonicalProjectType(type);
}

function buildFrontMatterPayload(
  kind: FrontMatterPayload["kind"],
  title: string,
  type: string,
  brief: WorkBriefInput,
): FrontMatterPayload {
  const profile = resolveDocumentProfile({
    type,
    educationLevel: brief.educationLevel,
    institutionName: brief.institutionName,
    coverTemplate: brief.coverTemplate,
  });

  return {
    version: 2,
    kind,
    profile: {
      educationLevel: profile.educationLevel,
      projectType: profile.projectType,
      displayTypeLabel: profile.displayTypeLabel,
      coverTemplate: profile.coverTemplate,
    },
    document: {
      title,
      subtitle: brief.subtitle,
      institution: resolveDocumentInstitutionName(profile, brief),
      courseLabel: resolveDocumentCourseLabel(profile, brief),
      referenceMeta: resolveDocumentReferenceMeta(profile, brief),
      studentName: brief.studentName || "Nome do estudante",
      advisorName: brief.advisorName,
      advisorLabel: profile.coverFieldPolicy.advisorLabel,
      city: brief.city || "Maputo",
      academicYear: brief.academicYear || new Date().getFullYear(),
    },
  };
}

export function generateCover(title: string, type: string, brief: WorkBriefInput) {
  return JSON.stringify(buildFrontMatterPayload("cover", title, type, brief));
}

export function generateTitlePage(title: string, type: string, brief: WorkBriefInput) {
  const profile = resolveDocumentProfile({
    type,
    educationLevel: brief.educationLevel,
    institutionName: brief.institutionName,
    coverTemplate: brief.coverTemplate,
  });

  if (!profile.frontMatterPolicy.includeTitlePage) {
    return "";
  }

  return JSON.stringify(buildFrontMatterPayload("title-page", title, type, brief));
}
