import { withClient, setHarnessOptions } from './harness/runner.js';
import defineActor from './scenarios/define-actor.js';
import defineGoalAssigned from './scenarios/define-goal-assigned.js';
import defineGoalGap from './scenarios/define-goal-gap.js';
import deleteActor from './scenarios/delete-actor.js';

async function main() {
  // Parse command-line arguments for step delay
  const args = process.argv.slice(2);
  const delayArg = args.find(arg => arg.startsWith('--delay='));
  const stepDelay = delayArg ? parseInt(delayArg.split('=')[1], 10) : undefined;

  // Also support environment variable
  const envDelay = process.env.STEP_DELAY ? parseInt(process.env.STEP_DELAY, 10) : undefined;

  const delay = stepDelay ?? envDelay;

  if (delay) {
    setHarnessOptions({ stepDelay: delay });
    console.log(`🐢 Slow mode enabled: ${delay}ms delay between steps`);
  }

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
