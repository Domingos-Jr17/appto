import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");
const standaloneNextDir = path.join(standaloneDir, ".next");
const staticSourceDir = path.join(root, ".next", "static");
const staticTargetDir = path.join(standaloneNextDir, "static");
const publicSourceDir = path.join(root, "public");
const publicTargetDir = path.join(standaloneDir, "public");

if (!existsSync(standaloneDir)) {
  throw new Error("Standalone output not found. Run `next build` first.");
}

mkdirSync(standaloneNextDir, { recursive: true });

if (existsSync(staticSourceDir)) {
  cpSync(staticSourceDir, staticTargetDir, { recursive: true });
}

if (existsSync(publicSourceDir)) {
  cpSync(publicSourceDir, publicTargetDir, { recursive: true });
}
