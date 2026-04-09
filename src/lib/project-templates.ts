import {
  resolveDocumentProfile,
  type DocumentSectionTemplate as ProjectSectionTemplate,
} from "@/lib/document-profile";

export type { ProjectSectionTemplate };

export function getSectionsForEducationLevel(
  educationLevel: string | null | undefined,
  projectType: string,
): ProjectSectionTemplate[] {
  return resolveDocumentProfile({
    educationLevel,
    type: projectType,
  }).sections;
}
