- AGENTS.md
  =========

- This file defines conventions, commands, and standards for agentic coding agents in this repo.
- It aims to be concise, actionable, and repeatable for both humans and bots.

1) Build / Lint / Test commands
- Prereqs: Python 3.11+, Node.js 18+ (adjust as needed).
- Dependency install (examples):
  ```bash
  # Python
  python -m venv .venv; source .venv/bin/activate; pip install -r requirements-dev.txt || true
  # Node
  if [ -f package.json ]; then npm ci; fi
  ```
- Run all tests:
  ```bash
  pytest -q || true
  npm test --silent || true
  ```
- Run a single test (Python):
  ```bash
  pytest tests/test_example.py::TestCase.test_specific
  ```
- Lint/format (Python):
  ```bash
  ruff check . || true
  black . || true
  isort . || true
  ```
- Type checks (Python):
  ```bash
  mypy . || true
  ```
- Optional dockerized tests:
  ```bash
  docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit
  docker-compose -f docker-compose.test.yml down
  ```

2) Code style guidelines
- Language scope: Python is primary; Node/JS for frontend/tests as needed.
- Python imports: standard library, third-party, local modules; absolute imports; no unused.
- Formatting: Black; Import sorting: isort; line length ~88.
- Types: annotate public APIs; use Optional/Union; from typing import Annotated/TypedDict as needed.
- Naming: functions/variables snake_case; classes CamelCase; constants UPPER_SNAKE.
- Errors: catch specific exceptions; avoid bare except; preserve context when rethrowing.
- Logging: use module logger; avoid prints in library code; include context when helpful.
- Tests: deterministic, isolated; use fixtures; avoid flakey timing.
- Bash scripts: set -euo pipefail; quote paths; consider shellcheck.
- YAML/JSON: validate structure; avoid trailing commas; document fields.
- Documentation: docstrings and module docs near APIs; examples where useful.
- Security: never hardcode credentials; use env vars / secret stores; pin dependencies.
- Performance: prefer async I/O where beneficial; profile bottlenecks.
- Commit hygiene: small, focused commits; include tests; avoid secrets.
- Release notes: maintain per-component changelogs when releasing.

3) Cursor & Copilot rules
- Cursor rules: honor .cursor/rules/ and .cursorrules if present.
- Copilot rules: respect .github/copilot-instructions.md if present.
- When present, reproduce rules in task prompts and patch messages.

4) AGENT lifecycle & interaction
- Agents should be stateless between runs; persist essential state to manifest/history.
- Use Handoff documents for context passing between stages.
- Validate outputs with relative paths and machine-friendly formats.

5) Security & secrets
- Do not embed secrets in code or test data.
- Use environment variables; review dependencies for vulns.

6) Onboarding & contributions
- Provide small templates; link to per-folder READMEs.
- Maintain a concise glossary for repo terms.
- Follow existing agent names: entropy-guardian, handoff-specialist, etc.

7) Quick examples
- Python single test:
```bash
pytest tests/entropy/test_guardian.py::TestCleanup.test_expired_files
```
- Python lint:
```bash
ruff check .
```
- Python format:
```bash
black .
```
- Node test:
```bash
npm test -- -t "Example test name"
```

8) README handling
- If a folder already has a README, reuse it as the canonical reference.
- If not, provide a minimal README with purpose and usage notes.

9) Notes on existing AGENTS.md
- If AGENTS.md exists, this file should augment it with concise, actionable guidelines.

End of AGENTS.md
- Prerequisites: Python 3.11+, Node.js 18+ (adjust to project needs); virtualenv or pyenv recommended for Python; npm/yarn/pnpm for NodeJS if applicable.
- Install dependencies (example layouts; adapt if your project differs):
  ```bash
  # Python
  python -m venv .venv
  source .venv/bin/activate
  if [ -f requirements-dev.txt ]; then pip install -r requirements-dev.txt; fi
  
  # Node (if applicable)
  if [ -f package.json ]; then npm ci; fi
  ```
- Run all tests (example patterns; adjust to your test suite):
  ```bash
  # Python (pytest)
  pytest -q
  
  # Node (Jest example)
  if [ -f package.json ]; then npm test --silent; fi
  ```
- Run a single Python test for a quick check:
  ```bash
  pytest tests/test_example.py::TestCase.test_specific
  ```
- Run a single Node test with Jest example:
  ```bash
  npm test -- -t "test description or name fragment" 
  ```
- Lint and format (Python):
  ```bash
  # Lint
  if command -v ruff >/dev/null 2>&1; then ruff check .; fi
  
  # Format
  if command -v black >/dev/null 2>&1; then black .; fi
  if command -v isort >/dev/null 2>&1; then isort .; fi
  ```
- Lint and format (Node):
  ```bash
  if [ -f package.json ]; then npm run lint; fi
  ```
- Type checking (Python):
  ```bash
  if command -v mypy >/dev/null 2>&1; then mypy .; fi
  ```
- Run tests and lint in one go (Makefile if available):
  ```bash
  if [ -f Makefile ]; then make test lint; else echo "No Makefile; run commands individually."; fi
  ```
- Dockerized test run (if you provide docker-compose.test.yml):
  ```bash
  docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit
  docker-compose -f docker-compose.test.yml down
  ```

2) Code style guidelines
- General: keep ASCII only in source files; avoid non-ASCII unless required by the project language; add comments only when necessary.
- Imports (Python): standard library first, third-party second, local app; absolute imports preferred; group by blank lines; no unused imports.
- Formatting: use Black for Python formatting (88 char line length by default); use isort to sort imports; keep consistent docstring style.
- Types (Python): annotate functions and public APIs; use typing.List/Dict/Optional/Union; consider Protocols where appropriate.
- Naming conventions:
  - Functions/Variables: snake_case
  - Classes: PascalCase
  - Constants: UPPER_SNAKE
- Error handling: catch specific exceptions; avoid bare except; provide context when rethrowing; log errors with meaningful messages.
- Logging: use module-level logger = logging.getLogger(__name__); avoid print statements in library code; include request IDs or correlation IDs where useful.
- Tests: write small, deterministic tests; avoid flaky time-based tests; use fixtures; ensure tests are isolated and idempotent.
- Bash scripts: set -euo pipefail; quote all paths with spaces; shellcheck recommended when possible.
- YAML/JSON: validate with schema when possible; avoid trailing commas in YAML/JSON; keep comments out of JSON; document fields in README.
- Documentation: place docstrings and module docs near public APIs; provide examples.
- Accessibility and internationalization: if UI, follow accessible color contrast; keep strings externalized if needed.
- Dependency management: pin versions in requirements-dev.txt and package.json; document non-obvious dependencies.
- Performance considerations: write non-blocking I/O where applicable; use async where beneficial; profile if bottlenecks arise.
- Version control hygiene: meaningful commits; small, focused changes; include tests with changes; avoid committing secrets.
- Release notes: maintain a changelog per component when releasing.

3) Cursor rules & Copilot rules
- Cursor rules: If a repository includes cursor-based rules, they should be honored. Look under: 
  - .cursor/rules/
  - .cursorrules
- Copilot rules: If there is a repository policy at .github/copilot-instructions.md, follow it for code generation constraints and safety.
- Action: If these files exist, ensure agent tasks adhere to them and reproduce them in task statements and patch commits.

4) AGENT lifecycle & interaction model
- Agents should be stateless between runs; persist essential state to the project manifest and context-history files.
- Use Handoff documents to pass context between agents; ensure outputs are consumable by subsequent agents.
- Validate that outputs have relative paths and machine-readable formats when possible.

5) Error cases and retries
- Provide retry logic with exponential backoff for transient failures (e.g., network, service unavailability).
- Surface actionable error messages to users and handoffs.

6) Security
- Do not embed credentials in code or test data.
- Prefer environment variables and secret management tooling for sensitive values.
- Audit dependency trees for known vulnerabilities.

7) Onboarding and contributor tips
- Add small examples and templates; link to per-folder READMEs.
- Include a short glossary for domain-specific terms used in this repo.
- Keep consistency with existing agent definitions (entropy-guardian, handoff-specialist, etc.).

8) Examples
- Running a single Python test:
```bash
pytest tests/entropy/test_guardian.py::TestCleanup.test_expired_files
```
- Lint check for Python:
```bash
ruff check .
```
- Format all Python files:
```bash
black .
```
- Run a single Node test with Jest:
```bash
npm test -- -t "Example test name"
```

9) Notes on existing AGENTS.md
- If AGENTS.md already exists in the repo root, this file should augment or replace it with improved guidelines while preserving historical decisions.
- If conflicts arise, prefer preserving explicit decisions and documenting changes in a commit message.

End of AGENTS.md
