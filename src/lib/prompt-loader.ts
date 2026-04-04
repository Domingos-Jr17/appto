import "server-only";

import fs from "node:fs";
import path from "node:path";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const PROMPTS_DIR = path.join(process.cwd(), "src", "prompts", "v3.1");

interface PromptCache {
  content: string;
  lastModified: number;
  validated: boolean;
}

const cache = new Map<string, PromptCache>();

const REQUIRED_SECTIONS: Record<string, string[]> = {
  "system-prompt.md": ["Regra de Recusa Explícita", "Expressões Proibidas", "Regras de Dados Não Confiáveis", "Few-Shot Examples"],
  "education-secondary.md": ["Regras"],
  "education-technical.md": ["Regras"],
  "education-higher.md": ["Regras obrigatórias"],
};

function validatePromptContent(filename: string, content: string): string[] {
  const required = REQUIRED_SECTIONS[filename];
  if (!required) return [];

  return required.filter((section) => !content.includes(section));
}

function readPromptFile(filename: string): string | null {
  try {
    const fullPath = path.join(PROMPTS_DIR, filename);
    const stat = fs.statSync(fullPath);
    const cached = cache.get(filename);

    if (cached && cached.lastModified === stat.mtimeMs) {
      return cached.content;
    }

    const content = fs.readFileSync(fullPath, "utf-8");
    const missingSections = validatePromptContent(filename, content);

    if (missingSections.length > 0) {
      const message = `Prompt file "${filename}" is missing required sections: ${missingSections.join(", ")}`;
      if (env.isDevelopment) {
        logger.warn(message);
      } else {
        logger.error(message);
      }
    }

    cache.set(filename, { content, lastModified: stat.mtimeMs, validated: true });
    return content;
  } catch {
    const message = `Prompt file "${filename}" not found — using inline fallback`;
    if (env.isDevelopment) {
      logger.warn(message);
    } else {
      logger.error(message);
    }
    return null;
  }
}

export function getSystemPromptMarkdown(): string | null {
  return readPromptFile("system-prompt.md");
}

export function getEducationPromptMarkdown(level: string): string | null {
  const fileMap: Record<string, string> = {
    SECONDARY: "education-secondary.md",
    TECHNICAL: "education-technical.md",
    HIGHER_EDUCATION: "education-higher.md",
  };

  const filename = fileMap[level];
  if (!filename) return null;

  return readPromptFile(filename);
}

export function clearPromptCache(): void {
  cache.clear();
}

export function getPromptValidationReport(): { file: string; missingSections: string[]; exists: boolean }[] {
  const report: { file: string; missingSections: string[]; exists: boolean }[] = [];

  for (const [filename, requiredSections] of Object.entries(REQUIRED_SECTIONS)) {
    const content = readPromptFile(filename);
    if (!content) {
      report.push({ file: filename, missingSections: requiredSections, exists: false });
    } else {
      const missing = requiredSections.filter((section) => !content.includes(section));
      report.push({ file: filename, missingSections: missing, exists: true });
    }
  }

  return report;
}
