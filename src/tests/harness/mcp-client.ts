import { randomUUID } from 'crypto';

// Use Node 20+ global fetch; keep untyped to avoid DOM lib dependency
const fetchFn: any = (globalThis as any).fetch;

export class MCPClient {
  private url: string;
  private idCounter = 1;
  private sessionId: string | null = null;

  constructor(url?: string) {
    this.url = url || process.env.MCP_URL || 'http://localhost:3000/mcp';
  }

  private get endpoint(): string {
    // Ensure no trailing slash; default endpoint is /mcp
    return this.url.replace(/\/$/, '');
  }

  // Perform the MCP initialize handshake and capture the session ID header
  async initSession(): Promise<string> {
    const payload = {
      jsonrpc: '2.0',
      id: this.idCounter++,
      method: 'initialize',
      params: {},
    };

    const res = await fetchFn(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Init failed: HTTP ${res.status}: ${text}`);
    }

    // Headers are case-insensitive; get will handle typical casing
    const sid =
      res.headers.get('Mcp-Session-Id') ||
      res.headers.get('mcp-session-id') ||
      res.headers.get('x-mcp-session') ||
      res.headers.get('x-session-id');

    if (!sid) {
      throw new Error('No session ID returned on initialize');
    }
    this.sessionId = sid;
    return sid;
  }

  async callTool<T = any>(name: string, args: any): Promise<T> {
    // Ensure we have a session first
    if (!this.sessionId) {
      await this.initSession();
    }

    const payload = {
      jsonrpc: '2.0',
      id: this.idCounter++,
      method: 'tools/call',
      params: {
        name,
        arguments: args || {},
      },
    };

    const res = await fetchFn(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Mcp-Session-Id': this.sessionId!,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      // surface more helpful message
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
