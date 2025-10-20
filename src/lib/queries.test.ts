import { describe, it, expect } from 'vitest';
import {
  findActorByName,
  findGoalByName,
  findTaskByName,
  findInteractionByName,
} from './queries.js';
import { Actor, Goal, Task, Interaction } from './schemas.js';

describe('Find by name functions', () => {
  describe('findActorByName', () => {
    const actors: Actor[] = [
      {
        id: '1',
        name: 'Payment Gateway',
        description: 'Processes payments',
        abilities: ['charge_card', 'refund'],
        constraints: ['requires_api_key'],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        name: 'Customer Service Rep',
        description: 'Handles customer inquiries',
        abilities: ['access_crm', 'issue_refunds'],
        constraints: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    it('should find actor by exact name', () => {
      const result = findActorByName(actors, 'Payment Gateway');
      expect(result).toBeDefined();
      expect(result?.id).toBe('1');
      expect(result?.name).toBe('Payment Gateway');
    });

    it('should find actor by case-insensitive name', () => {
      const result = findActorByName(actors, 'payment gateway');
      expect(result).toBeDefined();
      expect(result?.id).toBe('1');
    });

    it('should find actor with leading/trailing whitespace', () => {
      const result = findActorByName(actors, '  Payment Gateway  ');
      expect(result).toBeDefined();
      expect(result?.id).toBe('1');
    });

    it('should return undefined for non-existent actor', () => {
      const result = findActorByName(actors, 'NonExistent Actor');
      expect(result).toBeUndefined();
    });

    it('should return undefined for empty array', () => {
      const result = findActorByName([], 'Any Actor');
      expect(result).toBeUndefined();
    });
  });

  describe('findGoalByName', () => {
    const goals: Goal[] = [
      {
        id: '1',
        name: 'Complete Purchase',
        description: 'User completes checkout',
        success_criteria: ['Payment confirmed', 'Receipt sent'],
        priority: 'high',
        assigned_to: ['actor-1'],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        name: 'Generate Report',
        description: 'Generate monthly report',
        success_criteria: ['Report created'],
        priority: 'medium',
        assigned_to: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    it('should find goal by exact name', () => {
      const result = findGoalByName(goals, 'Complete Purchase');
      expect(result).toBeDefined();
      expect(result?.id).toBe('1');
      expect(result?.name).toBe('Complete Purchase');
    });

    it('should find goal by case-insensitive name', () => {
      const result = findGoalByName(goals, 'COMPLETE PURCHASE');
      expect(result).toBeDefined();
      expect(result?.id).toBe('1');
    });

    it('should return undefined for non-existent goal', () => {
      const result = findGoalByName(goals, 'NonExistent Goal');
      expect(result).toBeUndefined();
    });
  });

  describe('findTaskByName', () => {
    const tasks: Task[] = [
      {
        id: '1',
        name: 'Validate Payment',
        description: 'Validate payment information',
        required_abilities: ['validate_card'],
        composed_of: [],
        goal_ids: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        name: 'Send Confirmation',
        description: 'Send order confirmation',
        required_abilities: ['send_email'],
        composed_of: [],
        goal_ids: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    it('should find task by exact name', () => {
      const result = findTaskByName(tasks, 'Validate Payment');
      expect(result).toBeDefined();
      expect(result?.id).toBe('1');
      expect(result?.name).toBe('Validate Payment');
    });

    it('should find task by case-insensitive name', () => {
      const result = findTaskByName(tasks, 'validate payment');
      expect(result).toBeDefined();
      expect(result?.id).toBe('1');
    });

    it('should return undefined for non-existent task', () => {
      const result = findTaskByName(tasks, 'NonExistent Task');
      expect(result).toBeUndefined();
    });
  });

  describe('findInteractionByName', () => {
    const interactions: Interaction[] = [
      {
        id: '1',
        name: 'POST /api/orders',
        description: 'Create order via API',
        preconditions: ['User authenticated'],
        effects: ['Order created'],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        name: 'GET /api/orders/:id',
        description: 'Retrieve order details',
        preconditions: ['Order exists'],
        effects: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    it('should find interaction by exact name', () => {
      const result = findInteractionByName(interactions, 'POST /api/orders');
      expect(result).toBeDefined();
      expect(result?.id).toBe('1');
      expect(result?.name).toBe('POST /api/orders');
    });

    it('should find interaction by case-insensitive name', () => {
      const result = findInteractionByName(interactions, 'post /api/orders');
      expect(result).toBeDefined();
      expect(result?.id).toBe('1');
    });

    it('should return undefined for non-existent interaction', () => {
      const result = findInteractionByName(interactions, 'DELETE /api/orders');
      expect(result).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty strings', () => {
      const actors: Actor[] = [{
        id: '1',
        name: '',
        description: 'Empty name',
        abilities: [],
        constraints: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }];

      const result = findActorByName(actors, '');
      expect(result).toBeDefined();
      expect(result?.id).toBe('1');
    });

    it('should handle special characters in names', () => {
      const actors: Actor[] = [{
        id: '1',
        name: 'Actor-123 (Test)',
        description: 'Special chars',
        abilities: [],
        constraints: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }];

      const result = findActorByName(actors, 'actor-123 (test)');
      expect(result).toBeDefined();
      expect(result?.id).toBe('1');
    });
  });
});
