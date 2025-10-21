/**
 * Query helper functions for Phase 3 analytical tools.
 * These functions analyze the screenplay model to surface insights.
 */

import { Actor, Goal, Task, Interaction, Journey } from './schemas.js';

// ============================================================
// Query Result Types
// ============================================================

export interface ActorCapability {
  actor: Actor;
  has_ability: boolean;
}

export interface GoalAchievability {
  goal: Goal;
  is_achievable: boolean;
  reason: string;
  assigned_actors: Actor[];
  missing_abilities: string[];
}

export interface ActorGoalCheck {
  can_achieve: boolean;
  reason: string;
  actor_abilities: string[];
  required_abilities: string[];
  missing_abilities: string[];
}

// ============================================================
// Query Functions
// ============================================================

/**
 * Find actors that lack a specific ability.
 *
 * @param actors - All actors in the model
 * @param ability - The ability to check for
 * @returns Actors that do NOT have the specified ability
 */
export function findActorsWithoutAbility(actors: Actor[], ability: string): Actor[] {
  return actors.filter(actor => !actor.abilities.includes(ability));
}

/**
 * Find tasks that have no interactions defined.
 * These are "empty" tasks that need decomposition.
 *
 * @param tasks - All tasks in the model
 * @returns Tasks with empty composed_of arrays
 */
export function findTasksWithoutInteractions(tasks: Task[]): Task[] {
  return tasks.filter(task => task.composed_of.length === 0);
}

/**
 * Find journeys that have no steps recorded.
 * These are journeys that haven't been executed/tested yet.
 *
 * @param journeys - All journeys in the model
 * @returns Journeys with empty steps arrays
 */
export function findUntestedJourneys(journeys: Journey[]): Journey[] {
  return journeys.filter(journey => journey.steps.length === 0);
}

/**
 * Check if a specific actor can achieve a specific goal.
 *
 * This function checks:
 * 1. If the actor is assigned to the goal
 * 2. If tasks exist that lead to the goal
 * 3. If the actor has the required abilities for at least one task
 *
 * @param actor - The actor to check
 * @param goal - The goal to check
 * @param tasks - All tasks in the model (to find tasks for this goal)
 * @returns Detailed check result with reasoning
 */
export function checkActorCanAchieveGoal(
  actor: Actor,
  goal: Goal,
  tasks: Task[]
): ActorGoalCheck {
  const actorAbilities = new Set(actor.abilities);

  // Check if actor is assigned to this goal
  const isAssigned = goal.assigned_to.includes(actor.id);
  if (!isAssigned) {
    return {
      can_achieve: false,
      reason: `Actor "${actor.name}" is not assigned to goal "${goal.name}"`,
      actor_abilities: actor.abilities,
      required_abilities: [],
      missing_abilities: [],
    };
  }

  // Filter tasks to only those related to this goal
  const relevantTasks = tasks.filter(task =>
    task.goal_ids && task.goal_ids.includes(goal.id)
  );

  if (relevantTasks.length === 0) {
    return {
      can_achieve: false,
      reason: `No tasks defined yet for goal "${goal.name}". Cannot determine missing abilities.`,
      actor_abilities: actor.abilities,
      required_abilities: [],
      missing_abilities: [],
    };
  }

  // Check if actor has ALL required abilities for AT LEAST ONE relevant task
  for (const task of relevantTasks) {
    const taskAbilities = new Set(task.required_abilities);
    const missingForTask = Array.from(taskAbilities).filter(
      ability => !actorAbilities.has(ability)
    );

    if (missingForTask.length === 0) {
      // Actor can perform this task!
      return {
        can_achieve: true,
        reason: `Actor "${actor.name}" can perform task "${task.name}"`,
        actor_abilities: actor.abilities,
        required_abilities: Array.from(taskAbilities),
        missing_abilities: [],
      };
    }
  }

  // Actor cannot perform any relevant task - collect all unique required abilities from relevant tasks
  const allRequiredAbilities = new Set<string>();
  relevantTasks.forEach(task => {
    task.required_abilities.forEach(ability => allRequiredAbilities.add(ability));
  });

  const missingAbilities = Array.from(allRequiredAbilities).filter(
    ability => !actorAbilities.has(ability)
  );

  return {
    can_achieve: false,
    reason: `Actor "${actor.name}" cannot perform any task for goal "${goal.name}". Missing abilities: ${missingAbilities.join(', ')}`,
    actor_abilities: actor.abilities,
    required_abilities: Array.from(allRequiredAbilities),
    missing_abilities: missingAbilities,
  };
}

/**
 * Find goals that cannot be achieved by their assigned actors.
 *
 * A goal is unachievable if:
 * - It has no assigned actors, OR
 * - None of the assigned actors have the required abilities for any task leading to the goal
 *
 * @param goals - All goals in the model
 * @param actors - All actors in the model
 * @param tasks - All tasks in the model
 * @param actorId - Optional: filter to check only goals assigned to this actor
 * @returns Array of goal achievability analysis
 */
export function findUnachievableGoals(
  goals: Goal[],
  actors: Actor[],
  tasks: Task[],
  actorId?: string
): GoalAchievability[] {
  const actorMap = new Map(actors.map(a => [a.id, a]));
  const unachievable: GoalAchievability[] = [];

  for (const goal of goals) {
    // Filter goals if actorId specified
    if (actorId && !goal.assigned_to.includes(actorId)) {
      continue;
    }

    // Get assigned actors (only those that exist)
    const assignedActors = goal.assigned_to
      .map(id => actorMap.get(id))
      .filter((a): a is Actor => a !== undefined);

    // If no assigned actors, it's unachievable
    if (assignedActors.length === 0) {
      unachievable.push({
        goal,
        is_achievable: false,
        reason: goal.assigned_to.length > 0
          ? 'All assigned actors are missing (gaps)'
          : 'No actors assigned to this goal',
        assigned_actors: [],
        missing_abilities: [],
      });
      continue;
    }

    // Filter tasks to only those related to this goal
    const relevantTasks = tasks.filter(task =>
      task.goal_ids && task.goal_ids.includes(goal.id)
    );

    // If no tasks for this goal, it's unachievable
    if (relevantTasks.length === 0) {
      unachievable.push({
        goal,
        is_achievable: false,
        reason: `No tasks defined yet for goal "${goal.name}"`,
        assigned_actors: assignedActors,
        missing_abilities: [],
      });
      continue;
    }

    // Check if at least one assigned actor can perform at least one relevant task
    const hasCapableActor = assignedActors.some(actor => {
      const actorAbilities = new Set(actor.abilities);
      return relevantTasks.some(task => {
        // Check if actor has ALL abilities for this task
        return task.required_abilities.every(ability =>
          actorAbilities.has(ability)
        );
      });
    });

    if (!hasCapableActor) {
      // Collect all required abilities from relevant tasks
      const allRequiredAbilities = new Set<string>();
      relevantTasks.forEach(task => {
        task.required_abilities.forEach(ability => allRequiredAbilities.add(ability));
      });

      // Collect missing abilities
      const allActorAbilities = new Set(
        assignedActors.flatMap(a => a.abilities)
      );
      const missingAbilities = Array.from(allRequiredAbilities).filter(
        ability => !allActorAbilities.has(ability)
      );

      unachievable.push({
        goal,
        is_achievable: false,
        reason: `None of the assigned actors can perform tasks for goal "${goal.name}". Missing abilities: ${missingAbilities.join(', ')}`,
        assigned_actors: assignedActors,
        missing_abilities: missingAbilities,
      });
    }
  }

  return unachievable;
}

/**
 * Find an actor by name (case-insensitive).
 *
 * @param actors - All actors in the model
 * @param name - The name to search for
 * @returns The actor with matching name, or undefined if not found
 */
export function findActorByName(actors: Actor[], name: string): Actor | undefined {
  const normalizedName = name.toLowerCase().trim();
  return actors.find(actor => actor.name.toLowerCase().trim() === normalizedName);
}

/**
 * Find a goal by name (case-insensitive).
 *
 * @param goals - All goals in the model
 * @param name - The name to search for
 * @returns The goal with matching name, or undefined if not found
 */
export function findGoalByName(goals: Goal[], name: string): Goal | undefined {
  const normalizedName = name.toLowerCase().trim();
  return goals.find(goal => goal.name.toLowerCase().trim() === normalizedName);
}

/**
 * Find a task by name (case-insensitive).
 *
 * @param tasks - All tasks in the model
 * @param name - The name to search for
 * @returns The task with matching name, or undefined if not found
 */
export function findTaskByName(tasks: Task[], name: string): Task | undefined {
  const normalizedName = name.toLowerCase().trim();
  return tasks.find(task => task.name.toLowerCase().trim() === normalizedName);
}

/**
 * Find an interaction by name (case-insensitive).
 *
 * @param interactions - All interactions in the model
 * @param name - The name to search for
 * @returns The interaction with matching name, or undefined if not found
 */
export function findInteractionByName(interactions: Interaction[], name: string): Interaction | undefined {
  const normalizedName = name.toLowerCase().trim();
  return interactions.find(interaction => interaction.name.toLowerCase().trim() === normalizedName);
}
