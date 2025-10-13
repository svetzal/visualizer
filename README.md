# Screenplay Visualizer

A real-time visualization tool for ensemble coding sessions. Projects a live diagram of your system's actors, goals, tasks, and interactions as Claude Code builds the model from your team's conversation.

## For Users

### Download & Install

**Coming soon:** Pre-built releases for macOS, Windows, and Linux will be available on the [Releases](../../releases) page.

For now, see the Developer section below to run from source.

### What It Does

The Screenplay Visualizer runs an MCP (Model Context Protocol) server that Claude Code connects to during ensemble coding sessions. As your team discusses the system you're building, Claude Code creates entities in real-time:

- **Actors** (blue circles) - People or systems that interact
- **Goals** (green squares) - What actors want to achieve
- **Tasks** (purple triangles) - How goals are accomplished
- **Interactions** (orange diamonds) - Atomic actions that compose tasks
- **Gaps** (red dashed "?" circles) - Missing pieces that need discussion

The visualization updates within 1 second of any change, keeping the entire team synchronized on what's being discussed.

### How To Use

1. **Launch the app** - The Screenplay Visualizer window opens with an empty canvas
2. **Note the MCP URL** - Displayed in the header (typically `http://localhost:3000/mcp`)
3. **Configure Claude Code** - Add the MCP server to your Claude Code configuration
4. **Start your ensemble session** - As Claude Code processes your conversation, entities appear in real-time
5. **Project on second screen** - The visualization is designed to be readable from across the room

**Gap-Driven Development:** Red "?" nodes appear when you reference something not yet defined (e.g., "the payment processor handles this" before you've discussed the payment processor). This prompts the team to fill in missing details.

### Data Storage

All model data is saved to your system's application data directory:

- **macOS:** `~/Library/Application Support/screenplay-visualizer/.screenplay/`
- **Linux:** `~/.config/screenplay-visualizer/.screenplay/`
- **Windows:** `%APPDATA%/screenplay-visualizer/.screenplay/`

Each entity type (actors, goals, tasks, interactions, questions, journeys) is stored in its own JSON file.

## For Developers

### Prerequisites

- Node.js 20+ (tested with v22.13.0)
- npm or yarn

### Running from Source

```bash
# Install dependencies
npm ci

# Start the app (builds TypeScript and launches Electron)
npm start
```

The Screenplay Visualizer window will open with the MCP server running at `http://localhost:3000/mcp`.

### Development Workflow

```bash
npm run build           # Compile TypeScript (src/ → dist/)
npm run clean           # Remove dist/ directory
npm start               # Build and launch app
```

### Project Structure

```
screenplay-visualizer/
├── src/
│   ├── main.ts              # Electron main process
│   ├── preload.ts           # IPC bridge
│   ├── lib/
│   │   ├── schemas.ts       # Zod schemas + TypeScript types
│   │   ├── storage.ts       # JSONStorage with EventEmitter
│   │   └── queries.ts       # Query helper functions
│   ├── mcp-server/
│   │   └── tools.ts         # 32 MCP tools (CRUD, composition, queries)
│   └── tests/
│       ├── run-all-scenarios.ts     # Test runner
│       ├── harness/                 # MCP client + test framework
│       └── scenarios/               # E2E test scenarios
├── renderer/
│   ├── index.html           # UI structure
│   ├── styles.css           # Projection-ready styles
│   └── app.js               # D3 force layout visualization
└── dist/                    # Compiled JavaScript (generated)
```

### Testing

**Run all tests:**
```bash
npm run test:e2e
```

**Note:** The Electron app must be running (`npm start`) before running tests.

**Slow mode** (watch visualization changes):
```bash
npm run test:e2e:slow                  # 2 second delay between steps
npm run test:e2e -- --delay=5000       # Custom delay
STEP_DELAY=3000 npm run test:e2e       # Via environment variable
```

Test scenarios are in `src/tests/scenarios/`. Three scenarios exercise all 32 MCP tools:
1. `comprehensive-crud-and-composition.ts` - All CRUD and composition tools
2. `query-tools.ts` - Analytical query tools
3. `visualizer-itself.ts` - Models the visualizer's own audience and purpose

### Packaging

Create distributable apps:

```bash
npm run package          # Unpacked app for testing (release/ directory)
npm run package:mac      # macOS .dmg and .zip
npm run package:win      # Windows installer and portable .exe
npm run package:linux    # Linux AppImage and .deb
```

**Note:** First-time packaging downloads platform binaries (~200MB).

### Architecture

```
Electron App
├── Main Process
│   ├── FastMCP Server (HTTP streaming on localhost:3000)
│   ├── JSONStorage (EventEmitter, atomic writes)
│   └── IPC Bridge to Renderer
└── Renderer Process
    ├── D3 Force Layout Visualization
    └── Real-time Updates (<1s latency)
```

**MCP Tools:** 32 tools across 4 categories:
- **Phase 1 (5):** Basic CRUD (define_actor, define_goal, delete_actor, get_full_model, clear_model)
- **Phase 2 (15):** Full CRUD for all entity types (tasks, interactions, questions, journeys)
- **Phase 2.5 (7):** Composition tools (assign_goal_to_actor, add_interaction_to_task, record_journey_step, etc.)
- **Phase 3 (5):** Query/analytical tools (find_actors_without_ability, actor_can_achieve_goal, find_unachievable_goals, etc.)

For detailed documentation, see `CLAUDE.md` (for AI assistants) and `SPEC.md` (technical specification).

## License

MIT
