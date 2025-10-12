import { MCPClient, assert } from '../harness/mcp-client.js';
import { ScenarioRunner, FullModel, Actor, Goal, getHarnessOptions } from '../harness/runner.js';

export default async function run(client: MCPClient) {
  const state: { actor?: Actor; goal?: Goal } = {};

  await new ScenarioRunner('Delete an actor and convert edges to gaps (standalone)', getHarnessOptions())
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
        name: 'User Management',
        description: 'Manage users',
        success_criteria: ['Can create users'],
        priority: 'high',
        assigned_to: [state.actor!.id],
      });
      assert(resp.success, 'define_goal should succeed');
      state.goal = resp.data;
    })
    .step('delete_actor', async () => {
      const resp = await client.callTool<{ success: boolean; data: { id: string } }>('delete_actor', { id: state.actor!.id });
      assert(resp.success, 'delete_actor should succeed');
    })
    .step('get_full_model verifies gap for deleted actor', async () => {
      const model = await client.callTool<FullModel>('get_full_model', {});
      assert(model.goals.some(g => g.id === state.goal!.id), 'goal still present');
      assert(model.gaps?.some(g => g.expected_type === 'actor' && g.referenced_by.includes(state.goal!.id)), 'gap references our goal');
    })
    .run();
}
