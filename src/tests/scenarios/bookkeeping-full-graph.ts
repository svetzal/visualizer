import { MCPClient, assert, newMissingUUID } from '../harness/mcp-client.js';
import { ScenarioRunner, FullModel, Actor, Goal, getHarnessOptions } from '../harness/runner.js';

// Add type imports for new entities
type Task = { id: string; name: string; description: string; required_abilities: string[]; composed_of: string[] };
type Interaction = { id: string; name: string; description: string; preconditions: string[]; effects: string[] };
type Question = { id: string; name: string; description: string; asks_about: string };
type Journey = { id: string; name: string; description: string; actor_id: string; goal_ids: string[]; steps: any[] };

export default async function run(client: MCPClient) {
  const state = {
    actors: {
      jennifer: undefined as Actor | undefined,
      maria: undefined as Actor | undefined,
      apSystem: undefined as Actor | undefined,
      sarah: undefined as Actor | undefined,
    },
    goals: {
      transactionRecording: undefined as Goal | undefined,
      financialReporting: undefined as Goal | undefined,
      taxCompliance: undefined as Goal | undefined,
      vendorPayment: undefined as Goal | undefined,
      auditPrep: undefined as Goal | undefined,
      budgetPlanning: undefined as Goal | undefined,
    },
    tasks: {
      recordTransaction: undefined as Task | undefined,
      reconcileAccounts: undefined as Task | undefined,
      generateReport: undefined as Task | undefined,
    },
    interactions: {
      enterReceipt: undefined as Interaction | undefined,
      matchTransaction: undefined as Interaction | undefined,
      verifyBalance: undefined as Interaction | undefined,
    },
    questions: {
      balanceAccuracy: undefined as Question | undefined,
    },
    journeys: {
      monthlyClose: undefined as Journey | undefined,
    },
    missingActorIds: {
      externalAuditor: undefined as string | undefined,
      cfo: undefined as string | undefined,
    },
  };

  await new ScenarioRunner('Bookkeeping System - Full Graph Building', getHarnessOptions())
    // Act One: Defining the Team (Actors)
    .step('define_actor: Jennifer (Accountant)', async () => {
      const resp = await client.callTool<{ success: boolean; data: Actor }>('define_actor', {
        name: 'Jennifer',
        description: 'Accountant - Reviews financial reports, prepares tax returns, audits transactions, and approves reports',
        abilities: ['review_financials', 'prepare_tax_returns', 'audit_transactions', 'approve_reports'],
        constraints: ['requires_bookkeeper_data', 'must_follow_gaap'],
      });
      assert(resp.success, 'define_actor Jennifer should succeed');
      state.actors.jennifer = resp.data;
    })
    .step('define_actor: Maria (Bookkeeper)', async () => {
      const resp = await client.callTool<{ success: boolean; data: Actor }>('define_actor', {
        name: 'Maria',
        description: 'Bookkeeper - Records transactions, reconciles accounts, and generates reports',
        abilities: ['record_transactions', 'reconcile_accounts', 'generate_reports'],
        constraints: ['requires_transaction_documentation', 'cannot_approve_own_work'],
      });
      assert(resp.success, 'define_actor Maria should succeed');
      state.actors.maria = resp.data;
    })
    .step('define_actor: AP System (Accounts Payable System)', async () => {
      const resp = await client.callTool<{ success: boolean; data: Actor }>('define_actor', {
        name: 'AP System',
        description: 'Automated Accounts Payable System - Tracks invoices, schedules payments, and sends reminders',
        abilities: ['track_invoices', 'schedule_payments', 'send_reminders'],
        constraints: ['requires_approval_workflow', 'must_maintain_audit_trail'],
      });
      assert(resp.success, 'define_actor AP System should succeed');
      state.actors.apSystem = resp.data;
    })
    .step('define_actor: Sarah (Business Owner)', async () => {
      const resp = await client.callTool<{ success: boolean; data: Actor }>('define_actor', {
        name: 'Sarah',
        description: 'Business Owner - Views reports, approves budgets, and makes strategic decisions',
        abilities: ['view_reports', 'approve_budgets', 'make_strategic_decisions'],
        constraints: ['requires_monthly_reports', 'limited_technical_knowledge'],
      });
      assert(resp.success, 'define_actor Sarah should succeed');
      state.actors.sarah = resp.data;
    })
    // Act Two: Setting Goals
    .step('define_goal: Accurate Daily Transaction Recording (HIGH)', async () => {
      const resp = await client.callTool<{ success: boolean; data: Goal }>('define_goal', {
        name: 'Accurate Daily Transaction Recording',
        description: 'Every financial transaction must be recorded within 24 hours',
        success_criteria: [
          'All receipts entered same day',
          'Bank statements reconciled weekly',
          'Zero discrepancies in cash accounts',
        ],
        priority: 'high',
        assigned_to: [state.actors.maria!.id],
      });
      assert(resp.success, 'define_goal Transaction Recording should succeed');
      state.goals.transactionRecording = resp.data;
    })
    .step('define_goal: Monthly Financial Reporting (HIGH)', async () => {
      const resp = await client.callTool<{ success: boolean; data: Goal }>('define_goal', {
        name: 'Monthly Financial Reporting',
        description: 'Comprehensive reports by the 5th of each month',
        success_criteria: [
          'P&L statement delivered by 5th',
          'Balance sheet delivered by 5th',
          'Cash flow statement delivered by 5th',
        ],
        priority: 'high',
        assigned_to: [state.actors.maria!.id, state.actors.jennifer!.id],
      });
      assert(resp.success, 'define_goal Monthly Reporting should succeed');
      state.goals.financialReporting = resp.data;
    })
    .step('define_goal: Tax Compliance (HIGH)', async () => {
      const resp = await client.callTool<{ success: boolean; data: Goal }>('define_goal', {
        name: 'Tax Compliance',
        description: 'All tax obligations met accurately and on time',
        success_criteria: [
          'Quarterly estimates filed on time',
          'Annual returns before deadline',
          'All deductions properly documented',
          'Zero penalties or interest charged',
        ],
        priority: 'high',
        assigned_to: [state.actors.jennifer!.id],
      });
      assert(resp.success, 'define_goal Tax Compliance should succeed');
      state.goals.taxCompliance = resp.data;
    })
    .step('define_goal: Vendor Payment Processing (MEDIUM)', async () => {
      const resp = await client.callTool<{ success: boolean; data: Goal }>('define_goal', {
        name: 'Vendor Payment Processing',
        description: 'Pay all invoices accurately and on time',
        success_criteria: [
          'All invoices paid within terms',
          'Early payment discounts captured',
          'Payment confirmations archived',
          'Maintain good vendor relationships',
        ],
        priority: 'medium',
        assigned_to: [state.actors.apSystem!.id],
      });
      assert(resp.success, 'define_goal Vendor Payment should succeed');
      state.goals.vendorPayment = resp.data;
    })
    .step('define_goal: Annual Audit Preparation (MEDIUM) - with GAP', async () => {
      const externalAuditor = newMissingUUID();
      state.missingActorIds.externalAuditor = externalAuditor;
      const resp = await client.callTool<{ success: boolean; data: Goal }>('define_goal', {
        name: 'Annual Audit Preparation',
        description: 'Prepare all documentation for external audit',
        success_criteria: [
          'All supporting documents organized',
          'All reconciliations current',
          'Management rep letter prepared',
          'Audit completed within 2 weeks',
        ],
        priority: 'medium',
        assigned_to: [externalAuditor],
      });
      assert(resp.success, 'define_goal Audit Prep should succeed');
      state.goals.auditPrep = resp.data;
    })
    .step('define_goal: Budget Planning & Analysis (HIGH) - with GAP', async () => {
      const cfo = newMissingUUID();
      state.missingActorIds.cfo = cfo;
      const resp = await client.callTool<{ success: boolean; data: Goal }>('define_goal', {
        name: 'Budget Planning & Analysis',
        description: 'Develop and monitor annual budget with variance analysis',
        success_criteria: [
          'Budget approved by Q4',
          'Monthly variance reports generated',
          'Forecasts updated quarterly',
          'Budget vs actual within 5%',
        ],
        priority: 'high',
        assigned_to: [state.actors.sarah!.id, cfo],
      });
      assert(resp.success, 'define_goal Budget Planning should succeed');
      state.goals.budgetPlanning = resp.data;
    })
    // Act Three: Define Interactions (before tasks that compose them)
    .step('define_interaction: Enter Receipt', async () => {
      const resp = await client.callTool<{ success: boolean; data: Interaction }>('define_interaction', {
        name: 'Enter Receipt',
        description: 'Manually enter a receipt into the accounting system',
        preconditions: ['Receipt is available', 'System is accessible'],
        effects: ['Transaction recorded', 'Receipt archived'],
      });
      assert(resp.success, 'define_interaction Enter Receipt should succeed');
      state.interactions.enterReceipt = resp.data;
    })
    .step('define_interaction: Match Transaction', async () => {
      const resp = await client.callTool<{ success: boolean; data: Interaction }>('define_interaction', {
        name: 'Match Transaction',
        description: 'Match a bank transaction to a recorded transaction',
        preconditions: ['Bank statement imported', 'Transaction recorded'],
        effects: ['Transaction matched', 'Balance updated'],
      });
      assert(resp.success, 'define_interaction Match Transaction should succeed');
      state.interactions.matchTransaction = resp.data;
    })
    .step('define_interaction: Verify Balance', async () => {
      const resp = await client.callTool<{ success: boolean; data: Interaction }>('define_interaction', {
        name: 'Verify Balance',
        description: 'Confirm account balance matches expected amount',
        preconditions: ['All transactions matched', 'No pending items'],
        effects: ['Balance verified', 'Reconciliation complete'],
      });
      assert(resp.success, 'define_interaction Verify Balance should succeed');
      state.interactions.verifyBalance = resp.data;
    })
    // Act Four: Define Tasks (composed of interactions)
    .step('define_task: Record Transaction', async () => {
      const resp = await client.callTool<{ success: boolean; data: Task }>('define_task', {
        name: 'Record Transaction',
        description: 'Enter and verify a financial transaction',
        required_abilities: ['record_transactions'],
        composed_of: [state.interactions.enterReceipt!.id],
      });
      assert(resp.success, 'define_task Record Transaction should succeed');
      state.tasks.recordTransaction = resp.data;
    })
    .step('define_task: Reconcile Accounts', async () => {
      const resp = await client.callTool<{ success: boolean; data: Task }>('define_task', {
        name: 'Reconcile Accounts',
        description: 'Match transactions and verify balances',
        required_abilities: ['reconcile_accounts'],
        composed_of: [state.interactions.matchTransaction!.id, state.interactions.verifyBalance!.id],
      });
      assert(resp.success, 'define_task Reconcile Accounts should succeed');
      state.tasks.reconcileAccounts = resp.data;
    })
    .step('define_task: Generate Report - with missing interaction GAP', async () => {
      const missingInteractionId = newMissingUUID();
      const resp = await client.callTool<{ success: boolean; data: Task }>('define_task', {
        name: 'Generate Report',
        description: 'Create financial statements and reports',
        required_abilities: ['generate_reports'],
        composed_of: [missingInteractionId],
      });
      assert(resp.success, 'define_task Generate Report should succeed (with gap)');
      state.tasks.generateReport = resp.data;
    })
    // Act Five: Update operations
    .step('update_actor: Maria adds new ability', async () => {
      const resp = await client.callTool<{ success: boolean; data: Actor }>('update_actor', {
        id: state.actors.maria!.id,
        abilities: [...state.actors.maria!.abilities, 'prepare_budgets'],
      });
      assert(resp.success, 'update_actor Maria should succeed');
      assert(resp.data.abilities.includes('prepare_budgets'), 'Maria should have new ability');
      state.actors.maria = resp.data;
    })
    .step('update_goal: Transaction Recording priority changes to medium', async () => {
      const resp = await client.callTool<{ success: boolean; data: Goal }>('update_goal', {
        id: state.goals.transactionRecording!.id,
        priority: 'medium',
      });
      assert(resp.success, 'update_goal should succeed');
      assert(resp.data.priority === 'medium', 'Priority should be updated to medium');
      state.goals.transactionRecording = resp.data;
    })
    .step('update_task: Reconcile Accounts updates description', async () => {
      const resp = await client.callTool<{ success: boolean; data: Task }>('update_task', {
        id: state.tasks.reconcileAccounts!.id,
        description: 'Match bank transactions, verify balances, and document discrepancies',
      });
      assert(resp.success, 'update_task should succeed');
      assert(resp.data.description.includes('document discrepancies'), 'Description should be updated');
      state.tasks.reconcileAccounts = resp.data;
    })
    .step('update_interaction: Enter Receipt adds effect', async () => {
      const resp = await client.callTool<{ success: boolean; data: Interaction }>('update_interaction', {
        id: state.interactions.enterReceipt!.id,
        effects: [...state.interactions.enterReceipt!.effects, 'Audit trail created'],
      });
      assert(resp.success, 'update_interaction should succeed');
      assert(resp.data.effects.includes('Audit trail created'), 'Effect should be added');
      state.interactions.enterReceipt = resp.data;
    })
    // Act Six: Questions and Journeys
    .step('define_question: Balance Accuracy', async () => {
      const resp = await client.callTool<{ success: boolean; data: Question }>('define_question', {
        name: 'Balance Accuracy Check',
        description: 'How do we verify that account balances are correct?',
        asks_about: 'Account reconciliation process and verification steps',
      });
      assert(resp.success, 'define_question should succeed');
      state.questions.balanceAccuracy = resp.data;
    })
    .step('define_journey: Monthly Close Process', async () => {
      const resp = await client.callTool<{ success: boolean; data: Journey }>('define_journey', {
        name: 'Monthly Close Process',
        description: 'Maria\'s end-of-month workflow',
        actor_id: state.actors.maria!.id,
        goal_ids: [state.goals.transactionRecording!.id, state.goals.financialReporting!.id],
      });
      assert(resp.success, 'define_journey should succeed');
      state.journeys.monthlyClose = resp.data;
    })
    .step('update_question: Balance Accuracy clarification', async () => {
      const resp = await client.callTool<{ success: boolean; data: Question }>('update_question', {
        id: state.questions.balanceAccuracy!.id,
        asks_about: 'Three-way reconciliation: book vs bank vs receipts',
      });
      assert(resp.success, 'update_question should succeed');
      assert(resp.data.asks_about.includes('Three-way'), 'Question should be clarified');
      state.questions.balanceAccuracy = resp.data;
    })
    .step('update_journey: Monthly Close adds another goal', async () => {
      const resp = await client.callTool<{ success: boolean; data: Journey }>('update_journey', {
        id: state.journeys.monthlyClose!.id,
        goal_ids: [...state.journeys.monthlyClose!.goal_ids, state.goals.taxCompliance!.id],
      });
      assert(resp.success, 'update_journey should succeed');
      assert(resp.data.goal_ids.length === 3, 'Journey should have 3 goals');
      state.journeys.monthlyClose = resp.data;
    })
    // Act Seven: Deletions
    .step('delete_interaction: Enter Receipt (will create gap in Record Transaction task)', async () => {
      const resp = await client.callTool<{ success: boolean }>('delete_interaction', {
        id: state.interactions.enterReceipt!.id,
      });
      assert(resp.success, 'delete_interaction should succeed');
    })
    .step('delete_task: Record Transaction', async () => {
      const resp = await client.callTool<{ success: boolean }>('delete_task', {
        id: state.tasks.recordTransaction!.id,
      });
      assert(resp.success, 'delete_task should succeed');
    })
    .step('delete_question: Balance Accuracy', async () => {
      const resp = await client.callTool<{ success: boolean }>('delete_question', {
        id: state.questions.balanceAccuracy!.id,
      });
      assert(resp.success, 'delete_question should succeed');
    })
    // Act Eight: The Plot Twist - Maria leaves
    .step('delete_actor: Maria (Bookkeeper leaves) - creates GAPS', async () => {
      const resp = await client.callTool<{ success: boolean }>('delete_actor', {
        id: state.actors.maria!.id,
      });
      assert(resp.success, 'delete_actor Maria should succeed');
    })
    .step('delete_journey: Monthly Close (dependent on deleted actor)', async () => {
      const resp = await client.callTool<{ success: boolean }>('delete_journey', {
        id: state.journeys.monthlyClose!.id,
      });
      assert(resp.success, 'delete_journey should succeed');
    })
    .step('delete_goal: Transaction Recording', async () => {
      const resp = await client.callTool<{ success: boolean }>('delete_goal', {
        id: state.goals.transactionRecording!.id,
      });
      assert(resp.success, 'delete_goal should succeed');
    })
    // Final verification
    .step('verify final state: comprehensive model check', async () => {
      const model = await client.callTool<FullModel>('get_full_model', {});

      // Should have 3 remaining actors (Jennifer, AP System, Sarah)
      assert(model.actors.length === 3, `Expected 3 actors, got ${model.actors.length}`);
      assert(model.actors.some(a => a.id === state.actors.jennifer!.id), 'Jennifer should exist');
      assert(model.actors.some(a => a.id === state.actors.apSystem!.id), 'AP System should exist');
      assert(model.actors.some(a => a.id === state.actors.sarah!.id), 'Sarah should exist');
      assert(!model.actors.some(a => a.id === state.actors.maria!.id), 'Maria should be deleted');

      // Should have 5 goals (deleted transactionRecording)
      assert(model.goals.length === 5, `Expected 5 goals, got ${model.goals.length}`);

      // Should have 2 tasks (deleted recordTransaction, kept reconcileAccounts and generateReport)
      assert(model.tasks.length === 2, `Expected 2 tasks, got ${model.tasks.length}`);

      // Should have 2 interactions (deleted enterReceipt, kept matchTransaction and verifyBalance)
      assert(model.interactions.length === 2, `Expected 2 interactions, got ${model.interactions.length}`);

      // Should have 0 questions (deleted balanceAccuracy)
      assert(model.questions.length === 0, `Expected 0 questions, got ${model.questions.length}`);

      // Should have 0 journeys (deleted monthlyClose)
      assert(model.journeys.length === 0, `Expected 0 journeys, got ${model.journeys.length}`);

      // Gaps should include:
      // 1. Maria (deleted actor) - affects financialReporting goal
      // 2. External Auditor (missing) - affects auditPrep goal
      // 3. CFO (missing) - affects budgetPlanning goal
      // 4. Missing interaction from generateReport task
      // 5. Deleted enterReceipt interaction (gap in recordTransaction... wait, that task was deleted)
      // Actually, after deletions the gaps should be: Maria, External Auditor, CFO, missing interaction in generateReport
      assert(Array.isArray(model.gaps), 'model.gaps should be present');
      assert(model.gaps!.length === 4, `Expected 4 gaps, got ${model.gaps!.length}`);

      const mariaGap = model.gaps!.find(g => g.id === state.actors.maria!.id);
      assert(mariaGap && mariaGap.expected_type === 'actor', 'Maria should appear as deleted actor gap');

      const auditorGap = model.gaps!.find(g => g.id === state.missingActorIds.externalAuditor);
      assert(auditorGap && auditorGap.expected_type === 'actor', 'External Auditor should appear as missing actor gap');

      const cfoGap = model.gaps!.find(g => g.id === state.missingActorIds.cfo);
      assert(cfoGap && cfoGap.expected_type === 'actor', 'CFO should appear as missing actor gap');

      // Verify interaction gap
      const interactionGaps = model.gaps!.filter(g => g.expected_type === 'interaction');
      assert(interactionGaps.length === 1, `Expected 1 interaction gap, got ${interactionGaps.length}`);
    })
    .run();
}
