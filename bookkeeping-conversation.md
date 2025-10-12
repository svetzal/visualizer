# Bookkeeping System Design Session
## A Screenplay for Ensemble Modeling

---

### Scene Setup

**Location:** Conference room
**Setting:** Four people sit around a table with laptops and coffee
**Duration:** ~15 minutes

### Cast of Characters

| Character | Role | Age | Personality |
|-----------|------|-----|-------------|
| **SARAH** | Business Owner | Mid-40s | Pragmatic, strategic thinker |
| **JENNIFER** | Accountant | Late-30s | Detail-oriented, compliance-focused |
| **ALEX** | Operations Manager | Mid-30s | Organized, process-driven |
| **MIKE** | Software Developer | Early-30s | Technical, systems-oriented |

---

## Act One: Defining the Team

**SARAH:** Okay, let's figure out who's actually going to be doing what in our new bookkeeping system. Jennifer, you'll obviously be our main accountant, right?

**JENNIFER:** Yes, that's me. I'll be reviewing financial reports, preparing tax returns, auditing transactions, and approving reports. I need to make sure we follow GAAP standards, and I'll depend on having clean data from the bookkeeper.

**SARAH:** Good. And we have Maria as our bookkeeper. She handles the day-to-day stuff.

**JENNIFER:** Right, Maria records transactions, reconciles accounts, and generates reports. She needs proper documentation for everything, and we've set it up so she can't approve her own work - that's an important control.

**ALEX:** Don't forget about the AP system we just installed. It's automated.

**MIKE:** Yeah, that's our accounts payable system. It tracks invoices, schedules payments, and sends reminders. We built in an approval workflow and it maintains a full audit trail.

**SARAH:** That's me too, I guess. I'm the business owner. I view reports, approve budgets, and make strategic decisions. Though I have to admit, I need monthly reports to stay informed, and I don't have a lot of technical knowledge about the accounting side.

**JENNIFER:** That's fine, Sarah. That's what you have me for.

---

## Act Two: Setting Goals

**SARAH:** Okay, so what are our main goals here? What do we need to achieve?

**JENNIFER:** Well, first and most important - we need accurate daily transaction recording. Every financial transaction must be recorded within 24 hours. That means all receipts entered the same day, bank statements reconciled weekly, and zero discrepancies in cash accounts. That's Maria's responsibility - our bookkeeper.

**SARAH:** Agreed. That's high priority. What else?

**JENNIFER:** Monthly financial reporting. We need comprehensive reports by the 5th of each month - P&L statement, balance sheet, cash flow statement, all delivered to you by the 5th. That's really both Maria and me working together on that one.

**SARAH:** Yeah, that needs to be high priority too.

**JENNIFER:** And of course, tax compliance. All tax obligations met accurately and on time - quarterly estimates filed, annual returns before deadline, deductions documented, zero penalties or interest. That's my job.

**SARAH:** Definitely high priority. Alex, what about vendor payments?

**ALEX:** That's what the AP system handles. Vendor payment processing - paying all invoices accurately and on time, capturing early payment discounts, archiving payment confirmations, maintaining vendor relationships. I'd say that's medium priority - important but not as critical as the financial reporting.

**SARAH:** Makes sense. Oh, we should also plan for the annual audit, right Jennifer?

**JENNIFER:** Yes, audit preparation is important. We need to prepare all documentation for the external audit - supporting documents organized, reconciliations current, management rep letter prepared. The goal is to complete the audit within two weeks. That'll be handled by... well, we don't have an external auditor yet. We'll need to hire someone for that.

**SARAH:** Okay, so that's assigned to an external auditor we haven't found yet. Medium priority?

**JENNIFER:** Yes, medium is fine. We have time to find someone before audit season.

**SARAH:** And I've been thinking - we should really do better budget planning and analysis. Develop and monitor an annual budget with variance analysis. Get the budget approved by Q4, generate monthly variance reports, update forecasts quarterly, keep budget versus actual within 5%. That's something I'd want to be involved in, but honestly, we need a CFO for this.

**MIKE:** Do we have a CFO?

**SARAH:** No, we don't. That's a position we're planning to hire for. But it's high priority work that needs to happen.

**ALEX:** So you're assigning that goal to yourself and a CFO who doesn't exist yet?

**SARAH:** Exactly. It shows us what we're missing.

---

## Act Three: The Plot Twist

**JENNIFER:** Speaking of missing people... bad news, everyone. Maria gave her two weeks notice this morning.

**SARAH:** What? The bookkeeper is leaving?

**JENNIFER:** Yes. She got an offer from a bigger firm. She'll be gone by the end of the month.

**ALEX:** Oh no. So we don't have a bookkeeper anymore?

**JENNIFER:** Not after this month, no.

**SARAH:** That's a problem. We had two goals assigned to her - the daily transaction recording and the monthly financial reporting. Who's going to handle those?

**JENNIFER:** I can take over monthly reporting, but I can't do the daily transaction work. We need to hire a replacement immediately.

**ALEX:** So right now, those goals are... unassigned?

**MIKE:** Essentially yes. There's a gap. We need to fill it.

**SARAH:** This is really helpful to see. We've got three gaps now - we need a new bookkeeper urgently because two critical goals depend on that role, we need to engage an external auditor, and we should start looking for a CFO for strategic planning.

**JENNIFER:** The bookkeeper is the most urgent. Those are high-priority goals that can't wait.

**SARAH:** Agreed. Let's start interviewing candidates this week.

---

## [END SCENE]

---

# Agent Interpretation Guide

## Expected Actions

An agent reading this screenplay should recognize the following elements and make appropriate MCP tool calls:

### Actors to Define (4)

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

### Goals to Define (6)

| # | Goal | Priority | Assigned To |
|---|------|----------|-------------|
| 1 | Accurate Daily Transaction Recording | HIGH | Maria |
| 2 | Monthly Financial Reporting | HIGH | Maria + Jennifer |
| 3 | Tax Compliance | HIGH | Jennifer |
| 4 | Vendor Payment Processing | MEDIUM | AP System |
| 5 | Annual Audit Preparation | MEDIUM | *External Auditor* (GAP) |
| 6 | Budget Planning & Analysis | HIGH | Sarah + *CFO* (GAP) |

### Deletions (1)

- **Maria** (Bookkeeper) — Creates gaps in Goals #1 and #2

### Expected Final State

- **3 Actors:** Jennifer, AP System, Sarah
- **6 Goals:** All goals defined
- **3 Gaps:**
  - Deleted Maria (affects 2 goals)
  - Missing External Auditor (affects 1 goal)
  - Missing CFO (affects 1 goal)

---

## Usage Instructions

### For Human Facilitators

1. Read the screenplay aloud to an AI agent connected to the MCP server
2. Read naturally, pausing between major sections (Acts)
3. Watch the visualization update in real-time as the agent processes each section
4. Observe how gaps appear when non-existent actors are mentioned
5. Notice how Maria's deletion creates visual gaps in the graph

### For AI Agents

When processing this screenplay:
- Listen for character descriptions that include abilities and constraints → `define_actor`
- Listen for goal descriptions with success criteria and assignments → `define_goal`
- Listen for phrases like "doesn't exist yet" or "we don't have" → assign to placeholder IDs (creates gaps)
- Listen for departures or removals → `delete_actor`
- Track which actors are assigned to which goals for proper relationship modeling

---

**Document Version:** 1.0
**Created for:** Screenplay MCP Server Phase 1 Testing
**License:** Use freely for ensemble modeling sessions
