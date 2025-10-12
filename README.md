# Screenplay Visualizer

**Phase 1: Walking Skeleton**

A real-time visualization tool for ensemble coding sessions. Combines an MCP server with an Electron-based D3 force layout to show the screenplay model as it evolves during team discussions.

## Architecture

```
Electron App
├── Main Process
│   ├── FastMCP Server (HTTP streaming on localhost:3000)
│   ├── JSONStorage (EventEmitter-based, persisted to ~/.screenplay/)
│   └── IPC Bridge to Renderer
└── Renderer Process
    ├── D3 Force Layout Visualization
    └── Real-time Updates (<1s latency)
```

## Installation

```bash
npm install
```

## Running the Application

```bash
npm start
```

This will:
1. Compile TypeScript to JavaScript
2. Launch Electron with the MCP server
3. Open the visualization window
4. Display the MCP server URL in the header (e.g., `http://localhost:3000/mcp`)

**Note:** The first time you run it, Electron may take a few moments to initialize. Look for the Screenplay Visualizer window to open.

## Testing

### Automated E2E Tests

Run the automated test suite:

```bash
npm run test:e2e
```

This will:
1. Build the project
2. Connect to the running MCP server at `http://localhost:3000/mcp`
3. Execute all test scenarios
4. Verify tool behavior and data consistency

**Note:** The Electron app must be running (`npm start`) before running tests.

#### Slow Mode for Visual Verification

To watch the visualizer animations in real-time while tests run, use slow mode:

```bash
# Run with 2 second delay between steps (default)
npm run test:e2e:slow

# Or specify a custom delay in milliseconds
npm run test:e2e -- --delay=3000

# Or use environment variable
STEP_DELAY=5000 npm run test:e2e
```

This adds a configurable delay between each test step, allowing you to:
- Watch the animations execute
- Verify the force layout updates correctly
- Observe node transitions and edge changes
- Debug visual issues

The test output will indicate when slow mode is enabled:
```
🐢 Slow mode enabled: 2000ms delay between steps
```

### Adding New Test Scenarios

Create new test files in `src/tests/scenarios/` following this pattern:

```typescript
import { MCPClient, assert, uniqueName } from '../harness/mcp-client.js';
import { ScenarioRunner } from '../harness/runner.js';

export default async function myScenario(client: MCPClient) {
  const runner = new ScenarioRunner('My test scenario');

  runner
    .step('step description', async () => {
      const result = await client.callTool('tool_name', { /* args */ });
      assert(result.id, 'Should return an id');
    })
    .step('another step', async () => {
      // More assertions...
    });

  await runner.run();
}
```

Then add it to `src/tests/run-all-scenarios.ts`.

### Manual Testing with MCP

The MCP server can be tested directly using the Model Context Protocol. The easiest way is to use Claude Desktop or another MCP client. For direct HTTP testing, you'll need to use the FastMCP httpStream protocol with JSON-RPC 2.0 envelopes.

**Available Tools:**
- `define_actor` - Create a new actor with abilities and constraints
- `define_goal` - Create a goal with success criteria and priority
- `delete_actor` - Delete an actor by ID
- `get_full_model` - Retrieve all entities and computed gaps
- `clear_model` - Clear all data (for testing)

**Example workflow:**
1. Create an actor → blue circle appears in visualization
2. Create a goal assigned to that actor → green square appears with gray edge to actor
3. Create a goal with a non-existent actor UUID → green square with red dashed edge to "?" gap node
4. Delete the actor → actor fades out, edges become red dashed gap edges
5. Get full model → returns all entities plus computed gaps

All visualization updates appear within ~1 second of the tool call.

## Phase 1 Acceptance Criteria

- [x] Electron starts and shows MCP server URL in header
- [x] `define_actor` tool call creates a blue circle node
- [x] `define_goal` tool call creates a green square node with edge to actor
- [x] `define_goal` with non-existent actor UUID creates gap node and red dashed edge
- [x] `delete_actor` removes actor and converts edges to gaps (dashed red)
- [x] `get_full_model` returns all entities and computed gaps
- [x] `clear_model` clears all data for test cleanup
- [x] All updates appear in visualization within 1 second
- [x] Force layout keeps nodes properly spaced and readable
- [x] E2E test harness validates all Phase 1 tools

## Visual Design

### Node Types

- **Actor** - Blue circle (radius 20px)
- **Goal** - Green square (30×30px)
- **Task** - Purple triangle (size 25px) [Phase 2]
- **Interaction** - Orange diamond (size 20px) [Phase 2]
- **Gap** - Red dashed circle with "?" (radius 15px)

### Edge Types

- **Goal Assignment** - Gray solid line (Actor → Goal)
- **Task Composition** - Purple solid line (Task → Interaction) [Phase 2]
- **Gap Reference** - Red dashed line (Any → Gap)

### Colors (Color-blind safe)

- Actor: `#2563EB` (blue-600)
- Goal: `#059669` (green-600)
- Task: `#7C3AED` (purple-600)
- Interaction: `#EA580C` (orange-600)
- Gap: `#DC2626` (red-600)

### Fonts

- Labels: 18px (readable from 15 feet)
- Tooltips: 24px (click to show, click outside to hide)

## Data Storage

All entities are persisted to platform-specific application data directories:

**macOS:** `~/Library/Application Support/screenplay-visualizer/.screenplay/`
**Linux:** `~/.config/screenplay-visualizer/.screenplay/`
**Windows:** `%APPDATA%/screenplay-visualizer/.screenplay/`

Files stored:
```
.screenplay/
├── actors.json
├── goals.json
├── tasks.json
├── interactions.json
├── questions.json
└── journeys.json
```

Files are written atomically (temp file + rename) to prevent corruption.

## Development

### Structure

```
screenplay-visualizer/
├── src/
│   ├── main.ts              # Electron main process
│   ├── preload.ts           # IPC bridge
│   ├── lib/
│   │   ├── schemas.ts       # TypeScript + Zod schemas
│   │   └── storage.ts       # JSONStorage class
│   ├── mcp-server/
│   │   └── tools.ts         # MCP tool definitions
│   └── tests/
│       ├── run-all-scenarios.ts  # Test runner
│       ├── harness/
│       │   ├── mcp-client.ts     # MCP SDK client wrapper
│       │   └── runner.ts         # Test scenario framework
│       └── scenarios/
│           └── *.ts              # Individual test scenarios
├── renderer/
│   ├── index.html           # UI structure
│   ├── styles.css           # Projection-ready styles
│   └── app.js               # D3 visualization
├── package.json
└── tsconfig.json
```

### Build

```bash
npm run build
```

Compiles TypeScript from `src/` to `dist/`.

### Clean

```bash
npm run clean
```

Removes the `dist/` directory.

## Next Steps (Phase 2)

- [ ] Add remaining CRUD tools (task, interaction, question, journey)
- [ ] Add composition tools (assign_goal_to_actor, compose_task, record_journey_step)
- [ ] Add query tools (find_actors_without_ability, etc.)
- [ ] Add visualization tools (get_actor_capability_map, etc.)
- [ ] Test with realistic model (3 actors, 5 goals, 10 tasks, 20 interactions)

## Next Steps (Phase 3)

- [ ] Connect Claude Code to MCP server
- [ ] Run real ensemble session with team
- [ ] Tune force layout parameters based on conversation flow
- [ ] Address open decisions (clustering, journey visualization, etc.)

## License

MIT
