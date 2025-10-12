# E2E Test Slow Mode Implementation

## Overview

Added a "slow mode" feature to the E2E test harness that allows running test scenarios with configurable delays between steps. This enables visual verification of the visualizer animations during automated tests.

## Changes Made

### 1. Core Harness Updates (`src/tests/harness/runner.ts`)

- Added `ScenarioOptions` interface with `stepDelay` property
- Updated `ScenarioRunner` constructor to accept options
- Modified `run()` method to inject delays between steps (using proper index-based loop)
- Added global `HarnessOptions` management functions:
  - `setHarnessOptions()` - Configure global delay settings
  - `getHarnessOptions()` - Retrieve current settings for use in scenarios

### 2. Main Test Runner Updates (`src/tests/run-all-scenarios.ts`)

- Parse `--delay=<ms>` command-line argument
- Support `STEP_DELAY` environment variable
- Display indicator when slow mode is enabled
- Set global harness options before running scenarios

### 3. Scenario Updates

Updated all scenario files to use global options:
- `src/tests/scenarios/define-actor.ts`
- `src/tests/scenarios/define-goal-assigned.ts`
- `src/tests/scenarios/define-goal-gap.ts`
- `src/tests/scenarios/delete-actor.ts`

Each now calls `getHarnessOptions()` when creating the `ScenarioRunner`.

### 4. Package Scripts (`package.json`)

Added new npm script:
```json
"test:e2e:slow": "npm run build && node dist/tests/run-all-scenarios.js --delay=2000"
```

### 5. Documentation (`README.md`)

Added comprehensive "Slow Mode for Visual Verification" section with:
- Usage examples for all three methods (npm script, CLI arg, env var)
- Explanation of benefits
- Sample output

## Usage

### Option 1: Pre-configured npm script (2 second delay)
```bash
npm run test:e2e:slow
```

### Option 2: Custom delay via command-line argument
```bash
npm run test:e2e -- --delay=3000
```

### Option 3: Environment variable
```bash
STEP_DELAY=5000 npm run test:e2e
```

## Output Example

When slow mode is enabled, the test runner displays:
```
🐢 Slow mode enabled: 2000ms delay between steps
[Harness] Using MCP at http://localhost:3000/mcp

=== Scenario: Create a new actor (standalone) ===
⏱️  Running with 2000ms delay between steps
→ define_actor ... OK
→ get_full_model includes our actor ... OK
✓ Scenario passed: Create a new actor (standalone)
```

## Benefits

- **Visual Debugging**: Watch animations execute in real-time
- **Animation Verification**: Ensure transitions, fades, and force layout updates work correctly
- **Demo Capability**: Use slow mode to demonstrate the visualizer's behavior
- **Flexible Configuration**: Choose delay based on animation complexity
- **No Code Changes**: Works with existing test scenarios without modification

## Implementation Notes

- Delay is only injected between steps, not after the final step
- Original fast test execution remains the default
- All three configuration methods work together (CLI arg > env var > default)
- The harness uses a proper indexed loop to avoid reference equality issues with `indexOf()`
