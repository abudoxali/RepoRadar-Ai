<p align="center"><img src="assets/app-icon.webp" alt="RepoRadar AI icon" width="160"></p>

# RepoRadar AI

> Turn any codebase into AI-ready project intelligence — without paid AI.

RepoRadar AI is a desktop-friendly and CLI-based developer tool that scans a codebase locally and generates structured project intelligence, architecture reports, security notes, fix plans, GitHub-ready issues, and AI-agent prompts. It runs entirely on your machine, requires zero API keys, and never sends your code to a third party.

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white">
  <img alt="CLI Tool" src="https://img.shields.io/badge/CLI-Tool-000000?logo=windows-terminal&logoColor=white">
  <img alt="MIT License" src="https://img.shields.io/badge/License-MIT-green.svg">
  <img alt="No Paid AI" src="https://img.shields.io/badge/No%20Paid%20AI%20Required-ff6b6b">
  <img alt="Tests" src="https://img.shields.io/badge/Tests-Passing-brightgreen">
</p>

---

## Demo

![RepoRadar AI Demo](docs/assets/demo.gif)

> A real demo GIF can be added later at `docs/assets/demo.gif`.

**Best demo flow:**

1. Open RepoRadar AI from the desktop shortcut.
2. Choose a project folder.
3. Run scan.
4. Open generated reports.
5. Review `FIX_PLAN.md` and `AGENT_FIX_PROMPT.md`.

*Demo outputs are already checked into the repo:*

- [repo-facts.json](examples/sample-project-output/repo-facts.json)
- [PROJECT_REPORT.md](examples/sample-project-output/PROJECT_REPORT.md)
- [ARCHITECTURE.md](examples/sample-project-output/ARCHITECTURE.md)
- [TECH_STACK.md](examples/sample-project-output/TECH_STACK.md)
- [SECURITY_NOTES.md](examples/sample-project-output/SECURITY_NOTES.md)
- [README_SUGGESTION.md](examples/sample-project-output/README_SUGGESTION.md)
- [AI_AGENT_PROMPT.md](examples/sample-project-output/AI_AGENT_PROMPT.md)
- [LINKEDIN_POST.md](examples/sample-project-output/LINKEDIN_POST.md)
- [PORTFOLIO_CASE_STUDY.md](examples/sample-project-output/PORTFOLIO_CASE_STUDY.md)
- [FIX_PLAN.md](examples/sample-project-output/FIX_PLAN.md)
- [QUICK_WINS.md](examples/sample-project-output/QUICK_WINS.md)
- [GITHUB_ISSUES.md](examples/sample-project-output/GITHUB_ISSUES.md)
- [AGENT_FIX_PROMPT.md](examples/sample-project-output/AGENT_FIX_PROMPT.md)

---

## Quick Start

```bash
npm install
npm run build
node dist/cli.js scan ./sample-project
```

**Desktop launcher:**

```bash
node dist/cli.js launch
```

**Create Windows shortcut:**

```bash
npm run shortcut:windows
```

**Clean JSON output:**

```bash
node dist/cli.js scan ./sample-project --json
```

---

## What It Does

RepoRadar AI scans any repository and produces a `.reporadar/` folder containing 13 structured outputs:

| File | Purpose |
|------|---------|
| `repo-facts.json` | Full machine-readable scan facts |
| `PROJECT_REPORT.md` | High-level project summary with health score |
| `ARCHITECTURE.md` | Entrypoints, routes, layers, dependencies, and risks |
| `TECH_STACK.md` | Languages, frameworks, ecosystem, and module-resolution signals |
| `SECURITY_NOTES.md` | Security-oriented findings and cautions |
| `README_SUGGESTION.md` | Draft structure for repo documentation |
| `AI_AGENT_PROMPT.md` | Deterministic context for AI coding agents |
| `LINKEDIN_POST.md` | Social-ready summary copy |
| `PORTFOLIO_CASE_STUDY.md` | Portfolio-oriented project framing |
| `FIX_PLAN.md` | Prioritized improvement plan with acceptance criteria |
| `QUICK_WINS.md` | Low-effort, high-impact fixes you can do today |
| `GITHUB_ISSUES.md` | Copy-paste ready GitHub issues with labels |
| `AGENT_FIX_PROMPT.md` | Safe, focused prompt for AI coding agents |

---

## Why This Exists

Developers often work with messy, undocumented, or unfamiliar repositories. AI coding agents also need clean project context before making safe changes.

RepoRadar AI turns a repository into structured intelligence, actionable fix plans, copy-paste GitHub issues, and safe prompts for AI coding agents — all without paid AI.

---

## Features

- **Local deterministic scanner** — no API keys, no cloud, no database
- **Works without paid AI** — heuristic and regex-based detection
- **Desktop launcher** — interactive folder picker and menu-driven workflow
- **Windows shortcut support** — one-click desktop shortcut creation
- **Project type detection** — frontend, backend, full-stack, CLI, library
- **Tech stack detection** — frameworks, build tools, test runners
- **Architecture detection** — routes, layers, entrypoints, data models
- **Dependency graph summaries** — package relationships and monorepo hints
- **Monorepo detection** — npm workspaces, pnpm workspaces, Turborepo
- **Python and JavaScript/TypeScript support**
- **Deployment signal detection** — Docker, PM2, GitHub Actions, Vercel, Netlify, Render, Railway
- **Security notes without exposing secret values** — `.env` detected by name only
- **Fix plan generator** — prioritized by severity with acceptance criteria
- **Quick wins generator** — low-effort, high-impact improvements
- **GitHub issue generator** — copy-paste ready with labels and checklists
- **AI-agent prompt generator** — safe, focused prompts for coding agents
- **LinkedIn and portfolio content generation** — social-ready project summaries

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `node dist/cli.js scan <path>` | Scan a project and generate all reports |
| `node dist/cli.js scan <path> --json` | Scan and output clean JSON to stdout |
| `node dist/cli.js scan <path> --output <dir>` | Write reports to a custom directory |
| `node dist/cli.js scan <path> --config <path>` | Use a custom config file |
| `node dist/cli.js init` | Create a starter `reporadar.config.json` |
| `node dist/cli.js launch` | Open the interactive desktop launcher |
| `node dist/cli.js --help` | Show help |
| `node dist/cli.js --version` | Show version |

> **Note:** `npm run dev -- scan ... --json` may include npm wrapper output. Use `node dist/cli.js scan ... --json` for clean JSON.

---

## Desktop Launcher

RepoRadar AI includes an interactive launcher for Windows users who prefer a graphical folder picker and menu-driven workflow.

**Create a Desktop Shortcut:**

```bash
npm install
npm run build
npm run shortcut:windows
```

This creates `RepoRadar AI.lnk` on your Desktop. Double-click it to launch the interactive picker.

**What the Launcher Does:**

1. Shows a friendly menu in the terminal
2. Lets you pick a folder using the Windows folder picker, or type a path manually
3. Runs a full scan on the selected project
4. Shows the scan summary (project name, type, health score, generated files, top risks)
5. Offers a post-scan menu to open the output folder or specific reports

See [docs/DESKTOP_LAUNCHER.md](docs/DESKTOP_LAUNCHER.md) for full details.

---

## Generated Outputs

| File | Purpose |
|------|---------|
| `repo-facts.json` | Full machine-readable scan facts |
| `PROJECT_REPORT.md` | High-level project summary |
| `ARCHITECTURE.md` | Entrypoints, routes, layers, dependencies, and risks |
| `TECH_STACK.md` | Languages, frameworks, ecosystem signals |
| `SECURITY_NOTES.md` | Security-oriented findings and cautions |
| `README_SUGGESTION.md` | Draft structure for repo documentation |
| `AI_AGENT_PROMPT.md` | Deterministic context for AI coding agents |
| `LINKEDIN_POST.md` | Social-ready summary copy |
| `PORTFOLIO_CASE_STUDY.md` | Portfolio-oriented project framing |
| `FIX_PLAN.md` | Prioritized improvement plan with acceptance criteria |
| `QUICK_WINS.md` | Low-effort, high-impact fixes you can do today |
| `GITHUB_ISSUES.md` | Copy-paste ready GitHub issues with labels |
| `AGENT_FIX_PROMPT.md` | Safe, focused prompt for AI coding agents |

*Example outputs:*

- [PROJECT_REPORT.md](examples/sample-project-output/PROJECT_REPORT.md)
- [ARCHITECTURE.md](examples/sample-project-output/ARCHITECTURE.md)
- [FIX_PLAN.md](examples/sample-project-output/FIX_PLAN.md)
- [QUICK_WINS.md](examples/sample-project-output/QUICK_WINS.md)
- [AGENT_FIX_PROMPT.md](examples/sample-project-output/AGENT_FIX_PROMPT.md)

---

## Supported Detection

**JavaScript / TypeScript:**
React, Next.js, Vite, Vue, Nuxt, Svelte, SvelteKit, Angular, Astro, Remix, SolidJS, Preact

**Backend:**
Express, Fastify, NestJS, Hono, Koa

**Python:**
FastAPI, Flask, Django, Typer, Click, Streamlit

**Data & ORM:**
Prisma, Drizzle ORM, Zod, Mongoose, Sequelize, TypeORM, PostgreSQL hints, Pydantic, SQLAlchemy-style patterns

**Tooling & Deployment:**
Docker, PM2, ESLint, Prettier, Vitest, Jest, Playwright, Cypress, Pytest, GitHub Actions, Vercel, Netlify, Render, Railway

**Monorepos:**
npm workspaces, pnpm workspaces, Turborepo

---

## Configuration

Create a `reporadar.config.json` in your project root:

```json
{
  "projectName": "My Project",
  "include": ["src/**"],
  "exclude": ["generated/**", "vendor/**"],
  "maxFiles": 5000,
  "maxFileSizeKb": 512,
  "outputDir": ".reporadar",
  "reports": {
    "project": true,
    "architecture": true,
    "security": true,
    "readme": true,
    "agentPrompt": true,
    "linkedin": true,
    "portfolio": true,
    "fixPlan": true,
    "quickWins": true,
    "githubIssues": true,
    "agentFixPrompt": true
  }
}
```

---

## Validation

```bash
npm audit
npm run typecheck
npm run build
npm test
npm run validate
npm run pack:dry-run
```

---

## Safety & Privacy

- RepoRadar AI runs entirely locally.
- It does not require paid AI or API keys.
- It does not send code to external APIs by default.
- It does not print `.env` secret values.
- Environment variables are detected by name only.
- It generates advisory reports and does not automatically modify the scanned project.

---

## Roadmap

- [ ] Real demo GIF / screenshot
- [ ] More framework coverage
- [ ] Richer dependency graph ownership analysis
- [ ] Optional local AI summaries with Ollama / LM Studio
- [ ] Optional HTML report
- [ ] Optional GitHub issue export automation

---

## Limitations

- Detection is heuristic and regex-based.
- Dynamic routes can be underdetected.
- Runtime-generated aliases may be missed.
- Generated code may be skipped or underdetected.
- Direct `node` command is preferred for clean JSON output (`npm run dev --` may include wrapper output).

---

## Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md) — setup, tests, fixture guidance
- [CHANGELOG.md](CHANGELOG.md) — version history
- [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md) — release checklist
- [docs/DEMO_RECORDING_GUIDE.md](docs/DEMO_RECORDING_GUIDE.md) — how to record a demo
- [docs/DESKTOP_LAUNCHER.md](docs/DESKTOP_LAUNCHER.md) — launcher details
- [docs/FIX_PLAN_WORKFLOW.md](docs/FIX_PLAN_WORKFLOW.md) — how to use fix-plan outputs

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, test commands, fixture guidance, and project rules.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

## Creator

RepoRadar AI was created by **Abed**.

- Website: [abud.fun](https://abud.fun)
- GitHub: [@3bud-ZC](https://github.com/3bud-ZC)

This project is open-source and available under the MIT License.

---

## License

Released under the MIT License. See [LICENSE](LICENSE).

