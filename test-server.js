// Simple test to verify FastMCP server works outside Electron
import { FastMCP } from 'fastmcp';
import { z } from 'zod';

console.log('Creating FastMCP server...');

const server = new FastMCP({
  name: 'test-server',
  version: '1.0.0',
});

server.addTool({
  name: 'hello',
  description: 'Say hello',
  parameters: z.object({
    name: z.string(),
  }),
  execute: async (args) => {
    return `Hello, ${args.name}!`;
  },
});

console.log('Starting server on port 4000...');

server.start({
  transportType: 'httpStream',
  httpStream: {
    endpoint: '/mcp',
    port: 4000,
  },
}).then(() => {
  console.log('Server started successfully on http://localhost:4000/mcp');
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
