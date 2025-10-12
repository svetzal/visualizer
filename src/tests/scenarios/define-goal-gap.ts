import { MCPClient, assert, uniqueName, newMissingUUID } from '../harness/mcp-client.js';
import { ScenarioRunner, FullModel, Goal } from '../harness/runner.js';

export default async function run(client: MCPClient) {
  const state: { goal?: Goal; missingId?: string } = {};

  await new ScenarioRunner('Create a goal referencing a missing actor (standalone)')
    .step('define_goal with non-existent actor UUID', async () => {
      const missing = newMissingUUID();
      state.missingId = missing;
      const resp = await client.callTool<{ success: boolean; data: Goal }>('define_goal', {
        name: uniqueName('Analytics'),
        description: 'Dashboards',
        success_criteria: ['<2s load'],
        priority: 'medium',
        assigned_to: [missing],
      });
      assert(resp.success, 'define_goal should succeed');
      state.goal = resp.data;
    })
    .step('get_full_model shows gap for missing actor id', async () => {
      const model = await client.callTool<FullModel>('get_full_model', {});
      assert(Array.isArray(model.gaps), 'model.gaps present');
      assert(model.gaps!.some(g => g.id === state.missingId && g.expected_type === 'actor'), 'missing actor id appears as gap');
    })
    .run();
}
