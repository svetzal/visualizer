# Screenplay MCP Server + Electron Visualizer

**Context:** Single-screen ensemble coding where 4-6 people discuss software behavior with one Claude Code instance. Screen 1: Claude Code + evolving prototype. Screen 2 (projected): This visualization showing the specification model as it grows. The visualization must be **readable from across a room** and **update fast enough to feel responsive to conversation**.

---

## Electron Implementation

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

**Phase 1 Implementation Status:**
- ✅ `define_actor` - Create actors
- ✅ `define_goal` - Create goals with assignments
- ✅ `delete_actor` - Delete actors
- ✅ `get_full_model` - Retrieve all entities and computed gaps
- ✅ `clear_model` - Clear all data (for testing)

**Phase 2 Implementation Status:**
- ✅ **Actor CRUD:** `update_actor`, `delete_actor` (already done in Phase 1)
- ✅ **Goal CRUD:** `update_goal`, `delete_goal`
- ✅ **Task CRUD:** `define_task`, `update_task`, `delete_task`
- ✅ **Interaction CRUD:** `define_interaction`, `update_interaction`, `delete_interaction`
- ✅ **Question CRUD:** `define_question`, `update_question`, `delete_question`
- ✅ **Journey CRUD:** `define_journey`, `update_journey`, `delete_journey`
- ✅ **Total:** 20 tools implemented (was 5, added 15)
- ✅ **Testing:** Comprehensive bookkeeping scenario with 31 test steps
- ✅ **Gap detection:** Working for all entity types

**Current State:** Basic CRUD operations complete. System can model actors, goals, tasks, interactions, questions, and journeys with full gap detection. However, **not ready for real ensemble conversations** - need richer interaction tools first (see Phase 2.5 below).

**Phase 2.5: Composition & Relationship Tools (NEEDED BEFORE REAL USAGE)**

Before using this in actual ensemble coding sessions, we need tools that better express relationships without requiring manual CRUD operations:

### CRUD Tools (18 total - PARTIALLY COMPLETE)

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

**Status:** ✅ All CRUD operations implemented (20 tools total)

---

### Phase 2.5: Composition Tools (7) - **NEXT PRIORITY FOR REAL USAGE**

**Problem:** Current CRUD tools require agents to manually manage arrays. In conversation, people say "assign this goal to Maria" not "update goal with assigned_to array [maria_id, ...existing]".

**Solution:** 7 idempotent composition tools that handle array manipulation internally:

```javascript
// Goal assignments
assign_goal_to_actor({ actor_id, goal_id })
  → goal = storage.get("goal", goal_id)
  → if !goal.assigned_to.includes(actor_id): goal.assigned_to.push(actor_id)
  → storage.update("goal", goal_id, { assigned_to: goal.assigned_to })
  → { success: true, data: Goal }

unassign_goal_from_actor({ actor_id, goal_id })
  → goal = storage.get("goal", goal_id)
  → goal.assigned_to = goal.assigned_to.filter(id => id !== actor_id)
  → storage.update("goal", goal_id, { assigned_to: goal.assigned_to })
  → { success: true, data: Goal }

// Task composition
add_interaction_to_task({ task_id, interaction_id })
  → task = storage.get("task", task_id)
  → if !task.composed_of.includes(interaction_id): task.composed_of.push(interaction_id)
  → storage.update("task", task_id, { composed_of: task.composed_of })
  → { success: true, data: Task }

remove_interaction_from_task({ task_id, interaction_id })
  → task = storage.get("task", task_id)
  → task.composed_of = task.composed_of.filter(id => id !== interaction_id)
  → storage.update("task", task_id, { composed_of: task.composed_of })
  → { success: true, data: Task }

// Journey tracking
record_journey_step({ journey_id, task_id, outcome })
  → journey = storage.get("journey", journey_id)
  → journey.steps.push({ task_id, outcome, timestamp: now() })
  → storage.update("journey", journey_id, { steps: journey.steps })
  → { success: true, data: Journey }

add_goal_to_journey({ journey_id, goal_id })
  → journey = storage.get("journey", journey_id)
  → if !journey.goal_ids.includes(goal_id): journey.goal_ids.push(goal_id)
  → storage.update("journey", journey_id, { goal_ids: journey.goal_ids })
  → { success: true, data: Journey }

remove_goal_from_journey({ journey_id, goal_id })
  → journey = storage.get("journey", journey_id)
  → journey.goal_ids = journey.goal_ids.filter(id => id !== goal_id)
  → storage.update("journey", journey_id, { goal_ids: journey.goal_ids })
  → { success: true, data: Journey }
```

**Implementation notes:**
- All tools are idempotent (safe to call multiple times)
- Error if entity not found
- No validation that referenced IDs exist (allows gaps)
- Estimated effort: 4-6 hours

**Status:** ❌ Not yet implemented - **BLOCKING REAL ENSEMBLE USAGE**

---

### Phase 3: Query Tools (5) - **NICE TO HAVE**

These tools help agents analyze the model and surface insights during conversations:

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

**Status:** ❌ Not yet implemented - useful for analysis but not blocking

---

### Phase 4: Visualization Tools (5) - **NICE TO HAVE**

Specialized views for different analysis needs:

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

**Status:** ✅ `get_full_model` implemented. Others ❌ not yet needed - can build with client-side logic if required.

---

## Implementation Roadmap

### ✅ Phase 1 + 2: Complete (20 tools)
- Electron app with D3 force-directed graph
- MCP server with FastMCP on localhost:3000
- Full CRUD for actors, goals, tasks, interactions, questions, journeys
- Gap detection and real-time updates (<1s latency)
- 5 test scenarios, 42 test steps, all passing

### 🚧 Phase 2.5: Next Priority (7 tools, 4-6 hours)
**Goal:** Natural conversation flows for ensemble sessions

**Why:** Current tools require manual array management. Need idempotent composition tools that match natural language patterns like "assign this goal to Maria."

**Tools to implement:**
- `assign_goal_to_actor` / `unassign_goal_from_actor`
- `add_interaction_to_task` / `remove_interaction_from_task`
- `record_journey_step`
- `add_goal_to_journey` / `remove_goal_from_journey`

**Test:** Create `conversation-flow.ts` scenario mimicking real dialogue

### 🔮 Phase 3-4: Future (as needed)
- **Query Tools:** Add when teams ask "who can do X?" during sessions
- **Visualization Tools:** Add specialized views based on usage feedback

---

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

## Phase 1: Walking Skeleton ✅ COMPLETE

**Acceptance Criteria (implemented):**

1. Electron starts and shows the MCP server URL in the header (e.g., http://localhost:3000/mcp).
2. Using the MCP server on http://localhost:3000/mcp with FastMCP httpStream JSON-RPC envelopes:
   - `define_actor` creates an actor; a blue circle appears within ~1s.
   - `define_goal` with assigned_to including a valid actor UUID creates a goal; a green square appears with a gray edge to the actor.
   - `define_goal` with a non-existent actor UUID creates a gap; the goal shows a red dashed edge to a red dashed "?" node.
   - `delete_actor` removes the actor; edges to any assigned goals turn into red dashed gap edges while goals remain.
   - `get_full_model` returns all entities plus computed gaps.
   - `clear_model` clears all data for test cleanup.
3. E2E test harness validates all tools and workflows, including complex scenarios like the bookkeeping system model.

**Phase 1 Complete:** All acceptance criteria met, ~800 lines of code, fully tested.

---

## Phase 2: Full CRUD Operations ✅ COMPLETE

**Acceptance Criteria (implemented):**

1. All 6 entity types support full CRUD:
   - **Create:** `define_actor`, `define_goal`, `define_task`, `define_interaction`, `define_question`, `define_journey`
   - **Read:** `get_full_model` (returns all entity types)
   - **Update:** `update_actor`, `update_goal`, `update_task`, `update_interaction`, `update_question`, `update_journey`
   - **Delete:** `delete_actor`, `delete_goal`, `delete_task`, `delete_interaction`, `delete_question`, `delete_journey`

2. Gap detection works for all relationship types:
   - Goals referencing missing actors
   - Tasks referencing missing interactions
   - Journeys referencing missing actors, goals, or tasks

3. Comprehensive test coverage:
   - Extended bookkeeping scenario exercises all CRUD operations
   - 31 test steps covering create, update, delete, and gap scenarios
   - Tests validate cascading effects (e.g., deleting actor creates gaps)

**Phase 2 Complete:** 20 tools total (was 5, added 15), ~1200 lines of code, all tests passing.

---

## Phase 2.5: Composition Tools 🚧 NEXT PRIORITY

**Why:** Current CRUD tools require agents to manually manage arrays (e.g., reading all current goal assignments, appending a new ID, then updating). This doesn't match natural conversation patterns like "assign this goal to Maria."

**Goal:** Enable agents to express relationships naturally without state management.

**Acceptance Criteria:**

1. Implement 7 composition tools that handle array manipulation internally
2. Tools are idempotent (safe to call multiple times)
3. Create "conversation-flow" test scenario that reads like natural dialogue
4. Update bookkeeping-conversation.md to use composition tools
5. Verify agent can process screenplay without manual array management

**Status:** Not yet started - **BLOCKING REAL ENSEMBLE USAGE**

---

## Testing Strategy

The application uses an automated E2E test harness that connects to the MCP server:
├── package.json
├── tsconfig.json
├── tsconfig.preload.json
├── src/
│   ├── bootstrap.ts            # Entry point
│   ├── main.ts                 # Electron main process (window, storage, MCP server, IPC)
│   ├── preload.ts              # IPC bridge exposing getModel + event hooks
│   ├── lib/
│   │   ├── schemas.ts          # Zod schemas and TS types for entities
│   │   └── storage.ts          # JSONStorage with atomic writes and change events
│   ├── mcp-server/
│   │   └── tools.ts            # Phase 1 tools (define_actor, define_goal, delete_actor, get_full_model, clear_model)
│   └── tests/
│       ├── run-all-scenarios.ts        # Test runner with slow mode support
│       ├── harness/
│       │   ├── mcp-client.ts           # MCP SDK client wrapper
│       │   └── runner.ts               # ScenarioRunner framework
│       └── scenarios/
│           ├── define-actor.ts         # Actor creation test
│           ├── define-goal-assigned.ts # Goal with valid actor test
│           ├── define-goal-gap.ts      # Goal with missing actor test
│           ├── delete-actor.ts         # Actor deletion and gap creation test
│           └── bookkeeping-full-graph.ts # Complex end-to-end scenario
├── renderer/
│   ├── index.html              # UI structure with header and force layout
│   ├── app.js                  # D3 force layout + IPC handling
│   └── styles.css              # Projection-ready styles
└── dist/                       # Compiled JS output (build step)
```

**Phase 1 Complete:** All acceptance criteria met, ~800 lines of code, fully tested.

## Testing Strategy

The application uses an automated E2E test harness that connects to the MCP server:

- **E2E Tests**: Run `npm run test:e2e` to execute all test scenarios against the MCP server
- **Slow Mode**: Run `npm run test:e2e:slow` to add delays between steps for visual verification
- **Test Framework**: Located in `src/tests/`, uses the official MCP SDK client (`@modelcontextprotocol/sdk`)
- **Test Scenarios**: Individual scenario files in `src/tests/scenarios/` validate each tool and workflow
- **MCP Endpoint**: Running on `http://localhost:3000/mcp` using FastMCP's stateless HTTP streaming mode

### Current Test Coverage (Phase 1 + 2)

The test harness validates:
- Tool execution and response format
- Data model consistency
- Gap detection and relationship handling
- State persistence across operations
- Complex workflows (e.g., the bookkeeping scenario with 4 actors, 6 goals, 3 tasks, 3 interactions, and gap evolution)

**Test Scenarios:**
1. `define-actor.ts` - Actor creation (2 steps)
2. `define-goal-assigned.ts` - Goal with valid actor (3 steps)
3. `define-goal-gap.ts` - Goal with missing actor creates gap (2 steps)
4. `delete-actor.ts` - Actor deletion creates gaps (4 steps)
5. `bookkeeping-full-graph.ts` - Comprehensive CRUD scenario (31 steps)

**Total:** 5 scenarios, 42 test steps, all passing ✅

### Phase 2.5 Testing Plan

**Adding New Tests**:
1. Create `conversation-flow.ts` scenario that mimics natural dialogue
2. Use composition tools instead of update operations
3. Test idempotency (calling same composition tool multiple times)
4. Validate that screenplay processing feels natural

Example test pattern:
```typescript
.step('Sarah assigns budget goal to herself', async () => {
  await client.callTool('assign_goal_to_actor', {
    actor_id: sarah.id,
    goal_id: budgetGoal.id
  });
})
.step('Sarah also gets monthly reporting (can call twice)', async () => {
  await client.callTool('assign_goal_to_actor', {
    actor_id: sarah.id,
    goal_id: reportingGoal.id
  });
  // Call again to test idempotency
  await client.callTool('assign_goal_to_actor', {
    actor_id: sarah.id,
    goal_id: reportingGoal.id
  });
})
```

---
---

## Current Project Status

**What Works:**
- ✅ Electron app with D3 force-directed graph visualization
- ✅ MCP server on localhost:3000 with 20 tools
- ✅ Real-time updates with <1s latency from tool call to visual change
- ✅ Full CRUD for actors, goals, tasks, interactions, questions, journeys
- ✅ Gap detection for missing references
- ✅ Comprehensive test suite (42 steps, all passing)
- ✅ Bookkeeping conversation screenplay documenting expected usage

**What's Missing for Real Usage:**
- ❌ Composition tools for natural conversation flow
- ❌ "conversation-flow" test scenario
- ❌ Query tools for analysis (nice to have, not blocking)

**Recommendation:** Implement Phase 2.5 composition tools before using with real ensemble coding sessions. Current CRUD operations work but require too much state management for natural agent interaction.

---

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
