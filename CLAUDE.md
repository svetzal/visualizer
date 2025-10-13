# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron-based visualization tool for ensemble coding sessions. It combines a FastMCP server with a D3 force layout to display the "Screenplay" specification model as it evolves during team discussions. The visualization is designed to be **projected on a second screen** (readable from across a room) while the team works with Claude Code on screen 1.

**Key Insight:** Gaps (missing references) are features, not bugs. The visualization surfaces what hasn't been discussed yet, prompting the team to fill in missing details.

## Common Commands

### Development
```bash
npm ci                   # Install dependencies (recommended over npm install)
npm run build            # Compile TypeScript (src/ → dist/)
npm start                # Build and launch Electron app with MCP server at :3000/mcp
npm run clean            # Remove dist/ directory
```

**Note:** Node 20+ required (tested with v22.13.0). Package uses ES modules (`"type": "module"`).

### Packaging
```bash
npm run package          # Build unpacked app for testing (release/ directory)
npm run package:mac      # Create macOS .dmg and .zip
npm run package:win      # Create Windows installer and portable .exe
npm run package:linux    # Create Linux AppImage and .deb
```

**Note:** First-time packaging downloads platform binaries (~200MB). Output in `release/` directory.

### Release Procedure
To prepare a new release (e.g., version 1.0.1):

1. **Bump version** in package.json:
   ```bash
   # Edit package.json and change "version" field
   ```

2. **Clean build and test**:
   ```bash
   npm run clean
   npm run build
   npm start                # Start app in background
   # In separate terminal:
   npm run test:e2e         # Run all E2E tests
   # Stop the app when tests complete
   ```

3. **Create packages for all platforms** (can run in parallel):
   ```bash
   npm run package:mac
   npm run package:win
   npm run package:linux
   ```

4. **Commit and tag the release**:
   ```bash
   git add package.json
   git commit -m "chore: bump version to X.Y.Z for release

   - Updated package.json version from A.B.C to X.Y.Z
   - All tests passing (32 tools verified)
   - Packages built for macOS, Windows, and Linux"

   git tag RELEASE_X_Y_Z
   git push && git push --tags
   ```

5. **Create GitHub release**:
   ```bash
   # Create draft release with notes
   gh release create RELEASE_X_Y_Z \
     --title "Release X.Y.Z" \
     --notes "Brief description of changes" \
     --draft

   # Upload release assets
   gh release upload RELEASE_X_Y_Z \
     "release/screenplay-visualizer_X.Y.Z_arm64.deb" \
     "release/Screenplay Visualizer-X.Y.Z-arm64-mac.zip" \
     "release/Screenplay Visualizer-X.Y.Z-arm64.AppImage" \
     "release/Screenplay Visualizer Setup X.Y.Z.exe"

   # Publish the release (removes draft status)
   gh release edit RELEASE_X_Y_Z --draft=false
   ```

**Tag naming convention:** Use `RELEASE_X_Y_Z` format (underscores, not dots) for version tags.

**Verification checklist:**
- [ ] All E2E tests pass (32 tools verified)
- [ ] Packages created in `release/` directory for all three platforms
- [ ] Version bump committed with descriptive message
- [ ] Release tagged following naming convention
- [ ] Tag matches package.json version
- [ ] GitHub release created with assets uploaded
- [ ] Release published (not in draft status)

### Testing
```bash
npm run test:e2e                    # Run automated E2E tests
npm run test:e2e:slow               # Run tests with 2s delay between steps
npm run test:e2e -- --delay=5000    # Run with custom delay (5s)
STEP_DELAY=3000 npm run test:e2e    # Run with env-based delay
```

**IMPORTANT:** The Electron app must be running (`npm start`) before running E2E tests. Tests connect to `http://localhost:3000/mcp` via the MCP SDK.

**Expected Behavior During Tests:**
- Blue circle for actor appears within ~1s
- Assigned goals show gray edges to actors
- Deleting actor fades it out; edges become red dashed gap edges
- Goals remain as green squares; gap nodes appear as red dashed circles with "?"

### Running Single Tests
To run a specific test scenario during development:
```bash
npm run build && node dist/tests/scenarios/define-actor.js
```

Note: Individual scenario files are meant to be imported by `run-all-scenarios.ts`, but can be run directly for debugging.

### Environment Flags (Optional)
```bash
ELECTRON_ENABLE_LOGGING=1 npm start  # Increase Electron logging to stdout
```

Debug storage/model events: Storage emits 'change' events forwarded to renderer via IPC. Check DevTools console for `[Main]` and `[Renderer]` logs.

## Architecture

```
Electron App (Single Process)
├── Main Process (src/main.ts)
│   ├── FastMCP HTTP Server (localhost:3000+)
│   ├── JSONStorage (EventEmitter, in-memory cache)
│   └── IPC Bridge to Renderer
└── Renderer Process (renderer/app.js)
    ├── D3 Force Layout Visualization
    └── Real-time Updates (<1s latency)
```

### Data Flow
1. Team discusses → Claude Code calls MCP tools
2. Tool executes → JSONStorage saves to disk + emits 'change' event
3. Main process forwards event to renderer via IPC (~10ms)
4. Renderer applies delta, triggers D3 transition (~500ms)
5. **Total latency budget: <1s from tool call to visible change**

### Storage Layer

**Location:** Platform-specific application data directory
- macOS: `~/Library/Application Support/screenplay-visualizer/.screenplay/`
- Linux: `~/.config/screenplay-visualizer/.screenplay/`
- Windows: `%APPDATA%/screenplay-visualizer/.screenplay/`

**Files:** `actors.json`, `goals.json`, `tasks.json`, `interactions.json`, `questions.json`, `journeys.json`

**Implementation:** JSONStorage class (src/lib/storage.ts)
- In-memory cache (Map) for fast reads
- Atomic writes (temp file + rename) to prevent corruption
- EventEmitter pattern for real-time updates
- Zod validation on all save/update operations
- All mutations emit StorageChangeEvent forwarded to renderer via IPC channel 'model-updated'

**Factory Reset:** Use the `clear_model` MCP tool or delete JSON files manually while app is stopped.

## Core Data Model

All entities extend the base `Entity` interface with `id`, `name`, `description`, `created_at`, `updated_at`.

**Entity Types:**
- **Actor** - Blue circles, has `abilities[]` and `constraints[]`
- **Goal** - Green squares, has `success_criteria[]`, `priority`, `assigned_to[]` (actor IDs)
- **Task** - Purple triangles, has `required_abilities[]`, `composed_of[]` (interaction IDs)
- **Interaction** - Orange diamonds, has `preconditions[]`, `effects[]`
- **Question** - Has `asks_about` (system state query)
- **Journey** - Has `actor_id`, `goal_ids[]`, `steps[]` (with task references)

**Gap Detection:** When an entity references a non-existent ID (e.g., goal.assigned_to includes missing actor UUID), the visualization creates a red dashed "?" node. The `computeGaps()` function in `src/mcp-server/tools.ts` scans all references and returns computed gaps.

**Schema Definitions:** All TypeScript types and Zod schemas are in `src/lib/schemas.ts`. This is the single source of truth for both MCP tool inputs/outputs and D3 visualization data.

## MCP Tools

**Phase 1 (Complete - 5 tools):**
- `define_actor` - Create actor
- `define_goal` - Create goal (allows missing actor IDs)
- `delete_actor` - Delete actor (creates gaps in assigned goals)
- `get_full_model` - Returns all entities + computed gaps
- `clear_model` - Clears all data (for test cleanup)

**Phase 2 (Complete - 15 tools added):**
- CRUD tools for all entity types: `define_*`, `update_*`, `delete_*`
- Full set: actor, goal, task, interaction, question, journey
- Tools: `update_actor`, `define_task`, `update_task`, `delete_task`, `define_interaction`, `update_interaction`, `delete_interaction`, `update_goal`, `delete_goal`, `define_question`, `update_question`, `delete_question`, `define_journey`, `update_journey`, `delete_journey`

**Phase 2.5 (Complete - 7 tools added):**
- Composition tools for natural conversation flow
- All tools are idempotent (safe to call multiple times)
- Tools: `assign_goal_to_actor`, `unassign_goal_from_actor`, `add_interaction_to_task`, `remove_interaction_from_task`, `record_journey_step`, `add_goal_to_journey`, `remove_goal_from_journey`

**Phase 3 (Complete - 5 query tools added):**
- Query/analytical tools for surfacing insights
- All query logic in `src/lib/queries.ts` (pure functions)
- Tools: `find_actors_without_ability`, `find_tasks_without_interactions`, `find_untested_journeys`, `actor_can_achieve_goal`, `find_unachievable_goals`

**Current Status: 32 tools implemented, 2 comprehensive test scenarios**

**Phase 4 (Future):**
- Visualization tools: `get_actor_capability_map`, `get_journey_flow`, `get_goal_coverage_matrix`, `get_recent_changes`

**Tool Implementation Pattern:**
1. Validate input with Zod schema
2. Create/update entity with timestamps
3. Call `storage.save()` or `storage.update()` or `storage.delete()`
4. Storage emits 'change' event → renderer updates
5. Return `{ success: true, data: entity }` as JSON string

## Visualization Design

**Node Shapes & Colors (color-blind safe):**
- Actor: Circle, `#2563EB` (blue-600), radius 20px
- Goal: Square, `#059669` (green-600), 30×30px
- Task: Triangle, `#7C3AED` (purple-600), size 25px
- Interaction: Diamond, `#EA580C` (orange-600), size 20px
- Gap: Dashed circle, `#DC2626` (red-600), "?", radius 15px

**Edge Types:**
- Goal Assignment (Actor → Goal): Gray solid line
- Task Composition (Task → Interaction): Purple solid line
- Gap Reference (Any → Gap): Red dashed line

**Projection-Ready Styling:**
- Labels: 18px font (readable from 15 feet)
- Tooltips: 24px font (click to show, not hover)
- High contrast colors throughout
- Zoom: 0.5x to 2x, mouse wheel
- Pan: Click-drag background

## Testing Strategy

### Test Harness (src/tests/)

**Structure:**
- `run-all-scenarios.ts` - Main test runner, parses `--delay` flag
- `harness/mcp-client.ts` - MCP SDK client wrapper with helper methods
- `harness/runner.ts` - ScenarioRunner framework for step-by-step tests
- `scenarios/*.ts` - Individual test scenarios

**Writing New Tests:**
1. Create file in `src/tests/scenarios/`
2. Import `MCPClient`, `assert`, `uniqueName` from harness
3. Use `ScenarioRunner` to define steps:
```typescript
export default async function myScenario(client: MCPClient) {
  const runner = new ScenarioRunner('My test description');

  runner
    .step('step description', async () => {
      const result = await client.callTool('tool_name', { args });
      assert(result.field, 'Should have field');
    })
    .step('verify state', async () => {
      const model = await client.getFullModel();
      assert(model.actors.length === 1, 'Should have one actor');
    });

  await runner.run();
}
```
4. Add to imports in `run-all-scenarios.ts`
5. Add to scenario list with delay support

**Slow Mode:** Pass `--delay=N` or set `STEP_DELAY=N` to add delays between steps. Useful for watching animations during test execution.

### Complex Test Example

See `src/tests/scenarios/bookkeeping-full-graph.ts` for a comprehensive example that:
- Creates 4 actors (Bookkeeper, Client, Bank, CRA)
- Creates 6 goals across actors
- Includes intentional gaps (non-existent actors)
- Verifies gap detection and evolution
- Demonstrates realistic ensemble model building

## Key Implementation Details

### Main Process (src/main.ts)
- Initializes JSONStorage on app startup
- Starts FastMCP server on dynamic port (≥3000)
- Creates BrowserWindow with preload script
- Forwards storage 'change' events to renderer via IPC
- Provides 'get-model' IPC handler for initial state
- DevTools auto-opens for development debugging

### Preload (src/preload.ts)
- Exposes `window.screenplay` API to renderer
- Methods: `onServerStarted()`, `onModelUpdate()`, `getModel()`
- Uses contextBridge for security (contextIsolation: true, nodeIntegration: false)

### Renderer (renderer/app.js)
- Implements D3 v3 force layout simulation
- Handles `.join()` pattern for smooth enter/update/exit transitions
- Computes gaps client-side using same logic as server
- Builds edges dynamically based on entity relationships
- Gentle simulation reheat (alpha=0.3) on updates to avoid chaos
- D3 forces: link distance=100, charge=-300, collision radius=30
- Labels are large for projection readability

### Data and Schema Guarantees
- Zod schemas validate all entities on load and save
- Hand-editing JSON files: Invalid entities will fail to load
- Goal.assigned_to intentionally tolerates non-existent actor references to create gaps
- Use UUIDs (uuid v4) for entity IDs
- Always set created_at and updated_at to ISO strings
- Update updated_at on all mutations

### Gap Computation Algorithm
The `computeGaps()` function scans:
1. `goal.assigned_to[]` for missing actors
2. `task.composed_of[]` for missing interactions
3. `journey.actor_id` for missing actor
4. `journey.goal_ids[]` for missing goals
5. `journey.steps[].task_id` for missing tasks

Returns array of `{ id, expected_type, referenced_by[] }` objects.

## TypeScript Configuration

Two tsconfig files:
- `tsconfig.json` - Main process and tests (src/ → dist/)
- `tsconfig.preload.json` - Preload script only

Both use ES modules (`"type": "module"` in package.json), output to `dist/`, target ES2020.

## Code Style and Conventions

- TypeScript in `src/` compiled with strict-ish checks (see tsconfig.json)
- Use Zod for runtime validation at IO boundaries
- Keep tool parameter schemas precise and descriptive (use `.describe()`) for agent-facing clarity
- Use uuid v4 for entity IDs
- Set created_at and updated_at to ISO strings; update updated_at on mutations
- Tests reuse model types from `src/lib/schemas.ts` (import types from lib to prevent drift)

## Troubleshooting

**Electron fails to start in headless/CI:**
- Need a display server or xvfb. Locally, macOS/Windows/Linux GUIs work out of the box.

**Port conflicts on 3000:**
- Adjust starting port in `src/main.ts` (`findAvailablePort` function)
- Update tests and documentation accordingly

**JSON-RPC errors on /mcp:**
- Use the E2E test harness as reference
- FastMCP httpStream transport expects proper JSON-RPC 2.0 envelopes with session management
- MCP SDK client handles this automatically

**Data not updating on screen:**
- Ensure main window is open
- Check DevTools console logs for `[Main]` and `[Renderer]` messages
- Verify storage change events are being forwarded via IPC
- Confirm JSON files under userData are writable

## Phase Status

**Phase 1 (Complete):** Walking skeleton with 5 core tools, E2E test harness
**Phase 2 (Complete):** Full CRUD tools for all 6 entity types (15 tools added)
**Phase 2.5 (Complete):** Composition tools for natural conversation flow (7 tools added)
**Phase 3 (Complete):** Query/analytical tools to surface insights (5 tools added)
**Current State:** 32 tools, ~2,400 lines of TypeScript, 2 comprehensive test scenarios
**Ready for real ensemble coding sessions!**
**Phase 4 (Planned):** Advanced visualization and analysis tools (based on usage feedback)

## File References

- Entity schemas: `src/lib/schemas.ts`
- Storage implementation: `src/lib/storage.ts`
- Query helpers (Phase 3): `src/lib/queries.ts`
- MCP tool registration: `src/mcp-server/tools.ts` (565+ lines, 27 tools)
- Gap computation: `src/mcp-server/tools.ts:567`
- D3 visualization: `renderer/app.js`
- Test client wrapper: `src/tests/harness/mcp-client.ts`
- Test runner framework: `src/tests/harness/runner.ts`
- Comprehensive test scenario: `src/tests/scenarios/comprehensive-crud-and-composition.ts` (551 lines)
- Query tools test scenario: `src/tests/scenarios/query-tools.ts` (Phase 3 tests)

## Quick Start

```bash
git clone <repo> && cd visualizer
npm ci
npm start                # Opens Electron, starts MCP server on :3000/mcp
# In second terminal:
npm run test:e2e         # Runs automated test suite
# Or:
npm run test:e2e:slow    # Adds delays to watch visualization changes
```

Observe expected node/edge changes in the app window within ~1s.
