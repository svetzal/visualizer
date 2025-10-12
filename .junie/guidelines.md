Screenplay Visualizer – Project Guidelines

Document scope
- Audience: advanced developers working on this repository.
- Goal: capture build/config, testing, and development practices that are specific to this project so you can be productive quickly.

1) Build and configuration
- Node/Electron toolchain
  - Node 20+ tested (CI machine shows v22.13.0). Package.json uses "type": "module".
  - Install deps: npm ci
  - Build TypeScript: npm run build (tsc, plus a second pass for the preload bundle). Outputs to dist/.
  - Start app: npm start
    - Does: builds, launches Electron, starts MCP server inside the main process:
      - MCP server: http://localhost:3000/mcp (FastMCP httpStream transport)
    - The renderer shows the MCP URL in the header once ready.

- Data directory
  - All persisted data (JSON files) lives under Electron userData path:
    - macOS: ~/Library/Application Support/screenplay-visualizer/.screenplay/
    - Linux: ~/.config/screenplay-visualizer/.screenplay/
    - Windows: %APPDATA%/screenplay-visualizer/.screenplay/
    - Files: actors.json, goals.json, tasks.json, interactions.json, questions.json, journeys.json
  - JSON writes are atomic (tmp+rename) via JSONStorage.writeFile.
  - To "factory reset" visuals, use the `clear_model` MCP tool or delete the files above while the app is not running.

- Ports and endpoints
  - 3000/mcp: FastMCP JSON-RPC 2.0 over HTTP streaming. Requires a valid session (handled automatically by the MCP SDK client).

- Project layout (see README for diagram)
  - src/main.ts: Electron main process bootstrap (creates windows, storage, MCP server, IPC plumbing)
  - src/lib/{schemas.ts,storage.ts}: Zod-based schemas + JSON-backed, event-emitting storage
  - src/mcp-server/tools.ts: FastMCP tools (define_actor, define_goal, delete_actor, get_full_model, clear_model)
  - renderer/{index.html,app.js,styles.css}: D3 force layout + UI and counters
  - dist/: compiled JS

- Common environment flags (optional)
  - ELECTRON_ENABLE_LOGGING=1 npm start – increases Electron logging to stdout.
  - DEBUG storage/model events: storage emits 'change' events that the main process forwards to the renderer. The renderer logs [Renderer] messages in devtools.

- Data directory
  - All persisted data (JSON files) lives under Electron userData path, e.g. on macOS:
    - ~/.config/screenplay-visualizer/.screenplay/
    - Files: actors.json, goals.json, tasks.json, interactions.json, questions.json, journeys.json
  - JSON writes are atomic (tmp+rename) via JSONStorage.writeFile.
  - To “factory reset” visuals, either use the test reset endpoint (see testing) or delete the files above while the app is not running.

- Ports and endpoints
  - 3000/mcp: FastMCP JSON-RPC 2.0 over HTTP streaming. Requires a valid session (handled automatically by the MCP SDK client).

- Project layout (see README for diagram)
  - src/main.ts: Electron main process bootstrap (creates windows, storage, servers, IPC plumbing)
  - src/lib/{schemas.ts,storage.ts}: Zod-based schemas + JSON-backed, event-emitting storage
  - src/mcp-server/tools.ts: FastMCP tools (define_actor, define_goal, delete_actor, get_full_model, clear_model)
  - renderer/{index.html,app.js,styles.css}: D3 force layout + UI and counters
  - dist/: compiled JS

- Common environment flags (optional)
  - ELECTRON_ENABLE_LOGGING=1 npm start – increases Electron logging to stdout.
  - DEBUG storage/model events: storage emits 'change' events that the main process forwards to the renderer. The renderer logs [Renderer] messages in devtools.

2) Testing
There are two complementary ways to test Phase 1.

A) Automated E2E Tests (recommended for validation)
- Start the app: npm start (wait for the Electron window to open; the MCP server runs on :3000/mcp).
- Run tests: npm run test:e2e (executes all test scenarios)
- Run tests in slow mode: npm run test:e2e:slow (adds 2s delay between steps for visual verification)
- The E2E tests use the official MCP SDK client (@modelcontextprotocol/sdk) to call tools and validate behavior.
- Test scenarios are in src/tests/scenarios/
- What you should see in the window (live within ~1s):
  - Blue circle for the actor appears; assigned goals show gray edges.
  - Deleting the actor fades it out; edges to goals become red dashed gap edges.
    - Goals remain as green squares; gap nodes appear as red dashed circles with a "?" label.

B) Manual Testing with MCP
- The MCP server runs on http://localhost:3000/mcp using FastMCP httpStream JSON-RPC 2.0 protocol.
- The easiest way to test is through an MCP client like Claude Desktop or using the E2E test harness.
- For direct HTTP testing, you need proper JSON-RPC 2.0 envelopes with session management.
- Available tools: define_actor, define_goal, delete_actor, get_full_model, clear_model
- See README.md for tool descriptions and expected behavior.

C) Adding new tests
- Create new test scenario files in src/tests/scenarios/ following the ScenarioRunner pattern
- Import and add them to src/tests/run-all-scenarios.ts
- Tests use the MCP SDK client to call tools and validate responses
- Example: see define-actor.ts or bookkeeping-full-graph.ts for patterns

3) Additional development information

B) MCP endpoint (:3000/mcp) for JSON-RPC tool calls
- This uses FastMCP httpStream transport with JSON-RPC 2.0 protocol.
- The MCP server exposes: define_actor, define_goal, delete_actor, get_full_model, clear_model
- Use an MCP client like Claude Desktop or the E2E test harness for testing.

C) Adding new tests
- Create new test scenario files in src/tests/scenarios/ following the ScenarioRunner pattern
- Import and add them to src/tests/run-all-scenarios.ts
- Tests use the MCP SDK client to call tools and validate responses
- Example: see define-actor.ts or bookkeeping-full-graph.ts for patterns

D) Demonstration: verified simple test
- Verified here: dependency install (npm ci) and TypeScript build (npm run build) succeed.
- For a live demo without Electron, you can run the lightweight FastMCP sample server in this repo: node test-server.js
  - It binds to http://localhost:4000/mcp and exposes a toy tool hello(name:string) – useful to confirm the environment and FastMCP wiring. Note: FastMCP requires a proper JSON-RPC session; use the app’s provided scripts for full end-to-end flows.

3) Additional development information
- Data and schema guarantees
  - Zod schemas in src/lib/schemas.ts validate all entities on load and save. If you hand-edit JSON in the data directory, invalid entities will fail to load.
  - Goal.assigned_to stores actor IDs as strings; the renderer intentionally tolerates references to non-existent actors to create “gaps.”

- Storage semantics
  - JSONStorage caches in memory and writes the whole array atomically on each mutation.
  - All mutations emit a StorageChangeEvent that the main process forwards to the renderer via IPC (channel: 'model-updated'). The renderer updates its D3 simulation incrementally.

- Renderer/dev UX
  - The D3 simulation (renderer/app.js) sets up forces and a collision radius; labels are large for projection. Nodes: Actor (blue circle), Goal (green square), Gap (red dashed circle with “?”). See README Visual Design for details.
  - DevTools auto-opens on window load (main.ts). Use the console logs tagged [Main] and [Renderer] to trace flows.
  - The Clear Canvas button triggers the IPC handler 'clear-model' (wired in main.ts) which calls storage.clear(). Use this during demos.

- Troubleshooting
  - Electron fails to start in headless/CI: You need a display server or xvfb. Locally, macOS/Windows/Linux GUIs work out of the box.
  - Port conflicts on 3000: Adjust the starting port in src/main.ts (findAvailablePort function). Update tests and documentation accordingly.
  - JSON-RPC errors on /mcp: Use the E2E test harness as a reference. The httpStream transport expects proper JSON-RPC 2.0 envelopes with session management.
  - Data not updating on screen: Ensure the main window is open, check DevTools console logs, verify storage change events are being forwarded, and that the JSON files under userData are writable.

- Code style and conventions
  - TypeScript in src/ compiled with strict-ish checks (see tsconfig.json). Use Zod for runtime validation at IO boundaries.
  - Keep tool parameter schemas precise and descriptive (zod.describe) for agent-facing clarity.
  - Use uuid v4 for entity IDs. Set created_at and updated_at to ISO strings; update updated_at on mutations.
  - Tests reuse model types from src/lib/schemas.ts. Import types from lib to prevent drift.

Appendix: Quick start
- git clone ... && cd visualizer
- npm ci
- npm start  # opens Electron, starts MCP server on :3000
- In a second terminal: npm run test:e2e  # runs automated test suite
- Or: npm run test:e2e:slow  # adds delays to watch visualization changes
- Observe expected node/edge changes in the app window within ~1s.
