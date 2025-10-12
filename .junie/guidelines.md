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
    - Does: builds, launches Electron, starts two HTTP servers inside the main process:
      - MCP server: http://localhost:3000/mcp (FastMCP httpStream transport)
      - Simple test server: http://localhost:3001 (project-specific convenience API)
    - The renderer shows the MCP URL in the header once ready.

- Data directory
  - All persisted data (JSON files) lives under Electron userData path, e.g. on macOS:
    - ~/.config/screenplay-visualizer/.screenplay/
    - Files: actors.json, goals.json, tasks.json, interactions.json, questions.json, journeys.json
  - JSON writes are atomic (tmp+rename) via JSONStorage.writeFile.
  - To “factory reset” visuals, either use the test reset endpoint (see testing) or delete the files above while the app is not running.

- Ports and endpoints
  - 3000/mcp: FastMCP JSON-RPC 2.0 over HTTP streaming. Requires a valid session (handled automatically by the app tooling; see Test Scripts and README examples for request shape).
  - 3001/test: Plain JSON endpoints intended for manual/system tests. No session management required.

- Project layout (see README for diagram)
  - src/main.ts: Electron main process bootstrap (creates windows, storage, servers, IPC plumbing)
  - src/lib/{schemas.ts,storage.ts}: Zod-based schemas + JSON-backed, event-emitting storage
  - src/mcp-server/{tools.ts,test-endpoint.ts}: FastMCP tools and the simple test HTTP server
  - renderer/{index.html,app.js,styles.css}: D3 force layout + UI and counters
  - dist/: compiled JS

- Common environment flags (optional)
  - ELECTRON_ENABLE_LOGGING=1 npm start – increases Electron logging to stdout.
  - DEBUG storage/model events: storage emits 'change' events that the main process forwards to the renderer. The renderer logs [Renderer] messages in devtools.

2) Testing
There are two complementary ways to test Phase 1.

A) Simple Test HTTP API (recommended for quick iteration)
- Start the app: npm start (wait for the Electron window to open; the test server runs on :3001).
- Requirements: jq installed to pretty-print JSON (brew install jq on macOS).
- Use the provided scripts in the repo root:
  - ./test-simple.sh – creates an actor, a real goal, a goal with a fake actor (creates a gap), fetches the model, then deletes the actor.
  - ./test-phase1.sh – runs a scripted “acceptance” flow including a reset, creation, gap demonstration, and deletion.
  - What you should see in the window (live within ~1s):
    - Blue circle for the actor appears; assigned goals show gray edges.
    - Deleting the actor fades it out; edges to goals become red dashed gap edges.
    - Goals remain as green squares; gap nodes appear as red dashed circles with a “?” label.

Minimal curl examples for :3001
- Reset data
  curl -s -X POST http://localhost:3001/test/reset | jq '.'
- Define actor
  curl -s -X POST http://localhost:3001/test/define_actor \
    -H 'Content-Type: application/json' \
    -d '{"name":"Admin","description":"System administrator","abilities":["manage_users"],"constraints":[]}' | jq '.'
- Define goal assigned to that actor (bash captures ACTOR_ID)
  ACTOR_ID=$(curl -s -X POST http://localhost:3001/test/define_actor -H 'Content-Type: application/json' -d '{"name":"Admin","description":"System administrator","abilities":["manage_users"],"constraints":[]}' | jq -r '.data.id')
  curl -s -X POST http://localhost:3001/test/define_goal \
    -H 'Content-Type: application/json' \
    -d '{"name":"User Management","description":"Manage users","success_criteria":["Can create users"],"priority":"high","assigned_to":["'"$ACTOR_ID"'"]}' | jq '.'
- Define goal with a fake actor to create a gap
  curl -s -X POST http://localhost:3001/test/define_goal \
    -H 'Content-Type: application/json' \
    -d '{"name":"Analytics","description":"Dashboards","success_criteria":["<2s load"],"priority":"medium","assigned_to":["fake-999"]}' | jq '.'
- Delete actor (creates a gap edge)
  curl -s -X POST http://localhost:3001/test/delete_actor \
    -H 'Content-Type: application/json' \
    -d '{"id":"'"$ACTOR_ID"'"}' | jq '.'

B) MCP endpoint (:3000/mcp) for JSON-RPC tool calls
- This uses FastMCP httpStream transport. The repository provides ./test-mcp.sh which shows the correct JSON-RPC envelopes and extracts IDs from responses.
- Run: ./test-mcp.sh (with the app running). It demonstrates define_actor, define_goal, get_full_model, and delete_actor.
- If you construct your own requests, follow the README’s JSON-RPC examples. The server expects a valid session context; using the provided examples avoids session issues.

C) Adding new tests
- Preferred: extend the :3001 test endpoints first; they are intentionally permissive and do not require UUIDs in input. See src/mcp-server/test-endpoint.ts for the exact request bodies.
- Example pattern to add a new endpoint locally:
  - Add a branch to test-endpoint.ts (e.g., POST /test/define_task) that:
    - Parses JSON, builds a minimal Task with uuidv4(), fills created_at/updated_at (ISO), and calls storage.save('task', ...)
    - Returns { success: true, data: <entity> }
  - Rebuild + restart: npm run build && npm start
  - Create a shell script mirroring test-simple.sh that calls your new endpoint and uses jq to print responses.
- For MCP-level tests, add a new tool in src/mcp-server/tools.ts (server.addTool(...)) with zod-validated parameters, then extend test-mcp.sh accordingly.

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
  - Port conflicts on 3000/3001: Adjust the starting port in src/main.ts (findAvailablePort currently returns the start port without probing). For quick local changes, search for 3000/3001 and update; keep README and scripts in sync.
  - JSON-RPC errors on /mcp: Prefer the provided test-mcp.sh or README examples. The httpStream transport expects a negotiated session context; hand-crafting requests can fail if the envelope is malformed.
  - Data not updating on screen: Ensure the main window is open, check DevTools console logs, verify storage change events are being forwarded, and that the JSON files under userData are writable.

- Code style and conventions
  - TypeScript in src/ compiled with strict-ish checks (see tsconfig.json). Use Zod for runtime validation at IO boundaries.
  - Keep tool parameter schemas precise and descriptive (zod.describe) for agent-facing clarity.
  - Use uuid v4 for entity IDs. Set created_at and updated_at to ISO strings; update updated_at on mutations.
  - Favor small, append-only APIs in the test endpoint for demo flows; do not bake business rules there (renderer encodes the “gap” visual semantics).
  - Tests reuse model types from src/lib/schemas.ts. Avoid redefining Actor/Goal/etc. in tests; import types (exported from lib) or re-exported via the harness to prevent drift.

Appendix: Quick start
- git clone ... && cd visualizer
- npm ci
- npm start  # opens Electron, starts :3000 (MCP) and :3001 (test API)
- In a second terminal: ./test-simple.sh  # requires jq
- Observe expected node/edge changes in the app window within ~1s.
