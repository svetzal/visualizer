import { FastMCP } from 'fastmcp';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { JSONStorage } from '../lib/storage.js';
import { Actor, Goal, Task, Interaction, Question, Journey, Gap } from '../lib/schemas.js';

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

  // Tool: clear_model
  server.addTool({
    name: 'clear_model',
    description: 'Clear all data from the model (for testing purposes)',
    parameters: z.object({}),
    execute: async () => {
      await storage.clear();
      return JSON.stringify({ success: true, message: 'Model cleared' });
    },
  });

  // ========== Phase 2: CRUD Tools ==========

  // Tool: update_actor
  server.addTool({
    name: 'update_actor',
    description: 'Update an existing actor',
    parameters: z.object({
      id: z.string().uuid().describe('The actor ID to update'),
      name: z.string().optional().describe('Updated name'),
      description: z.string().optional().describe('Updated description'),
      abilities: z.array(z.string()).optional().describe('Updated abilities'),
      constraints: z.array(z.string()).optional().describe('Updated constraints'),
    }),
    execute: async (args) => {
      const { id, ...updates } = args;
      const updated = await storage.update('actor', id, updates);
      return JSON.stringify({ success: true, data: updated });
    },
  });

  // Tool: define_task
  server.addTool({
    name: 'define_task',
    description: 'Create a new task with required abilities',
    parameters: z.object({
      name: z.string().describe('Human-readable name for the task'),
      description: z.string().describe('Free text description'),
      required_abilities: z.array(z.string()).describe('Abilities needed to perform this task'),
      composed_of: z.array(z.string().uuid()).optional().default([]).describe('Interaction IDs (may reference non-existent interactions)'),
    }),
    execute: async (args) => {
      const now = new Date().toISOString();
      const task = {
        id: uuidv4(),
        name: args.name,
        description: args.description,
        required_abilities: args.required_abilities,
        composed_of: args.composed_of,
        created_at: now,
        updated_at: now,
      };

      await storage.save('task', task);
      return JSON.stringify({ success: true, data: task });
    },
  });

  // Tool: update_task
  server.addTool({
    name: 'update_task',
    description: 'Update an existing task',
    parameters: z.object({
      id: z.string().uuid().describe('The task ID to update'),
      name: z.string().optional().describe('Updated name'),
      description: z.string().optional().describe('Updated description'),
      required_abilities: z.array(z.string()).optional().describe('Updated required abilities'),
      composed_of: z.array(z.string().uuid()).optional().describe('Updated interaction IDs'),
    }),
    execute: async (args) => {
      const { id, ...updates } = args;
      const updated = await storage.update('task', id, updates);
      return JSON.stringify({ success: true, data: updated });
    },
  });

  // Tool: delete_task
  server.addTool({
    name: 'delete_task',
    description: 'Delete a task by ID',
    parameters: z.object({
      id: z.string().uuid().describe('The task ID to delete'),
    }),
    execute: async (args) => {
      await storage.delete('task', args.id);
      return JSON.stringify({ success: true, data: { id: args.id } });
    },
  });

  // Tool: define_interaction
  server.addTool({
    name: 'define_interaction',
    description: 'Create a new interaction with preconditions and effects',
    parameters: z.object({
      name: z.string().describe('Human-readable name for the interaction'),
      description: z.string().describe('Free text description'),
      preconditions: z.array(z.string()).describe('Conditions that must be true before this interaction'),
      effects: z.array(z.string()).describe('Changes that result from this interaction'),
    }),
    execute: async (args) => {
      const now = new Date().toISOString();
      const interaction = {
        id: uuidv4(),
        name: args.name,
        description: args.description,
        preconditions: args.preconditions,
        effects: args.effects,
        created_at: now,
        updated_at: now,
      };

      await storage.save('interaction', interaction);
      return JSON.stringify({ success: true, data: interaction });
    },
  });

  // Tool: update_interaction
  server.addTool({
    name: 'update_interaction',
    description: 'Update an existing interaction',
    parameters: z.object({
      id: z.string().uuid().describe('The interaction ID to update'),
      name: z.string().optional().describe('Updated name'),
      description: z.string().optional().describe('Updated description'),
      preconditions: z.array(z.string()).optional().describe('Updated preconditions'),
      effects: z.array(z.string()).optional().describe('Updated effects'),
    }),
    execute: async (args) => {
      const { id, ...updates } = args;
      const updated = await storage.update('interaction', id, updates);
      return JSON.stringify({ success: true, data: updated });
    },
  });

  // Tool: delete_interaction
  server.addTool({
    name: 'delete_interaction',
    description: 'Delete an interaction by ID',
    parameters: z.object({
      id: z.string().uuid().describe('The interaction ID to delete'),
    }),
    execute: async (args) => {
      await storage.delete('interaction', args.id);
      return JSON.stringify({ success: true, data: { id: args.id } });
    },
  });

  // Tool: update_goal
  server.addTool({
    name: 'update_goal',
    description: 'Update an existing goal',
    parameters: z.object({
      id: z.string().uuid().describe('The goal ID to update'),
      name: z.string().optional().describe('Updated name'),
      description: z.string().optional().describe('Updated description'),
      success_criteria: z.array(z.string()).optional().describe('Updated success criteria'),
      priority: z.enum(['low', 'medium', 'high']).optional().describe('Updated priority'),
      assigned_to: z.array(z.string().uuid()).optional().describe('Updated actor assignments'),
    }),
    execute: async (args) => {
      const { id, ...updates } = args;
      const updated = await storage.update('goal', id, updates);
      return JSON.stringify({ success: true, data: updated });
    },
  });

  // Tool: delete_goal
  server.addTool({
    name: 'delete_goal',
    description: 'Delete a goal by ID',
    parameters: z.object({
      id: z.string().uuid().describe('The goal ID to delete'),
    }),
    execute: async (args) => {
      await storage.delete('goal', args.id);
      return JSON.stringify({ success: true, data: { id: args.id } });
    },
  });

  // Tool: define_question
  server.addTool({
    name: 'define_question',
    description: 'Create a new question about system state',
    parameters: z.object({
      name: z.string().describe('Human-readable name for the question'),
      description: z.string().describe('Free text description'),
      asks_about: z.string().describe('What system state this queries'),
    }),
    execute: async (args) => {
      const now = new Date().toISOString();
      const question = {
        id: uuidv4(),
        name: args.name,
        description: args.description,
        asks_about: args.asks_about,
        created_at: now,
        updated_at: now,
      };

      await storage.save('question', question);
      return JSON.stringify({ success: true, data: question });
    },
  });

  // Tool: update_question
  server.addTool({
    name: 'update_question',
    description: 'Update an existing question',
    parameters: z.object({
      id: z.string().uuid().describe('The question ID to update'),
      name: z.string().optional().describe('Updated name'),
      description: z.string().optional().describe('Updated description'),
      asks_about: z.string().optional().describe('Updated system state query'),
    }),
    execute: async (args) => {
      const { id, ...updates } = args;
      const updated = await storage.update('question', id, updates);
      return JSON.stringify({ success: true, data: updated });
    },
  });

  // Tool: delete_question
  server.addTool({
    name: 'delete_question',
    description: 'Delete a question by ID',
    parameters: z.object({
      id: z.string().uuid().describe('The question ID to delete'),
    }),
    execute: async (args) => {
      await storage.delete('question', args.id);
      return JSON.stringify({ success: true, data: { id: args.id } });
    },
  });

  // Tool: define_journey
  server.addTool({
    name: 'define_journey',
    description: 'Create a new journey for an actor pursuing goals',
    parameters: z.object({
      name: z.string().describe('Human-readable name for the journey'),
      description: z.string().describe('Free text description'),
      actor_id: z.string().uuid().describe('Actor ID (may reference non-existent actor)'),
      goal_ids: z.array(z.string().uuid()).describe('Goal IDs (may reference non-existent goals)'),
    }),
    execute: async (args) => {
      const now = new Date().toISOString();
      const journey = {
        id: uuidv4(),
        name: args.name,
        description: args.description,
        actor_id: args.actor_id,
        goal_ids: args.goal_ids,
        steps: [],
        created_at: now,
        updated_at: now,
      };

      await storage.save('journey', journey);
      return JSON.stringify({ success: true, data: journey });
    },
  });

  // Tool: update_journey
  server.addTool({
    name: 'update_journey',
    description: 'Update an existing journey',
    parameters: z.object({
      id: z.string().uuid().describe('The journey ID to update'),
      name: z.string().optional().describe('Updated name'),
      description: z.string().optional().describe('Updated description'),
      actor_id: z.string().uuid().optional().describe('Updated actor ID'),
      goal_ids: z.array(z.string().uuid()).optional().describe('Updated goal IDs'),
    }),
    execute: async (args) => {
      const { id, ...updates } = args;
      const updated = await storage.update('journey', id, updates);
      return JSON.stringify({ success: true, data: updated });
    },
  });

  // Tool: delete_journey
  server.addTool({
    name: 'delete_journey',
    description: 'Delete a journey by ID',
    parameters: z.object({
      id: z.string().uuid().describe('The journey ID to delete'),
    }),
    execute: async (args) => {
      await storage.delete('journey', args.id);
      return JSON.stringify({ success: true, data: { id: args.id } });
    },
  });

  // ============================================================
  // Phase 2.5: Composition Tools (7 tools)
  // ============================================================

  // Tool: assign_goal_to_actor
  server.addTool({
    name: 'assign_goal_to_actor',
    description: 'Assign a goal to an actor (idempotent)',
    parameters: z.object({
      actor_id: z.string().uuid().describe('Actor UUID'),
      goal_id: z.string().uuid().describe('Goal UUID'),
    }),
    execute: async (args) => {
      const goal = await storage.get('goal', args.goal_id) as Goal | null;
      if (!goal) {
        return JSON.stringify({ success: false, error: `Goal ${args.goal_id} not found` });
      }

      if (!goal.assigned_to.includes(args.actor_id)) {
        goal.assigned_to.push(args.actor_id);
        const updated = await storage.update('goal', args.goal_id, { assigned_to: goal.assigned_to });
        return JSON.stringify({ success: true, data: updated });
      }

      return JSON.stringify({ success: true, data: goal });
    },
  });

  // Tool: unassign_goal_from_actor
  server.addTool({
    name: 'unassign_goal_from_actor',
    description: 'Unassign a goal from an actor (idempotent)',
    parameters: z.object({
      actor_id: z.string().uuid().describe('Actor UUID'),
      goal_id: z.string().uuid().describe('Goal UUID'),
    }),
    execute: async (args) => {
      const goal = await storage.get('goal', args.goal_id) as Goal | null;
      if (!goal) {
        return JSON.stringify({ success: false, error: `Goal ${args.goal_id} not found` });
      }

      goal.assigned_to = goal.assigned_to.filter((id: string) => id !== args.actor_id);
      const updated = await storage.update('goal', args.goal_id, { assigned_to: goal.assigned_to });

      return JSON.stringify({ success: true, data: updated });
    },
  });

  // Tool: add_interaction_to_task
  server.addTool({
    name: 'add_interaction_to_task',
    description: 'Add an interaction to a task composition (idempotent)',
    parameters: z.object({
      task_id: z.string().uuid().describe('Task UUID'),
      interaction_id: z.string().uuid().describe('Interaction UUID'),
    }),
    execute: async (args) => {
      const task = await storage.get('task', args.task_id) as Task | null;
      if (!task) {
        return JSON.stringify({ success: false, error: `Task ${args.task_id} not found` });
      }

      if (!task.composed_of.includes(args.interaction_id)) {
        task.composed_of.push(args.interaction_id);
        const updated = await storage.update('task', args.task_id, { composed_of: task.composed_of });
        return JSON.stringify({ success: true, data: updated });
      }

      return JSON.stringify({ success: true, data: task });
    },
  });

  // Tool: remove_interaction_from_task
  server.addTool({
    name: 'remove_interaction_from_task',
    description: 'Remove an interaction from a task composition (idempotent)',
    parameters: z.object({
      task_id: z.string().uuid().describe('Task UUID'),
      interaction_id: z.string().uuid().describe('Interaction UUID'),
    }),
    execute: async (args) => {
      const task = await storage.get('task', args.task_id) as Task | null;
      if (!task) {
        return JSON.stringify({ success: false, error: `Task ${args.task_id} not found` });
      }

      task.composed_of = task.composed_of.filter((id: string) => id !== args.interaction_id);
      const updated = await storage.update('task', args.task_id, { composed_of: task.composed_of });

      return JSON.stringify({ success: true, data: updated });
    },
  });

  // Tool: record_journey_step
  server.addTool({
    name: 'record_journey_step',
    description: 'Record a new step in a journey (append-only)',
    parameters: z.object({
      journey_id: z.string().uuid().describe('Journey UUID'),
      task_id: z.string().uuid().describe('Task UUID'),
      outcome: z.enum(['success', 'failure', 'blocked']).describe('Outcome of the task'),
    }),
    execute: async (args) => {
      const journey = await storage.get('journey', args.journey_id) as Journey | null;
      if (!journey) {
        return JSON.stringify({ success: false, error: `Journey ${args.journey_id} not found` });
      }

      journey.steps.push({
        task_id: args.task_id,
        outcome: args.outcome,
        timestamp: new Date().toISOString(),
      });
      const updated = await storage.update('journey', args.journey_id, { steps: journey.steps });

      return JSON.stringify({ success: true, data: updated });
    },
  });

  // Tool: add_goal_to_journey
  server.addTool({
    name: 'add_goal_to_journey',
    description: 'Add a goal to a journey (idempotent)',
    parameters: z.object({
      journey_id: z.string().uuid().describe('Journey UUID'),
      goal_id: z.string().uuid().describe('Goal UUID'),
    }),
    execute: async (args) => {
      const journey = await storage.get('journey', args.journey_id) as Journey | null;
      if (!journey) {
        return JSON.stringify({ success: false, error: `Journey ${args.journey_id} not found` });
      }

      if (!journey.goal_ids.includes(args.goal_id)) {
        journey.goal_ids.push(args.goal_id);
        const updated = await storage.update('journey', args.journey_id, { goal_ids: journey.goal_ids });
        return JSON.stringify({ success: true, data: updated });
      }

      return JSON.stringify({ success: true, data: journey });
    },
  });

  // Tool: remove_goal_from_journey
  server.addTool({
    name: 'remove_goal_from_journey',
    description: 'Remove a goal from a journey (idempotent)',
    parameters: z.object({
      journey_id: z.string().uuid().describe('Journey UUID'),
      goal_id: z.string().uuid().describe('Goal UUID'),
    }),
    execute: async (args) => {
      const journey = await storage.get('journey', args.journey_id) as Journey | null;
      if (!journey) {
        return JSON.stringify({ success: false, error: `Journey ${args.journey_id} not found` });
      }

      journey.goal_ids = journey.goal_ids.filter((id: string) => id !== args.goal_id);
      const updated = await storage.update('journey', args.journey_id, { goal_ids: journey.goal_ids });

      return JSON.stringify({ success: true, data: updated });
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
