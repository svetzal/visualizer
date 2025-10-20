import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSONStorage } from './storage.js';
import { Actor, Goal, Task, Interaction } from './schemas.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';

describe('JSONStorage', () => {
  let storage: JSONStorage;
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for test storage
    tempDir = path.join(os.tmpdir(), `test-storage-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    storage = new JSONStorage(tempDir);
    await storage.initialize();
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  describe('Actor operations', () => {
    it('should save and retrieve an actor', async () => {
      const actor: Actor = {
        id: uuidv4(),
        name: 'Test Actor',
        description: 'A test actor',
        abilities: ['test_ability'],
        constraints: ['test_constraint'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await storage.save('actor', actor);
      const retrieved = await storage.get('actor', actor.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(actor.id);
      expect(retrieved?.name).toBe('Test Actor');
    });

    it('should emit change event when actor is created', async () => {
      let eventReceived = false;
      storage.on('change', (event) => {
        if (event.type === 'create' && event.entity === 'actor') {
          eventReceived = true;
        }
      });

      const actor: Actor = {
        id: uuidv4(),
        name: 'Another Actor',
        description: 'Description',
        abilities: [],
        constraints: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await storage.save('actor', actor);
      expect(eventReceived).toBe(true);
    });

    it('should update an existing actor', async () => {
      const actorId = uuidv4();
      const actor: Actor = {
        id: actorId,
        name: 'Original Name',
        description: 'Original description',
        abilities: ['ability1'],
        constraints: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await storage.save('actor', actor);
      await storage.update('actor', actorId, {
        name: 'Updated Name',
        abilities: ['ability1', 'ability2'],
      });

      const updated = await storage.get('actor', actorId);
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.abilities).toContain('ability2');
    });

    it('should delete an actor', async () => {
      const actorId = uuidv4();
      const actor: Actor = {
        id: actorId,
        name: 'To Be Deleted',
        description: 'Will be deleted',
        abilities: [],
        constraints: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await storage.save('actor', actor);
      await storage.delete('actor', actorId);

      const retrieved = await storage.get('actor', actorId);
      expect(retrieved).toBeUndefined();
    });

    it('should list all actors', async () => {
      const actor1: Actor = {
        id: uuidv4(),
        name: 'Actor 1',
        description: 'First actor',
        abilities: [],
        constraints: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const actor2: Actor = {
        id: uuidv4(),
        name: 'Actor 2',
        description: 'Second actor',
        abilities: [],
        constraints: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await storage.save('actor', actor1);
      await storage.save('actor', actor2);

      const allActors = await storage.getAll('actor');
      expect(allActors).toHaveLength(2);
    });
  });

  describe('Goal operations', () => {
    it('should save and retrieve a goal', async () => {
      const goalId = uuidv4();
      const goal: Goal = {
        id: goalId,
        name: 'Test Goal',
        description: 'A test goal',
        success_criteria: ['criterion1'],
        priority: 'high',
        assigned_to: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await storage.save('goal', goal);
      const retrieved = await storage.get('goal', goalId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Goal');
      expect((retrieved as Goal)?.priority).toBe('high');
    });

    it('should handle goals with assigned actors', async () => {
      const goalId = uuidv4();
      const actorId1 = uuidv4();
      const actorId2 = uuidv4();
      const goal: Goal = {
        id: goalId,
        name: 'Assigned Goal',
        description: 'Goal with actors',
        success_criteria: [],
        priority: 'medium',
        assigned_to: [actorId1, actorId2],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await storage.save('goal', goal);
      const retrieved = await storage.get('goal', goalId) as Goal;

      expect(retrieved.assigned_to).toHaveLength(2);
      expect(retrieved.assigned_to).toContain(actorId1);
    });
  });

  describe('Task operations', () => {
    it('should save and retrieve a task', async () => {
      const taskId = uuidv4();
      const task: Task = {
        id: taskId,
        name: 'Test Task',
        description: 'A test task',
        required_abilities: ['ability1'],
        composed_of: [],
        goal_ids: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await storage.save('task', task);
      const retrieved = await storage.get('task', taskId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Task');
      expect((retrieved as Task)?.required_abilities).toContain('ability1');
    });

    it('should handle tasks with interactions', async () => {
      const taskId = uuidv4();
      const interactionId1 = uuidv4();
      const interactionId2 = uuidv4();
      const goalId = uuidv4();
      const task: Task = {
        id: taskId,
        name: 'Task with Interactions',
        description: 'Task composed of interactions',
        required_abilities: [],
        composed_of: [interactionId1, interactionId2],
        goal_ids: [goalId],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await storage.save('task', task);
      const retrieved = await storage.get('task', taskId) as Task;

      expect(retrieved.composed_of).toHaveLength(2);
      expect(retrieved.goal_ids).toContain(goalId);
    });
  });

  describe('Interaction operations', () => {
    it('should save and retrieve an interaction', async () => {
      const interactionId = uuidv4();
      const interaction: Interaction = {
        id: interactionId,
        name: 'Test Interaction',
        description: 'A test interaction',
        preconditions: ['precondition1'],
        effects: ['effect1'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await storage.save('interaction', interaction);
      const retrieved = await storage.get('interaction', interactionId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Interaction');
      expect((retrieved as Interaction)?.preconditions).toContain('precondition1');
    });
  });

  describe('Clear operation', () => {
    it('should clear all entities', async () => {
      const actor: Actor = {
        id: uuidv4(),
        name: 'Actor',
        description: 'Will be cleared',
        abilities: [],
        constraints: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const goal: Goal = {
        id: uuidv4(),
        name: 'Goal',
        description: 'Will be cleared',
        success_criteria: [],
        priority: 'low',
        assigned_to: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await storage.save('actor', actor);
      await storage.save('goal', goal);

      await storage.clear();

      const actors = await storage.getAll('actor');
      const goals = await storage.getAll('goal');

      expect(actors).toHaveLength(0);
      expect(goals).toHaveLength(0);
    });
  });

  describe('Error handling', () => {
    it('should throw error when updating non-existent entity', async () => {
      await expect(
        storage.update('actor', 'non-existent', { name: 'Updated' })
      ).rejects.toThrow();
    });

    it('should throw error when deleting non-existent entity', async () => {
      await expect(
        storage.delete('actor', 'non-existent')
      ).rejects.toThrow();
    });
  });
});
