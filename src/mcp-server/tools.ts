import { FastMCP } from 'fastmcp';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { JSONStorage } from '../lib/storage.js';
import { Actor, Goal, Task, Interaction, Question, Journey, Gap } from '../lib/schemas.js';
import {
  findActorsWithoutAbility,
  findTasksWithoutInteractions,
  findUntestedJourneys,
  checkActorCanAchieveGoal,
  findUnachievableGoals,
  findActorByName,
  findGoalByName,
  findTaskByName,
  findInteractionByName,
} from '../lib/queries.js';

export function registerTools(server: FastMCP, storage: JSONStorage): void {
  // ============================================================
  // SCREENPLAY PATTERN TOOLS
  //
  // Use these tools to model BDD-style software features using the Screenplay Pattern.
  // Work through phases: 1) Define Actors (who), 2) Define Goals (what),
  // 3) Define Tasks & Interactions (how), 4) Create Journeys (validation).
  // Gaps (missing references) are FEATURES - they help teams discover what hasn't been discussed yet.
  // ============================================================

  // Tool: define_actor
  server.addTool({
    name: 'define_actor',
    description: 'Define a person, system, or service that participates in the software system. IMPORTANT: Before creating a new actor, use find_actor_by_name to check if an actor with this name already exists - this prevents duplicates. Only create if the actor is genuinely new. Actors have abilities (what they can do) and constraints (what prevents them from doing things). Start every modeling session by defining actors first.',
    parameters: z.object({
      name: z.string().describe('Display name (e.g., "Product Owner", "Payment Gateway", "Mobile App User")'),
      description: z.string().describe('Detailed context about this actor\'s role, responsibilities, or technical nature'),
      abilities: z.array(z.string()).describe('List of capabilities this actor possesses (e.g., ["view_dashboard", "approve_orders", "send_notifications"]). These must match abilities required by tasks.'),
      constraints: z.array(z.string()).describe('Limitations or restrictions (e.g., ["cannot access production database", "rate limited to 100 requests/minute", "only works during business hours"])'),
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
    description: 'Define a desired outcome or objective that actors pursue. IMPORTANT: Before creating a new goal, use find_goal_by_name to check if a goal with this name already exists - this prevents duplicates. Only create if the goal is genuinely new. Goals should be outcome-focused (not implementation-focused). Each goal gets assigned to one or more actors who have the abilities to achieve it.',
    parameters: z.object({
      name: z.string().describe('Outcome-focused name (e.g., "Complete Purchase", "Generate Monthly Report", "Onboard New User")'),
      description: z.string().describe('Detailed explanation of what achieving this goal means and why it matters'),
      success_criteria: z.array(z.string()).describe('Observable, testable conditions that prove the goal is achieved (e.g., ["payment confirmed", "receipt emailed", "inventory updated"])'),
      priority: z.enum(['low', 'medium', 'high']).describe('Business priority - use "high" for must-haves, "medium" for important features, "low" for nice-to-haves'),
      assigned_to: z.array(z.string().uuid()).optional().default([]).describe('Array of actor IDs who can pursue this goal. Referencing non-existent actors creates visible gaps (red "?" nodes) - this is intentional to surface missing discussions.'),
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
    description: 'Remove an actor from the model. Use this when an actor is no longer relevant or was created by mistake. Note: Deleting an actor will create gaps in any goals/journeys that reference it.',
    parameters: z.object({
      id: z.string().uuid().describe('UUID of the actor to remove (obtain from get_full_model or previous create/update operations)'),
    }),
    execute: async (args) => {
      await storage.delete('actor', args.id);

      return JSON.stringify({ success: true, data: { id: args.id } });
    },
  });

  // Tool: get_full_model
  server.addTool({
    name: 'get_full_model',
    description: 'Retrieve the entire screenplay model including all actors, goals, tasks, interactions, questions, journeys, and computed gaps. Use this at the start of a session to understand what has already been discussed, or periodically to check the current state. Gaps indicate missing entities that are referenced but not yet defined - these are conversation prompts, not errors.',
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
    description: 'Delete all data from the model and start fresh. Use this only when explicitly requested by the user or when starting a completely new modeling session. This cannot be undone.',
    parameters: z.object({}),
    execute: async () => {
      await storage.clear();
      return JSON.stringify({ success: true, message: 'Model cleared' });
    },
  });

  // ============================================================
  // CRUD TOOLS - Update and Delete Operations
  // Use these to refine the model as the team's understanding evolves.
  // ============================================================

  // Tool: update_actor
  server.addTool({
    name: 'update_actor',
    description: 'Modify an existing actor\'s properties. Use this when the team refines their understanding of an actor\'s capabilities, adds new abilities, or clarifies constraints. All fields are optional - only provide fields that need to change.',
    parameters: z.object({
      id: z.string().uuid().describe('UUID of the actor to update'),
      name: z.string().optional().describe('New display name (if changing)'),
      description: z.string().optional().describe('Updated description (if adding context)'),
      abilities: z.array(z.string()).optional().describe('Replacement abilities array (not merged - provide complete new list if changing)'),
      constraints: z.array(z.string()).optional().describe('Replacement constraints array (not merged - provide complete new list if changing)'),
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
    description: 'Define a concrete activity that actors perform to achieve goals. IMPORTANT: Before creating a new task, use find_task_by_name to check if a task with this name already exists - this prevents duplicates. Only create if the task is genuinely new. Tasks are the "how" - they decompose goals into actionable steps. Tasks require specific abilities (which actors must have) and are composed of lower-level interactions.',
    parameters: z.object({
      name: z.string().describe('Action-oriented name (e.g., "Submit Order", "Validate Payment", "Send Confirmation Email")'),
      description: z.string().describe('Detailed explanation of what happens during this task, including any business rules or technical steps'),
      required_abilities: z.array(z.string()).describe('Abilities an actor must possess to perform this task (e.g., ["access_database", "send_email"]). These must match abilities defined on actors.'),
      composed_of: z.array(z.string().uuid()).optional().default([]).describe('Array of interaction IDs that make up this task. Referencing non-existent interactions creates gaps - useful for progressive decomposition.'),
      goal_ids: z.array(z.string().uuid()).optional().default([]).describe('Array of goal IDs that this task helps achieve. Links tasks to higher-level objectives.'),
    }),
    execute: async (args) => {
      const now = new Date().toISOString();
      const task = {
        id: uuidv4(),
        name: args.name,
        description: args.description,
        required_abilities: args.required_abilities,
        composed_of: args.composed_of,
        goal_ids: args.goal_ids,
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
    description: 'Modify an existing task. Use this to refine task descriptions, adjust required abilities, add/remove interactions, or link to additional goals as understanding evolves.',
    parameters: z.object({
      id: z.string().uuid().describe('UUID of the task to update'),
      name: z.string().optional().describe('New name (if changing)'),
      description: z.string().optional().describe('Updated description (if adding clarity)'),
      required_abilities: z.array(z.string()).optional().describe('Replacement abilities array (provide complete new list if changing)'),
      composed_of: z.array(z.string().uuid()).optional().describe('Replacement interaction IDs array (provide complete new list if changing)'),
      goal_ids: z.array(z.string().uuid()).optional().describe('Replacement goal IDs array (provide complete new list if changing)'),
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
    description: 'Remove a task from the model. Use when a task is no longer relevant or was created by mistake. Deleting a task will create gaps in journeys that reference it.',
    parameters: z.object({
      id: z.string().uuid().describe('UUID of the task to remove'),
    }),
    execute: async (args) => {
      await storage.delete('task', args.id);
      return JSON.stringify({ success: true, data: { id: args.id } });
    },
  });

  // Tool: define_interaction
  server.addTool({
    name: 'define_interaction',
    description: 'Define a low-level system interaction - the atomic operations that tasks are composed of. IMPORTANT: Before creating a new interaction, use find_interaction_by_name to check if an interaction with this name already exists - this prevents duplicates. Only create if the interaction is genuinely new. Use this for API calls, database operations, UI actions, or any technical step that changes system state. Interactions have preconditions (what must be true first) and effects (what changes as a result).',
    parameters: z.object({
      name: z.string().describe('Technical name for the operation (e.g., "POST /api/orders", "Query UserTable", "Click Submit Button")'),
      description: z.string().describe('Technical details about this interaction, including protocols, data formats, or UI specifics'),
      preconditions: z.array(z.string()).describe('Conditions that must be true before this interaction can execute (e.g., ["user authenticated", "cart not empty", "payment token valid"])'),
      effects: z.array(z.string()).describe('State changes that result from this interaction (e.g., ["order created in database", "inventory decremented", "confirmation email queued"])'),
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
    description: 'Modify an existing interaction. Use this to refine technical details, add preconditions, or update effects as implementation understanding improves.',
    parameters: z.object({
      id: z.string().uuid().describe('UUID of the interaction to update'),
      name: z.string().optional().describe('New name (if changing)'),
      description: z.string().optional().describe('Updated description (if adding technical details)'),
      preconditions: z.array(z.string()).optional().describe('Replacement preconditions array (provide complete new list if changing)'),
      effects: z.array(z.string()).optional().describe('Replacement effects array (provide complete new list if changing)'),
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
    description: 'Remove an interaction from the model. Use when an interaction is obsolete or was created by mistake. Deleting an interaction will create gaps in tasks that reference it.',
    parameters: z.object({
      id: z.string().uuid().describe('UUID of the interaction to remove'),
    }),
    execute: async (args) => {
      await storage.delete('interaction', args.id);
      return JSON.stringify({ success: true, data: { id: args.id } });
    },
  });

  // Tool: update_goal
  server.addTool({
    name: 'update_goal',
    description: 'Modify an existing goal. Use this to adjust priorities, refine success criteria, reassign actors, or clarify descriptions as requirements evolve.',
    parameters: z.object({
      id: z.string().uuid().describe('UUID of the goal to update'),
      name: z.string().optional().describe('New name (if changing)'),
      description: z.string().optional().describe('Updated description (if clarifying)'),
      success_criteria: z.array(z.string()).optional().describe('Replacement success criteria array (provide complete new list if changing)'),
      priority: z.enum(['low', 'medium', 'high']).optional().describe('New priority level (if reprioritizing)'),
      assigned_to: z.array(z.string().uuid()).optional().describe('Replacement actor assignments array (provide complete new list if changing)'),
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
    description: 'Remove a goal from the model. Use when a goal is descoped, obsolete, or was created by mistake. Deleting a goal will create gaps in journeys that reference it.',
    parameters: z.object({
      id: z.string().uuid().describe('UUID of the goal to remove'),
    }),
    execute: async (args) => {
      await storage.delete('goal', args.id);
      return JSON.stringify({ success: true, data: { id: args.id } });
    },
  });

  // Tool: define_question
  server.addTool({
    name: 'define_question',
    description: 'Define a question that actors need to ask about system state. Use this when discussing queries, reports, dashboards, or any information retrieval need. Questions represent read-only operations that don\'t change state but provide visibility.',
    parameters: z.object({
      name: z.string().describe('Query-focused name (e.g., "What is my order status?", "How many items in stock?", "Who approved this request?")'),
      description: z.string().describe('Detailed explanation of why this question matters, who asks it, and when it\'s asked'),
      asks_about: z.string().describe('The system state or data being queried (e.g., "order status and tracking information", "current inventory levels", "approval workflow history")'),
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
    description: 'Modify an existing question. Use this to refine the query, clarify what\'s being asked about, or update the description as data requirements are better understood.',
    parameters: z.object({
      id: z.string().uuid().describe('UUID of the question to update'),
      name: z.string().optional().describe('New question text (if rewording)'),
      description: z.string().optional().describe('Updated description (if adding context)'),
      asks_about: z.string().optional().describe('Updated system state description (if clarifying data needs)'),
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
    description: 'Remove a question from the model. Use when a question is no longer needed or was created by mistake.',
    parameters: z.object({
      id: z.string().uuid().describe('UUID of the question to remove'),
    }),
    execute: async (args) => {
      await storage.delete('question', args.id);
      return JSON.stringify({ success: true, data: { id: args.id } });
    },
  });

  // Tool: define_journey
  server.addTool({
    name: 'define_journey',
    description: 'Define an end-to-end scenario where an actor pursues one or more goals through a sequence of tasks. Journeys are like test scenarios or user flows - they validate that the model is complete and coherent. Use this to model user stories, test cases, or business processes. Journeys help discover missing tasks and interactions.',
    parameters: z.object({
      name: z.string().describe('Scenario name (e.g., "First-Time User Makes Purchase", "Admin Generates Monthly Report", "Customer Tracks Shipment")'),
      description: z.string().describe('Narrative description of this scenario, including context, triggers, and expected outcomes'),
      actor_id: z.string().uuid().describe('UUID of the actor performing this journey. Referencing non-existent actor creates a gap - useful for discovering missing actors.'),
      goal_ids: z.array(z.string().uuid()).describe('Array of goal IDs this journey aims to achieve. Typically 1-3 related goals. Referencing non-existent goals creates gaps.'),
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
    description: 'Modify an existing journey. Use this to change the actor, adjust goals, or refine the scenario description. Note: use record_journey_step to add steps, not this tool.',
    parameters: z.object({
      id: z.string().uuid().describe('UUID of the journey to update'),
      name: z.string().optional().describe('New scenario name (if changing)'),
      description: z.string().optional().describe('Updated narrative (if adding context)'),
      actor_id: z.string().uuid().optional().describe('New actor ID (if changing who performs this journey)'),
      goal_ids: z.array(z.string().uuid()).optional().describe('Replacement goal IDs array (provide complete new list if changing)'),
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
    description: 'Remove a journey from the model. Use when a scenario is no longer relevant or was created by mistake.',
    parameters: z.object({
      id: z.string().uuid().describe('UUID of the journey to remove'),
    }),
    execute: async (args) => {
      await storage.delete('journey', args.id);
      return JSON.stringify({ success: true, data: { id: args.id } });
    },
  });

  // ============================================================
  // COMPOSITION TOOLS - Build Relationships Between Entities
  // These tools manage the connections between actors, goals, tasks,
  // interactions, and journeys. All are idempotent (safe to call multiple times).
  // ============================================================

  // Tool: assign_goal_to_actor
  server.addTool({
    name: 'assign_goal_to_actor',
    description: 'Assign a goal to an actor, indicating this actor has the abilities needed to achieve this goal. Use this after defining actors and goals to build responsibility relationships. Idempotent - safe to call multiple times with same IDs.',
    parameters: z.object({
      actor_id: z.string().uuid().describe('UUID of the actor who will pursue this goal'),
      goal_id: z.string().uuid().describe('UUID of the goal to assign'),
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
    description: 'Remove a goal assignment from an actor. Use this when an actor should no longer be responsible for a goal, or when correcting an incorrect assignment. Idempotent - safe to call even if not currently assigned.',
    parameters: z.object({
      actor_id: z.string().uuid().describe('UUID of the actor to remove from this goal'),
      goal_id: z.string().uuid().describe('UUID of the goal to unassign'),
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
    description: 'Add an interaction as a component of a task, building the task\'s implementation detail. Use this to decompose high-level tasks into low-level technical operations. Idempotent - safe to call multiple times.',
    parameters: z.object({
      task_id: z.string().uuid().describe('UUID of the task being composed'),
      interaction_id: z.string().uuid().describe('UUID of the interaction to add as a component'),
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
    description: 'Remove an interaction from a task\'s composition. Use this when an interaction is no longer part of the task, or when correcting an incorrect composition. Idempotent - safe to call even if not currently composed.',
    parameters: z.object({
      task_id: z.string().uuid().describe('UUID of the task to modify'),
      interaction_id: z.string().uuid().describe('UUID of the interaction to remove'),
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
    description: 'Add a task execution step to a journey\'s timeline. Use this to build the sequence of tasks an actor performs during a scenario. Steps are append-only (creating a timeline) and include outcomes. This helps validate that journeys are feasible and complete.',
    parameters: z.object({
      journey_id: z.string().uuid().describe('UUID of the journey being executed'),
      task_id: z.string().uuid().describe('UUID of the task being performed in this step'),
      outcome: z.enum(['success', 'failure', 'blocked']).describe('Result of executing this task: "success" = task completed, "failure" = task attempted but failed, "blocked" = task couldn\'t be attempted due to missing preconditions'),
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
    description: 'Add an additional goal to an existing journey. Use this when a journey pursues multiple related goals, or when refining a journey\'s scope. Idempotent - safe to call multiple times.',
    parameters: z.object({
      journey_id: z.string().uuid().describe('UUID of the journey to modify'),
      goal_id: z.string().uuid().describe('UUID of the goal to add'),
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
    description: 'Remove a goal from a journey\'s scope. Use this when narrowing a journey\'s focus or correcting an incorrect goal association. Idempotent - safe to call even if not currently associated.',
    parameters: z.object({
      journey_id: z.string().uuid().describe('UUID of the journey to modify'),
      goal_id: z.string().uuid().describe('UUID of the goal to remove'),
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

  // ============================================================
  // ANALYTICAL TOOLS - Discover Issues and Validate Completeness
  // Use these tools to find problems, gaps, and inconsistencies in the model.
  // Run these periodically to guide the conversation toward missing details.
  // ============================================================

  // Tool: find_actors_without_ability
  server.addTool({
    name: 'find_actors_without_ability',
    description: 'Identify all actors that do NOT have a specific ability. Use this to find who cannot perform certain tasks, helping validate actor definitions and discover capability gaps. Useful when discussing constraints or limitations.',
    parameters: z.object({
      ability: z.string().describe('The ability to check for (must match ability strings exactly, e.g., "deploy_to_production", "access_customer_data", "send_notifications")'),
    }),
    execute: async (args) => {
      const actors = await storage.getAll('actor');
      const result = findActorsWithoutAbility(actors as Actor[], args.ability);
      return JSON.stringify(result);
    },
  });

  // Tool: find_tasks_without_interactions
  server.addTool({
    name: 'find_tasks_without_interactions',
    description: 'Find all tasks that have empty interaction lists - these are high-level tasks that haven\'t been decomposed yet. Use this to identify where more technical detail is needed. These tasks appear complete at the goal level but lack implementation specifics.',
    parameters: z.object({}),
    execute: async () => {
      const tasks = await storage.getAll('task');
      const result = findTasksWithoutInteractions(tasks as Task[]);
      return JSON.stringify(result);
    },
  });

  // Tool: find_untested_journeys
  server.addTool({
    name: 'find_untested_journeys',
    description: 'Find all journeys with no recorded steps - these are scenarios that have been identified but not yet validated through task execution. Use this to identify which user stories or test cases need to be walked through.',
    parameters: z.object({}),
    execute: async () => {
      const journeys = await storage.getAll('journey');
      const result = findUntestedJourneys(journeys as Journey[]);
      return JSON.stringify(result);
    },
  });

  // Tool: actor_can_achieve_goal
  server.addTool({
    name: 'actor_can_achieve_goal',
    description: 'Validate whether a specific actor possesses all abilities required by tasks that achieve a specific goal. Returns detailed reasoning including which abilities are present, which are missing, and which tasks are affected. Use this to validate actor-goal assignments or diagnose why a journey might fail.',
    parameters: z.object({
      actor_id: z.string().uuid().describe('UUID of the actor to validate'),
      goal_id: z.string().uuid().describe('UUID of the goal to check achievability for'),
    }),
    execute: async (args) => {
      const actor = await storage.get('actor', args.actor_id) as Actor | null;
      const goal = await storage.get('goal', args.goal_id) as Goal | null;
      const tasks = await storage.getAll('task');

      if (!actor) {
        return JSON.stringify({
          can_achieve: false,
          reason: `Actor ${args.actor_id} not found`,
          actor_abilities: [],
          required_abilities: [],
          missing_abilities: [],
        });
      }

      if (!goal) {
        return JSON.stringify({
          can_achieve: false,
          reason: `Goal ${args.goal_id} not found`,
          actor_abilities: actor.abilities,
          required_abilities: [],
          missing_abilities: [],
        });
      }

      const result = checkActorCanAchieveGoal(actor, goal, tasks as Task[]);
      return JSON.stringify(result);
    },
  });

  // Tool: find_unachievable_goals
  server.addTool({
    name: 'find_unachievable_goals',
    description: 'Scan the entire model to find goals where assigned actors lack required abilities for associated tasks. This reveals systemic problems - goals that cannot be achieved with current actor capabilities. Use this as a health check to validate the model\'s coherence. Optionally filter to a specific actor to focus on one actor\'s capability gaps.',
    parameters: z.object({
      actor_id: z.string().uuid().optional().describe('Optional: UUID of a specific actor. If provided, only analyzes goals assigned to this actor. If omitted, checks all actors and all goals.'),
    }),
    execute: async (args) => {
      const goals = await storage.getAll('goal');
      const actors = await storage.getAll('actor');
      const tasks = await storage.getAll('task');

      const result = findUnachievableGoals(
        goals as Goal[],
        actors as Actor[],
        tasks as Task[],
        args.actor_id
      );
      return JSON.stringify(result);
    },
  });

  // ============================================================
  // NAME LOOKUP TOOLS - Find entities by name to prevent duplicates
  // These tools help LLMs check if an entity already exists before creating a new one.
  // Always use these tools before calling define_* tools to avoid duplicating entities.
  // ============================================================

  // Tool: find_actor_by_name
  server.addTool({
    name: 'find_actor_by_name',
    description: 'Find an existing actor by name (case-insensitive). Use this BEFORE calling define_actor to check if an actor already exists. This prevents creating duplicate actors with the same name. Returns the existing actor if found, or null if not found.',
    parameters: z.object({
      name: z.string().describe('The name of the actor to search for (case-insensitive, e.g., "Payment Gateway" matches "payment gateway")'),
    }),
    execute: async (args) => {
      const actors = await storage.getAll('actor') as Actor[];
      const found = findActorByName(actors, args.name);
      return JSON.stringify(found || null);
    },
  });

  // Tool: find_goal_by_name
  server.addTool({
    name: 'find_goal_by_name',
    description: 'Find an existing goal by name (case-insensitive). Use this BEFORE calling define_goal to check if a goal already exists. This prevents creating duplicate goals with the same name. Returns the existing goal if found, or null if not found.',
    parameters: z.object({
      name: z.string().describe('The name of the goal to search for (case-insensitive, e.g., "Complete Purchase" matches "complete purchase")'),
    }),
    execute: async (args) => {
      const goals = await storage.getAll('goal') as Goal[];
      const found = findGoalByName(goals, args.name);
      return JSON.stringify(found || null);
    },
  });

  // Tool: find_task_by_name
  server.addTool({
    name: 'find_task_by_name',
    description: 'Find an existing task by name (case-insensitive). Use this BEFORE calling define_task to check if a task already exists. This prevents creating duplicate tasks with the same name. Returns the existing task if found, or null if not found.',
    parameters: z.object({
      name: z.string().describe('The name of the task to search for (case-insensitive, e.g., "Submit Order" matches "submit order")'),
    }),
    execute: async (args) => {
      const tasks = await storage.getAll('task') as Task[];
      const found = findTaskByName(tasks, args.name);
      return JSON.stringify(found || null);
    },
  });

  // Tool: find_interaction_by_name
  server.addTool({
    name: 'find_interaction_by_name',
    description: 'Find an existing interaction by name (case-insensitive). Use this BEFORE calling define_interaction to check if an interaction already exists. This prevents creating duplicate interactions with the same name. Returns the existing interaction if found, or null if not found.',
    parameters: z.object({
      name: z.string().describe('The name of the interaction to search for (case-insensitive, e.g., "POST /api/orders" matches "post /api/orders")'),
    }),
    execute: async (args) => {
      const interactions = await storage.getAll('interaction') as Interaction[];
      const found = findInteractionByName(interactions, args.name);
      return JSON.stringify(found || null);
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
    if (Array.isArray(task.composed_of) && task.composed_of.length > 0) {
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
    }
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
