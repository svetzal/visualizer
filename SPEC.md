# Screenplay MCP Server + Electron Visualizer

**Context:** Single-screen ensemble coding where 4-6 people discuss software behavior with one Claude Code instance. Screen 1: Claude Code + evolving prototype. Screen 2 (projected): This visualization showing the specification model as it grows. The visualization must be **readable from across a room** and **update fast enough to feel responsive to conversation**.

## Core Insight

Gaps are features, not bugs. The visualization surfaces what hasn't been discussed yet. A task referencing a non-existent interaction shows as a dangling edge—this prompts the team to realize "wait, how does login actually work?"

## Architecture

```
Electron App (Single Process, No Network Concerns)
├── Main Process
│   ├── FastMCP Server (localhost, dynamic port ≥3000)
│   ├── JSONStorage (EventEmitter, in-memory cache)
│   └── IPC Bridge to Renderer
└── Renderer Process
    ├── Single-Page App (tabs but no navigation)
    ├── D3 Force Layout (primary view)
    └── Real-time Updates (300-500ms animations)
```

**Data Flow:**

1. Team discusses → Claude Code calls MCP tools → Storage updates + emits event
2. Main forwards event to Renderer via IPC (~10ms)
3. Renderer applies delta, triggers D3 .join() transition (~500ms)
4. **Total latency budget: <1s from tool call to visible change**

## Unified Data Model

Use these TypeScript interfaces for **both** MCP tool inputs/outputs **and** D3 visualization data. Zod schemas mirror these exactly.

```typescript
// Base for all entities
interface Entity {
  id: string;              // UUID - concept anchor
  name: string;            // Human label
  description: string;     // Free text
  created_at: string;      // ISO timestamp
  updated_at: string;      // ISO timestamp
}

interface Actor extends Entity {
  abilities: string[];     // What they can do
  constraints: string[];   // What prevents them
}

interface Goal extends Entity {
  success_criteria: string[];
  priority: "low" | "medium" | "high";
  assigned_to: string[];   // Actor IDs (may reference missing actors)
}

interface Task extends Entity {
  required_abilities: string[];
  composed_of: string[];   // Interaction IDs (may reference missing interactions)
}

interface Interaction extends Entity {
  preconditions: string[];
  effects: string[];
}

interface Question extends Entity {
  asks_about: string;      // What system state this queries
}

interface Journey extends Entity {
  actor_id: string;        // May reference missing actor
  goal_ids: string[];      // May reference missing goals
  steps: JourneyStep[];
}

interface JourneyStep {
  task_id: string;         // May reference missing task
  outcome: string;
  timestamp: string;       // ISO timestamp
}

// Visualization-specific (not stored)
interface Gap {
  id: string;              // UUID of the missing entity
  expected_type: "actor" | "goal" | "task" | "interaction";
  referenced_by: string[]; // IDs of entities that reference this gap
}
```

**Gap Handling:**

- When rendering, if `task.composed_of` includes unknown ID, D3 creates a `Gap` node
- Gap nodes render as dashed circles with "?" and the expected type
- Clicking a gap shows "Referenced by: Task A, Task B" in tooltip
- When the missing entity is defined, gap node morphs into real node (same UUID, smooth transition)

## Storage Layer

**Location:** `app.getPath('userData')/.screenplay/` (platform-specific app data directory)

**Files:**

- `actors.json`, `goals.json`, `tasks.json`, `interactions.json`, `questions.json`, `journeys.json`
- Each file contains `Entity[]` (empty array if not exists)

**JSONStorage Class:**

```javascript
class JSONStorage extends EventEmitter {
  constructor(basePath) {
    this.cache = new Map(); // type -> Entity[]
    this.basePath = basePath;
  }

  async load(type) {
    // Read file, parse, cache, return Entity[]
  }

  async save(type, entity) {
    // Validate with Zod
    // Add to cache
    // Atomic write (temp file + rename)
    // Emit: { type: "create", entity: type, data: entity }
  }

  async update(type, id, partial) {
    // Find in cache, merge, validate, write
    // Emit: { type: "update", entity: type, data: updated }
  }

  async delete(type, id) {
    // Remove from cache, write
    // Emit: { type: "delete", entity: type, data: { id } }
  }

  async getAll(type) {
    // Return from cache (load if not present)
  }
}
```

**Event Format:**

```javascript
{
  type: "create" | "update" | "delete",
  entity: "actor" | "goal" | "task" | "interaction" | "question" | "journey",
  data: Entity | { id: string }
}
```

## MCP Tool Specification

**Philosophy:** Tools are thin wrappers around storage. Validation happens in storage layer. Tools return immediately after emitting change event.

### CRUD Tools (18 total)

**Creation Pattern:**

```javascript
define_actor({ name, description, abilities, constraints })
  → storage.save("actor", { id: uuid(), name, description, abilities, constraints, created_at: now(), updated_at: now() })
  → { success: true, data: Actor }
```

**Update Pattern:**

```javascript
update_actor({ id, name?, description?, abilities?, constraints? })
  → storage.update("actor", id, { ...partials, updated_at: now() })
  → { success: true, data: Actor }
```

**Deletion Pattern:**

```javascript
delete_actor({ id })
  → storage.delete("actor", id)
  → { success: true, data: { id } }
```

Apply this pattern to: `actor`, `goal`, `task`, `interaction`, `question`, `journey`

### Composition Tools (3)

```javascript
assign_goal_to_actor({ actor_id, goal_id })
  → goal = storage.get("goal", goal_id)
  → goal.assigned_to.push(actor_id) // Does NOT validate actor exists
  → storage.update("goal", goal_id, { assigned_to: goal.assigned_to })
  → { success: true, data: Goal }

compose_task({ task_id, interaction_ids })
  → storage.update("task", task_id, { composed_of: interaction_ids })
  → { success: true, data: Task }

record_journey_step({ journey_id, task_id, outcome })
  → journey = storage.get("journey", journey_id)
  → journey.steps.push({ task_id, outcome, timestamp: now() })
  → storage.update("journey", journey_id, { steps: journey.steps })
  → { success: true, data: Journey }
```

### Query Tools (5)

```javascript
find_actors_without_ability({ ability })
  → actors = storage.getAll("actor")
  → return actors.filter(a => !a.abilities.includes(ability))

find_unachievable_goals({ actor_id? })
  → For each goal, check if any assigned actor has all required abilities for at least one task
  → Return goals that fail this check

find_tasks_without_interactions()
  → tasks = storage.getAll("task")
  → return tasks.filter(t => t.composed_of.length === 0)

find_untested_journeys()
  → journeys = storage.getAll("journey")
  → return journeys.filter(j => j.steps.length === 0)

actor_can_achieve_goal({ actor_id, goal_id })
  → Get goal, get tasks that lead to goal, check if actor has required abilities
  → return { can_achieve: boolean, reason: string }
```

### Visualization Tools (6)

```javascript
get_full_model()
  → Return { actors[], goals[], tasks[], interactions[], questions[], journeys[], gaps[] }
  → gaps[] computed by scanning all references and collecting missing IDs

get_actor_capability_map()
  → Return { actors[], goals[], edges: [{ actor_id, goal_id, can_achieve: boolean }] }

get_journey_flow({ journey_id })
  → Return journey + hydrated actor/goals/tasks (include gaps if refs missing)

get_interaction_dependencies({ task_id? })
  → Return { tasks[], interactions[], edges: [{ task_id, interaction_id }] }

get_goal_coverage_matrix()
  → Return { actors[], goals[], matrix: boolean[][] } where matrix[i][j] = actor i can achieve goal j

get_recent_changes({ since_timestamp? })
  → Default since_timestamp = now() - 1 hour
  → Return changes from storage event log (store last 100 events in memory)
```

## Electron Implementation

**Main Process (src/main.ts):**

```javascript
import { app, BrowserWindow, ipcMain } from 'electron';
import { McpServer } from 'fastmcp';
import { JSONStorage } from './lib/storage.js';
import { registerTools } from './mcp-server/tools/index.js';

let mainWindow;
let storage;
let server;
let serverPort;

app.on('ready', async () => {
  // Initialize storage
  const dataPath = app.getPath('userData') + '/.screenplay';
  storage = new JSONStorage(dataPath);
  await storage.initialize();

  // Start MCP server
  server = new McpServer();
  registerTools(server, storage);
  serverPort = await findAvailablePort(3000);
  await server.listen(serverPort);

  // Create window
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('renderer/index.html');

  // Forward storage events to renderer
  storage.on('change', (event) => {
    mainWindow.webContents.send('model-updated', event);
  });

  // Send server URL
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('server-started', `http://localhost:${serverPort}/mcp`);
  });

  // IPC handlers
  ipcMain.handle('get-model', async () => {
    return {
      actors: await storage.getAll('actor'),
      goals: await storage.getAll('goal'),
      tasks: await storage.getAll('task'),
      interactions: await storage.getAll('interaction'),
      questions: await storage.getAll('question'),
      journeys: await storage.getAll('journey')
    };
  });
});
```

**Preload (preload.js):**

```javascript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('screenplay', {
  onServerStarted: (callback) => ipcRenderer.on('server-started', (_, url) => callback(url)),
  onModelUpdate: (callback) => ipcRenderer.on('model-updated', (_, event) => callback(event)),
  getModel: () => ipcRenderer.invoke('get-model')
});
```

## Renderer: D3 Force Layout Strategy

**Goal:** Single zoomable/pannable canvas showing all entities. Force layout keeps related items close, unrelated items apart.

**Node Types:**

- **Actor** (circle, blue, radius=20)
- **Goal** (square, green, size=30)
- **Task** (triangle, purple, size=25)
- **Interaction** (diamond, orange, size=20)
- **Gap** (dashed circle, red, radius=15, "?")

**Edge Types:**

- **Goal Assignment** (Actor → Goal, solid gray)
- **Task Composition** (Task → Interaction, solid purple)
- **Can Achieve** (Actor → Goal, dashed green, only if true)
- **Gap Reference** (Any → Gap, dashed red)

**Force Configuration:**

```javascript
const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(edges).id(d => d.id).distance(100))
  .force('charge', d3.forceManyBody().strength(-300))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide().radius(30));
```

**Update Pattern:**

```javascript
function updateVisualization(model) {
  // Compute gaps
  const gaps = findGaps(model);
  const nodes = [...model.actors, ...model.goals, ...model.tasks, ...model.interactions, ...gaps];
  const edges = buildEdges(model, gaps);

  // Bind data
  const nodeSelection = svg.selectAll('.node')
    .data(nodes, d => d.id)
    .join(
      enter => enter.append('g').attr('class', 'node')
        .call(renderNode)
        .style('opacity', 0)
        .transition().duration(500).style('opacity', 1),
      update => update.call(renderNode),
      exit => exit.transition().duration(300).style('opacity', 0).remove()
    );

  const edgeSelection = svg.selectAll('.edge')
    .data(edges, d => d.source.id + '-' + d.target.id)
    .join(/* similar pattern */);

  // Restart simulation with new nodes
  simulation.nodes(nodes);
  simulation.force('link').links(edges);
  simulation.alpha(0.3).restart(); // Gentle reheat, not full restart
}

function findGaps(model) {
  const allIds = new Set([...model.actors, ...model.goals, ...model.tasks, ...model.interactions].map(e => e.id));
  const gaps = new Map();

  // Check goal.assigned_to
  model.goals.forEach(goal => {
    goal.assigned_to.forEach(actor_id => {
      if (!allIds.has(actor_id)) {
        gaps.set(actor_id, { id: actor_id, expected_type: 'actor', referenced_by: [...(gaps.get(actor_id)?.referenced_by || []), goal.id] });
      }
    });
  });

  // Check task.composed_of
  model.tasks.forEach(task => {
    task.composed_of.forEach(interaction_id => {
      if (!allIds.has(interaction_id)) {
        gaps.set(interaction_id, { id: interaction_id, expected_type: 'interaction', referenced_by: [...(gaps.get(interaction_id)?.referenced_by || []), task.id] });
      }
    });
  });

  // Similar for journey.actor_id, journey.goal_ids, journey.steps[].task_id

  return Array.from(gaps.values());
}
```

**Visual Design for Projection:**

- **Fonts:** 18px labels (readable from 15ft)
- **Colors:** High contrast, color-blind safe
    - Actor: `#2563EB` (blue-600)
    - Goal: `#059669` (green-600)
    - Task: `#7C3AED` (purple-600)
    - Interaction: `#EA580C` (orange-600)
    - Gap: `#DC2626` (red-600)
- **Tooltips:** 24px font, show on click (not hover—projected screen)
- **Zoom:** Mouse wheel, min=0.5x, max=2x
- **Pan:** Click-drag background

**Secondary Views (current vs future):**

- Implemented now: Force Layout (primary, always visible) with header counters (Actors, Goals, Tasks, Interactions, Gaps)
- Deferred to future phases: Timeline (recent changes), Coverage Matrix (actors × goals), detailed Stats panels

Note: Keep 90% of screen time on the Force Layout; add the other views in later phases once we have real usage data.

## Phase 1: Walking Skeleton

**Acceptance Criteria (implemented):**

1. Electron starts and shows the MCP server URL in the header (e.g., http://localhost:3000/mcp).
2. Using the simple test API on http://localhost:3001:
   - POST /test/define_actor creates an actor; a blue circle appears within ~1s.
   - POST /test/define_goal with assigned_to including the actor ID creates a goal; a green square appears with a gray edge to the actor.
   - POST /test/define_goal with a fake actor ID creates a gap; the goal shows a red dashed edge to a red dashed "?" node.
   - POST /test/delete_actor removes the actor; the edge to any assigned goals turns into a red dashed gap edge while goals remain.
3. Using the MCP server on http://localhost:3000/mcp with FastMCP httpStream JSON-RPC envelopes (see README and test-mcp.sh), define_actor/define_goal/delete_actor/get_full_model work and drive the same visualization updates.

**Files to Create:**

```
screenplay-visualizer/
├── package.json
├── src/
│   ├── main.ts                 # Electron main process (creates window, storage, servers, IPC)
│   ├── preload.ts              # IPC bridge exposing getModel + event hooks
│   ├── lib/
│   │   ├── schemas.ts          # Zod schemas and TS types for entities
│   │   └── storage.ts          # JSONStorage with atomic writes and change events
│   └── mcp-server/
│       ├── tools.ts            # define_actor, define_goal, delete_actor, get_full_model
│       └── test-endpoint.ts    # simple HTTP test API on :3001
├── renderer/
│   ├── index.html
│   ├── app.js                  # D3 force layout + IPC handling
│   └── styles.css
├── dist/                       # Compiled JS output (build step)
├── test-mcp.sh                 # JSON-RPC examples for :3000/mcp
├── test-simple.sh              # Simple :3001/test walkthrough
└── test-phase1.sh              # Acceptance flow using :3001/test
```

**Phase 1 Code Volume:** ~800 lines total. Should take 2-3 hours with Claude Code.

## Testing Strategy

The application uses an automated E2E test harness that connects to the MCP server:

- **E2E Tests**: Run `npm run test:e2e` to execute all test scenarios against the MCP server
- **Test Framework**: Located in `src/tests/`, uses the official MCP SDK client (`@modelcontextprotocol/sdk`)
- **Adding Tests**: Create new scenario files in `src/tests/scenarios/` following the existing patterns
- **MCP Endpoint**: Running on `http://localhost:3000/mcp` using FastMCP's stateless HTTP streaming mode

The test harness validates:
- Tool execution and response format
- Data model consistency
- Gap detection and relationship handling
- State persistence across operations

**Phase 2:** Expand test scenarios to cover all 32 tools with realistic data (3 actors, 5 goals, 10 tasks, 20 interactions).

**Phase 3:** Connect Claude Code, run a real ensemble session with your team. Tune force layout parameters based on what feels good during conversation flow.

## What We're NOT Building

- Multi-user collaboration
- Undo/redo (LLM is the undo mechanism—just ask it to revert)
- Persistence beyond JSON files (no git integration, no database)
- Export to SVG/PNG (screenshot the window if needed)
- Custom layout algorithms (force layout handles everything)
- Search/filter UI (model should stay small enough to see all at once)

## Open Decisions

1. **What happens when model grows to 100+ nodes?** Do we auto-hide low-priority goals? Cluster by actor?
2. **Journey visualization:** Show journeys as animated paths through the force layout? Or separate timeline view?
3. **Question entities:** Where do these fit in the force layout? They don't connect to anything yet.
4. **Ability matching:** Exact string match or case-insensitive?
5. **Priority semantics:** Does "high priority goal" affect force layout (stronger attraction to actors)?

Address these in Phase 3 when you have real data to evaluate.
