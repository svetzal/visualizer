import { MCPClient, assert, uniqueName } from '../harness/mcp-client.js';
import { ScenarioRunner, FullModel, Actor } from '../harness/runner.js';

export default async function run(client: MCPClient) {
  const actorName = uniqueName('Admin');
  const state: { actor?: Actor } = {};

  await new ScenarioRunner('Create a new actor (standalone)')
    .step('define_actor', async () => {
      const resp = await client.callTool<{ success: boolean; data: Actor }>('define_actor', {
        name: actorName,
        description: 'System administrator',
        abilities: ['manage_users'],
        constraints: [],
      });
      assert(resp.success, 'define_actor should succeed');
      assert(resp.data?.id && resp.data.id.length > 10, 'actor id should look like a UUID');
      state.actor = resp.data;
    })
    .step('get_full_model includes our actor', async () => {
      const model = await client.callTool<FullModel>('get_full_model', {});
      assert(model.actors.some(a => a.id === state.actor!.id), 'model contains our actor');
    })
    .run();
}
