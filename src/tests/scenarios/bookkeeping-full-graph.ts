import { MCPClient, assert, newMissingUUID } from '../harness/mcp-client.js';
import { ScenarioRunner, FullModel, Actor, Goal, getHarnessOptions } from '../harness/runner.js';

export default async function run(client: MCPClient) {
  const state: {
    jennifer?: Actor;
    maria?: Actor;
    apSystem?: Actor;
    sarah?: Actor;
    externalAuditorId?: string;
    cfoId?: string;
    goal1?: Goal;
    goal2?: Goal;
    goal3?: Goal;
    goal4?: Goal;
    goal5?: Goal;
    goal6?: Goal;
  } = {};

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
      state.jennifer = resp.data;
    })
    .step('define_actor: Maria (Bookkeeper)', async () => {
      const resp = await client.callTool<{ success: boolean; data: Actor }>('define_actor', {
        name: 'Maria',
        description: 'Bookkeeper - Records transactions, reconciles accounts, and generates reports',
        abilities: ['record_transactions', 'reconcile_accounts', 'generate_reports'],
        constraints: ['requires_transaction_documentation', 'cannot_approve_own_work'],
      });
      assert(resp.success, 'define_actor Maria should succeed');
      state.maria = resp.data;
    })
    .step('define_actor: AP System (Accounts Payable System)', async () => {
      const resp = await client.callTool<{ success: boolean; data: Actor }>('define_actor', {
        name: 'AP System',
        description: 'Automated Accounts Payable System - Tracks invoices, schedules payments, and sends reminders',
        abilities: ['track_invoices', 'schedule_payments', 'send_reminders'],
        constraints: ['requires_approval_workflow', 'must_maintain_audit_trail'],
      });
      assert(resp.success, 'define_actor AP System should succeed');
      state.apSystem = resp.data;
    })
    .step('define_actor: Sarah (Business Owner)', async () => {
      const resp = await client.callTool<{ success: boolean; data: Actor }>('define_actor', {
        name: 'Sarah',
        description: 'Business Owner - Views reports, approves budgets, and makes strategic decisions',
        abilities: ['view_reports', 'approve_budgets', 'make_strategic_decisions'],
        constraints: ['requires_monthly_reports', 'limited_technical_knowledge'],
      });
      assert(resp.success, 'define_actor Sarah should succeed');
      state.sarah = resp.data;
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
        assigned_to: [state.maria!.id],
      });
      assert(resp.success, 'define_goal Transaction Recording should succeed');
      state.goal1 = resp.data;
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
        assigned_to: [state.maria!.id, state.jennifer!.id],
      });
      assert(resp.success, 'define_goal Monthly Reporting should succeed');
      state.goal2 = resp.data;
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
        assigned_to: [state.jennifer!.id],
      });
      assert(resp.success, 'define_goal Tax Compliance should succeed');
      state.goal3 = resp.data;
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
        assigned_to: [state.apSystem!.id],
      });
      assert(resp.success, 'define_goal Vendor Payment should succeed');
      state.goal4 = resp.data;
    })
    .step('define_goal: Annual Audit Preparation (MEDIUM) - with GAP', async () => {
      const externalAuditor = newMissingUUID();
      state.externalAuditorId = externalAuditor;
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
      state.goal5 = resp.data;
    })
    .step('define_goal: Budget Planning & Analysis (HIGH) - with GAP', async () => {
      const cfo = newMissingUUID();
      state.cfoId = cfo;
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
        assigned_to: [state.sarah!.id, cfo],
      });
      assert(resp.success, 'define_goal Budget Planning should succeed');
      state.goal6 = resp.data;
    })
    // Act Three: The Plot Twist - Maria leaves
    .step('delete_actor: Maria (Bookkeeper leaves) - creates GAPS', async () => {
      const resp = await client.callTool<{ success: boolean }>('delete_actor', {
        id: state.maria!.id,
      });
      assert(resp.success, 'delete_actor Maria should succeed');
    })
    .step('verify final state: 3 actors, 6 goals, 3 gaps', async () => {
      const model = await client.callTool<FullModel>('get_full_model', {});
      
      // Should have 3 remaining actors (Jennifer, AP System, Sarah)
      assert(model.actors.length === 3, `Expected 3 actors, got ${model.actors.length}`);
      assert(model.actors.some(a => a.id === state.jennifer!.id), 'Jennifer should exist');
      assert(model.actors.some(a => a.id === state.apSystem!.id), 'AP System should exist');
      assert(model.actors.some(a => a.id === state.sarah!.id), 'Sarah should exist');
      assert(!model.actors.some(a => a.id === state.maria!.id), 'Maria should be deleted');
      
      // Should have 6 goals
      assert(model.goals.length === 6, `Expected 6 goals, got ${model.goals.length}`);
      
      // Should have 3 gaps:
      // 1. Maria (deleted) - appears in goal1 and goal2
      // 2. External Auditor (missing) - appears in goal5
      // 3. CFO (missing) - appears in goal6
      assert(Array.isArray(model.gaps), 'model.gaps should be present');
      assert(model.gaps!.length === 3, `Expected 3 gaps, got ${model.gaps!.length}`);
      
      // Verify specific gaps
      const mariaGap = model.gaps!.find(g => g.id === state.maria!.id);
      assert(mariaGap && mariaGap.expected_type === 'actor', 'Maria should appear as deleted actor gap');
      
      const auditorGap = model.gaps!.find(g => g.id === state.externalAuditorId);
      assert(auditorGap && auditorGap.expected_type === 'actor', 'External Auditor should appear as missing actor gap');
      
      const cfoGap = model.gaps!.find(g => g.id === state.cfoId);
      assert(cfoGap && cfoGap.expected_type === 'actor', 'CFO should appear as missing actor gap');
    })
    .run();
}
