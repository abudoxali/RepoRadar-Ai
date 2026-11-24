import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../src/cli";
import { copyFixture, cleanupFixture } from "./helpers/fixtureHarness";

const cleanupTargets: string[] = [];
const tempRoots: string[] = [];
const originalCwd = process.cwd();

afterEach(() => {
  vi.restoreAllMocks();
  process.chdir(originalCwd);
  while (cleanupTargets.length > 0) {
    const target = cleanupTargets.pop();
    if (target) {
      cleanupFixture(target);
    }
  }
  while (tempRoots.length > 0) {
    const tempRoot = tempRoots.pop();
    if (tempRoot) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }
});

describe("phase 2F release readiness", () => {
  it("supports help and version output", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await runCli(["node", "reporadar", "--help"]);
    const helpOutput = logSpy.mock.calls.map((call) => String(call[0])).join("\n");
    expect(helpOutput).toContain("Usage:");
    expect(helpOutput).toContain("scan");
    expect(helpOutput).toContain("init");
    expect(helpOutput).toContain("launch");

    logSpy.mockClear();
    await runCli(["node", "reporadar", "--version"]);
    expect(logSpy.mock.calls.map((call) => String(call[0])).join("\n").trim()).toBe("0.2.0");
  });

  it("supports --output and --config scan options", async () => {
    const outputFixturePath = copyFixture("backend-express");
    const configFixturePath = copyFixture("config-custom-output");
    cleanupTargets.push(outputFixturePath, configFixturePath);

    const outputLogSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await runCli(["node", "reporadar", "scan", outputFixturePath, "--output", "demo-output"]);
    expect(fs.existsSync(path.join(outputFixturePath, "demo-output", "repo-facts.json"))).toBe(true);
    expect(outputLogSpy.mock.calls.map((call) => String(call[0])).join("\n")).toContain("Output directory:");

    outputLogSpy.mockClear();
    await runCli([
      "node",
      "reporadar",
      "scan",
      configFixturePath,
      "--config",
      path.join(configFixturePath, "reporadar.config.json"),
      "--json",
    ]);
    const parsed = JSON.parse(outputLogSpy.mock.calls.map((call) => String(call[0])).join("\n")) as {
      config: { configDetected: boolean; outputDir: string; configPath: string | null };
    };
    expect(parsed.config.configDetected).toBe(true);
    expect(parsed.config.outputDir).toBe(".custom-radar");
    expect(parsed.config.configPath).toContain("reporadar.config.json");
    expect(fs.existsSync(path.join(configFixturePath, ".custom-radar", "repo-facts.json"))).toBe(true);
  });

  it("creates a starter config and refuses overwrite without force", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "reporadar-init-"));
    tempRoots.push(tempRoot);
    process.chdir(tempRoot);

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await runCli(["node", "reporadar", "init"]);
    const configPath = path.join(tempRoot, "reporadar.config.json");
    expect(fs.existsSync(configPath)).toBe(true);
    const createdConfig = JSON.parse(fs.readFileSync(configPath, "utf8")) as {
      reports: { techStack?: boolean };
    };
    expect(createdConfig.reports.techStack).toBe(true);

    await expect(runCli(["node", "reporadar", "init"])).rejects.toThrow(/--force/);

    fs.writeFileSync(configPath, "{\n  \"projectName\": \"forced\"\n}\n", "utf8");
    await runCli(["node", "reporadar", "init", "--force"]);
    const overwrittenConfig = JSON.parse(fs.readFileSync(configPath, "utf8")) as {
      outputDir: string;
    };
    expect(overwrittenConfig.outputDir).toBe(".reporadar");
    expect(logSpy.mock.calls.map((call) => String(call[0])).join("\n")).toContain("Created starter config");
  });

  it("commits demo example outputs with sanitized paths", () => {
    const examplesRoot = path.resolve("examples/sample-project-output");
    const expectedFiles = [
      "repo-facts.json",
      "PROJECT_REPORT.md",
      "ARCHITECTURE.md",
      "TECH_STACK.md",
      "SECURITY_NOTES.md",
      "README_SUGGESTION.md",
      "AI_AGENT_PROMPT.md",
      "LINKEDIN_POST.md",
      "PORTFOLIO_CASE_STUDY.md",
    ];

    for (const fileName of expectedFiles) {
      expect(fs.existsSync(path.join(examplesRoot, fileName))).toBe(true);
    }

    const repoFacts = JSON.parse(fs.readFileSync(path.join(examplesRoot, "repo-facts.json"), "utf8")) as {
      metadata: { rootPath: string; outputPath: string };
    };
    expect(repoFacts.metadata.rootPath).toBe("<sample-project>");
    expect(repoFacts.metadata.outputPath).toBe("<sample-project>/.reporadar");
  });

  it("keeps package metadata and dry-run scripts release-ready", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8")) as {
      name: string;
      version: string;
      files: string[];
      scripts: Record<string, string>;
      sideEffects: boolean;
      author: string;
    };

    expect(pkg.name).toBe("reporadar-ai");
    expect(pkg.version).toBe("0.2.0");
    expect(pkg.files).toEqual(expect.arrayContaining(["dist", "examples", "docs", "CHANGELOG.md", "CONTRIBUTING.md"]));
    expect(pkg.scripts.validate).toContain("typecheck");
    expect(pkg.scripts["pack:dry-run"]).toBe("npm pack --dry-run");
    expect(pkg.sideEffects).toBe(false);
    expect(pkg.author).toMatch(/^Abed/);
  });
});
