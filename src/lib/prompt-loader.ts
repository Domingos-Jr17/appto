import "server-only";

import fs from "node:fs";
import path from "node:path";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const PROMPTS_DIR = path.join(process.cwd(), "src", "prompts", "v3.1");

interface PromptCache {
  content: string;
  lastModified: number;
}

const cache = new Map<string, PromptCache>();

function readPromptFile(filename: string): string | null {
  try {
    const fullPath = path.join(PROMPTS_DIR, filename);
    const stat = fs.statSync(fullPath);
    const cached = cache.get(filename);

    if (cached && cached.lastModified === stat.mtimeMs) {
      return cached.content;
    }

    const content = fs.readFileSync(fullPath, "utf-8");
    cache.set(filename, { content, lastModified: stat.mtimeMs });
    return content;
  } catch {
    if (env.isDevelopment) {
      logger.warn("Prompt file not found, using fallback", { filename });
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
