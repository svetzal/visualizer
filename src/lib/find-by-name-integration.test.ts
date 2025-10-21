import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSONStorage } from './storage.js';
import { Actor, Goal, Task, Interaction } from './schemas.js';
import {
  findActorByName,
  findGoalByName,
  findTaskByName,
  findInteractionByName,
} from './queries.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';

describe('Find by name integration with storage', () => {
  let storage: JSONStorage;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `test-integration-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    storage = new JSONStorage(tempDir);
    await storage.initialize();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  describe('Preventing duplicates with find-by-name', () => {
    it('should detect existing actor before creating duplicate', async () => {
      // Create an actor
      const actor: Actor = {
        id: uuidv4(),
        name: 'Payment Gateway',
        description: 'Processes payments',
        abilities: ['charge_card'],
        constraints: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await storage.save('actor', actor);

      // Try to find it with exact name
      const actors = await storage.getAll('actor') as Actor[];
      const found = findActorByName(actors, 'Payment Gateway');
      
      expect(found).toBeDefined();
      expect(found?.id).toBe(actor.id);
    });

    it('should detect existing actor with case-insensitive match', async () => {
      const actor: Actor = {
        id: uuidv4(),
        name: 'Customer Service Rep',
        description: 'Handles inquiries',
        abilities: [],
        constraints: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await storage.save('actor', actor);

      const actors = await storage.getAll('actor') as Actor[];
      const found = findActorByName(actors, 'CUSTOMER SERVICE REP');
      
      expect(found).toBeDefined();
      expect(found?.id).toBe(actor.id);
    });

    it('should return undefined when actor does not exist', async () => {
      const actors = await storage.getAll('actor') as Actor[];
      const found = findActorByName(actors, 'NonExistent Actor');
      
      expect(found).toBeUndefined();
    });
  });

  describe('Model consistency scenarios', () => {
    it('should find goal after creation and prevent duplicate', async () => {
      // Scenario: LLM mentions "Complete Purchase" goal
      const goal1: Goal = {
        id: uuidv4(),
        name: 'Complete Purchase',
        description: 'User completes checkout',
        success_criteria: ['Payment confirmed'],
        priority: 'high',
        assigned_to: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await storage.save('goal', goal1);

      // Later in conversation, LLM mentions "complete purchase" again
      const goals = await storage.getAll('goal') as Goal[];
      const existing = findGoalByName(goals, 'complete purchase');

      // Should find the existing goal
      expect(existing).toBeDefined();
      expect(existing?.id).toBe(goal1.id);

      // If we check before creating, we avoid duplicate
      if (!existing) {
        // Would create new goal here
        throw new Error('Should not reach this point');
      }
    });

    it('should handle multiple entities with similar but different names', async () => {
      const task1: Task = {
        id: uuidv4(),
        name: 'Validate Payment',
        description: 'Validate payment details',
        required_abilities: [],
        composed_of: [],
        goal_ids: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const task2: Task = {
        id: uuidv4(),
        name: 'Process Payment',
        description: 'Actually process the payment',
        required_abilities: [],
        composed_of: [],
        goal_ids: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await storage.save('task', task1);
      await storage.save('task', task2);

      const tasks = await storage.getAll('task') as Task[];
      
      const foundValidate = findTaskByName(tasks, 'Validate Payment');
      const foundProcess = findTaskByName(tasks, 'Process Payment');
      
      expect(foundValidate?.id).toBe(task1.id);
      expect(foundProcess?.id).toBe(task2.id);
      expect(foundValidate?.id).not.toBe(foundProcess?.id);
    });

    it('should support workflow: check before create pattern', async () => {
      const workflowName = 'POST /api/orders';

      // Step 1: Check if interaction exists
      let interactions = await storage.getAll('interaction') as Interaction[];
      let existing = findInteractionByName(interactions, workflowName);
      
      expect(existing).toBeUndefined();

      // Step 2: Create since it doesn't exist
      const interaction: Interaction = {
        id: uuidv4(),
        name: workflowName,
        description: 'Create order',
        preconditions: [],
        effects: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await storage.save('interaction', interaction);

      // Step 3: Later in conversation, check again
      interactions = await storage.getAll('interaction') as Interaction[];
      existing = findInteractionByName(interactions, workflowName);
      
      expect(existing).toBeDefined();
      expect(existing?.id).toBe(interaction.id);

      // Step 4: Don't create duplicate
      const duplicateCheck = findInteractionByName(interactions, 'post /api/orders');
      expect(duplicateCheck?.id).toBe(interaction.id);
    });
  });

  describe('Complex model scenarios', () => {
    it('should maintain referential integrity when using find-by-name', async () => {
      // Create an actor
      const actor: Actor = {
        id: uuidv4(),
        name: 'Accountant',
        description: 'Manages finances',
        abilities: ['review_reports'],
        constraints: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await storage.save('actor', actor);

      // Create a goal assigned to this actor
      const goal: Goal = {
        id: uuidv4(),
        name: 'Generate Report',
        description: 'Generate financial report',
        success_criteria: [],
        priority: 'high',
        assigned_to: [actor.id],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await storage.save('goal', goal);

      // Later: find actor by name to link another goal
      const actors = await storage.getAll('actor') as Actor[];
      const foundActor = findActorByName(actors, 'accountant');
      
      expect(foundActor).toBeDefined();
      expect(foundActor?.id).toBe(actor.id);

      // Create another goal with same actor (using found ID)
      const goal2: Goal = {
        id: uuidv4(),
        name: 'Audit Transactions',
        description: 'Review all transactions',
        success_criteria: [],
        priority: 'medium',
        assigned_to: [foundActor!.id],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await storage.save('goal', goal2);

      // Verify both goals reference the same actor
      const goals = await storage.getAll('goal') as Goal[];
      expect(goals).toHaveLength(2);
      expect(goals[0].assigned_to[0]).toBe(goals[1].assigned_to[0]);
    });

    it('should handle updating entity found by name', async () => {
      const task: Task = {
        id: uuidv4(),
        name: 'Send Email',
        description: 'Send confirmation email',
        required_abilities: ['send_email'],
        composed_of: [],
        goal_ids: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await storage.save('task', task);

      // Find task by name
      const tasks = await storage.getAll('task') as Task[];
      const found = findTaskByName(tasks, 'send email');
      
      expect(found).toBeDefined();

      // Update the found task
      await storage.update('task', found!.id, {
        required_abilities: ['send_email', 'access_smtp'],
      });

      // Verify update
      const updated = await storage.get('task', found!.id) as Task;
      expect(updated.required_abilities).toHaveLength(2);
      expect(updated.required_abilities).toContain('access_smtp');
    });
  });

  describe('Edge cases and error conditions', () => {
    it('should handle empty model gracefully', async () => {
      const actors = await storage.getAll('actor') as Actor[];
      const found = findActorByName(actors, 'Any Actor');
      
      expect(actors).toHaveLength(0);
      expect(found).toBeUndefined();
    });

    it('should distinguish between whitespace variations', async () => {
      const goal: Goal = {
        id: uuidv4(),
        name: '  Complete Purchase  ',
        description: 'Goal with spaces',
        success_criteria: [],
        priority: 'low',
        assigned_to: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await storage.save('goal', goal);

      const goals = await storage.getAll('goal') as Goal[];
      const found = findGoalByName(goals, 'Complete Purchase');
      
      // Should still find it due to trimming
      expect(found).toBeDefined();
      expect(found?.id).toBe(goal.id);
    });

    it('should return first match when duplicates exist', async () => {
      // Create two actors with same name (shouldn't happen but test the behavior)
      const actor1: Actor = {
        id: uuidv4(),
        name: 'Duplicate Actor',
        description: 'First one',
        abilities: [],
        constraints: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const actor2: Actor = {
        id: uuidv4(),
        name: 'Duplicate Actor',
        description: 'Second one',
        abilities: [],
        constraints: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await storage.save('actor', actor1);
      await storage.save('actor', actor2);

      const actors = await storage.getAll('actor') as Actor[];
      const found = findActorByName(actors, 'Duplicate Actor');
      
      // Should return first match
      expect(found).toBeDefined();
      expect(found?.id).toBe(actor1.id);
    });
  });
});
