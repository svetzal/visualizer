import { MCPClient, assert, newMissingUUID } from '../harness/mcp-client.js';
import { ScenarioRunner, FullModel, Actor, Goal, getHarnessOptions } from '../harness/runner.js';

// Add type imports for all entities
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

  await new ScenarioRunner('Comprehensive Test - All 27 Tools', getHarnessOptions())
    // ========== Phase 1 Tools (5) ==========

    // Tool 1: define_actor (x4 actors)
    .step('define_actor: Jennifer (Accountant)', async () => {
      const resp = await client.callTool<{ success: boolean; data: Actor }>('define_actor', {
        name: 'Jennifer',
        description: 'Accountant - Reviews financial reports, prepares tax returns, audits transactions',
        abilities: ['review_financials', 'prepare_tax_returns', 'audit_transactions', 'approve_reports'],
        constraints: ['requires_bookkeeper_data', 'must_follow_gaap'],
      });
      assert(resp.success, 'define_actor Jennifer should succeed');
      state.actors.jennifer = resp.data;
    })
    .step('define_actor: Maria (Bookkeeper)', async () => {
      const resp = await client.callTool<{ success: boolean; data: Actor }>('define_actor', {
        name: 'Maria',
        description: 'Bookkeeper - Records transactions, reconciles accounts, generates reports',
        abilities: ['record_transactions', 'reconcile_accounts', 'generate_reports'],
        constraints: ['requires_transaction_documentation', 'cannot_approve_own_work'],
      });
      assert(resp.success, 'define_actor Maria should succeed');
      state.actors.maria = resp.data;
    })
    .step('define_actor: AP System (Accounts Payable System)', async () => {
      const resp = await client.callTool<{ success: boolean; data: Actor }>('define_actor', {
        name: 'AP System',
        description: 'Automated Accounts Payable System - Tracks invoices, schedules payments',
        abilities: ['track_invoices', 'schedule_payments', 'send_reminders'],
        constraints: ['requires_approval_workflow', 'must_maintain_audit_trail'],
      });
      assert(resp.success, 'define_actor AP System should succeed');
      state.actors.apSystem = resp.data;
    })
    .step('define_actor: Sarah (Business Owner)', async () => {
      const resp = await client.callTool<{ success: boolean; data: Actor }>('define_actor', {
        name: 'Sarah',
        description: 'Business Owner - Views reports, approves budgets, makes strategic decisions',
        abilities: ['view_reports', 'approve_budgets', 'make_strategic_decisions'],
        constraints: ['requires_monthly_reports', 'limited_technical_knowledge'],
      });
      assert(resp.success, 'define_actor Sarah should succeed');
      state.actors.sarah = resp.data;
    })

    // Tool 2: define_goal (x6 goals, some with gaps for testing)
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
        assigned_to: [], // Will use assign_goal_to_actor later
      });
      assert(resp.success, 'define_goal Transaction Recording should succeed');
      state.goals.transactionRecording = resp.data;
    })
    .step('define_goal: Monthly Financial Reporting (HIGH)', async () => {
      const resp = await client.callTool<{ success: boolean; data: Goal }>('define_goal', {
        name: 'Monthly Financial Reporting',
        description: 'Generate accurate monthly financial reports',
        success_criteria: [
          'P&L statement ready by 5th business day',
          'Balance sheet verified',
          'Cash flow statement completed',
        ],
        priority: 'high',
        assigned_to: [], // Will assign later
      });
      assert(resp.success, 'define_goal Financial Reporting should succeed');
      state.goals.financialReporting = resp.data;
    })
    .step('define_goal: Tax Compliance (HIGH)', async () => {
      const resp = await client.callTool<{ success: boolean; data: Goal }>('define_goal', {
        name: 'Tax Compliance',
        description: 'Maintain quarterly tax filings',
        success_criteria: ['Quarterly filings submitted on time', 'All deductions documented', 'Sales tax collected accurately'],
        priority: 'high',
        assigned_to: [state.actors.jennifer!.id],
      });
      assert(resp.success, 'define_goal Tax Compliance should succeed');
      state.goals.taxCompliance = resp.data;
    })
    .step('define_goal: Vendor Payment Processing (MEDIUM)', async () => {
      const resp = await client.callTool<{ success: boolean; data: Goal }>('define_goal', {
        name: 'Vendor Payment Processing',
        description: 'Process vendor payments on time',
        success_criteria: ['Invoices paid within terms', 'Take advantage of early payment discounts', '0% late payment fees'],
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
        description: 'Prepare documentation for annual audit',
        success_criteria: [
          'All supporting documents organized',
          'Trial balance reconciled',
          'External auditor has access to systems',
        ],
        priority: 'medium',
        assigned_to: [state.actors.jennifer!.id, externalAuditor],
      });
      assert(resp.success, 'define_goal Audit Prep should succeed');
      state.goals.auditPrep = resp.data;
    })
    .step('define_goal: Budget Planning & Analysis (HIGH) - with GAP', async () => {
      const cfo = newMissingUUID();
      state.missingActorIds.cfo = cfo;
      const resp = await client.callTool<{ success: boolean; data: Goal }>('define_goal', {
        name: 'Budget Planning & Analysis',
        description: 'Strategic planning and budget allocation',
        success_criteria: ['Annual budget approved', 'Variance analysis completed', 'Forecast updated quarterly'],
        priority: 'high',
        assigned_to: [state.actors.sarah!.id, cfo],
      });
      assert(resp.success, 'define_goal Budget Planning should succeed');
      state.goals.budgetPlanning = resp.data;
    })

    // Tool 3: get_full_model (verify gaps detected)
    .step('get_full_model: verify gaps detected', async () => {
      const model = await client.callTool<FullModel>('get_full_model', {});
      assert(model.actors.length === 4, 'should have 4 actors');
      assert(model.goals.length === 6, 'should have 6 goals');
      assert(model.gaps!.length >= 2, 'should detect at least 2 gaps for missing actors');
      assert(
        model.gaps!.some((g) => g.id === state.missingActorIds.externalAuditor && g.expected_type === 'actor'),
        'external auditor gap detected'
      );
      assert(model.gaps!.some((g) => g.id === state.missingActorIds.cfo && g.expected_type === 'actor'), 'cfo gap detected');
    })

    // ========== Phase 2.5 Composition Tools (7) ==========

    // Tool 4: assign_goal_to_actor
    .step('assign_goal_to_actor: Maria to Transaction Recording', async () => {
      const resp = await client.callTool<{ success: boolean; data: Goal }>('assign_goal_to_actor', {
        actor_id: state.actors.maria!.id,
        goal_id: state.goals.transactionRecording!.id,
      });
      assert(resp.success, 'assign_goal_to_actor should succeed');
      assert(resp.data.assigned_to.includes(state.actors.maria!.id), 'Maria should be assigned');
    })
    .step('assign_goal_to_actor: Jennifer and Maria to Financial Reporting', async () => {
      const resp1 = await client.callTool<{ success: boolean; data: Goal }>('assign_goal_to_actor', {
        actor_id: state.actors.jennifer!.id,
        goal_id: state.goals.financialReporting!.id,
      });
      assert(resp1.success, 'assign Jennifer should succeed');
      const resp2 = await client.callTool<{ success: boolean; data: Goal }>('assign_goal_to_actor', {
        actor_id: state.actors.maria!.id,
        goal_id: state.goals.financialReporting!.id,
      });
      assert(resp2.success, 'assign Maria should succeed');
      assert(resp2.data.assigned_to.length === 2, 'should have 2 actors assigned');
    })
    .step('assign_goal_to_actor: idempotent check', async () => {
      const resp = await client.callTool<{ success: boolean; data: Goal }>('assign_goal_to_actor', {
        actor_id: state.actors.maria!.id,
        goal_id: state.goals.transactionRecording!.id,
      });
      assert(resp.success, 'idempotent call should succeed');
      assert(
        resp.data.assigned_to.filter((id: string) => id === state.actors.maria!.id).length === 1,
        'Maria should appear exactly once'
      );
    })

    // ========== Phase 2 CRUD Tools (15) ==========

    // Tool 5: define_interaction (x3)
    .step('define_interaction: Enter Receipt', async () => {
      const resp = await client.callTool<{ success: boolean; data: Interaction }>('define_interaction', {
        name: 'Enter Receipt',
        description: 'Manually enter a receipt into the accounting system',
        preconditions: ['receipt_available', 'system_access'],
        effects: ['transaction_recorded', 'receipt_filed'],
      });
      assert(resp.success, 'define_interaction Enter Receipt should succeed');
      state.interactions.enterReceipt = resp.data;
    })
    .step('define_interaction: Match Transaction', async () => {
      const resp = await client.callTool<{ success: boolean; data: Interaction }>('define_interaction', {
        name: 'Match Transaction',
        description: 'Match a bank transaction to a receipt',
        preconditions: ['bank_statement_imported', 'receipts_entered'],
        effects: ['transaction_reconciled'],
      });
      assert(resp.success, 'define_interaction Match Transaction should succeed');
      state.interactions.matchTransaction = resp.data;
    })
    .step('define_interaction: Verify Balance', async () => {
      const resp = await client.callTool<{ success: boolean; data: Interaction }>('define_interaction', {
        name: 'Verify Balance',
        description: 'Verify the account balance matches',
        preconditions: ['all_transactions_matched'],
        effects: ['balance_verified'],
      });
      assert(resp.success, 'define_interaction Verify Balance should succeed');
      state.interactions.verifyBalance = resp.data;
    })

    // Tool 6: define_task (x3, one with gap)
    .step('define_task: Record Transaction', async () => {
      const resp = await client.callTool<{ success: boolean; data: Task }>('define_task', {
        name: 'Record Transaction',
        description: 'Record a single financial transaction',
        required_abilities: ['record_transactions'],
        composed_of: [], // Will use add_interaction_to_task later
      });
      assert(resp.success, 'define_task Record Transaction should succeed');
      state.tasks.recordTransaction = resp.data;
    })
    .step('define_task: Reconcile Accounts', async () => {
      const resp = await client.callTool<{ success: boolean; data: Task }>('define_task', {
        name: 'Reconcile Accounts',
        description: 'Monthly account reconciliation',
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
        description: 'Generate monthly financial reports',
        required_abilities: ['generate_reports'],
        composed_of: [state.interactions.verifyBalance!.id, missingInteractionId],
      });
      assert(resp.success, 'define_task Generate Report should succeed');
      state.tasks.generateReport = resp.data;
    })

    // Tool 7-8: add/remove_interaction_to_task
    .step('add_interaction_to_task: Enter Receipt to Record Transaction', async () => {
      const resp = await client.callTool<{ success: boolean; data: Task }>('add_interaction_to_task', {
        task_id: state.tasks.recordTransaction!.id,
        interaction_id: state.interactions.enterReceipt!.id,
      });
      assert(resp.success, 'add_interaction_to_task should succeed');
      assert(resp.data.composed_of.includes(state.interactions.enterReceipt!.id), 'interaction should be added');
    })
    .step('add_interaction_to_task: idempotent check', async () => {
      const resp = await client.callTool<{ success: boolean; data: Task }>('add_interaction_to_task', {
        task_id: state.tasks.recordTransaction!.id,
        interaction_id: state.interactions.enterReceipt!.id,
      });
      assert(resp.success, 'idempotent add should succeed');
      assert(
        resp.data.composed_of.filter((id: string) => id === state.interactions.enterReceipt!.id).length === 1,
        'interaction should appear exactly once'
      );
    })
    .step('remove_interaction_from_task: remove Enter Receipt', async () => {
      const resp = await client.callTool<{ success: boolean; data: Task }>('remove_interaction_from_task', {
        task_id: state.tasks.recordTransaction!.id,
        interaction_id: state.interactions.enterReceipt!.id,
      });
      assert(resp.success, 'remove_interaction_from_task should succeed');
      assert(!resp.data.composed_of.includes(state.interactions.enterReceipt!.id), 'interaction should be removed');
    })

    // Tool 9: define_question
    .step('define_question: Balance Accuracy', async () => {
      const resp = await client.callTool<{ success: boolean; data: Question }>('define_question', {
        name: 'Balance Accuracy',
        description: 'Is the account balance accurate?',
        asks_about: 'verification_process',
      });
      assert(resp.success, 'define_question should succeed');
      state.questions.balanceAccuracy = resp.data;
    })

    // Tool 10: define_journey
    .step('define_journey: Monthly Close Process', async () => {
      const resp = await client.callTool<{ success: boolean; data: Journey }>('define_journey', {
        name: 'Monthly Close Process',
        description: "Maria's monthly workflow to close the books",
        actor_id: state.actors.maria!.id,
        goal_ids: [], // Will use add_goal_to_journey later
        steps: [],
      });
      assert(resp.success, 'define_journey should succeed');
      state.journeys.monthlyClose = resp.data;
    })

    // Tool 11-12: add/remove_goal_to_journey
    .step('add_goal_to_journey: Transaction Recording to Monthly Close', async () => {
      const resp = await client.callTool<{ success: boolean; data: Journey }>('add_goal_to_journey', {
        journey_id: state.journeys.monthlyClose!.id,
        goal_id: state.goals.transactionRecording!.id,
      });
      assert(resp.success, 'add_goal_to_journey should succeed');
      assert(resp.data.goal_ids.includes(state.goals.transactionRecording!.id), 'goal should be added');
    })
    .step('add_goal_to_journey: Financial Reporting to Monthly Close', async () => {
      const resp = await client.callTool<{ success: boolean; data: Journey }>('add_goal_to_journey', {
        journey_id: state.journeys.monthlyClose!.id,
        goal_id: state.goals.financialReporting!.id,
      });
      assert(resp.success, 'add second goal should succeed');
      assert(resp.data.goal_ids.length === 2, 'should have 2 goals');
    })
    .step('add_goal_to_journey: idempotent check', async () => {
      const resp = await client.callTool<{ success: boolean; data: Journey }>('add_goal_to_journey', {
        journey_id: state.journeys.monthlyClose!.id,
        goal_id: state.goals.transactionRecording!.id,
      });
      assert(resp.success, 'idempotent add should succeed');
      assert(
        resp.data.goal_ids.filter((id: string) => id === state.goals.transactionRecording!.id).length === 1,
        'goal should appear exactly once'
      );
    })
    .step('remove_goal_from_journey: remove Financial Reporting', async () => {
      const resp = await client.callTool<{ success: boolean; data: Journey }>('remove_goal_from_journey', {
        journey_id: state.journeys.monthlyClose!.id,
        goal_id: state.goals.financialReporting!.id,
      });
      assert(resp.success, 'remove_goal_from_journey should succeed');
      assert(!resp.data.goal_ids.includes(state.goals.financialReporting!.id), 'goal should be removed');
      assert(resp.data.goal_ids.length === 1, 'should have 1 goal left');
    })

    // Tool 13: record_journey_step
    .step('record_journey_step: Record Transaction with success', async () => {
      const resp = await client.callTool<{ success: boolean; data: Journey }>('record_journey_step', {
        journey_id: state.journeys.monthlyClose!.id,
        task_id: state.tasks.recordTransaction!.id,
        outcome: 'success',
      });
      assert(resp.success, 'record_journey_step should succeed');
      assert(resp.data.steps.length === 1, 'should have 1 step');
      assert(resp.data.steps[0].outcome === 'success', 'outcome should be success');
    })
    .step('record_journey_step: Reconcile Accounts with success', async () => {
      const resp = await client.callTool<{ success: boolean; data: Journey }>('record_journey_step', {
        journey_id: state.journeys.monthlyClose!.id,
        task_id: state.tasks.reconcileAccounts!.id,
        outcome: 'success',
      });
      assert(resp.success, 'second step should succeed');
      assert(resp.data.steps.length === 2, 'should have 2 steps');
    })

    // Tool 14: update_actor
    .step('update_actor: Maria adds new ability', async () => {
      const resp = await client.callTool<{ success: boolean; data: Actor }>('update_actor', {
        id: state.actors.maria!.id,
        abilities: [...state.actors.maria!.abilities, 'prepare_tax_schedules'],
      });
      assert(resp.success, 'update_actor should succeed');
      assert(resp.data.abilities.includes('prepare_tax_schedules'), 'new ability should be present');
    })

    // Tool 15: update_goal
    .step('update_goal: Transaction Recording priority changes to medium', async () => {
      const resp = await client.callTool<{ success: boolean; data: Goal }>('update_goal', {
        id: state.goals.transactionRecording!.id,
        priority: 'medium',
      });
      assert(resp.success, 'update_goal should succeed');
      assert(resp.data.priority === 'medium', 'priority should be updated');
    })

    // Tool 16: update_task
    .step('update_task: Reconcile Accounts updates description', async () => {
      const resp = await client.callTool<{ success: boolean; data: Task }>('update_task', {
        id: state.tasks.reconcileAccounts!.id,
        description: 'Weekly account reconciliation (changed from monthly)',
      });
      assert(resp.success, 'update_task should succeed');
      assert(resp.data.description.includes('Weekly'), 'description should be updated');
    })

    // Tool 17: update_interaction
    .step('update_interaction: Enter Receipt adds effect', async () => {
      const resp = await client.callTool<{ success: boolean; data: Interaction }>('update_interaction', {
        id: state.interactions.enterReceipt!.id,
        effects: [...state.interactions.enterReceipt!.effects, 'audit_trail_created'],
      });
      assert(resp.success, 'update_interaction should succeed');
      assert(resp.data.effects.includes('audit_trail_created'), 'new effect should be present');
    })

    // Tool 18: update_question
    .step('update_question: Balance Accuracy clarification', async () => {
      const resp = await client.callTool<{ success: boolean; data: Question }>('update_question', {
        id: state.questions.balanceAccuracy!.id,
        description: 'Is the account balance accurate and reconciled with bank statements?',
      });
      assert(resp.success, 'update_question should succeed');
      assert(resp.data.description.includes('reconciled'), 'description should be updated');
    })

    // Tool 19: update_journey
    .step('update_journey: Monthly Close updates description', async () => {
      const resp = await client.callTool<{ success: boolean; data: Journey }>('update_journey', {
        id: state.journeys.monthlyClose!.id,
        description: "Maria's streamlined monthly workflow to close the books efficiently",
      });
      assert(resp.success, 'update_journey should succeed');
      assert(resp.data.description.includes('streamlined'), 'description should be updated');
    })

    // Tool 20: unassign_goal_from_actor
    .step('unassign_goal_from_actor: remove Jennifer from Financial Reporting', async () => {
      const resp = await client.callTool<{ success: boolean; data: Goal }>('unassign_goal_from_actor', {
        actor_id: state.actors.jennifer!.id,
        goal_id: state.goals.financialReporting!.id,
      });
      assert(resp.success, 'unassign_goal_from_actor should succeed');
      assert(!resp.data.assigned_to.includes(state.actors.jennifer!.id), 'Jennifer should be unassigned');
    })

    // Tool 21: delete_interaction (creates gap in Record Transaction task)
    .step('delete_interaction: Match Transaction', async () => {
      const resp = await client.callTool<{ success: boolean; data: { id: string } }>('delete_interaction', {
        id: state.interactions.matchTransaction!.id,
      });
      assert(resp.success, 'delete_interaction should succeed');
    })

    // Tool 22: delete_task
    .step('delete_task: Generate Report', async () => {
      const resp = await client.callTool<{ success: boolean; data: { id: string } }>('delete_task', {
        id: state.tasks.generateReport!.id,
      });
      assert(resp.success, 'delete_task should succeed');
    })

    // Tool 23: delete_question
    .step('delete_question: Balance Accuracy', async () => {
      const resp = await client.callTool<{ success: boolean; data: { id: string } }>('delete_question', {
        id: state.questions.balanceAccuracy!.id,
      });
      assert(resp.success, 'delete_question should succeed');
    })

    // Tool 24: delete_journey
    .step('delete_journey: Monthly Close', async () => {
      const resp = await client.callTool<{ success: boolean; data: { id: string } }>('delete_journey', {
        id: state.journeys.monthlyClose!.id,
      });
      assert(resp.success, 'delete_journey should succeed');
    })

    // Tool 25: delete_actor (creates gaps)
    .step('delete_actor: Maria (creates GAPS in goals)', async () => {
      const resp = await client.callTool<{ success: boolean; data: { id: string } }>('delete_actor', {
        id: state.actors.maria!.id,
      });
      assert(resp.success, 'delete_actor should succeed');
    })

    // Tool 26: delete_goal
    .step('delete_goal: Transaction Recording', async () => {
      const resp = await client.callTool<{ success: boolean; data: { id: string } }>('delete_goal', {
        id: state.goals.transactionRecording!.id,
      });
      assert(resp.success, 'delete_goal should succeed');
    })

    // Tool 27: clear_model (verify final state first)
    .step('verify final state before clear', async () => {
      const model = await client.callTool<FullModel>('get_full_model', {});
      assert(model.actors.length === 3, `should have 3 actors (Maria deleted), got ${model.actors.length}`);
      assert(model.goals.length === 5, `should have 5 goals (Transaction Recording deleted), got ${model.goals.length}`);
      assert(model.tasks.length === 2, `should have 2 tasks (Generate Report deleted), got ${model.tasks.length}`);
      assert(model.interactions.length === 2, `should have 2 interactions (Match Transaction deleted), got ${model.interactions.length}`);
      assert(model.questions.length === 0, 'should have 0 questions (Balance Accuracy deleted)');
      assert(model.journeys.length === 0, 'should have 0 journeys (Monthly Close deleted)');

      // Verify gaps for deleted Maria and deleted Match Transaction interaction
      assert(model.gaps!.length >= 3, 'should have gaps for missing actor (Maria) and original test gaps');
    })
    .step('clear_model: reset everything', async () => {
      const resp = await client.callTool<{ success: boolean; message: string }>('clear_model', {});
      assert(resp.success, 'clear_model should succeed');
    })
    .step('verify model is empty after clear', async () => {
      const model = await client.callTool<FullModel>('get_full_model', {});
      assert(model.actors.length === 0, 'actors should be empty');
      assert(model.goals.length === 0, 'goals should be empty');
      assert(model.tasks.length === 0, 'tasks should be empty');
      assert(model.interactions.length === 0, 'interactions should be empty');
      assert(model.questions.length === 0, 'questions should be empty');
      assert(model.journeys.length === 0, 'journeys should be empty');
      assert(model.gaps!.length === 0, 'gaps should be empty');
    })
    .run();
}
