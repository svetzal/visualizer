import { createServer, IncomingMessage, ServerResponse } from 'http';
import { JSONStorage } from '../lib/storage.js';
import { v4 as uuidv4 } from 'uuid';

export function createTestServer(storage: JSONStorage, port: number) {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/test/define_actor') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const args = JSON.parse(body);
          const now = new Date().toISOString();
          const actor = {
            id: uuidv4(),
            name: args.name,
            description: args.description,
            abilities: args.abilities || [],
            constraints: args.constraints || [],
            created_at: now,
            updated_at: now,
          };

          await storage.save('actor', actor);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, data: actor }));
        } catch (error: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
      });
    } else if (req.method === 'POST' && req.url === '/test/define_goal') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const args = JSON.parse(body);
          const now = new Date().toISOString();
          const goal = {
            id: uuidv4(),
            name: args.name,
            description: args.description,
            success_criteria: args.success_criteria || [],
            priority: args.priority || 'medium',
            assigned_to: args.assigned_to || [],
            created_at: now,
            updated_at: now,
          };

          await storage.save('goal', goal);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, data: goal }));
        } catch (error: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
      });
    } else if (req.method === 'POST' && req.url === '/test/delete_actor') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const args = JSON.parse(body);
          await storage.delete('actor', args.id);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, data: { id: args.id } }));
        } catch (error: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
      });
    } else if (req.method === 'POST' && req.url === '/test/reset') {
      try {
        // Delete all entities
        const actors = await storage.getAll('actor');
        const goals = await storage.getAll('goal');
        const tasks = await storage.getAll('task');
        const interactions = await storage.getAll('interaction');

        for (const actor of actors) {
          await storage.delete('actor', actor.id);
        }
        for (const goal of goals) {
          await storage.delete('goal', goal.id);
        }
        for (const task of tasks) {
          await storage.delete('task', task.id);
        }
        for (const interaction of interactions) {
          await storage.delete('interaction', interaction.id);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'All data cleared',
          deleted: {
            actors: actors.length,
            goals: goals.length,
            tasks: tasks.length,
            interactions: interactions.length
          }
        }));
      } catch (error: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    } else if (req.method === 'GET' && req.url === '/test/model') {
      try {
        const actors = await storage.getAll('actor');
        const goals = await storage.getAll('goal');
        const tasks = await storage.getAll('task');
        const interactions = await storage.getAll('interaction');
        const questions = await storage.getAll('question');
        const journeys = await storage.getAll('journey');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          actors,
          goals,
          tasks,
          interactions,
          questions,
          journeys,
        }));
      } catch (error: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  server.listen(port, () => {
    console.log(`[Test] Test HTTP server listening on http://localhost:${port}`);
  });

  return server;
}
