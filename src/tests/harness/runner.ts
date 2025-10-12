import { MCPClient, assert } from './mcp-client.js';

export type Step = () => Promise<void> | void;

export interface ScenarioOptions {
  stepDelay?: number; // milliseconds to wait between steps
}

export class ScenarioRunner {
  private steps: { name: string; fn: Step }[] = [];
  private options: ScenarioOptions;

  constructor(private title: string, options: ScenarioOptions = {}) {
    this.options = options;
  }

  step(name: string, fn: Step) {
    this.steps.push({ name, fn });
    return this;
  }

  async run(): Promise<void> {
    console.log(`\n=== Scenario: ${this.title} ===`);
    if (this.options.stepDelay) {
      console.log(`⏱️  Running with ${this.options.stepDelay}ms delay between steps`);
    }

    for (let i = 0; i < this.steps.length; i++) {
      const { name, fn } = this.steps[i];
      process.stdout.write(`→ ${name} ... `);
      await fn();
      console.log('OK');

      // Add delay after each step (except the last one)
      if (this.options.stepDelay && i < this.steps.length - 1) {
        await new Promise(resolve => setTimeout(resolve, this.options.stepDelay));
      }
    }
    console.log(`✓ Scenario passed: ${this.title}`);
  }
}

// Reuse model types from the source of truth (lib/schemas)
export type { Actor, Goal, Gap, FullModel } from '../../lib/schemas.js';

export interface HarnessOptions {
  stepDelay?: number; // milliseconds to wait between steps in scenarios
}

let globalHarnessOptions: HarnessOptions = {};

export function setHarnessOptions(options: HarnessOptions): void {
  globalHarnessOptions = options;
}

export function getHarnessOptions(): HarnessOptions {
  return globalHarnessOptions;
}

export async function withClient<T>(fn: (client: MCPClient) => Promise<T>): Promise<T> {
  const client = new MCPClient();
  console.log(`[Harness] Using MCP at ${process.env.MCP_URL || 'http://localhost:3000/mcp'}`);
  return fn(client);
}
