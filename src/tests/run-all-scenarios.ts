import { withClient } from './harness/runner.js';
import defineActor from './scenarios/define-actor.js';
import defineGoalAssigned from './scenarios/define-goal-assigned.js';
import defineGoalGap from './scenarios/define-goal-gap.js';
import deleteActor from './scenarios/delete-actor.js';

async function main() {
  await withClient(async (client) => {
    await defineActor(client);
    await defineGoalAssigned(client);
    await defineGoalGap(client);
    await deleteActor(client);
  });
  console.log('\nAll standalone scenarios passed.');
}

main().catch((err) => {
  console.error('\nScenario run failed:', err?.message || err);
  process.exit(1);
});
