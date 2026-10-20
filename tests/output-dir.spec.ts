import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { scanProject } from "../src/scanner/scanProject";
import { cleanupFixture, copyFixture } from "./helpers/fixtureHarness";

const cleanupTargets: string[] = [];
const tempDirs: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  while (cleanupTargets.length > 0) {
    const target = cleanupTargets.pop();
    if (target) {
      cleanupFixture(target);
    }
  }
});

describe("--output directory handling", () => {
  it("writes to an explicit absolute --output outside the scanned repository", () => {
    const fixturePath = copyFixture("cli-tool");
    cleanupTargets.push(fixturePath);
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "reporadar-out-"));
    tempDirs.push(outside);

    const repoFacts = scanProject(fixturePath, { outputDir: outside });

    expect(path.resolve(repoFacts.metadata.outputPath)).toBe(path.resolve(outside));
    expect(fs.existsSync(path.join(outside, "PROJECT_REPORT.md"))).toBe(true);
    expect(fs.existsSync(path.join(fixturePath, ".reporadar"))).toBe(false);
  });

  it("does not let a repository's own config write outside the repository", () => {
    const fixturePath = copyFixture("cli-tool");
    cleanupTargets.push(fixturePath);
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "reporadar-escape-"));
    tempDirs.push(outside);
    fs.writeFileSync(path.join(fixturePath, "reporadar.config.json"), JSON.stringify({ outputDir: outside }));
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const repoFacts = scanProject(fixturePath);

    expect(repoFacts.config.outputDir).toBe(".reporadar");
    expect(fs.readdirSync(outside)).toHaveLength(0);
  });

  it("reports a rejected relative --output instead of falling back silently", () => {
    const fixturePath = copyFixture("cli-tool");
    cleanupTargets.push(fixturePath);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const repoFacts = scanProject(fixturePath, { outputDir: "../escape" });

    expect(repoFacts.config.outputDir).toBe(".reporadar");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("outputDir must stay inside the scanned repository"));
  });
});
