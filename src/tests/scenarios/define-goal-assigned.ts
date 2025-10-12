import { MCPClient, assert } from '../harness/mcp-client.js';
import { ScenarioRunner, FullModel, Actor, Goal, getHarnessOptions } from '../harness/runner.js';

export default async function run(client: MCPClient) {
  const state: { actor?: Actor; goal?: Goal } = {};

  await new ScenarioRunner('Create a goal assigned to a new actor (standalone)', getHarnessOptions())
    .step('define_actor', async () => {
      const resp = await client.callTool<{ success: boolean; data: Actor }>('define_actor', {
        name: 'Admin',
        description: 'System administrator',
        abilities: ['manage_users'],
        constraints: [],
      });
      assert(resp.success, 'define_actor should succeed');
      state.actor = resp.data;
    })
    .step('define_goal assigned to actor', async () => {
      const resp = await client.callTool<{ success: boolean; data: Goal }>('define_goal', {
        name: 'Build Feature',
        description: 'Build new feature',
        success_criteria: ['Can create users'],
        priority: 'high',
        assigned_to: [state.actor!.id],
      });
      assert(resp.success, 'define_goal should succeed');
      state.goal = resp.data;
    })
    .step('get_full_model asserts linkage', async () => {
      const model = await client.callTool<FullModel>('get_full_model', {});
      assert(model.actors.some(a => a.id === state.actor!.id), 'model contains actor');
      assert(model.goals.some(g => g.id === state.goal!.id), 'model contains goal');
    })
    .run();
}
