# Arbor

AI-powered SDK documentation generator. Arbor uses [tree-sitter](https://tree-sitter.github.io/) for accurate structural extraction and the [Claude API](https://docs.anthropic.com/en/docs) for intelligent enrichment — producing markdown documentation from C, C++, Kotlin, and Swift codebases.

Available as both a **CLI tool** and an **MCP server**.

## Installation

```bash
git clone https://github.com/josuediazflores/Arbor.git
cd Arbor
npm install
npm run build
```

## Quick Start

```bash
# Scan a codebase
npx arbor scan ./path/to/source

# Generate documentation (without AI)
npx arbor generate ./path/to/source --no-ai -o ./docs

# Generate documentation (with AI enrichment)
export ANTHROPIC_API_KEY=sk-ant-...
npx arbor generate ./path/to/source -o ./docs

# Compare docs against a baseline
npx arbor scan ./path/to/source --snapshot
npx arbor diff ./path/to/source

# Generate a coverage badge
npx arbor badge ./path/to/source -o docs-badge.svg
```

## CLI Commands

### `arbor init`

Creates a `docgen.yaml` configuration file in the current directory, auto-detecting which languages are present.

```bash
arbor init
arbor init --dir ./my-project
```

### `arbor scan [dir]`

Scans source files and displays extraction statistics — how many functions, classes, enums, etc. were found and how many have existing documentation.

```bash
arbor scan ./src
arbor scan ./src --language c cpp
arbor scan ./src --json
arbor scan ./src --exclude "**/vendor/**" "**/test/**"

# Save a snapshot for later diffing
arbor scan ./src --snapshot
arbor scan ./src --snapshot ./my-snapshot.json
```

| Option | Description |
|--------|-------------|
| `-l, --language <langs...>` | Languages to scan: `c`, `cpp`, `kotlin`, `swift` |
| `-i, --include <patterns...>` | Glob patterns to include |
| `-e, --exclude <patterns...>` | Glob patterns to exclude |
| `--json` | Output results as JSON |
| `-s, --snapshot [path]` | Save snapshot file (default: `.arbor-snapshot.json`) |

### `arbor generate [dir]`

Full pipeline: scan source files, optionally enrich with Claude, and output markdown documentation.

```bash
# Without AI (fast, uses only parsed doc comments)
arbor generate ./src --no-ai -o ./docs

# With AI enrichment
ANTHROPIC_API_KEY=sk-ant-... arbor generate ./src -o ./docs

# Specific languages only
arbor generate ./src --language kotlin swift -o ./docs
```

| Option | Description |
|--------|-------------|
| `-o, --output <dir>` | Output directory (default: `./docs`) |
| `--no-ai` | Skip AI enrichment |
| `-l, --language <langs...>` | Languages to scan |
| `-i, --include <patterns...>` | Glob patterns to include |
| `-e, --exclude <patterns...>` | Glob patterns to exclude |
| `-t, --title <title>` | Documentation title |

### `arbor diff [dir]`

Compare current documentation entries against a previously saved snapshot. Shows what's been added, removed, or changed — useful for CI gates and code review.

```bash
# First, create a baseline
arbor scan ./src --snapshot

# Later, check what changed
arbor diff ./src

# Output as JSON (for CI pipelines)
arbor diff ./src --json

# Exit with code 1 if any changes detected (useful for CI)
arbor diff ./src --exit-code
```

| Option | Description |
|--------|-------------|
| `-s, --snapshot <path>` | Path to baseline snapshot (default: `.arbor-snapshot.json`) |
| `-l, --language <langs...>` | Languages to scan |
| `--json` | Output as JSON |
| `--exit-code` | Exit with code 1 if changes detected |

### `arbor badge [dir]`

Generate an SVG documentation coverage badge for embedding in your README.

```bash
arbor badge ./src
arbor badge ./src -o docs-badge.svg
arbor badge ./src --style flat-square
arbor badge ./src --label "doc coverage"
```

Then add to your README:

```markdown
![Documentation Coverage](./coverage-badge.svg)
```

| Option | Description |
|--------|-------------|
| `-o, --output <path>` | Output SVG path (default: `coverage-badge.svg`) |
| `--label <text>` | Badge label (default: `docs`) |
| `--style <style>` | `flat`, `flat-square`, or `plastic` (default: `flat`) |
| `-l, --language <langs...>` | Languages to scan |

## MCP Server

Arbor can run as an [MCP](https://modelcontextprotocol.io/) server, letting AI assistants scan repos and generate docs directly. It exposes two tools:

- **`scan_repo`** — Scan a repository and return entry metadata as JSON
- **`generate_docs`** — Generate markdown documentation files

### Setup

#### 1. Clone and build

```bash
git clone https://github.com/josuediazflores/Arbor.git
cd Arbor
npm install
npm run build
```

Note the **absolute path** to the repo — you'll need it for the config below. For example: `/Users/you/Arbor`.

#### 2. Add to your MCP client

**Claude Desktop** — edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "arbor": {
      "command": "node",
      "args": ["/absolute/path/to/Arbor/dist/mcp-server/index.js"]
    }
  }
}
```

**Claude Code** — run:

```bash
claude mcp add arbor node /absolute/path/to/Arbor/dist/mcp-server/index.js
```

**Cursor** — add to `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "arbor": {
      "command": "node",
      "args": ["/absolute/path/to/Arbor/dist/mcp-server/index.js"]
    }
  }
}
```

Replace `/absolute/path/to/Arbor` with the actual path where you cloned the repo.

#### 3. Restart your client

Restart Claude Desktop, Claude Code, or Cursor. The `scan_repo` and `generate_docs` tools will now be available to the AI assistant.

### MCP Tools

**`scan_repo`** — Scans a codebase and returns structured metadata.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `rootDir` | string | Yes | Root directory to scan |
| `languages` | string[] | No | `["c", "cpp", "kotlin", "swift"]` |
| `include` | string[] | No | Glob patterns to include |
| `exclude` | string[] | No | Glob patterns to exclude |

**`generate_docs`** — Generates markdown documentation files.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `rootDir` | string | Yes | Root directory to scan |
| `outputDir` | string | No | Output directory (default: `./docs`) |
| `enrich` | boolean | No | Enable AI enrichment (requires `ANTHROPIC_API_KEY`) |
| `languages` | string[] | No | Languages to scan |

## Supported Languages

| Language | Parser | Doc Comment Format |
|----------|--------|-------------------|
| C | tree-sitter | Doxygen (`/** @brief */`, `@param`, `@return`) |
| C++ | tree-sitter | Doxygen (`/** @brief */`, `@param`, `@return`) |
| Kotlin | tree-sitter | KDoc (`/** @param */`, `@return`, `@throws`) |
| Swift | regex-based* | Swift doc comments (`/// - Parameter:`, `- Returns:`, `- Throws:`) |

\* Swift uses a regex-based fallback parser because the `tree-sitter-swift` native module has build compatibility issues on some platforms. Functionality is equivalent.

### File Extension Mapping

| Extension | Language |
|-----------|----------|
| `.c`, `.h` | C (`.h` files are checked for C++ constructs first) |
| `.cpp`, `.cc`, `.cxx`, `.hpp` | C++ |
| `.kt`, `.kts` | Kotlin |
| `.swift` | Swift |

## Configuration

Arbor looks for configuration in these locations (via [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig)):

- `docgen.yaml` / `docgen.yml`
- `docgen.json`
- `.docgenrc` / `.docgenrc.json` / `.docgenrc.yaml`
- `package.json` (`"docgen"` key)

### Example `docgen.yaml`

```yaml
languages:
  - c
  - cpp
  - kotlin
  - swift

outputDir: ./docs

include:
  - "**/*"
exclude:
  - "**/node_modules/**"
  - "**/build/**"
  - "**/dist/**"

enrich: true
# model: claude-sonnet-4-5-20250929
# concurrency: 5
# skipDocumented: false

title: My API Documentation
```

## AI Enrichment

When enabled (default), Arbor sends each extracted code entry to Claude to generate:

- **Descriptions** — what the function/class does and why you'd use it
- **Parameter descriptions** — for each parameter
- **Return descriptions** — what's returned
- **Code examples** — minimal, compilable usage examples
- **Edge cases** — null handling, thread safety, performance notes
- **Related entries** — links to related functions/types
- **Tags** — categorization labels

AI never modifies types or signatures — those come exclusively from the parser.

Set `--no-ai` to skip enrichment and generate docs using only existing source comments.

## Development

```bash
# Install
npm install

# Build
npm run build

# Run tests
npm test

# Watch tests
npm run test:watch

# Type check
npm run lint

# Dev mode (run CLI without building)
npx tsx src/cli/index.ts scan ./tests/fixtures
```

## Project Structure

```
src/
  shared/          # Types, Zod schemas, config, errors, constants
  core/
    parsers/
      tree-sitter/ # Parser manager, AST utilities, comment extraction
      c-cpp/       # C and C++ extractors, Doxygen parser
      kotlin/      # Kotlin extractor, KDoc parser
      swift/       # Swift extractor (regex-based), Swift doc parser
    analyzer/      # Relationship analysis, module grouping, context builder
    ai/            # Claude API client, prompt builder, enrichment pipeline
    output/        # Handlebars markdown renderer
    snapshot.ts    # Snapshot creation, loading, diffing
    badge.ts       # SVG badge generator
    engine.ts      # Core orchestrator
  cli/             # Commander.js CLI
  mcp-server/      # MCP server with stdio transport
templates/         # Handlebars templates for markdown output
tests/
  fixtures/        # Sample source files (C, C++, Kotlin, Swift)
  parsers/         # Extractor tests
  core/            # Snapshot and badge tests
  cli/             # Diff and badge command tests
  shared/          # Schema tests
  ai/              # Response parser tests
  engine/          # Integration tests
```

## License

MIT
