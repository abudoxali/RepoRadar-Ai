import fs from "node:fs";
import path from "node:path";
import type {
  PackageJsonLike,
  RepoConfigInfo,
  RepoFacts,
  RepoRadarConfig,
  ResolvedReportSelection,
  ScanContext,
  ScanOptions,
  SkippedReasonSummary,
} from "../types/repoFacts";
import {
  DEFAULT_IGNORED_DIRECTORIES,
  DEFAULT_MAX_FILES,
  DEFAULT_MAX_FILE_SIZE_KB,
  assertDirectoryExists,
  collectProjectFiles,
  ensureDirectory,
  findImportantConfigFiles,
  getMainFolders,
  mergeScanSafety,
  readJsonFile,
  readTextFileIfSafe,
  toRelativePosix,
} from "../utils/fileUtils";
import { buildRepoFacts } from "./buildRepoFacts";
import { writeReports } from "../reports/writeReports";

const CONFIG_FILE_NAME = "reporadar.config.json";

const DEFAULT_REPORT_SELECTION: ResolvedReportSelection = {
  project: true,
  architecture: true,
  techStack: true,
  security: true,
  readme: true,
  agentPrompt: true,
  linkedin: true,
  portfolio: true,
  fixPlan: true,
  quickWins: true,
  githubIssues: true,
  agentFixPrompt: true,
};

interface ValidatedConfigResult {
  projectName: string | null;
  includePatterns: string[];
  excludePatterns: string[];
  maxFiles: number;
  maxFileSizeKb: number;
  outputDir: string;
  reports: ResolvedReportSelection;
  configPath: string | null;
  configDetected: boolean;
  configWarnings: string[];
}

function loadPackageJson(rootPath: string): PackageJsonLike | null {
  return readJsonFile<PackageJsonLike>(path.join(rootPath, "package.json"));
}

function createSkipReasonTracker(): { add: (reason: string, count?: number) => void; toArray: () => SkippedReasonSummary[] } {
  const counts = new Map<string, number>();

  return {
    add(reason: string, count = 1) {
      counts.set(reason, (counts.get(reason) ?? 0) + count);
    },
    toArray() {
      return [...counts.entries()]
        .map(([reason, count]) => ({ reason, count }))
        .sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason));
    },
  };
}

function normalizePatterns(value: unknown, fieldName: "include" | "exclude", warnings: string[]): string[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    warnings.push(`${fieldName} must be an array of glob-like strings; defaults were used.`);
    return [];
  }

  const normalized = value
    .filter((item) => typeof item === "string")
    .map((item) => item.replace(/\\/g, "/").trim())
    .filter(Boolean);

  if (normalized.length !== value.length) {
    warnings.push(`${fieldName} contained non-string values; invalid entries were ignored.`);
  }

  return [...new Set(normalized)];
}

/**
 * Resolves where reports are written.
 * - A config file may only point inside the scanned repository (a scanned repo must not be able
 *   to make RepoRadar write elsewhere on the machine).
 * - An explicit `--output` flag may also be an absolute path, so a third-party repository can be
 *   scanned without writing into it.
 */
function normalizeOutputDir(value: unknown, warnings: string[], allowAbsolute = false): string {
  if (value === undefined) {
    return ".reporadar";
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    warnings.push("outputDir must be a non-empty relative path; defaulting to .reporadar.");
    return ".reporadar";
  }

  if (allowAbsolute && path.isAbsolute(value.trim())) {
    return path.resolve(value.trim());
  }

  const normalized = value.replace(/\\/g, "/").trim().replace(/^\.\/+/, "");
  if (path.isAbsolute(normalized) || normalized.startsWith("../") || normalized.includes("/../") || normalized === "..") {
    warnings.push("outputDir must stay inside the scanned repository; defaulting to .reporadar.");
    return ".reporadar";
  }

  return normalized;
}

function normalizePositiveInteger(
  value: unknown,
  fieldName: "maxFiles" | "maxFileSizeKb",
  fallback: number,
  warnings: string[],
): number {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    warnings.push(`${fieldName} must be a positive integer; default ${fallback} was used.`);
    return fallback;
  }

  return value;
}

function normalizeReports(value: unknown, warnings: string[]): ResolvedReportSelection {
  if (value === undefined) {
    return { ...DEFAULT_REPORT_SELECTION };
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    warnings.push("reports must be an object of boolean flags; default report selection was used.");
    return { ...DEFAULT_REPORT_SELECTION };
  }

  const raw = value as Record<string, unknown>;
  const reportSelection = { ...DEFAULT_REPORT_SELECTION };
  const mappings: Array<[keyof ResolvedReportSelection, string]> = [
    ["project", "project"],
    ["architecture", "architecture"],
    ["techStack", "techStack"],
    ["security", "security"],
    ["readme", "readme"],
    ["agentPrompt", "agentPrompt"],
    ["linkedin", "linkedin"],
    ["portfolio", "portfolio"],
    ["fixPlan", "fixPlan"],
    ["quickWins", "quickWins"],
    ["githubIssues", "githubIssues"],
    ["agentFixPrompt", "agentFixPrompt"],
  ];

  for (const [targetKey, rawKey] of mappings) {
    const entry = raw[rawKey];
    if (entry === undefined) {
      continue;
    }

    if (typeof entry !== "boolean") {
      warnings.push(`reports.${rawKey} must be boolean; default value was used.`);
      continue;
    }

    reportSelection[targetKey] = entry;
  }

  return reportSelection;
}

function resolveConfigLocation(rootPath: string, explicitConfigPath?: string): string {
  if (!explicitConfigPath) {
    return path.join(rootPath, CONFIG_FILE_NAME);
  }

  const resolved = path.resolve(explicitConfigPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Config path does not exist: ${resolved}`);
  }

  if (!fs.statSync(resolved).isFile()) {
    throw new Error(`Config path is not a file: ${resolved}`);
  }

  return resolved;
}

function validateConfig(rootPath: string, options: ScanOptions = {}): ValidatedConfigResult {
  const configPath = resolveConfigLocation(rootPath, options.configPath);
  if (!fs.existsSync(configPath)) {
    // Kept (not discarded) so a rejected --output is reported instead of silently falling back.
    const noConfigWarnings: string[] = [];
    return {
      projectName: null,
      includePatterns: [],
      excludePatterns: [],
      maxFiles: DEFAULT_MAX_FILES,
      maxFileSizeKb: DEFAULT_MAX_FILE_SIZE_KB,
      outputDir: normalizeOutputDir(options.outputDir, noConfigWarnings, true),
      reports: { ...DEFAULT_REPORT_SELECTION },
      configPath: null,
      configDetected: false,
      configWarnings: noConfigWarnings,
    };
  }

  const warnings: string[] = [];

  let parsed: RepoRadarConfig | null = null;
  try {
    parsed = JSON.parse(fs.readFileSync(configPath, "utf8")) as RepoRadarConfig;
  } catch {
    warnings.push("Config file could not be parsed as valid JSON; all defaults were used.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      projectName: null,
      includePatterns: [],
      excludePatterns: [],
      maxFiles: DEFAULT_MAX_FILES,
      maxFileSizeKb: DEFAULT_MAX_FILE_SIZE_KB,
      outputDir: normalizeOutputDir(options.outputDir, warnings, true),
      reports: { ...DEFAULT_REPORT_SELECTION },
      configPath,
      configDetected: true,
      configWarnings: warnings,
    };
  }

  const projectName = typeof parsed.projectName === "string" && parsed.projectName.trim().length > 0
    ? parsed.projectName.trim()
    : null;
  if (parsed.projectName !== undefined && projectName === null) {
    warnings.push("projectName must be a non-empty string; the detected project name was kept.");
  }

  // Only the explicit CLI flag may leave the repository; the repo's own config may not.
  const outputDir = options.outputDir !== undefined
    ? normalizeOutputDir(options.outputDir, warnings, true)
    : normalizeOutputDir(parsed.outputDir, warnings);

  return {
    projectName,
    includePatterns: normalizePatterns(parsed.include, "include", warnings),
    excludePatterns: normalizePatterns(parsed.exclude, "exclude", warnings),
    maxFiles: normalizePositiveInteger(parsed.maxFiles, "maxFiles", DEFAULT_MAX_FILES, warnings),
    maxFileSizeKb: normalizePositiveInteger(parsed.maxFileSizeKb, "maxFileSizeKb", DEFAULT_MAX_FILE_SIZE_KB, warnings),
    outputDir,
    reports: normalizeReports(parsed.reports, warnings),
    configPath,
    configDetected: true,
    configWarnings: warnings,
  };
}

function buildConfigInfo(validatedConfig: ValidatedConfigResult): RepoConfigInfo {
  const outputDir = validatedConfig.outputDir.replace(/\\/g, "/");
  const appliedExcludePatterns = [...validatedConfig.excludePatterns];

  if (!appliedExcludePatterns.includes(outputDir)) {
    appliedExcludePatterns.push(outputDir);
  }
  if (!appliedExcludePatterns.includes(`${outputDir}/**`)) {
    appliedExcludePatterns.push(`${outputDir}/**`);
  }

  return {
    configDetected: validatedConfig.configDetected,
    configPath: validatedConfig.configPath,
    configWarnings: validatedConfig.configWarnings,
    appliedIncludePatterns: validatedConfig.includePatterns,
    appliedExcludePatterns,
    outputDir,
    maxFiles: validatedConfig.maxFiles,
    maxFileSizeKb: validatedConfig.maxFileSizeKb,
    reports: validatedConfig.reports,
  };
}

export function createScanContext(rootPath: string, options: ScanOptions = {}): ScanContext {
  const normalizedRoot = assertDirectoryExists(rootPath);
  const validatedConfig = validateConfig(normalizedRoot, options);
  const config = buildConfigInfo(validatedConfig);

  if (config.configWarnings.length > 0) {
    for (const warning of config.configWarnings) {
      console.warn(`RepoRadar AI config warning (${CONFIG_FILE_NAME}): ${warning}`);
    }
  }

  const ignoredDirectories = new Set(DEFAULT_IGNORED_DIRECTORIES);
  // An absolute --output lives outside the scan (or is excluded below by name when inside it).
  const outputDirName = path.basename(config.outputDir);
  if (outputDirName) {
    ignoredDirectories.add(outputDirName);
  }

  const collected = collectProjectFiles(normalizedRoot, {
    includePatterns: config.appliedIncludePatterns,
    excludePatterns: config.appliedExcludePatterns,
    maxFiles: config.maxFiles,
    ignoredDirectories,
  });
  const allFiles = collected.files;
  const relativeFiles = allFiles.map((file) => toRelativePosix(normalizedRoot, file)).sort();
  const outputPath = path.isAbsolute(config.outputDir)
    ? config.outputDir
    : path.join(normalizedRoot, config.outputDir);
  const packageJson = loadPackageJson(normalizedRoot);
  const fileContentCache = new Map<string, string>();
  const readSkipTracker = createSkipReasonTracker();
  let additionalSkippedFiles = 0;

  for (const absoluteFile of allFiles) {
    const relativeFile = toRelativePosix(normalizedRoot, absoluteFile);
    const content = readTextFileIfSafe(absoluteFile, config.maxFileSizeKb, readSkipTracker);
    if (content !== null) {
      fileContentCache.set(relativeFile, content);
      continue;
    }

    additionalSkippedFiles += 1;
  }

  const scanSafety = mergeScanSafety(
    {
      maxFiles: config.maxFiles,
      maxFileSizeKb: config.maxFileSizeKb,
      skippedFiles: collected.skippedFiles + additionalSkippedFiles,
      skippedFolders: collected.skippedFolders,
      skippedReasons: collected.skippedReasons,
      truncated: collected.truncated,
    },
    readSkipTracker.toArray(),
  );

  return {
    rootPath: normalizedRoot,
    projectName: validatedConfig.projectName ?? packageJson?.name ?? path.basename(normalizedRoot),
    outputPath,
    config,
    scanSafety,
    allFiles,
    relativeFiles,
    mainFolders: getMainFolders(relativeFiles),
    importantConfigFiles: findImportantConfigFiles(relativeFiles),
    packageJson,
    fileContentCache,
  };
}

export function scanProject(targetPath: string, options: ScanOptions = {}): RepoFacts {
  const context = createScanContext(targetPath, options);
  ensureDirectory(context.outputPath);
  const repoFacts = buildRepoFacts(context);
  writeReports(context.outputPath, repoFacts);
  return repoFacts;
}

export function createDefaultRepoRadarConfig(): RepoRadarConfig {
  return {
    projectName: "optional override",
    include: ["src/**"],
    exclude: ["generated/**", "vendor/**"],
    maxFiles: DEFAULT_MAX_FILES,
    maxFileSizeKb: DEFAULT_MAX_FILE_SIZE_KB,
    reports: {
      project: true,
      architecture: true,
      techStack: true,
      security: true,
      readme: true,
      agentPrompt: true,
      linkedin: true,
      portfolio: true,
      fixPlan: true,
      quickWins: true,
      githubIssues: true,
      agentFixPrompt: true,
    },
    outputDir: ".reporadar",
  };
}
