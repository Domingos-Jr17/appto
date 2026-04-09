import { describe, expect, test } from "bun:test";

import {
  isWorkspaceRoute,
  shouldPauseNonCriticalAppFetch,
} from "@/lib/app-shell-fetch-policy";

describe("app shell fetch policy", () => {
  test("detects workspace routes", () => {
    expect(isWorkspaceRoute("/app/trabalhos/abc123")).toBe(true);
    expect(isWorkspaceRoute("/app/trabalhos")).toBe(false);
    expect(isWorkspaceRoute("/app")).toBe(false);
  });

  test("pauses non-critical fetches inside the workspace route", () => {
    expect(shouldPauseNonCriticalAppFetch("/app/trabalhos/abc123")).toBe(true);
    expect(shouldPauseNonCriticalAppFetch("/app/subscription")).toBe(false);
  });
});
