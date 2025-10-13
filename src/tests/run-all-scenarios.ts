import { withClient, setHarnessOptions } from './harness/runner.js';
import comprehensiveCrudAndComposition from './scenarios/comprehensive-crud-and-composition.js';
import queryTools from './scenarios/query-tools.js';

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
    // Run comprehensive scenario that tests all 27 tools
    await runScenario('comprehensive-crud-and-composition', async () => {
      await client.callTool('clear_model', {});
      await delayIfNeeded(delay);
      await comprehensiveCrudAndComposition(client);
    });

    // Run Phase 3 query tools scenario
    await runScenario('query-tools', async () => {
      await client.callTool('clear_model', {});
      await delayIfNeeded(delay);
      await queryTools(client);
    });
  });
  console.log('\n✅ All tests passed - 32 tools verified!');
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
