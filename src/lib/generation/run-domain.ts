export type GenerationRunStatus = "QUEUED" | "GENERATING" | "READY" | "FAILED" | "NEEDS_REVIEW";
export type GenerationAttemptStatus = "QUEUED" | "GENERATING" | "COMPLETED" | "FAILED";
export type SectionRunStatus = "PENDING" | "STREAMING" | "COMPLETED" | "FAILED";

export interface GenerationTrackedSection {
  sectionId?: string | null;
  title: string;
  order: number;
}

function normalizeKeySegment(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function buildGenerationSectionKey(section: GenerationTrackedSection) {
  const normalized = normalizeKeySegment(section.title) || "section";
  return `${String(section.order).padStart(3, "0")}:${normalized}`;
}

export function buildTrackedSections(
  sections: GenerationTrackedSection[],
): Array<GenerationTrackedSection & { stableKey: string }> {
  return sections
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((section) => ({
      ...section,
      stableKey: buildGenerationSectionKey(section),
    }));
}

export function isTransientGenerationFailure(message?: string | null) {
  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();
  return ["timeout", "timed out", "rate limit", "429", "502", "503", "504", "temporarily unavailable"].some((token) =>
    normalized.includes(token),
  );
}
