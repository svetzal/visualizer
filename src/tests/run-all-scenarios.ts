import { withClient, setHarnessOptions } from './harness/runner.js';
import defineActor from './scenarios/define-actor.js';
import defineGoalAssigned from './scenarios/define-goal-assigned.js';
import defineGoalGap from './scenarios/define-goal-gap.js';
import deleteActor from './scenarios/delete-actor.js';
import bookkeepingFullGraph from './scenarios/bookkeeping-full-graph.js';

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
    // Run each scenario independently with clean state
    await runScenario('define-actor', async () => {
      await client.callTool('clear_model', {});
      await delayIfNeeded(delay);
      await defineActor(client);
    });

    await runScenario('define-goal-assigned', async () => {
      await client.callTool('clear_model', {});
      await delayIfNeeded(delay);
      await defineGoalAssigned(client);
    });

    await runScenario('define-goal-gap', async () => {
      await client.callTool('clear_model', {});
      await delayIfNeeded(delay);
      await defineGoalGap(client);
    });

    await runScenario('delete-actor', async () => {
      await client.callTool('clear_model', {});
      await delayIfNeeded(delay);
      await deleteActor(client);
    });

    await runScenario('bookkeeping-full-graph', async () => {
      await client.callTool('clear_model', {});
      await delayIfNeeded(delay);
      await bookkeepingFullGraph(client);
    });
  });
  console.log('\nAll standalone scenarios passed.');
}

async function delayIfNeeded(delay: number | undefined): Promise<void> {
  if (delay) {
    console.log(`⏱️  Waiting ${delay}ms after clear...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

async function runScenario(name: string, fn: () => Promise<void>): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`SCENARIO: ${name}`);
  console.log('='.repeat(60));
  await fn();
}

main().catch((err) => {
  console.error('\nScenario run failed:', err?.message || err);
  process.exit(1);
});
