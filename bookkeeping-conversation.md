# Bookkeeping System Design Session

## A Screenplay for Ensemble Modeling

---

### Scene Setup

**Location:** Conference room with large projection screen

**Setting:** Four people sit around a table with laptops and coffee, with a force-directed graph visualization projected on the wall

**Duration:** ~20 minutes

**Visualization:** Updates in real-time as the team discusses the system

### Cast of Characters

| Character | Role               | Age       | Personality                         |
|-----------|--------------------|-----------|-------------------------------------|
| **SARAH** | Business Owner     | Mid-40s   | Pragmatic, strategic thinker        |
| **JENNIFER** | Accountant      | Late-30s  | Detail-oriented, compliance-focused |
| **ALEX**  | Operations Manager | Mid-30s   | Organized, process-driven           |
| **MIKE**  | Software Developer | Early-30s | Technical, systems-oriented         |

---

## Act One: Defining the Team

**SARAH:** Okay, let's figure out who's actually going to be doing what in our new bookkeeping system. Jennifer, you'll obviously be our main accountant, right?

**JENNIFER:** Yes, that's me. I'll be reviewing financial reports, preparing tax returns, auditing transactions, and approving reports. I need to make sure we follow GAAP standards, and I'll depend on having clean data from the bookkeeper.

*[GRAPH UPDATE: Blue circle appears labeled "Jennifer" with abilities listed]*

**SARAH:** Good. And we have Maria as our bookkeeper. She handles the day-to-day stuff.

**JENNIFER:** Right. Maria records transactions, reconciles accounts, and generates reports. She needs proper documentation for everything, and we've set it up so she can't approve her own work — that's an important control.

*[GRAPH UPDATE: Second blue circle "Maria" appears]*

**ALEX:** Don't forget about the AP system we just installed. It's automated.

**MIKE:** Yeah, that's our accounts payable system. It tracks invoices, schedules payments, and sends reminders. We built in an approval workflow and it maintains a full audit trail.

*[GRAPH UPDATE: Third blue circle "AP System" appears]*

**SARAH:** That's me too, I guess. I'm the business owner. I view reports, approve budgets, and make strategic decisions. I need monthly reports to stay informed, and I don't have a lot of technical knowledge about the accounting side.

*[GRAPH UPDATE: Fourth blue circle "Sarah" appears — now showing 4 actors]*

---

## Act Two: Setting Goals

**SARAH:** Okay, so what are our main goals here? What do we need to achieve?

**JENNIFER:** First and most important — we need accurate daily transaction recording. Every financial transaction must be recorded within 24 hours. Receipts entered the same day, bank statements reconciled weekly, and zero discrepancies in cash accounts. That's Maria's responsibility — our bookkeeper.

*[GRAPH UPDATE: Green square "Accurate Daily Transaction Recording" appears with gray line connecting to Maria]*

**SARAH:** Agreed. That's high priority. What else?

**JENNIFER:** Monthly financial reporting. We need comprehensive reports by the 5th of each month — P&L, balance sheet, cash flow — delivered to you by the 5th. That's both Maria and me working together.

*[GRAPH UPDATE: Green square "Monthly Financial Reporting" appears with lines to both Maria and Jennifer]*

**JENNIFER:** And of course, tax compliance. All tax obligations met accurately and on time — quarterly estimates filed, annual returns before deadline, deductions documented, zero penalties or interest. That's my job.

*[GRAPH UPDATE: Green square "Tax Compliance" appears connected to Jennifer]*

**ALEX:** Vendor payment processing — paying invoices accurately and on time, capturing early payment discounts, archiving payment confirmations, maintaining vendor relationships. That's handled by the AP system. I'd say medium priority.

*[GRAPH UPDATE: Green square "Vendor Payment Processing" appears connected to AP System]*

**SARAH:** We should also do better budget planning and analysis: develop and monitor an annual budget with variance analysis, approve the budget by Q4, generate monthly variance reports, update forecasts quarterly, keep budget vs. actual within 5%. I'd be involved, but we really need a CFO for this.

**MIKE:** Do we have a CFO?

**SARAH:** No, not yet. That's high priority work that needs to happen.

*[GRAPH UPDATE: Green square "Budget Planning & Analysis" appears with lines to Sarah and a red dashed "?" circle labeled "CFO" (GAP)]*

**SARAH:** What about the annual audit, Jennifer?

**JENNIFER:** Audit preparation is important. We need to prepare documentation for the external audit — supporting documents organized, reconciliations current, management rep letter prepared. We don't have an external auditor yet; we'll need to hire someone for that. Medium priority is fine.

*[GRAPH UPDATE: Green square "Annual Audit Preparation" appears with a red dashed line to a red dashed "?" circle labeled "External Auditor" (GAP)]*

---

## Act Three: The Plot Twist

**JENNIFER:** Speaking of missing people... bad news, everyone. Maria gave her two weeks’ notice this morning.

**SARAH:** What? The bookkeeper is leaving?

**JENNIFER:** Yes. She got an offer from a bigger firm. She'll be gone by the end of the month.

**SARAH:** That's a problem. Two goals were assigned to her — daily transaction recording and monthly financial reporting. Who's going to handle those?

**JENNIFER:** I can take over monthly reporting, but I can't do the daily transaction work. We need to hire a replacement immediately.

*[GRAPH UPDATE: Red dashed gaps appear on goals assigned to Maria]*

**ALEX:** So right now, those goals are... unassigned?

**MIKE:** Essentially yes. There's a gap. We need to fill it.

**SARAH:** This is really helpful to see. We've got three gaps now — bookkeeper, external auditor, and CFO.

---

## Act Three (cont.): Breaking Down the Work

**MIKE:** Okay, we have our people and goals. How do these actually get done? What are the concrete interactions?

**JENNIFER:** Let's think about what Maria does when she records a transaction.

**ALEX:** First, she enters the receipt into the system. Preconditions: receipt available, system accessible. Effects: transaction recorded, receipt archived.

*[GRAPH UPDATE: Orange diamond "Enter Receipt" appears with preconditions and effects listed]*

**JENNIFER:** Then she matches that transaction against the bank statement.

**ALEX:** Preconditions: bank statement imported, transaction recorded. Effects: transaction matched, balance updated.

*[GRAPH UPDATE: Orange diamond "Match Transaction" appears]*

**JENNIFER:** Finally, she verifies the balance is correct.

**ALEX:** Preconditions: all transactions matched, no pending items. Effects: balance verified, reconciliation complete.

*[GRAPH UPDATE: Orange diamond "Verify Balance" appears]*

**MIKE:** These interactions compose tasks. "Record Transaction" is the Enter Receipt interaction.

*[GRAPH UPDATE: Purple triangle "Record Transaction" appears with line to "Enter Receipt"]*

**JENNIFER:** And "Reconcile Accounts" is Match Transaction plus Verify Balance.

*[GRAPH UPDATE: Purple triangle "Reconcile Accounts" appears with lines to both "Match Transaction" and "Verify Balance"]*

**ALEX:** What about report generation? We haven't defined the workflow yet.

*[GRAPH UPDATE: Purple triangle "Generate Report" appears with a red dashed line to a missing interaction (GAP)]*

---

## Act Four: Refining the Model

**SARAH:** Looking at the visualization, Maria is pretty central to everything.

**JENNIFER:** Actually — we trained Maria on budget preparation last quarter. She has that ability now too.

*[GRAPH UPDATE: Maria's node updates to include "prepare_budgets" ability]*

**SARAH:** While we're refining priorities... is daily transaction recording really "high" priority? It's important, but compared to tax compliance...

**JENNIFER:** Let's call it medium. It needs to happen within 24 hours, but it's not an immediate requirement.

*[GRAPH UPDATE: "Accurate Daily Transaction Recording" updates to priority MEDIUM]*

**MIKE:** Also, the reconciliation task should include documenting discrepancies.

*[GRAPH UPDATE: "Reconcile Accounts" description adds "document discrepancies"]*

**JENNIFER:** And "Enter Receipt" should note that it creates an audit trail entry.

*[GRAPH UPDATE: "Enter Receipt" adds effect "Audit trail created"]*

---

## Act Five: Tracking Work Patterns

**ALEX:** What's Maria's actual workflow at month-end?

**JENNIFER:** That's a journey — Maria working toward transaction recording and financial reporting goals.

*[GRAPH UPDATE: "Monthly Close Process" journey appears, connecting Maria to Transaction Recording and Financial Reporting goals]*

**ALEX:** Makes sense. That's her regular workflow.

---

## Act Six: Discovering Problems

**SARAH:** Let's test a change. Mike, remove the "Enter Receipt" interaction.

*[GRAPH UPDATE: "Enter Receipt" disappears. "Record Transaction" now shows a red dashed line to a missing interaction (GAP)]*

**MIKE:** Maybe "Record Transaction" is too granular for now.

*[GRAPH UPDATE: "Record Transaction" task is deleted]*

**SARAH:** What about that balance accuracy question we raised earlier?

**JENNIFER:** We answered it with the three-way reconciliation explanation.

**ALEX:** Then let's remove the question from the graph.

*[GRAPH UPDATE: "Balance Accuracy Check" question is deleted]*

---

## Act Seven: Aftermath

**MIKE:** Removing Maria shows how critical her role is.

*[GRAPH UPDATE: Maria's blue circle disappears. Red dashed gaps appear on "Monthly Financial Reporting". The "Monthly Close Process" journey shows a red dashed line to a missing actor (GAP). "Reconcile Accounts" remains (ability-based).]*

**SARAH:** We're down to three actors: Jennifer, the AP System, and me. Five goals remain. We now have four gaps: Maria (deleted), External Auditor, CFO, and the missing interaction for Generate Report.

**ALEX:** Next steps:

1. Hire a bookkeeper immediately — HIGH PRIORITY
2. Define the report generation workflow
3. Engage an external auditor before audit season
4. Start the CFO search for strategic planning

**SARAH:** Agreed.

---

## [END SCENE]

---

# Agent Interpretation Guide

## Expected Actions

An agent reading this screenplay should recognize the following elements and make appropriate MCP tool calls:

### Act One: Actors (4 define_actor calls)

1. **Jennifer** (Accountant)
    - **Abilities:** `review_financials`, `prepare_tax_returns`, `audit_transactions`, `approve_reports`
    - **Constraints:** `requires_bookkeeper_data`, `must_follow_gaap`

2. **Maria** (Bookkeeper) — *later deleted*
    - **Abilities:** `record_transactions`, `reconcile_accounts`, `generate_reports`
    - **Constraints:** `requires_transaction_documentation`, `cannot_approve_own_work`

3. **AP System** (Accounts Payable System)
    - **Abilities:** `track_invoices`, `schedule_payments`, `send_reminders`
    - **Constraints:** `requires_approval_workflow`, `must_maintain_audit_trail`

4. **Sarah** (Business Owner)
    - **Abilities:** `view_reports`, `approve_budgets`, `make_strategic_decisions`
    - **Constraints:** `requires_monthly_reports`, `limited_technical_knowledge`

### Act Two: Goals (6 define_goal calls)

| # | Goal                                 | Priority | Assigned To              |
|---|--------------------------------------|----------|--------------------------|
| 1 | Accurate Daily Transaction Recording | HIGH     | Maria                    |
| 2 | Monthly Financial Reporting          | HIGH     | Maria + Jennifer         |
| 3 | Tax Compliance                       | HIGH     | Jennifer                 |
| 4 | Vendor Payment Processing            | MEDIUM   | AP System                |
| 5 | Annual Audit Preparation             | MEDIUM   | *External Auditor* (GAP) |
| 6 | Budget Planning & Analysis           | HIGH     | Sarah + *CFO* (GAP)      |

### Act Three: Interactions and Tasks (3 define_interaction, 3 define_task calls)

**Interactions:**

1. **Enter Receipt**
    - Preconditions: Receipt available, System accessible
    - Effects: Transaction recorded, Receipt archived

2. **Match Transaction**
    - Preconditions: Bank statement imported, Transaction recorded
    - Effects: Transaction matched, Balance updated

3. **Verify Balance**
    - Preconditions: All transactions matched, No pending items
    - Effects: Balance verified, Reconciliation complete

**Tasks:**

1. **Record Transaction** — *later deleted*
    - Required abilities: `record_transactions`
    - Composed of: Enter Receipt

2. **Reconcile Accounts**
    - Required abilities: `reconcile_accounts`
    - Composed of: Match Transaction, Verify Balance

3. **Generate Report**
    - Required abilities: `generate_reports`
    - Composed of: *[missing interaction]* (GAP)

### Act Four: Updates (4 update calls)

1. **update_actor**: Maria adds `prepare_budgets` ability
2. **update_goal**: Transaction Recording priority → MEDIUM
3. **update_task**: Reconcile Accounts description adds "document discrepancies"
4. **update_interaction**: Enter Receipt adds "Audit trail created" effect

### Act Five: Questions and Journeys (2 define, 2 update calls)

1. **define_question**: Balance Accuracy Check
    - Asks about: "Account reconciliation process and verification steps"

2. **define_journey**: Monthly Close Process
    - Actor: Maria
    - Goals: Transaction Recording, Financial Reporting

3. **update_question**: Balance Accuracy Check clarified
    - Updated to: "Three-way reconciliation: book vs bank vs receipts"

4. **update_journey**: Monthly Close adds Tax Compliance goal
    - Now tracking: Transaction Recording, Financial Reporting, Tax Compliance

### Act Six & Seven: Deletions (6 delete calls)

1. **delete_interaction**: Enter Receipt (creates gap in Record Transaction task)
2. **delete_task**: Record Transaction
3. **delete_question**: Balance Accuracy Check
4. **delete_actor**: Maria (creates gaps in goals/journeys)
5. **delete_journey**: Monthly Close Process
6. **delete_goal**: Accurate Daily Transaction Recording

### Expected Final State

- **3 Actors:** Jennifer, AP System, Sarah
- **5 Goals:** Monthly Reporting, Tax Compliance, Vendor Payment, Audit Prep, Budget Planning
- **2 Tasks:** Reconcile Accounts, Generate Report
- **2 Interactions:** Match Transaction, Verify Balance
- **0 Questions**
- **0 Journeys**
- **4 Gaps:**
    - Maria (deleted actor, affects Monthly Reporting goal)
    - External Auditor (missing actor, affects Audit Prep goal)
    - CFO (missing actor, affects Budget Planning goal)
    - Missing interaction (affects Generate Report task)

---

## Usage Instructions

### For Human Facilitators

1. Read the screenplay aloud to an AI agent connected to the MCP server
2. Read naturally, pausing between Acts to allow the agent to process and update the graph
3. Watch the visualization update in real-time as the agent processes each section
4. Observe how:
    - Blue circles (actors) appear as characters are introduced
    - Green squares (goals) connect to actors via gray lines
    - Red dashed elements (gaps) appear when non-existent entities are referenced
    - Orange diamonds (interactions) and purple triangles (tasks) show the work breakdown
    - Updates ripple through the graph as the model is refined
    - Deletions create gaps that highlight dependencies

### For AI Agents

When processing this screenplay:

**Listen for character descriptions that include:**

- Abilities and constraints → `define_actor`
- Multiple actors described in sequence → batch create them

**Listen for goal descriptions with:**

- Success criteria and priority levels → `define_goal`
- Assignments to characters or non-existent roles → use character IDs or create gaps

**Listen for work breakdowns:**

- "Interactions" with preconditions/effects → `define_interaction`
- "Tasks" composed of interactions → `define_task`
- References to undefined workflows → create with gap references

**Listen for refinements:**

- "Actually, she also can..." or "We trained her on..." → `update_actor`
- "Let's change the priority..." → `update_goal`
- "Should we clarify..." or "Add to the description..." → `update_task` or `update_interaction`

**Listen for tracking patterns:**

- "Workflow" or "journey" descriptions → `define_journey`
- Questions about processes → `define_question`
- Clarifications to questions → `update_question`

**Listen for removals:**

- "Let's remove..." or "Test what happens if..." → `delete_*`
- "Maria is leaving" or character departures → `delete_actor`
- "We don't need this anymore..." → `delete_question`, `delete_journey`

**Key phrase patterns:**

- "We don't have a [role] yet" → Create gap reference (use placeholder UUID)
- "[Person] is leaving" → Delete actor after they're created
- "What happens if we remove..." → Delete and observe gaps
- "Let's refine..." or "Actually..." → Update existing entity
- "How does [X] work?" → Create question
- "[Person]'s workflow for [goal]" → Create journey

---

## Visualization Expectations

As the agent processes this screenplay, the projected graph should show:

1. **Growth phase** (Acts 1-3): Graph expands with actors, goals, interactions, tasks
2. **Gap emergence**: Red dashed elements for External Auditor, CFO, missing interaction
3. **Refinement phase** (Act 4-5): Existing nodes update, connections strengthen
4. **Pattern phase** (Act 5): Journey and question elements appear
5. **Contraction phase** (Acts 6-7): Elements disappear, gaps become more prominent
6. **Final state**: Sparse graph with clear gaps highlighting hiring needs

The total evolution should take 15-20 minutes to narrate, with the graph updating smoothly throughout to give the team a
real-time "movie" of their system's design emerging.

---

**Document Version:** 2.0
**Updated:** Phase 2 - Full CRUD coverage
**Created for:** Screenplay MCP Server Testing
**License:** Use freely for ensemble modeling sessions
