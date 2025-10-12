import { MCPClient, assert } from './mcp-client.js';

export type Step = () => Promise<void> | void;

export class ScenarioRunner {
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

// Reuse model types from the source of truth (lib/schemas)
export type { Actor, Goal, Gap, FullModel } from '../../lib/schemas.js';

export async function withClient<T>(fn: (client: MCPClient) => Promise<T>): Promise<T> {
  const client = new MCPClient();
  console.log(`[Harness] Using MCP at ${process.env.MCP_URL || 'http://localhost:3000/mcp'}`);
  return fn(client);
}
