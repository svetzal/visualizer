# Screenplay Visualizer - AI Coding Agent Instructions

## Project Overview

This is an **Electron app with embedded MCP server** for real-time visualization of ensemble coding sessions. As teams discuss system design with AI agents (Claude Code, GitHub Copilot, etc.), entities appear as nodes in a D3 force-directed graph projected on a second screen. Updates must complete within **<1s from MCP tool call to visible change**.

**Key Insight:** Gaps (missing references) are features, not bugs. Red "?" nodes surface what hasn't been discussed yet, prompting teams to fill in missing details.

## Architecture at a Glance

```
Electron App (Single Process)
├── Main (src/main.ts)
│   ├── FastMCP HTTP Server (localhost:3000+, stateless mode)
│   ├── JSONStorage (EventEmitter, atomic writes, in-memory cache)
│   └── IPC Bridge → forwards 'change' events to renderer
└── Renderer (renderer/app.js)
    ├── D3 Force Layout (nodes: actors/goals/tasks/interactions/gaps)
    └── Real-time Updates (gentle simulation reheat on delta)
```

**Data Flow:** MCP tool call → Storage save/update/delete → emits 'change' event → IPC to renderer (~10ms) → D3 `.join()` transition (~500ms) → visible within ~1s total.

## Core Patterns

### 1. Single Source of Truth: `src/lib/schemas.ts`
- All entity types, Zod schemas, and TypeScript types live here
- Used by MCP tools, storage validation, renderer, and tests
- **Never duplicate types** - import from schemas.ts
- Gap type is visualization-only (not stored)

### 2. Storage Layer: `src/lib/storage.ts` (JSONStorage)
- **EventEmitter pattern:** All mutations emit `StorageChangeEvent`
- **Atomic writes:** temp file + rename to prevent corruption
- **In-memory cache:** Fast reads without disk I/O
- **Zod validation:** All entities validated on save/update
- Platform-specific locations: `app.getPath('userData')/.screenplay/`
- Separate JSON file per entity type: `actors.json`, `goals.json`, etc.

### 3. MCP Tools: `src/mcp-server/tools.ts` (783 lines, 32 tools)
**Pattern for all tools:**
1. Define with Zod schema (use `.describe()` for agent-facing clarity)
2. Create/update entity with timestamps (`created_at`, `updated_at`)
3. Call `storage.save()`, `storage.update()`, or `storage.delete()`
4. Storage emits → renderer updates automatically
5. Return `JSON.stringify({ success: true, data: entity })`

**Tool categories:**
- **Phase 1 (5):** Basic CRUD (`define_actor`, `define_goal`, `delete_actor`, `get_full_model`, `clear_model`)
- **Phase 2 (15):** Full CRUD for all 6 entity types
- **Phase 2.5 (7):** Composition tools (`assign_goal_to_actor`, `add_interaction_to_task`, `record_journey_step`, etc.) - all idempotent
- **Phase 3 (5):** Query/analytical tools (`find_actors_without_ability`, `actor_can_achieve_goal`, `find_unachievable_goals`, etc.) - pure functions in `src/lib/queries.ts`

### 4. Gap Detection: Server-side computation
**Algorithm in `computeGaps()` (tools.ts:567+):**
- Scans `goal.assigned_to[]` for missing actors
- Scans `task.composed_of[]` for missing interactions
- Scans `journey.actor_id`, `journey.goal_ids[]`, `journey.steps[].task_id` for missing entities
- Returns `Gap[]` with `{ id, expected_type, referenced_by[] }`
- Renderer duplicates logic client-side for real-time updates

### 5. D3 Visualization: `renderer/app.js` (708 lines)
**Node types & colors (color-blind safe):**
- Actor: Circle, `#2563EB` (blue-600), radius 20px
- Goal: Square, `#059669` (green-600), 30×30px
- Task: Triangle, `#7C3AED` (purple-600), size 25px
- Interaction: Diamond, `#EA580C` (orange-600), size 20px
- Gap: Dashed circle, `#DC2626` (red-600), "?", radius 15px

**Update pattern:**
```javascript
d3.selectAll('.node')
  .data(nodes, d => d.id)
  .join(
    enter => /* fade in */,
    update => /* update in place */,
    exit => /* fade out */
  );
simulation.alpha(0.3).restart(); // Gentle reheat, not full chaos
```

**Force configuration:** link distance=120, charge=-200, collision radius=50 (tuned for readability from 15ft)

## Developer Workflows

### Build & Run
```bash
npm ci                   # Install dependencies (Node 20+)
npm run build            # Compile TypeScript (src/ → dist/)
npm start                # Build + launch Electron with MCP server
```

**Expected behavior:** Electron window opens, DevTools auto-open, header shows MCP URL (e.g., `http://localhost:3000/mcp`)

### Testing
```bash
npm run test:e2e                    # Run all E2E tests (app must be running)
npm run test:e2e:slow               # Add 2s delay between steps
npm run test:e2e -- --delay=5000    # Custom delay for visual inspection
STEP_DELAY=3000 npm run test:e2e    # Via env variable
```

**Critical:** The Electron app must be running (`npm start`) before running tests. Tests connect to `http://localhost:3000/mcp` using the MCP SDK.

**Test structure:**
- `src/tests/run-all-scenarios.ts` - Main runner, parses `--delay` flag
- `src/tests/harness/` - MCP client wrapper + ScenarioRunner framework
- `src/tests/scenarios/` - Individual test scenarios (3 files, 55 steps total)

**Writing new tests:**
```typescript
import { MCPClient, ScenarioRunner } from '../harness/index.js';
export default async function myScenario(client: MCPClient) {
  const runner = new ScenarioRunner('Test description');
  runner
    .step('step 1', async () => {
      const result = await client.callTool('tool_name', { args });
      // assertions
    })
    .step('step 2', async () => { /* ... */ });
  await runner.run();
}
```

### Packaging
```bash
npm run package          # Unpacked app for testing (release/ dir)
npm run package:mac      # macOS .dmg and .zip
npm run package:win      # Windows installer and portable .exe
npm run package:linux    # Linux AppImage and .deb
```
First-time packaging downloads platform binaries (~200MB).

### Release Procedure
**Creating a new release (e.g., 1.0.1):**

1. **Bump version** in package.json
2. **Clean build:**
   ```bash
   npm run clean && npm run build
   ```
3. **Run tests:**
   ```bash
   npm start    # In background
   npm run test:e2e    # All 32 tools must pass
   # Stop app after tests
   ```
4. **Package all platforms** (parallel):
   ```bash
   npm run package:mac
   npm run package:win
   npm run package:linux
   ```
5. **Commit and tag:**
   ```bash
   git add package.json
   git commit -m "chore: bump version to X.Y.Z for release

   - Updated package.json version from A.B.C to X.Y.Z
   - All tests passing (32 tools verified)
   - Packages built for macOS, Windows, and Linux"

   git tag RELEASE_X_Y_Z
   git push && git push --tags
   ```

6. **Create GitHub release:**
   ```bash
   # Create draft release
   gh release create RELEASE_X_Y_Z --title "Release X.Y.Z" --notes "Release notes" --draft

   # Upload assets (takes ~5 minutes)
   gh release upload RELEASE_X_Y_Z \
     "release/screenplay-visualizer_X.Y.Z_arm64.deb" \
     "release/Screenplay Visualizer-X.Y.Z-arm64-mac.zip" \
     "release/Screenplay Visualizer-X.Y.Z-arm64.AppImage" \
     "release/Screenplay Visualizer Setup X.Y.Z.exe"

   # Publish
   gh release edit RELEASE_X_Y_Z --draft=false
   ```

**Tag format:** `RELEASE_X_Y_Z` (underscores, not dots)

## Project-Specific Conventions

### Timestamps
- Always use ISO strings: `new Date().toISOString()`
- Set `created_at` on creation, `updated_at` on all mutations

### IDs
- UUIDs (uuid v4) for all entity IDs
- Allow non-existent IDs in relationships to create gaps (intentional)

### Tool Parameter Design
- Use Zod `.describe()` extensively for agent-facing clarity
- Make relationships explicit: `assigned_to: z.array(z.string().uuid()).describe('Actor IDs (may reference non-existent actors)')`

### Error Handling
- Storage layer throws on not found / validation errors
- Tools return `{ success: true, data }` or let errors propagate
- Renderer logs to console with `[Renderer]` prefix
- Main process logs with `[Main]` prefix

### ES Modules
- `"type": "module"` in package.json
- Use `.js` extensions in imports (even for `.ts` files)
- Two tsconfig files: `tsconfig.json` (main + tests), `tsconfig.preload.json` (preload only)

## Integration Points

### IPC Channels
- `'server-started'` (Main → Renderer): Sends MCP URL on window load
- `'model-updated'` (Main → Renderer): Forwards storage change events
- `'get-model'` (Renderer → Main): Fetches full model on init
- `'clear-model'` (Renderer → Main): Test cleanup only

### Preload API (`window.screenplay`)
- `onServerStarted(callback)` - Receives MCP URL
- `onModelUpdate(callback)` - Receives change events
- `getModel()` - Returns full model (Promise)

### MCP Server
- FastMCP with `httpStream` transport (stateless mode)
- Endpoint: `/mcp` on dynamic port (≥3000)
- JSON-RPC 2.0 envelopes handled by MCP SDK client

## Critical Files Reference

- **Entity schemas:** `src/lib/schemas.ts` (84 lines)
- **Storage implementation:** `src/lib/storage.ts` (180 lines)
- **Query helpers:** `src/lib/queries.ts` (257 lines, Phase 3)
- **MCP tools:** `src/mcp-server/tools.ts` (783 lines, 32 tools)
- **Gap computation:** `tools.ts` line 567+
- **Main process:** `src/main.ts` (170 lines)
- **Preload bridge:** `src/preload.ts` (35 lines)
- **D3 visualization:** `renderer/app.js` (708 lines)
- **Test framework:** `src/tests/harness/runner.ts` + `mcp-client.ts`
- **Example scenario:** `src/tests/scenarios/comprehensive-crud-and-composition.ts` (551 lines)

## What We're NOT Building

- Multi-user collaboration (single-screen ensemble only)
- Undo/redo (LLM conversation is the undo mechanism)
- Git integration / version control
- Export to SVG/PNG (screenshot if needed)
- Custom layout algorithms (force layout handles everything)
- Search/filter UI (model should stay small enough to see all at once)

## Troubleshooting

**Port conflicts:** Adjust `findAvailablePort()` start port in `src/main.ts`

**Data not updating:** Check DevTools console for `[Main]` and `[Renderer]` logs, verify storage change events being forwarded via IPC

**Test failures:** Ensure Electron app is running before tests, check MCP endpoint is `http://localhost:3000/mcp`

**JSON validation errors:** Hand-editing JSON files requires valid Zod schemas; use `clear_model` tool or delete JSON files to reset

## Ready to Ship

**Status:** All 32 tools implemented, 2 comprehensive test scenarios (55 steps), all passing. System is production-ready for ensemble coding sessions. Phase 4 (advanced visualization tools) can be added based on usage feedback.

For detailed technical specs, see `SPEC.md`. For AI-specific guidance, see `CLAUDE.md`. For real-world usage example, see `bookkeeping-conversation.md`.
