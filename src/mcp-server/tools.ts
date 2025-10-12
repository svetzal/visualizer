import { FastMCP } from 'fastmcp';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { JSONStorage } from '../lib/storage.js';
import { Actor, Goal, Gap } from '../lib/schemas.js';

export function registerTools(server: FastMCP, storage: JSONStorage): void {
  // Tool: define_actor
  server.addTool({
    name: 'define_actor',
    description: 'Create a new actor with abilities and constraints',
    parameters: z.object({
      name: z.string().describe('Human-readable name for the actor'),
      description: z.string().describe('Free text description'),
      abilities: z.array(z.string()).describe('What the actor can do'),
      constraints: z.array(z.string()).describe('What prevents the actor from doing things'),
    }),
    execute: async (args) => {
      const now = new Date().toISOString();
      const actor: Actor = {
        id: uuidv4(),
        name: args.name,
        description: args.description,
        abilities: args.abilities,
        constraints: args.constraints,
        created_at: now,
        updated_at: now,
      };

      await storage.save('actor', actor);

      return JSON.stringify({ success: true, data: actor });
    },
  });

  // Tool: define_goal
  server.addTool({
    name: 'define_goal',
    description: 'Create a new goal with success criteria and priority',
    parameters: z.object({
      name: z.string().describe('Human-readable name for the goal'),
      description: z.string().describe('Free text description'),
      success_criteria: z.array(z.string()).describe('How to know when goal is achieved'),
      priority: z.enum(['low', 'medium', 'high']).describe('Priority level'),
      assigned_to: z.array(z.string().uuid()).optional().default([]).describe('Actor IDs (may reference non-existent actors)'),
    }),
    execute: async (args) => {
      const now = new Date().toISOString();
      const goal: Goal = {
        id: uuidv4(),
        name: args.name,
        description: args.description,
        success_criteria: args.success_criteria,
        priority: args.priority,
        assigned_to: args.assigned_to,
        created_at: now,
        updated_at: now,
      };

      await storage.save('goal', goal);

      return JSON.stringify({ success: true, data: goal });
    },
  });

  // Tool: delete_actor
  server.addTool({
    name: 'delete_actor',
    description: 'Delete an actor by ID',
    parameters: z.object({
      id: z.string().uuid().describe('The actor ID to delete'),
    }),
    execute: async (args) => {
      await storage.delete('actor', args.id);

      return JSON.stringify({ success: true, data: { id: args.id } });
    },
  });

  // Tool: get_full_model
  server.addTool({
    name: 'get_full_model',
    description: 'Retrieve the complete model including all entities and computed gaps',
    parameters: z.object({}),
    execute: async () => {
      const actors = await storage.getAll('actor');
      const goals = await storage.getAll('goal');
      const tasks = await storage.getAll('task');
      const interactions = await storage.getAll('interaction');
      const questions = await storage.getAll('question');
      const journeys = await storage.getAll('journey');

      // Compute gaps
      const gaps = computeGaps({ actors, goals, tasks, interactions, questions, journeys });

      return JSON.stringify({
        actors,
        goals,
        tasks,
        interactions,
        questions,
        journeys,
        gaps,
      });
    },
  });
}

// Helper function to compute gaps
function computeGaps(model: {
  actors: any[];
  goals: any[];
  tasks: any[];
  interactions: any[];
  questions: any[];
  journeys: any[];
}): Gap[] {
  const allIds = new Set([
    ...model.actors.map((e) => e.id),
    ...model.goals.map((e) => e.id),
    ...model.tasks.map((e) => e.id),
    ...model.interactions.map((e) => e.id),
  ]);

  const gapsMap = new Map<string, Gap>();

  // Check goal.assigned_to for missing actors
  model.goals.forEach((goal) => {
    goal.assigned_to.forEach((actor_id: string) => {
      if (!allIds.has(actor_id)) {
        const existing = gapsMap.get(actor_id);
        if (existing) {
          existing.referenced_by.push(goal.id);
        } else {
          gapsMap.set(actor_id, {
            id: actor_id,
            expected_type: 'actor',
            referenced_by: [goal.id],
          });
        }
      }
    });
  });

  // Check task.composed_of for missing interactions
  model.tasks.forEach((task) => {
    task.composed_of.forEach((interaction_id: string) => {
      if (!allIds.has(interaction_id)) {
        const existing = gapsMap.get(interaction_id);
        if (existing) {
          existing.referenced_by.push(task.id);
        } else {
          gapsMap.set(interaction_id, {
            id: interaction_id,
            expected_type: 'interaction',
            referenced_by: [task.id],
          });
        }
      }
    });
  });

  // Check journey.actor_id for missing actors
  model.journeys.forEach((journey: any) => {
    if (!allIds.has(journey.actor_id)) {
      const existing = gapsMap.get(journey.actor_id);
      if (existing) {
        existing.referenced_by.push(journey.id);
      } else {
        gapsMap.set(journey.actor_id, {
          id: journey.actor_id,
          expected_type: 'actor',
          referenced_by: [journey.id],
        });
      }
    }

    // Check journey.goal_ids for missing goals
    journey.goal_ids.forEach((goal_id: string) => {
      if (!allIds.has(goal_id)) {
        const existing = gapsMap.get(goal_id);
        if (existing) {
          existing.referenced_by.push(journey.id);
        } else {
          gapsMap.set(goal_id, {
            id: goal_id,
            expected_type: 'goal',
            referenced_by: [journey.id],
          });
        }
      }
    });

    // Check journey.steps[].task_id for missing tasks
    journey.steps.forEach((step: any) => {
      if (!allIds.has(step.task_id)) {
        const existing = gapsMap.get(step.task_id);
        if (existing) {
          existing.referenced_by.push(journey.id);
        } else {
          gapsMap.set(step.task_id, {
            id: step.task_id,
            expected_type: 'task',
            referenced_by: [journey.id],
          });
        }
      }
    });
  });

  return Array.from(gapsMap.values());
}
