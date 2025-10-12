import { randomUUID } from 'crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export class MCPClient {
  private url: string;
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;

  constructor(url?: string) {
    this.url = url || process.env.MCP_URL || 'http://localhost:3000/mcp';
  }

  private async ensureConnected(): Promise<void> {
    if (this.client) return;

    this.transport = new StreamableHTTPClientTransport(new URL(this.url));
    this.client = new Client(
      {
        name: 'test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await this.client.connect(this.transport);
  }

  async callTool<T = any>(name: string, args: any): Promise<T> {
    await this.ensureConnected();

    const result = await this.client!.callTool({
      name,
      arguments: args || {},
    });

    // FastMCP returns a result.content[0].text which is a JSON string payload from the tool
    const content = result?.content as any[];
    const text: string | undefined = content?.[0]?.text;
    if (typeof text !== 'string') {
      throw new Error(`Unexpected MCP response shape: ${JSON.stringify(result).slice(0, 500)}...`);
    }
    try {
      return JSON.parse(text) as T;
    } catch (e) {
      // Some tools might return plain strings; surface them directly
      return text as unknown as T;
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.transport = null;
    }
  }
}

export function assert(condition: any, message: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

// Utility for scenarios that need a unique-ish label
export function uniqueName(prefix: string): string {
  return `${prefix} ${new Date().toISOString()}`;
}

export function newMissingUUID(): string {
  return randomUUID(); // valid UUID which almost certainly doesn't exist in the model yet
}
