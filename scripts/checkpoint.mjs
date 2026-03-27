#!/usr/bin/env bun

import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "fs";
import { join } from "path";

const AI_DIR = join(process.cwd(), ".ai");
const LOG_FILE = join(AI_DIR, "checkpoints.log");
const MAX_CHECKPOINTS = 5;

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

function ensureDir() {
  if (!existsSync(AI_DIR)) mkdirSync(AI_DIR, { recursive: true });
}

function readCheckpoints() {
  if (!existsSync(LOG_FILE)) return [];
  return readFileSync(LOG_FILE, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [timestamp, name, sha, testPassed, testTotal, coverage, buildStatus] = line.split(" | ");
      return { timestamp, name, sha, testPassed, testTotal, coverage, buildStatus };
    });
}

function writeCheckpoints(checkpoints) {
  const content = checkpoints
    .map((cp) =>
      [cp.timestamp, cp.name, cp.sha, cp.testPassed, cp.testTotal, cp.coverage, cp.buildStatus].join(" | ")
    )
    .join("\n");
  writeFileSync(LOG_FILE, content + "\n");
}

function getTestResults() {
  try {
    const output = run("bun run test:unit 2>&1");
    const passMatch = output.match(/(\d+)\s+pass/);
    const failMatch = output.match(/(\d+)\s+fail/);
    const passed = passMatch ? parseInt(passMatch[1]) : 0;
    const failed = failMatch ? parseInt(failMatch[1]) : 0;
    return { passed: String(passed), total: String(passed + failed) };
  } catch (e) {
    const output = e.stdout || e.stderr || "";
    const passMatch = output.match(/(\d+)\s+pass/);
    const failMatch = output.match(/(\d+)\s+fail/);
    const passed = passMatch ? parseInt(passMatch[1]) : 0;
    const failed = failMatch ? parseInt(failMatch[1]) : 0;
    return { passed: String(passed), total: String(passed + failed) };
  }
}

function getBuildStatus() {
  try {
    run("bun run typecheck");
    return "PASS";
  } catch {
    return "FAIL";
  }
}

function createCheckpoint(name) {
  ensureDir();

  if (!name) {
    console.error("Error: Checkpoint name required. Usage: checkpoint create <name>");
    process.exit(1);
  }

  const existing = readCheckpoints();
  if (existing.find((cp) => cp.name === name)) {
    console.error(`Error: Checkpoint "${name}" already exists.`);
    process.exit(1);
  }

  console.log(`\nCreating checkpoint: ${name}\n`);

  const status = run("git status --porcelain");
  if (status) {
    console.log("Working tree has changes. Creating stash checkpoint...");
    run(`git stash push -m "checkpoint: ${name}"`);
  }

  const sha = run("git rev-parse --short HEAD");
  const timestamp = new Date().toISOString().replace("T", "-").slice(0, 16);

  console.log("Running typecheck...");
  const buildStatus = getBuildStatus();

  console.log("Running tests...");
  const tests = getTestResults();

  const coverage = "n/a";

  const entry = {
    timestamp,
    name,
    sha,
    testPassed: tests.passed,
    testTotal: tests.total,
    coverage,
    buildStatus,
  };

  appendFileSync(LOG_FILE, [entry.timestamp, entry.name, entry.sha, entry.testPassed, entry.testTotal, entry.coverage, entry.buildStatus].join(" | ") + "\n");

  console.log(`\nCHECKPOINT CREATED: ${name}`);
  console.log("============================");
  console.log(`SHA:       ${sha}`);
  console.log(`Time:      ${timestamp}`);
  console.log(`Tests:     ${tests.passed}/${tests.total} passed`);
  console.log(`Build:     ${buildStatus}`);
  console.log("");
}

function verifyCheckpoint(name) {
  if (!name) {
    console.error("Error: Checkpoint name required. Usage: checkpoint verify <name>");
    process.exit(1);
  }

  const checkpoints = readCheckpoints();
  const cp = checkpoints.find((c) => c.name === name);
  if (!cp) {
    console.error(`Error: Checkpoint "${name}" not found.`);
    console.log("\nAvailable checkpoints:");
    listCheckpoints();
    process.exit(1);
  }

  console.log(`\nVerifying checkpoint: ${name}\n`);

  const currentSha = run("git rev-parse --short HEAD");
  const filesChanged = run(`git diff --name-only ${cp.sha}..HEAD`).split("\n").filter(Boolean);
  const filesAdded = run(`git diff --name-only --diff-filter=A ${cp.sha}..HEAD`).split("\n").filter(Boolean);
  const filesModified = run(`git diff --name-only --diff-filter=M ${cp.sha}..HEAD`).split("\n").filter(Boolean);
  const filesDeleted = run(`git diff --name-only --diff-filter=D ${cp.sha}..HEAD`).split("\n").filter(Boolean);

  console.log("Running current tests...");
  const currentTests = getTestResults();
  console.log("Running typecheck...");
  const currentBuild = getBuildStatus();

  const testDelta = parseInt(currentTests.passed) - parseInt(cp.testPassed);
  const _failDelta = parseInt(currentTests.total) - parseInt(currentTests.passed) - (parseInt(cp.testTotal) - parseInt(cp.testPassed));

  console.log(`\nCHECKPOINT COMPARISON: ${name}`);
  console.log("============================");
  console.log(`SHA:         ${cp.sha} -> ${currentSha}`);
  console.log(`Files added:     ${filesAdded.length}`);
  console.log(`Files modified:  ${filesModified.length}`);
  console.log(`Files deleted:   ${filesDeleted.length}`);
  console.log(`Tests:       ${testDelta >= 0 ? "+" : ""}${testDelta} passed`);
  console.log(`Build:       ${cp.buildStatus} -> ${currentBuild}`);
  console.log("");

  if (filesChanged.length > 0) {
    console.log("Changed files:");
    filesChanged.forEach((f) => console.log(`  ${f}`));
    console.log("");
  }
}

function listCheckpoints() {
  const checkpoints = readCheckpoints();
  const currentSha = run("git rev-parse --short HEAD");

  if (checkpoints.length === 0) {
    console.log("No checkpoints found.");
    return;
  }

  console.log("\nCHECKPOINTS");
  console.log("===========");
  console.log(
    "Name".padEnd(25) + "Timestamp".padEnd(20) + "SHA".padEnd(10) + "Tests".padEnd(12) + "Build".padEnd(8) + "Status"
  );
  console.log("-".repeat(85));

  checkpoints.forEach((cp) => {
    const status = cp.sha === currentSha ? "current" : "behind";
    console.log(
      cp.name.padEnd(25) +
        cp.timestamp.padEnd(20) +
        cp.sha.padEnd(10) +
        `${cp.testPassed}/${cp.testTotal}`.padEnd(12) +
        cp.buildStatus.padEnd(8) +
        status
    );
  });
  console.log("");
}

function clearCheckpoints() {
  ensureDir();
  const checkpoints = readCheckpoints();
  if (checkpoints.length <= MAX_CHECKPOINTS) {
    console.log(`Nothing to clear. ${checkpoints.length} checkpoints (max kept: ${MAX_CHECKPOINTS}).`);
    return;
  }
  const kept = checkpoints.slice(-MAX_CHECKPOINTS);
  writeCheckpoints(kept);
  const removed = checkpoints.length - kept.length;
  console.log(`Cleared ${removed} old checkpoint(s). Kept last ${MAX_CHECKPOINTS}.`);
}

// Main
const [action, ...rest] = process.argv.slice(2);
const name = rest.join(" ");

switch (action) {
  case "create":
    createCheckpoint(name);
    break;
  case "verify":
    verifyCheckpoint(name);
    break;
  case "list":
    listCheckpoints();
    break;
  case "clear":
    clearCheckpoints();
    break;
  default:
    console.log("Usage: bun scripts/checkpoint.mjs <create|verify|list|clear> [name]");
    process.exit(1);
}
