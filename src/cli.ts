#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { Command, CommanderError } from "commander";
import { createDefaultRepoRadarConfig, scanProject } from "./scanner/scanProject";
import { assertDirectoryExists } from "./utils/fileUtils";
import { topPenaltySummaries } from "./utils/scoring";
import { runLauncher } from "./utils/launcher";

interface ScanCommandOptions {
  json?: boolean;
  output?: string;
  config?: string;
}

interface InitCommandOptions {
  force?: boolean;
}

function loadCliVersion(): string {
  const packageJsonPath = path.resolve(__dirname, "../package.json");
  try {
    const parsed = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as { version?: string };
    return parsed.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function printHumanSummary(targetPath: string, repoFacts: ReturnType<typeof scanProject>): void {
  const topIssues = repoFacts.issues.length > 0 ? repoFacts.issues.slice(0, 3) : topPenaltySummaries(repoFacts, 3);
  const topRisks = repoFacts.architectureRisks
    .slice(0, 3)
    .map((risk) => `${risk.severity.toUpperCase()}: ${risk.title}`);

  console.log(`RepoRadar AI scan completed for ${repoFacts.metadata.projectName}`);
  console.log(`Project type: ${repoFacts.projectType}`);
  console.log(`Architecture style: ${repoFacts.architecture.architectureStyle}`);
  console.log(`Frameworks: ${repoFacts.detectedFrameworks.join(", ") || "None detected"}`);
  console.log(`Config detected: ${repoFacts.config.configDetected ? "Yes" : "No"}`);
  console.log(`Config path: ${repoFacts.config.configPath ?? "Default root config lookup"}`);
  console.log(`Scan safety: max ${repoFacts.scanSafety.maxFiles} files, max ${repoFacts.scanSafety.maxFileSizeKb} KB, truncated ${repoFacts.scanSafety.truncated ? "yes" : "no"}`);
  console.log(`Skipped files/folders: ${repoFacts.scanSafety.skippedFiles}/${repoFacts.scanSafety.skippedFolders}`);
  console.log(`Module resolution: ${repoFacts.architecture.moduleResolution.aliases.length} alias pattern(s), ${repoFacts.architecture.moduleResolution.resolvedInternalImports} resolved internal import(s), ${repoFacts.architecture.moduleResolution.unresolvedInternalImports} unresolved`);
  if (repoFacts.architecture.moduleResolution.configFiles.length > 0) {
    console.log(`Alias config files: ${repoFacts.architecture.moduleResolution.configFiles.join(", ")}`);
  }
  if (repoFacts.monorepo.isMonorepo) {
    console.log("Monorepo: Yes");
    console.log(`Workspace manager: ${repoFacts.monorepo.workspaceManager ?? "Not detected"}`);
    console.log(`Detected apps count: ${repoFacts.monorepo.detectedApps.length}`);
    console.log(`Detected packages count: ${repoFacts.monorepo.detectedPackages.length}`);
  }
  if (repoFacts.ecosystems.python.detected) {
    console.log("Ecosystem: Python");
    console.log(`Detected Python framework: ${repoFacts.ecosystems.python.frameworks.join(", ") || "Not detected"}`);
  }
  if (repoFacts.architecture.entrypoints.length > 0 || repoFacts.architecture.routes.length > 0) {
    console.log(`Entrypoints count: ${repoFacts.architecture.entrypoints.length}`);
    console.log(`Routes count: ${repoFacts.architecture.routes.length}`);
    console.log(`Route sources: ${[...new Set(repoFacts.architecture.routes.map((route) => route.source))].join(", ") || "None"}`);
    console.log(`Data model sources: ${[...new Set(repoFacts.architecture.dataModels.map((model) => model.source))].join(", ") || "None"}`);
    console.log(`Detected layers: ${repoFacts.architecture.layers.map((layer) => layer.name).join(", ") || "None"}`);
    console.log(`Important files count: ${repoFacts.architecture.importantFiles.length}`);
    console.log(`Env variable names count: ${new Set(repoFacts.architecture.envUsage.map((usage) => usage.name)).size}`);
  }
  console.log(`Dependency graph: ${repoFacts.dependencyGraph.internalEdges.length} internal edges, ${repoFacts.dependencyGraph.externalPackages.length} external packages`);
  console.log(`Architecture risks count: ${repoFacts.architectureRisks.length}`);
  console.log(`Health endpoint detected: ${repoFacts.hasHealthEndpoint ? `Yes (${repoFacts.detectedHealthRoutes.join(", ")})` : "No"}`);
  console.log(`Health score: ${repoFacts.healthScore}/${repoFacts.healthDetails.maxScore}`);
  console.log(`Output directory: ${repoFacts.metadata.outputPath}`);
  console.log("Generated files:");
  for (const fileName of repoFacts.metadata.generatedFiles) {
    console.log(`- ${fileName}`);
  }
  console.log(`Top risks: ${topRisks.join(" | ") || "No major architecture risks detected."}`);
  console.log(`Top issues: ${topIssues.join(" | ") || "No major issues detected."}`);

  const criticalCount = repoFacts.improvementItems.filter((i) => i.severity === "critical").length;
  const warningCount = repoFacts.improvementItems.filter((i) => i.severity === "warning").length;
  const infoCount = repoFacts.improvementItems.filter((i) => i.severity === "info").length;
  const quickWins = repoFacts.improvementItems.filter((i) => i.effort === "low").length;

  if (repoFacts.improvementItems.length > 0) {
    console.log("");
    console.log("Actionable improvements:");
    console.log(`- Total items: ${repoFacts.improvementItems.length}`);
    console.log(`- Critical: ${criticalCount}`);
    console.log(`- Warnings: ${warningCount}`);
    console.log(`- Info: ${infoCount}`);
    console.log(`- Quick wins (low effort): ${quickWins}`);
    if (repoFacts.improvementItems.length > 0) {
      const first = repoFacts.improvementItems[0];
      console.log(`- Recommended first fix: ${first.id} - ${first.title}`);
    }
  }

  console.log("");
  console.log(`Next suggested command: reporadar scan ${path.normalize(targetPath)} --json`);
  console.log(`Direct JSON command: node dist/cli.js scan ${path.normalize(targetPath)} --json`);
}

function ensureSafeOutputDir(outputDir: string): string {
  const trimmed = outputDir.trim();
  if (!trimmed) {
    throw new Error("Output directory must be a non-empty path.");
  }

  return trimmed.replace(/\\/g, "/");
}

function runInitCommand(options: InitCommandOptions): void {
  const cwd = process.cwd();
  const configPath = path.join(cwd, "reporadar.config.json");
  if (fs.existsSync(configPath) && !options.force) {
    throw new Error(`Config already exists at ${configPath}. Re-run with --force to overwrite it.`);
  }

  const defaultConfig = createDefaultRepoRadarConfig();
  fs.writeFileSync(configPath, `${JSON.stringify(defaultConfig, null, 2)}\n`, "utf8");
  console.log(`Created starter config at ${configPath}`);
}

export function runCli(argv = process.argv): Promise<void> {
  const program = new Command();

  program
    .name("reporadar")
    .description("Deterministic repository intelligence scanner for demo-ready project reports")
    .version(loadCliVersion())
    .addHelpText(
      "after",
      "\nCreated by Abed — https://abud.fun",
    );

  program.configureOutput({
    writeOut: (output) => {
      console.log(output.trimEnd());
    },
    writeErr: (output) => {
      console.error(output.trimEnd());
    },
  });

  program
    .command("scan")
    .argument("<path>", "Path to the project to scan")
    .option("--json", "Print a machine-readable summary to stdout after generating reports")
    .option("--output <dir>", "Override the output directory inside the target repository")
    .option("--config <path>", "Use an explicit reporadar.config.json path")
    .description("Scan a repository and generate .reporadar outputs")
    .action((targetPath: string, options: ScanCommandOptions) => {
      const resolvedPath = assertDirectoryExists(targetPath);
      const repoFacts = scanProject(resolvedPath, {
        outputDir: options.output ? ensureSafeOutputDir(options.output) : undefined,
        configPath: options.config ? path.resolve(options.config) : undefined,
      });
      if (options.json) {
        console.log(JSON.stringify(repoFacts, null, 2));
        return;
      }

      printHumanSummary(targetPath, repoFacts);
    });

  program
    .command("init")
    .option("--force", "Overwrite an existing reporadar.config.json in the current directory")
    .description("Create a starter reporadar.config.json in the current directory")
    .action((options: InitCommandOptions) => {
      runInitCommand(options);
    });

  program
    .command("launch")
    .description("Interactive launcher: pick a project folder, scan it, and open reports")
    .action(() => {
      runLauncher();
    });

  program.exitOverride();

  return program.parseAsync(argv).then(() => undefined).catch((error: unknown) => {
    if (error instanceof CommanderError && ["commander.helpDisplayed", "commander.version"].includes(error.code)) {
      return undefined;
    }

    throw error;
  });
}

if (require.main === module) {
  runCli().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`RepoRadar AI failed: ${message}`);
    process.exitCode = 1;
  });
}
