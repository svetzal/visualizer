# Bookkeeping System Design Session# Bookkeeping System Design Session

## A Screenplay for Ensemble Modeling## A Screenplay for Ensemble Modeling



------



### Scene Setup### Scene Setup



**Location:** Conference room with large projection screen**Location:** Conference room with large projection screen

**Setting:** Four people sit around a table with laptops and coffee, with a force-directed graph visualization projected on the wall**Setting:** Four people sit around a table with laptops and coffee, with a force-directed graph visualization projected on the wall

**Duration:** ~20 minutes**Duration:** ~20 minutes

**Visualization:** Updates in real-time as the team discusses the system**Visualization:** Updates in real-time as the team discusses the system



### Cast of Characters### Cast of Characters



| Character | Role | Age | Personality || Character | Role | Age | Personality |

|-----------|------|-----|-------------||-----------|------|-----|-------------|

| **SARAH** | Business Owner | Mid-40s | Pragmatic, strategic thinker || **SARAH** | Business Owner | Mid-40s | Pragmatic, strategic thinker |

| **JENNIFER** | Accountant | Late-30s | Detail-oriented, compliance-focused || **JENNIFER** | Accountant | Late-30s | Detail-oriented, compliance-focused |

| **ALEX** | Operations Manager | Mid-30s | Organized, process-driven || **ALEX** | Operations Manager | Mid-30s | Organized, process-driven |

| **MIKE** | Software Developer | Early-30s | Technical, systems-oriented || **MIKE** | Software Developer | Early-30s | Technical, systems-oriented |



------



## Act One: Defining the Team## Act One: Defining the Team



**SARAH:** Okay, let's figure out who's actually going to be doing what in our new bookkeeping system. Jennifer, you'll obviously be our main accountant, right?**SARAH:** Okay, let's figure out who's actually going to be doing what in our new bookkeeping system. Jennifer, you'll obviously be our main accountant, right?



**JENNIFER:** Yes, that's me. I'll be reviewing financial reports, preparing tax returns, auditing transactions, and approving reports. I need to make sure we follow GAAP standards, and I'll depend on having clean data from the bookkeeper.**JENNIFER:** Yes, that's me. I'll be reviewing financial reports, preparing tax returns, auditing transactions, and approving reports. I need to make sure we follow GAAP standards, and I'll depend on having clean data from the bookkeeper.



*[GRAPH UPDATE: Blue circle appears labeled "Jennifer" with abilities listed]***SARAH:** Good. And we have Maria as our bookkeeper. She handles the day-to-day stuff.



**SARAH:** Good. And we have Maria as our bookkeeper. She handles the day-to-day stuff.**JENNIFER:** Right, Maria records transactions, reconciles accounts, and generates reports. She needs proper documentation for everything, and we've set it up so she can't approve her own work - that's an important control.



**JENNIFER:** Right, Maria records transactions, reconciles accounts, and generates reports. She needs proper documentation for everything, and we've set it up so she can't approve her own work - that's an important control.**ALEX:** Don't forget about the AP system we just installed. It's automated.



*[GRAPH UPDATE: Second blue circle "Maria" appears]***MIKE:** Yeah, that's our accounts payable system. It tracks invoices, schedules payments, and sends reminders. We built in an approval workflow and it maintains a full audit trail.



**ALEX:** Don't forget about the AP system we just installed. It's automated.**SARAH:** That's me too, I guess. I'm the business owner. I view reports, approve budgets, and make strategic decisions. Though I have to admit, I need monthly reports to stay informed, and I don't have a lot of technical knowledge about the accounting side.



**MIKE:** Yeah, that's our accounts payable system. It tracks invoices, schedules payments, and sends reminders. We built in an approval workflow and it maintains a full audit trail.**JENNIFER:** That's fine, Sarah. That's what you have me for.



*[GRAPH UPDATE: Third blue circle "AP System" appears]*---



**SARAH:** That's me too, I guess. I'm the business owner. I view reports, approve budgets, and make strategic decisions. Though I have to admit, I need monthly reports to stay informed, and I don't have a lot of technical knowledge about the accounting side.## Act Two: Setting Goals



**JENNIFER:** That's fine, Sarah. That's what you have me for.**SARAH:** Okay, so what are our main goals here? What do we need to achieve?



*[GRAPH UPDATE: Fourth blue circle "Sarah" appears - now showing 4 actors]***JENNIFER:** Well, first and most important - we need accurate daily transaction recording. Every financial transaction must be recorded within 24 hours. That means all receipts entered the same day, bank statements reconciled weekly, and zero discrepancies in cash accounts. That's Maria's responsibility - our bookkeeper.



---**SARAH:** Agreed. That's high priority. What else?



## Act Two: Setting Goals**JENNIFER:** Monthly financial reporting. We need comprehensive reports by the 5th of each month - P&L statement, balance sheet, cash flow statement, all delivered to you by the 5th. That's really both Maria and me working together on that one.



**SARAH:** Okay, so what are our main goals here? What do we need to achieve?**SARAH:** Yeah, that needs to be high priority too.



**JENNIFER:** Well, first and most important - we need accurate daily transaction recording. Every financial transaction must be recorded within 24 hours. That means all receipts entered the same day, bank statements reconciled weekly, and zero discrepancies in cash accounts. That's Maria's responsibility - our bookkeeper.**JENNIFER:** And of course, tax compliance. All tax obligations met accurately and on time - quarterly estimates filed, annual returns before deadline, deductions documented, zero penalties or interest. That's my job.



*[GRAPH UPDATE: Green square appears labeled "Accurate Daily Transaction Recording" with gray line connecting to Maria]***SARAH:** Definitely high priority. Alex, what about vendor payments?



**SARAH:** Agreed. That's high priority. What else?**ALEX:** That's what the AP system handles. Vendor payment processing - paying all invoices accurately and on time, capturing early payment discounts, archiving payment confirmations, maintaining vendor relationships. I'd say that's medium priority - important but not as critical as the financial reporting.



**JENNIFER:** Monthly financial reporting. We need comprehensive reports by the 5th of each month - P&L statement, balance sheet, cash flow statement, all delivered to you by the 5th. That's really both Maria and me working together on that one.**SARAH:** Makes sense. Oh, we should also plan for the annual audit, right Jennifer?



*[GRAPH UPDATE: Green square "Monthly Financial Reporting" appears with lines to both Maria and Jennifer]***JENNIFER:** Yes, audit preparation is important. We need to prepare all documentation for the external audit - supporting documents organized, reconciliations current, management rep letter prepared. The goal is to complete the audit within two weeks. That'll be handled by... well, we don't have an external auditor yet. We'll need to hire someone for that.



**SARAH:** Yeah, that needs to be high priority too.**SARAH:** Okay, so that's assigned to an external auditor we haven't found yet. Medium priority?



**JENNIFER:** And of course, tax compliance. All tax obligations met accurately and on time - quarterly estimates filed, annual returns before deadline, deductions documented, zero penalties or interest. That's my job.**JENNIFER:** Yes, medium is fine. We have time to find someone before audit season.



*[GRAPH UPDATE: Green square "Tax Compliance" appears connected to Jennifer]***SARAH:** And I've been thinking - we should really do better budget planning and analysis. Develop and monitor an annual budget with variance analysis. Get the budget approved by Q4, generate monthly variance reports, update forecasts quarterly, keep budget versus actual within 5%. That's something I'd want to be involved in, but honestly, we need a CFO for this.



**SARAH:** Definitely high priority. Alex, what about vendor payments?**MIKE:** Do we have a CFO?



**ALEX:** That's what the AP system handles. Vendor payment processing - paying all invoices accurately and on time, capturing early payment discounts, archiving payment confirmations, maintaining vendor relationships. I'd say that's medium priority - important but not as critical as the financial reporting.**SARAH:** No, we don't. That's a position we're planning to hire for. But it's high priority work that needs to happen.



*[GRAPH UPDATE: Green square "Vendor Payment Processing" appears connected to AP System]***ALEX:** So you're assigning that goal to yourself and a CFO who doesn't exist yet?



**SARAH:** Makes sense. Oh, we should also plan for the annual audit, right Jennifer?**SARAH:** Exactly. It shows us what we're missing.



**JENNIFER:** Yes, audit preparation is important. We need to prepare all documentation for the external audit - supporting documents organized, reconciliations current, management rep letter prepared. The goal is to complete the audit within two weeks. That'll be handled by... well, we don't have an external auditor yet. We'll need to hire someone for that.---



*[GRAPH UPDATE: Green square "Annual Audit Preparation" appears with a red dashed line to a red dashed "?" circle labeled "External Auditor" (GAP)]*## Act Three: The Plot Twist



**MIKE:** I see it on the screen - that's showing as a gap. The system knows we're referencing someone who doesn't exist yet.**JENNIFER:** Speaking of missing people... bad news, everyone. Maria gave her two weeks notice this morning.



**SARAH:** Okay, so that's assigned to an external auditor we haven't found yet. Medium priority?**SARAH:** What? The bookkeeper is leaving?



**JENNIFER:** Yes, medium is fine. We have time to find someone before audit season.**JENNIFER:** Yes. She got an offer from a bigger firm. She'll be gone by the end of the month.



**SARAH:** And I've been thinking - we should really do better budget planning and analysis. Develop and monitor an annual budget with variance analysis. Get the budget approved by Q4, generate monthly variance reports, update forecasts quarterly, keep budget versus actual within 5%. That's something I'd want to be involved in, but honestly, we need a CFO for this.**ALEX:** Oh no. So we don't have a bookkeeper anymore?



**MIKE:** Do we have a CFO?**JENNIFER:** Not after this month, no.



**SARAH:** No, we don't. That's a position we're planning to hire for. But it's high priority work that needs to happen.**SARAH:** That's a problem. We had two goals assigned to her - the daily transaction recording and the monthly financial reporting. Who's going to handle those?



*[GRAPH UPDATE: Green square "Budget Planning & Analysis" appears with lines to Sarah and another red dashed "?" circle labeled "CFO" (GAP)]***JENNIFER:** I can take over monthly reporting, but I can't do the daily transaction work. We need to hire a replacement immediately.



**ALEX:** So you're assigning that goal to yourself and a CFO who doesn't exist yet?**ALEX:** So right now, those goals are... unassigned?



**SARAH:** Exactly. It shows us what we're missing.**MIKE:** Essentially yes. There's a gap. We need to fill it.



---**SARAH:** This is really helpful to see. We've got three gaps now - we need a new bookkeeper urgently because two critical goals depend on that role, we need to engage an external auditor, and we should start looking for a CFO for strategic planning.



## Act Three: Breaking Down the Work**JENNIFER:** The bookkeeper is the most urgent. Those are high-priority goals that can't wait.



**MIKE:** Okay, this is good. We have our people and our goals. But how do these actually get done? What are the concrete interactions that make this work?**SARAH:** Agreed. Let's start interviewing candidates this week.



**JENNIFER:** Good question. Let's think about what Maria actually does when she records a transaction.---



**ALEX:** Well, first she has to enter the receipt into the system. She needs the receipt available, system has to be accessible. Once that's done, the transaction is recorded and the receipt gets archived.## [END SCENE]



*[GRAPH UPDATE: Orange diamond "Enter Receipt" appears with preconditions and effects listed]*---



**JENNIFER:** Right. And then for reconciliation, she has to match that transaction against the bank statement.# Agent Interpretation Guide



**ALEX:** That requires the bank statement to be imported and the transaction already recorded. Then she matches them and updates the balance.## Expected Actions



*[GRAPH UPDATE: Orange diamond "Match Transaction" appears]*An agent reading this screenplay should recognize the following elements and make appropriate MCP tool calls:



**JENNIFER:** And finally, she verifies the balance is correct.### Actors to Define (4)



**ALEX:** All transactions have to be matched first, no pending items. Then she can confirm the balance and mark the reconciliation complete.1. **Jennifer** (Accountant)

   - **Abilities:** `review_financials`, `prepare_tax_returns`, `audit_transactions`, `approve_reports`

*[GRAPH UPDATE: Orange diamond "Verify Balance" appears]*   - **Constraints:** `requires_bookkeeper_data`, `must_follow_gaap`



**MIKE:** So these interactions... they compose into larger tasks, right? Like "Record Transaction" is really just the "Enter Receipt" interaction.2. **Maria** (Bookkeeper) — *later deleted*

   - **Abilities:** `record_transactions`, `reconcile_accounts`, `generate_reports`

*[GRAPH UPDATE: Purple triangle "Record Transaction" appears with line to "Enter Receipt"]*   - **Constraints:** `requires_transaction_documentation`, `cannot_approve_own_work`



**JENNIFER:** And "Reconcile Accounts" is matching transactions plus verifying the balance - that's two interactions.3. **AP System** (Accounts Payable System)

   - **Abilities:** `track_invoices`, `schedule_payments`, `send_reminders`

*[GRAPH UPDATE: Purple triangle "Reconcile Accounts" appears with lines to both "Match Transaction" and "Verify Balance"]*   - **Constraints:** `requires_approval_workflow`, `must_maintain_audit_trail`



**ALEX:** What about report generation? We haven't really defined how that works yet.4. **Sarah** (Business Owner)

   - **Abilities:** `view_reports`, `approve_budgets`, `make_strategic_decisions`

**MIKE:** Yeah, that's still unclear. We know Maria needs the ability to generate reports, but we haven't broken down the actual steps involved.   - **Constraints:** `requires_monthly_reports`, `limited_technical_knowledge`



*[GRAPH UPDATE: Purple triangle "Generate Report" appears with a red dashed line to a missing interaction (GAP) - showing we haven't defined the workflow yet]*### Goals to Define (6)



**JENNIFER:** Let's come back to that. We should define the report generation process, but let's not get stuck on it now.| # | Goal | Priority | Assigned To |

|---|------|----------|-------------|

---| 1 | Accurate Daily Transaction Recording | HIGH | Maria |

| 2 | Monthly Financial Reporting | HIGH | Maria + Jennifer |

## Act Four: Refining the Model| 3 | Tax Compliance | HIGH | Jennifer |

| 4 | Vendor Payment Processing | MEDIUM | AP System |

**SARAH:** Looking at the visualization, I'm realizing Maria is pretty central to everything. She's connected to multiple goals.| 5 | Annual Audit Preparation | MEDIUM | *External Auditor* (GAP) |

| 6 | Budget Planning & Analysis | HIGH | Sarah + *CFO* (GAP) |

**JENNIFER:** Actually, I just remembered - we trained Maria on budget preparation last quarter. She has that ability now too.

### Deletions (1)

*[GRAPH UPDATE: Maria's node updates to include "prepare_budgets" ability]*

- **Maria** (Bookkeeper) — Creates gaps in Goals #1 and #2

**ALEX:** Oh, that's right. She helped you with the Q2 variance reports.

### Expected Final State

**JENNIFER:** Exactly. We should update her profile to reflect that.

- **3 Actors:** Jennifer, AP System, Sarah

**SARAH:** While we're refining things... you know, the daily transaction recording goal - is that really "high" priority? I mean, it's important, but compared to regulatory stuff like tax compliance...- **6 Goals:** All goals defined

- **3 Gaps:**

**JENNIFER:** You're right. Let's call it medium priority. It needs to happen, but we have a 24-hour window, not an immediate requirement.  - Deleted Maria (affects 2 goals)

  - Missing External Auditor (affects 1 goal)

*[GRAPH UPDATE: "Accurate Daily Transaction Recording" goal updates to show "medium" priority instead of "high"]*  - Missing CFO (affects 1 goal)



**MIKE:** And should we clarify the reconciliation task? The description says "match transactions and verify balances" but we also need to document any discrepancies we find.---



**ALEX:** Good catch. That's actually an important part of the audit trail.## Usage Instructions



*[GRAPH UPDATE: "Reconcile Accounts" task updates with expanded description including "document discrepancies"]*### For Human Facilitators



**JENNIFER:** And for the "Enter Receipt" interaction - we should note that it also creates an audit trail entry. That's critical for compliance.1. Read the screenplay aloud to an AI agent connected to the MCP server

2. Read naturally, pausing between major sections (Acts)

*[GRAPH UPDATE: "Enter Receipt" interaction adds "Audit trail created" to its effects]*3. Watch the visualization update in real-time as the agent processes each section

4. Observe how gaps appear when non-existent actors are mentioned

---5. Notice how Maria's deletion creates visual gaps in the graph



## Act Five: Tracking Work Patterns### For AI Agents



**ALEX:** I'm curious about how these things actually flow together. Like, what's Maria's actual workflow at the end of each month?When processing this screenplay:

- Listen for character descriptions that include abilities and constraints → `define_actor`

**JENNIFER:** Good question. She has a monthly close process. She's working toward that transaction recording goal and the financial reporting goal, mainly.- Listen for goal descriptions with success criteria and assignments → `define_goal`

- Listen for phrases like "doesn't exist yet" or "we don't have" → assign to placeholder IDs (creates gaps)

**MIKE:** So that's a journey, right? Maria going through a series of tasks to achieve those two goals?- Listen for departures or removals → `delete_actor`

- Track which actors are assigned to which goals for proper relationship modeling

*[GRAPH UPDATE: "Monthly Close Process" journey appears, connecting Maria to "Transaction Recording" and "Financial Reporting" goals]*

---

**ALEX:** Makes sense. That's her regular workflow.

**Document Version:** 1.0

**SARAH:** Actually, there's something that's been bothering me. How do we really verify that our account balances are accurate? What's the actual process?**Created for:** Screenplay MCP Server Phase 1 Testing

**License:** Use freely for ensemble modeling sessions

**JENNIFER:** That's a great question. Like, what are we actually checking?

*[GRAPH UPDATE: "Balance Accuracy Check" question appears on the graph]*

**ALEX:** Well, we're looking at the account reconciliation process, the verification steps...

**JENNIFER:** Wait, I think I can be more specific. We're doing a three-way reconciliation - we compare the books against the bank statements against the physical receipts. All three have to match.

*[GRAPH UPDATE: "Balance Accuracy Check" question updates with clarification: "Three-way reconciliation: book vs bank vs receipts"]*

**MIKE:** That's much clearer. That's the kind of specific detail we need.

**ALEX:** And Jennifer, doesn't Maria's monthly close also need to consider tax compliance? She's collecting data you'll need for quarterly estimates.

**JENNIFER:** You're absolutely right. Her workflow should include that.

*[GRAPH UPDATE: "Monthly Close Process" journey updates to add connection to "Tax Compliance" goal - now tracking 3 goals]*

---

## Act Six: Discovering Problems

**MIKE:** Looking at the graph, I'm noticing something odd. The "Record Transaction" task - it depends on the "Enter Receipt" interaction, right?

**ALEX:** Yeah, that's what we said.

**MIKE:** But what if we decide to automate receipt entry? Or change how we handle them? We'd be ripping out a core interaction.

**SARAH:** Let's test that. Mike, remove the "Enter Receipt" interaction and see what happens to the graph.

*[GRAPH UPDATE: "Enter Receipt" interaction disappears. The "Record Transaction" task now shows a red dashed line to a missing interaction (GAP)]*

**ALEX:** Whoa. So now we can see that the "Record Transaction" task is incomplete - it needs an interaction we haven't defined.

**JENNIFER:** That's actually useful. It forces us to think through the replacement before we finalize the change.

**MIKE:** And maybe "Record Transaction" itself is too granular at this point. We haven't really agreed on the workflow.

*[GRAPH UPDATE: "Record Transaction" task is deleted]*

**SARAH:** Fair enough. What about that balance accuracy question? Have we actually answered it sufficiently?

**JENNIFER:** I think we covered it with the three-way reconciliation explanation.

**ALEX:** But we don't need it cluttering the graph anymore. We can document that in our procedures manual.

*[GRAPH UPDATE: "Balance Accuracy Check" question is deleted]*

---

## Act Seven: The Plot Twist

**JENNIFER:** Speaking of things that need attention... I have some bad news. Maria gave her two weeks notice this morning.

**SARAH:** What? The bookkeeper is leaving?

**JENNIFER:** Yes. She got an offer from a bigger firm. She'll be gone by the end of the month.

*[Long pause as everyone stares at the projection]*

**ALEX:** Oh no. Look at the graph. She's connected to... everything.

**MIKE:** Let me remove her and see what happens.

*[GRAPH UPDATE: Maria's blue circle disappears. Red dashed gaps appear on "Monthly Financial Reporting" goal. The "Monthly Close Process" journey shows a red dashed line to a missing actor (GAP). The "Reconcile Accounts" task remains because it doesn't require Maria specifically, just the reconcile_accounts ability.]*

**SARAH:** Okay, that's... wow. That's really stark. The monthly reporting goal shows a gap now - it was assigned to both Maria and Jennifer, but Maria's gone.

**JENNIFER:** And the monthly close journey is completely broken - it was Maria's workflow. That whole process needs to be reassigned.

*[GRAPH UPDATE: "Monthly Close Process" journey is deleted as it cannot exist without its actor]*

**ALEX:** And we lost the daily transaction recording goal entirely?

**MIKE:** I think the system is showing us that without a bookkeeper, that goal literally can't be achieved. Let me remove it.

*[GRAPH UPDATE: "Accurate Daily Transaction Recording" goal is deleted]*

**SARAH:** This visualization is really driving home how critical this role is. We have...

*[She points at the screen]*

**SARAH:** ...three actors left: Jennifer, the AP System, and me. Five goals remaining. And now we have four gaps total:
- Maria herself - affecting the monthly reporting
- The external auditor we need to hire
- The CFO position we're planning to fill
- And that missing interaction in the report generation workflow

**JENNIFER:** The bookkeeper gap is the most urgent. The monthly financial reporting is high priority and regulatory work. I can help, but I can't do it all myself.

**ALEX:** The visualization makes it really clear. We need to:
1. Hire a bookkeeper immediately - HIGH PRIORITY
2. Define that report generation workflow we've been avoiding
3. Engage an external auditor before audit season
4. Start the CFO search for strategic planning

**SARAH:** Agreed. Mike, can you keep this graph up on the monitor in the hallway? I want everyone to see where we are.

**MIKE:** Absolutely. And as we interview bookkeeper candidates, we can literally show them this graph and say "here's what you'll be responsible for" and see the connections light up.

**JENNIFER:** I love that. It's not just an org chart - it's showing the actual work relationships.

**SARAH:** Alright. Let's get those job postings up today. Next week, we reconvene and start defining that report generation process properly. And Jennifer, can you start reaching out to auditors?

**JENNIFER:** On it.

**ALEX:** This was incredibly helpful. Seeing it all visualized like that makes the relationships and dependencies so much clearer.

**SARAH:** Agreed. Same time next week?

**ALL:** *[nod in agreement]*

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

| # | Goal | Priority | Assigned To |
|---|------|----------|-------------|
| 1 | Accurate Daily Transaction Recording | HIGH | Maria |
| 2 | Monthly Financial Reporting | HIGH | Maria + Jennifer |
| 3 | Tax Compliance | HIGH | Jennifer |
| 4 | Vendor Payment Processing | MEDIUM | AP System |
| 5 | Annual Audit Preparation | MEDIUM | *External Auditor* (GAP) |
| 6 | Budget Planning & Analysis | HIGH | Sarah + *CFO* (GAP) |

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

The total evolution should take 15-20 minutes to narrate, with the graph updating smoothly throughout to give the team a real-time "movie" of their system's design emerging.

---

**Document Version:** 2.0
**Updated:** Phase 2 - Full CRUD coverage
**Created for:** Screenplay MCP Server Testing
**License:** Use freely for ensemble modeling sessions
