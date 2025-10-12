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

## Phase 1 Testing

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

Test the MCP server directly using curl (requires the app to be running):

### 1. Create an Actor

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "define_actor",
      "arguments": {
        "name": "Admin",
        "description": "System administrator",
        "abilities": ["manage_users", "configure_system"],
        "constraints": ["requires_authentication"]
      }
    }
  }'
```

**Expected Result:** A blue circle labeled "Admin" appears in the force layout within 1 second.

### 2. Create a Goal

First, copy the `id` from the actor response above (e.g., `abc-123-def`), then:

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "define_goal",
      "arguments": {
        "name": "User Management",
        "description": "Manage all users in the system",
        "success_criteria": ["Users can be created", "Users can be deleted"],
        "priority": "high",
        "assigned_to": ["<ACTOR_ID_HERE>"]
      }
    }
  }'
```

**Expected Result:** A green square labeled "User Management" appears, with a gray edge connecting it to the Admin actor.

### 3. Create a Goal with Non-Existent Actor

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "define_goal",
      "arguments": {
        "name": "Advanced Analytics",
        "description": "Provide analytics dashboards",
        "success_criteria": ["Dashboard loads in <2s"],
        "priority": "medium",
        "assigned_to": ["fake-actor-id-123"]
      }
    }
  }'
```

**Expected Result:** A green square (goal) appears, with a dashed red edge connecting to a red dashed circle labeled "?" (gap node).

### 4. Delete the Actor

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "delete_actor",
      "arguments": {
        "id": "<ACTOR_ID_HERE>"
      }
    }
  }'
```

**Expected Result:** The Admin actor fades out (300ms), the edge to "User Management" turns into a dashed red gap edge, and the goal remains.

### 5. Get Full Model

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "get_full_model",
      "arguments": {}
    }
  }'
```

**Expected Result:** Returns JSON with all entities and computed gaps.

## Phase 1 Acceptance Criteria

- [x] Electron starts and shows MCP server URL in header
- [x] `define_actor` tool call creates a blue circle node
- [x] `define_goal` tool call creates a green square node with edge to actor
- [x] `delete_actor` removes actor and converts edge to gap (dashed red)
- [x] All updates appear in visualization within 1 second
- [x] Force layout keeps nodes properly spaced and readable

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

All entities are persisted to:
```
~/.config/screenplay-visualizer/.screenplay/
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
