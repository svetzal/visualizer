import { z } from 'zod';

// Base Entity Schema
const EntitySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Actor Schema
export const ActorSchema = EntitySchema.extend({
  abilities: z.array(z.string()),
  constraints: z.array(z.string()),
});

// Goal Schema
export const GoalSchema = EntitySchema.extend({
  success_criteria: z.array(z.string()),
  priority: z.enum(['low', 'medium', 'high']),
  assigned_to: z.array(z.string().min(1)), // Allow any string ID (may reference non-existent actors to create gaps)
});

// Task Schema
export const TaskSchema = EntitySchema.extend({
  required_abilities: z.array(z.string()),
  composed_of: z.array(z.string().min(1)), // Allow any string ID (may reference non-existent interactions to create gaps)
  goal_ids: z.array(z.string().min(1)).optional().default([]), // Goals this task helps achieve (may reference non-existent goals)
});

// Interaction Schema
export const InteractionSchema = EntitySchema.extend({
  preconditions: z.array(z.string()),
  effects: z.array(z.string()),
});

// Question Schema
export const QuestionSchema = EntitySchema.extend({
  asks_about: z.string(),
});

// Journey Step Schema
export const JourneyStepSchema = z.object({
  task_id: z.string().uuid(),
  outcome: z.string(),
  timestamp: z.string().datetime(),
});

// Journey Schema
export const JourneySchema = EntitySchema.extend({
  actor_id: z.string().uuid(),
  goal_ids: z.array(z.string().uuid()),
  steps: z.array(JourneyStepSchema),
});

// TypeScript Interfaces (inferred from schemas)
export type Entity = z.infer<typeof EntitySchema>;
export type Actor = z.infer<typeof ActorSchema>;
export type Goal = z.infer<typeof GoalSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Interaction = z.infer<typeof InteractionSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type JourneyStep = z.infer<typeof JourneyStepSchema>;
export type Journey = z.infer<typeof JourneySchema>;

// Gap type (visualization-specific, not stored)
export interface Gap {
  id: string;
  expected_type: 'actor' | 'goal' | 'task' | 'interaction';
  referenced_by: string[];
}

// Entity type union
export type AnyEntity = Actor | Goal | Task | Interaction | Question | Journey;

// Storage change event
export interface StorageChangeEvent {
  type: 'create' | 'update' | 'delete';
  entity: 'actor' | 'goal' | 'task' | 'interaction' | 'question' | 'journey';
  data: AnyEntity | { id: string };
}

// Entity type names
export const ENTITY_TYPES = ['actor', 'goal', 'task', 'interaction', 'question', 'journey'] as const;
export type EntityType = typeof ENTITY_TYPES[number];

// Schema map for validation
export const SCHEMA_MAP = {
  actor: ActorSchema,
  goal: GoalSchema,
  task: TaskSchema,
  interaction: InteractionSchema,
  question: QuestionSchema,
  journey: JourneySchema,
} as const;

// Unified model shape used by renderer/tests/MCP outputs
export type FullModel = {
  actors: Actor[];
  goals: Goal[];
  tasks: Task[];
  interactions: Interaction[];
  questions: Question[];
  journeys: Journey[];
  gaps?: Gap[]; // optional when reading from storage-only endpoints
};
