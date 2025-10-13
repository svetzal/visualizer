/**
 * Phase 3: Query Tools Test Scenario
 *
 * Tests all 5 analytical query tools that help agents analyze the screenplay model.
 */

import { MCPClient, assert } from '../harness/mcp-client.js';
import { ScenarioRunner, FullModel, Actor, Goal, getHarnessOptions } from '../harness/runner.js';

type Task = { id: string; name: string; description: string; required_abilities: string[]; composed_of: string[] };
type Interaction = { id: string; name: string; description: string; preconditions: string[]; effects: string[] };
type Journey = { id: string; name: string; description: string; actor_id: string; goal_ids: string[]; steps: any[] };

export default async function run(client: MCPClient) {
  const state = {
    actors: {
      coder: undefined as Actor | undefined,
      tester: undefined as Actor | undefined,
      designer: undefined as Actor | undefined,
    },
    goals: {
      codeFeature: undefined as Goal | undefined,
      testFeature: undefined as Goal | undefined,
      designUI: undefined as Goal | undefined,
    },
    tasks: {
      writeCode: undefined as Task | undefined,
      writeTests: undefined as Task | undefined,
      emptyTask: undefined as Task | undefined,
    },
    interactions: {
      editFile: undefined as Interaction | undefined,
      runTests: undefined as Interaction | undefined,
    },
    journeys: {
      featureDevelopment: undefined as Journey | undefined,
      emptyJourney: undefined as Journey | undefined,
    },
  };

  await new ScenarioRunner('Phase 3: Query Tools (5 tools)', getHarnessOptions())
    // Setup: Create a model to query
    .step('setup: create actors with different abilities', async () => {
      const coder = await client.callTool<{ success: boolean; data: Actor }>('define_actor', {
        name: 'Alice (Coder)',
        description: 'Software developer',
        abilities: ['write_code', 'debug', 'code_review'],
        constraints: ['needs_specs'],
      });
      state.actors.coder = coder.data;

      const tester = await client.callTool<{ success: boolean; data: Actor }>('define_actor', {
        name: 'Bob (Tester)',
        description: 'QA engineer',
        abilities: ['write_tests', 'manual_testing', 'automation'],
        constraints: ['needs_test_environment'],
      });
      state.actors.tester = tester.data;

      const designer = await client.callTool<{ success: boolean; data: Actor }>('define_actor', {
        name: 'Carol (Designer)',
        description: 'UX/UI designer',
        abilities: ['design_ui', 'user_research', 'prototyping'],
        constraints: ['needs_design_tools'],
      });
      state.actors.designer = designer.data;
    })
    .step('setup: create goals', async () => {
      const codeGoal = await client.callTool<{ success: boolean; data: Goal }>('define_goal', {
        name: 'Implement New Feature',
        description: 'Code and test a new feature',
        success_criteria: ['Code written', 'Tests passing', 'Code reviewed'],
        priority: 'high',
        assigned_to: [state.actors.coder!.id],
      });
      state.goals.codeFeature = codeGoal.data;

      const testGoal = await client.callTool<{ success: boolean; data: Goal }>('define_goal', {
        name: 'Comprehensive Test Coverage',
        description: 'Achieve 90% test coverage',
        success_criteria: ['Unit tests', 'Integration tests', 'E2E tests'],
        priority: 'high',
        assigned_to: [state.actors.tester!.id],
      });
      state.goals.testFeature = testGoal.data;

      const designGoal = await client.callTool<{ success: boolean; data: Goal }>('define_goal', {
        name: 'Design Modern UI',
        description: 'Create user-friendly interface',
        success_criteria: ['Wireframes approved', 'High-fidelity mockups', 'Design system updated'],
        priority: 'medium',
        assigned_to: [state.actors.coder!.id], // WRONG! Coder doesn't have design_ui ability
      });
      state.goals.designUI = designGoal.data;
    })
    .step('setup: create tasks and interactions', async () => {
      const editFile = await client.callTool<{ success: boolean; data: Interaction }>('define_interaction', {
        name: 'Edit File',
        description: 'Modify source code file',
        preconditions: ['file_exists', 'editor_open'],
        effects: ['code_changed', 'needs_review'],
      });
      state.interactions.editFile = editFile.data;

      const runTests = await client.callTool<{ success: boolean; data: Interaction }>('define_interaction', {
        name: 'Run Tests',
        description: 'Execute test suite',
        preconditions: ['tests_written', 'environment_ready'],
        effects: ['tests_executed', 'results_available'],
      });
      state.interactions.runTests = runTests.data;

      const writeCode = await client.callTool<{ success: boolean; data: Task }>('define_task', {
        name: 'Write Code',
        description: 'Write implementation code',
        required_abilities: ['write_code'],
        composed_of: [state.interactions.editFile!.id],
        goal_ids: [state.goals.codeFeature!.id], // Link to "Implement New Feature" goal
      });
      state.tasks.writeCode = writeCode.data;

      const writeTests = await client.callTool<{ success: boolean; data: Task }>('define_task', {
        name: 'Write Tests',
        description: 'Write unit and integration tests',
        required_abilities: ['write_tests'],
        composed_of: [state.interactions.editFile!.id, state.interactions.runTests!.id],
        goal_ids: [state.goals.testFeature!.id], // Link to "Comprehensive Test Coverage" goal
      });
      state.tasks.writeTests = writeTests.data;

      const emptyTask = await client.callTool<{ success: boolean; data: Task }>('define_task', {
        name: 'Empty Task',
        description: 'Task with no interactions defined yet',
        required_abilities: ['deploy'],
        composed_of: [], // EMPTY! Should be found by query
        goal_ids: [], // Not linked to any goal
      });
      state.tasks.emptyTask = emptyTask.data;
    })
    .step('setup: create journeys', async () => {
      const journey = await client.callTool<{ success: boolean; data: Journey }>('define_journey', {
        name: 'Feature Development',
        description: 'Complete feature development workflow',
        actor_id: state.actors.coder!.id,
        goal_ids: [state.goals.codeFeature!.id],
        steps: [],
      });
      state.journeys.featureDevelopment = journey.data;

      // Add a step to this journey
      await client.callTool('record_journey_step', {
        journey_id: journey.data.id,
        task_id: state.tasks.writeCode!.id,
        outcome: 'success',
      });

      const emptyJourney = await client.callTool<{ success: boolean; data: Journey }>('define_journey', {
        name: 'Empty Journey',
        description: 'Journey with no steps yet',
        actor_id: state.actors.tester!.id,
        goal_ids: [state.goals.testFeature!.id],
        steps: [], // EMPTY! Should be found by query
      });
      state.journeys.emptyJourney = emptyJourney.data;
    })

    // Test Query Tools
    .step('find_actors_without_ability: deploy', async () => {
      const resp = await client.callTool<Actor[]>('find_actors_without_ability', {
        ability: 'deploy',
      });
      assert(Array.isArray(resp), 'should return array');
      assert(resp.length === 3, 'all 3 actors lack deploy ability');
      assert(resp.some(a => a.id === state.actors.coder!.id), 'should include coder');
    })
    .step('find_actors_without_ability: write_code', async () => {
      const resp = await client.callTool<Actor[]>('find_actors_without_ability', {
        ability: 'write_code',
      });
      assert(resp.length === 2, 'tester and designer lack write_code');
      assert(!resp.some(a => a.id === state.actors.coder!.id), 'should NOT include coder');
    })

    .step('find_tasks_without_interactions', async () => {
      const resp = await client.callTool<Task[]>('find_tasks_without_interactions', {});
      assert(Array.isArray(resp), 'should return array');
      assert(resp.length === 1, 'should find 1 empty task');
      assert(resp[0].id === state.tasks.emptyTask!.id, 'should be the empty task');
    })

    .step('find_untested_journeys', async () => {
      const resp = await client.callTool<Journey[]>('find_untested_journeys', {});
      assert(Array.isArray(resp), 'should return array');
      assert(resp.length === 1, 'should find 1 empty journey');
      assert(resp[0].id === state.journeys.emptyJourney!.id, 'should be the empty journey');
    })

    .step('actor_can_achieve_goal: coder can achieve code feature', async () => {
      const resp = await client.callTool<{ can_achieve: boolean; reason: string }>('actor_can_achieve_goal', {
        actor_id: state.actors.coder!.id,
        goal_id: state.goals.codeFeature!.id,
      });
      assert(resp.can_achieve === true, 'coder should be able to achieve code goal');
      assert(typeof resp.reason === 'string', 'should provide reason');
    })
    .step('actor_can_achieve_goal: coder CANNOT achieve design UI', async () => {
      const resp = await client.callTool<{ can_achieve: boolean; reason: string }>('actor_can_achieve_goal', {
        actor_id: state.actors.coder!.id,
        goal_id: state.goals.designUI!.id,
      });
      assert(resp.can_achieve === false, 'coder should NOT be able to achieve design goal');
      assert(resp.reason.includes('missing') || resp.reason.includes('design'), 'reason should mention missing abilities');
    })

    .step('find_unachievable_goals: find design UI goal', async () => {
      const resp = await client.callTool<any[]>('find_unachievable_goals', {});
      assert(Array.isArray(resp), 'should return array');
      assert(resp.length >= 1, 'should find at least 1 unachievable goal');
      const designGoal = resp.find(g => g.goal.id === state.goals.designUI!.id);
      assert(designGoal !== undefined, 'should find design UI goal as unachievable');
      assert(designGoal.is_achievable === false, 'design goal should be marked unachievable');
    })
    .step('find_unachievable_goals: filter by actor', async () => {
      const resp = await client.callTool<any[]>('find_unachievable_goals', {
        actor_id: state.actors.coder!.id,
      });
      assert(Array.isArray(resp), 'should return array');
      // Should only show goals assigned to coder that they can't achieve
      const designGoal = resp.find(g => g.goal.id === state.goals.designUI!.id);
      assert(designGoal !== undefined, 'should find coder\'s unachievable design goal');
    })

    // Cleanup
    .step('cleanup: clear model', async () => {
      await client.callTool('clear_model', {});
    })
    .run();
}
