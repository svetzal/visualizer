Screenplay Visualizer – Project Guidelines

**Document scope**
- Audience: Advanced developers working on this repository
- Goal: Capture build/config, testing, and development practices specific to this project
- See also: CLAUDE.md for comprehensive architecture and implementation details

## 1) Build and Configuration

**Node/Electron Toolchain**
- Node 20+ tested (CI shows v22.13.0). Package uses ES modules (`"type": "module"`)
- Install: `npm ci`
- Build: `npm run build` (TypeScript → dist/, includes preload bundle)
- Start: `npm start` (builds + launches Electron + starts MCP server at :3000/mcp)
- Renderer displays MCP URL in header when ready

**Data Directory**
Platform-specific locations:
- macOS: `~/Library/Application Support/screenplay-visualizer/.screenplay/`
- Linux: `~/.config/screenplay-visualizer/.screenplay/`
- Windows: `%APPDATA%/screenplay-visualizer/.screenplay/`

Files: `actors.json`, `goals.json`, `tasks.json`, `interactions.json`, `questions.json`, `journeys.json`

- JSON writes are atomic (tmp+rename) via JSONStorage.writeFile
- Factory reset: Use `clear_model` MCP tool or delete files while app stopped

**Ports and Endpoints**
- `:3000/mcp` - FastMCP JSON-RPC 2.0 over HTTP streaming (session handled by MCP SDK)

**Project Layout**
- `src/main.ts` - Electron main process (windows, storage, MCP server, IPC)
- `src/lib/schemas.ts` - Zod schemas (single source of truth)
- `src/lib/storage.ts` - JSONStorage with EventEmitter
- `src/mcp-server/tools.ts` - MCP tool definitions
- `renderer/` - D3 force layout UI
- `dist/` - Compiled output

**Environment Flags (Optional)**
- `ELECTRON_ENABLE_LOGGING=1 npm start` - Verbose Electron logs
- Debug storage events: Check DevTools console for `[Main]` and `[Renderer]` logs

## 2) Release Procedure

**Creating a new release (e.g., version 1.0.1):**

1. **Bump version** in package.json (edit manually)
2. **Clean build:**
   ```bash
   npm run clean
   npm run build
   ```
3. **Start app and run E2E tests:**
   ```bash
   npm start                # Start Electron app (background or separate terminal)
   npm run test:e2e         # All 32 tools must pass
   # Stop app after tests complete
   ```
4. **Create packages for all platforms** (can run in parallel):
   ```bash
   npm run package:mac      # Creates .dmg and .zip for macOS
   npm run package:win      # Creates installer and portable .exe for Windows
   npm run package:linux    # Creates AppImage and .deb for Linux
   ```
   Output files will be in `release/` directory.

5. **Commit and tag the release:**
   ```bash
   git add package.json
   git commit -m "chore: bump version to X.Y.Z for release

   - Updated package.json version from A.B.C to X.Y.Z
   - All tests passing (32 tools verified)
   - Packages built for macOS, Windows, and Linux"

   git tag RELEASE_X_Y_Z    # Use underscores, not dots
   ```

**Important:**
- Tag naming convention: `RELEASE_X_Y_Z` format (e.g., `RELEASE_1_0_1`)
- All E2E tests must pass before packaging
- Verify packages are created for all three platforms

## 3) Testing

**A) Automated E2E Tests (Recommended)**
1. Start app: `npm start` (wait for Electron window showing MCP URL)
2. Run tests: `npm run test:e2e`
3. Slow mode: `npm run test:e2e:slow` (2s delay between steps for visual verification)

Tests use official MCP SDK client (`@modelcontextprotocol/sdk`) against `:3000/mcp`

**Expected Visual Behavior (<1s latency):**
- Blue circle for actor appears
- Assigned goals show gray edges
- Deleted actors fade out; edges become red dashed gap edges
- Goals remain green squares; gap nodes are red dashed circles with "?"

**B) Manual Testing**
- MCP server at `http://localhost:3000/mcp` (FastMCP httpStream JSON-RPC 2.0)
- Use Claude Desktop or E2E harness for testing
- Tools: `define_actor`, `define_goal`, `delete_actor`, `get_full_model`, `clear_model`

**C) Adding New Tests**
1. Create scenario file in `src/tests/scenarios/` (follow ScenarioRunner pattern)
2. Import in `src/tests/run-all-scenarios.ts`
3. See `define-actor.ts` or `bookkeeping-full-graph.ts` for examples

## 4) Additional Development Information
**Data and Schema Guarantees**
- Zod schemas (`src/lib/schemas.ts`) validate all entities on load/save
- Hand-edited JSON: Invalid entities will fail to load
- `Goal.assigned_to` intentionally tolerates non-existent actor IDs to create gaps

**Storage Semantics**
- JSONStorage: In-memory cache + atomic array writes
- Mutations emit `StorageChangeEvent` → forwarded to renderer via IPC (`model-updated`)
- Renderer applies delta updates to D3 simulation incrementally

**Renderer/Dev UX**
- D3 force layout (`renderer/app.js`) with collision detection
- Labels sized for projection (18px, readable from 15 feet)
- Node types: Actor (blue circle), Goal (green square), Gap (red dashed "?")
- DevTools auto-opens on load - check `[Main]` and `[Renderer]` console logs
- Clear Canvas button → IPC `clear-model` → `storage.clear()`

**Troubleshooting**
- **Electron headless/CI:** Need display server or xvfb
- **Port conflicts:** Adjust `findAvailablePort` in `src/main.ts`
- **JSON-RPC errors:** Reference E2E harness; needs proper envelopes + session
- **Data not updating:** Check window open, DevTools logs, IPC forwarding, file permissions

**Code Style**
- TypeScript strict-ish checks (`tsconfig.json`)
- Zod for runtime validation at IO boundaries
- Tool schemas: Use `.describe()` for agent-facing clarity
- Entity IDs: uuid v4
- Timestamps: ISO strings, update `updated_at` on mutations
- Tests import types from `src/lib/schemas.ts` to prevent drift

For comprehensive architecture details, see **CLAUDE.md**

## Quick Start

```bash
git clone <repo> && cd visualizer
npm ci
npm start                # Opens Electron + MCP server at :3000/mcp
# Second terminal:
npm run test:e2e         # Run automated tests
# Or:
npm run test:e2e:slow    # Watch visualization changes with delays
```

Observe node/edge changes in window within ~1s.
