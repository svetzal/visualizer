/*
 MCPP E2E Test Harness (Phase 1)
 - Talks to the Electron FastMCP server over httpStream JSON-RPC at :3000/mcp
 - Encodes executable scenarios mirroring BDD.md for Phase 1 tools
 - Run with: npm run test:e2e (after npm start in another terminal)

 Notes
 - No reset tool exists over MCP; this harness isolates its assertions to the entities it creates.
 - To induce a gap via MCP, we must use syntactically valid UUIDs that do not exist as actors.
*/

import { randomUUID } from 'crypto';

// Use Node 20+ global fetch; keep untyped to avoid DOM lib dependency
const fetchFn: any = (globalThis as any).fetch;

// Minimal JSON-RPC client for FastMCP httpStream transport
class MCPClient {
  private url: string;
  private idCounter = 1;
  constructor(url?: string) {
    this.url = url || process.env.MCP_URL || 'http://localhost:3000/mcp';
  }
  async callTool<T = any>(name: string, args: any): Promise<T> {
    const payload = {
      jsonrpc: '2.0',
      id: this.idCounter++,
      method: 'tools/call',
      params: {
        name,
        arguments: args || {},
      },
    };

    const res = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    const body = await res.json();

    // FastMCP returns a result.content[0].text which is a JSON string payload from the tool
    const text: string | undefined = body?.result?.content?.[0]?.text;
    if (typeof text !== 'string') {
      throw new Error(`Unexpected MCP response shape: ${JSON.stringify(body).slice(0, 500)}...`);
    }
    try {
      return JSON.parse(text) as T;
    } catch (e) {
      // Some tools might return plain strings; surface them directly
      return text as unknown as T;
    }
  }
}

// Tiny BDD-ish harness
type Step = () => Promise<void> | void;

class ScenarioRunner {
  private steps: { name: string; fn: Step }[] = [];
  constructor(private title: string) {}
  step(name: string, fn: Step) {
    this.steps.push({ name, fn });
    return this;
  }
  async run(): Promise<void> {
    console.log(`\n=== Scenario: ${this.title} ===`);
    for (const { name, fn } of this.steps) {
      process.stdout.write(`→ ${name} ... `);
      await fn();
      console.log('OK');
    }
    console.log(`✓ Scenario passed: ${this.title}`);
  }
}

function assert(condition: any, message: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

// Types (lightweight) to help with assertions
interface Actor { id: string; name: string; description: string; abilities: string[]; constraints: string[]; }
interface Goal { id: string; name: string; description: string; success_criteria: string[]; priority: 'low'|'medium'|'high'; assigned_to: string[]; }
interface FullModel { actors: Actor[]; goals: Goal[]; tasks: any[]; interactions: any[]; questions: any[]; journeys: any[]; gaps?: { id: string; expected_type: string; referenced_by: string[] }[] }

async function main() {
  const client = new MCPClient();
  console.log(`[Harness] Using MCP at ${process.env.MCP_URL || 'http://localhost:3000/mcp'}`);

  // Shared state between scenarios in this run
  const state: { actor?: Actor; goal?: Goal; gapGoal?: Goal; gapId?: string } = {};

  // Scenario 1: Create an actor
  await new ScenarioRunner('Create a new actor')
    .step('define_actor(Admin)', async () => {
      const resp = await client.callTool<{ success: boolean; data: Actor }>('define_actor', {
        name: `Admin ${new Date().toISOString()}`,
        description: 'System administrator',
        abilities: ['manage_users'],
        constraints: [],
      });
      assert(resp.success, 'define_actor should succeed');
      assert(resp.data?.id && resp.data.id.length > 10, 'actor id should look like a UUID');
      state.actor = resp.data;
    })
    .run();

  // Scenario 2: Create a goal assigned to actor
  await new ScenarioRunner('Create a goal assigned to existing actor')
    .step('define_goal(User Management)', async () => {
      const resp = await client.callTool<{ success: boolean; data: Goal }>('define_goal', {
        name: 'User Management',
        description: 'Manage users',
        success_criteria: ['Can create users'],
        priority: 'high',
        assigned_to: [state.actor!.id],
      });
      assert(resp.success, 'define_goal should succeed');
      assert(resp.data?.id, 'goal id present');
      assert(Array.isArray(resp.data.assigned_to) && resp.data.assigned_to.includes(state.actor!.id), 'goal assigned_to includes actor');
      state.goal = resp.data;
    })
    .step('get_full_model and assert actor/goal exist', async () => {
      const model = await client.callTool<FullModel>('get_full_model', {});
      assert(model.actors.some(a => a.id === state.actor!.id), 'model contains our actor');
      assert(model.goals.some(g => g.id === state.goal!.id), 'model contains our goal');
    })
    .run();

  // Scenario 3: Create a goal with a non-existent actor (gap)
  await new ScenarioRunner('Create a goal referencing a missing actor (gap)')
    .step('define_goal with fake assigned_to UUID', async () => {
      const missingActorId = randomUUID();
      state.gapId = missingActorId;
      const resp = await client.callTool<{ success: boolean; data: Goal }>('define_goal', {
        name: 'Analytics',
        description: 'Dashboards',
        success_criteria: ['<2s load'],
        priority: 'medium',
        assigned_to: [missingActorId], // Valid UUID but not an existing actor
      });
      assert(resp.success, 'define_goal (gap) should succeed');
      state.gapGoal = resp.data;
    })
    .step('get_full_model and assert gaps include missing actor id', async () => {
      const model = await client.callTool<FullModel>('get_full_model', {});
      assert(Array.isArray(model.gaps), 'model.gaps present');
      assert(model.gaps!.some(g => g.id === state.gapId && g.expected_type === 'actor'), 'gaps include our missing actor id');
    })
    .run();

  // Scenario 4: Delete the actor and verify gaps
  await new ScenarioRunner('Delete the actor and convert edges to gaps')
    .step('delete_actor', async () => {
      const resp = await client.callTool<{ success: boolean; data: { id: string } }>('delete_actor', { id: state.actor!.id });
      assert(resp.success, 'delete_actor should succeed');
    })
    .step('get_full_model and verify goal edge became a gap', async () => {
      const model = await client.callTool<FullModel>('get_full_model', {});
      // Our assigned goal should now reference a missing actor, so the actor id appears in gaps
      assert(model.goals.some(g => g.id === state.goal!.id), 'goal still present');
      assert(model.gaps!.some(g => g.expected_type === 'actor' && g.referenced_by.includes(state.goal!.id)), 'gap references our goal');
    })
    .run();

  console.log('\nAll scenarios passed.');
}

main().catch((err) => {
  console.error('\nHarness failed:', err.message || err);
  process.exit(1);
});
