# Domain-Oriented Compositional Tools Design

This document elaborates on **Approach 3** from DUPLICATION.md: a comprehensive redesign of the MCP tool API from low-level CRUD operations to high-level, domain-salient, conversational tools.

## Executive Summary

The current 32 CRUD-based tools require LLMs to:
1. Track entity UUIDs across conversation turns (unreliable)
2. Make 5-12 separate calls to model a single concept
3. Manually prevent duplication by checking names first
4. Understand low-level implementation details (assigned_to arrays, composed_of relationships)

**Proposed solution:** Replace with 15-20 domain-oriented tools that:
- Accept names instead of UUIDs (find-or-create semantics)
- Combine related operations into single, cohesive actions
- Use natural language parameter names aligned with domain terminology
- Automatically prevent duplication through built-in name resolution
- Reduce tool calls by 60-80% for common scenarios

---

## Design Principles

### 1. **Conversational First**
Tools should map to how humans think and talk about systems:
- ✅ "Introduce the payment gateway as a system that processes payments"
- ❌ "Create actor with id=uuid, name='Payment Gateway', abilities=['process_payment']"

### 2. **Progressive Disclosure**
Start simple, add detail incrementally:
- First mention: `introduce_system("Payment Gateway")`
- Later: `grant_ability("Payment Gateway", "refund_transactions")`
- Not: Define everything upfront or fail

### 3. **Idempotent by Default**
Every tool can be called multiple times safely:
- `introduce_actor("Sarah")` → creates if new, returns if exists
- No "already exists" errors
- Enables natural conversation flow

### 4. **Relationship-Aware**
Tools understand and maintain relationships:
- `assign_responsibility("Sarah", "Approve budgets")` → ensures Sarah exists, ensures "Approve budgets" goal exists, links them
- Not: Create both separately, then link with third call

### 5. **Intention-Revealing Names**
Tool names describe business intent, not implementation:
- ✅ `establish_business_objective`, `record_workflow`
- ❌ `create_goal`, `update_task_composed_of`

---

## Tool Catalog

### Category 1: Actor Introduction & Management

#### `introduce_human_actor`
**Purpose:** Define a person, role, or user persona in the system.

**Parameters:**
```typescript
{
  name: string,                    // "Customer Service Rep", "Product Owner"
  role?: string,                   // "Front-line support", "Decision maker"
  responsibilities?: string[],     // ["Handle complaints", "Process refunds"]
  constraints?: string[],          // ["Cannot access production data"]
}
```

**Behavior:**
- Case-insensitive name lookup
- If exists: return existing actor (optionally merge responsibilities/constraints)
- If new: create with default abilities inferred from responsibilities
- Auto-link to any goals matching responsibility keywords

**Example:**
```javascript
// Before (3 calls):
define_actor({name: "Customer Service Rep", abilities: ["handle_complaints"], constraints: ["limited_access"]})
define_goal({name: "Handle Customer Complaints", ...})
assign_goal_to_actor(actor_id, goal_id)

// After (1 call):
introduce_human_actor({
  name: "Customer Service Rep",
  responsibilities: ["Handle Customer Complaints"],
  constraints: ["limited_access"]
})
```

---

#### `introduce_system_actor`
**Purpose:** Define an external system, service, or automated component.

**Parameters:**
```typescript
{
  name: string,                    // "Payment Gateway", "Email Service"
  purpose: string,                 // "Process credit card payments"
  interfaces?: string[],           // ["REST API", "Webhook callbacks"]
  capabilities?: string[],         // ["Charge card", "Refund", "Tokenize"]
  constraints?: string[],          // ["Rate limited to 100/min"]
}
```

**Behavior:**
- Creates actor with technical metadata
- Capabilities → abilities
- Auto-infers goal from purpose if mentioned
- Tags as system vs human for visualization (different icon)

**Example:**
```javascript
introduce_system_actor({
  name: "Stripe Payment Gateway",
  purpose: "Process payments securely",
  capabilities: ["charge_card", "create_refund", "verify_3ds"],
  constraints: ["requires_api_key", "PCI_compliant_environment"]
})
```

---

#### `grant_ability_to_actor`
**Purpose:** Add a capability to an existing (or new) actor.

**Parameters:**
```typescript
{
  actor_name: string,              // "Sarah"
  ability: string,                 // "approve_budgets"
  rationale?: string,              // "Promoted to CFO role"
}
```

**Behavior:**
- Find actor by name (case-insensitive), create if not exists
- Add ability to abilities array (idempotent - no duplicates)
- Log rationale in updated_at metadata

**Example:**
```javascript
grant_ability_to_actor({
  actor_name: "Sarah",
  ability: "access_financial_reports",
  rationale: "Promoted to CFO"
})
```

---

### Category 2: Goal & Objective Management

#### `establish_business_objective`
**Purpose:** Define a desired outcome or business goal.

**Parameters:**
```typescript
{
  name: string,                    // "Complete Purchase"
  owner_name: string,              // "Customer" (actor name)
  success_criteria?: string[],     // ["Payment confirmed", "Receipt emailed"]
  priority?: 'low' | 'medium' | 'high',
  depends_on?: string[],           // Names of prerequisite goals
}
```

**Behavior:**
- Find or create goal by name
- Find or create owner actor by name
- Link goal to owner (assign_to)
- If depends_on specified: find/create those goals, add to metadata
- Return goal with owner info embedded

**Example:**
```javascript
establish_business_objective({
  name: "Complete Monthly Close",
  owner_name: "Accountant",
  success_criteria: [
    "All transactions reconciled",
    "Reports generated by 5th",
    "P&L variance < 2%"
  ],
  priority: "high",
  depends_on: ["Reconcile All Accounts"]
})
```

---

#### `decompose_goal_into_tasks`
**Purpose:** Break a goal down into concrete tasks.

**Parameters:**
```typescript
{
  goal_name: string,               // "Complete Purchase"
  tasks: Array<{
    name: string,                  // "Validate Payment"
    description?: string,
    required_abilities?: string[], // ["process_credit_card"]
  }>
}
```

**Behavior:**
- Find or create goal by name
- For each task: find or create task by name
- Link tasks to goal (task.goal_ids)
- Infer required_abilities from task name if not specified (e.g., "Validate Payment" → "validate_payment")

**Example:**
```javascript
decompose_goal_into_tasks({
  goal_name: "Complete Purchase",
  tasks: [
    {name: "Add Items to Cart", required_abilities: ["browse_catalog"]},
    {name: "Enter Payment Info", required_abilities: ["access_payment_form"]},
    {name: "Confirm Order", required_abilities: ["submit_order"]}
  ]
})
```

---

### Category 3: Workflow & Task Definition

#### `define_workflow`
**Purpose:** Model a multi-step process with tasks and interactions.

**Parameters:**
```typescript
{
  name: string,                    // "Customer Checkout Flow"
  actor_name: string,              // "Online Customer"
  goal_name: string,               // "Complete Purchase"
  steps: Array<{
    task_name: string,             // "Enter Payment"
    interactions?: string[],       // ["Fill payment form", "POST /checkout"]
    outcome?: string,              // "Payment authorized"
  }>
}
```

**Behavior:**
- Find or create actor, goal, tasks, interactions (by name)
- Create journey linking all entities
- Auto-populate journey steps with task references
- Return complete workflow structure

**Example:**
```javascript
define_workflow({
  name: "First-Time Customer Purchase",
  actor_name: "New Customer",
  goal_name: "Complete First Order",
  steps: [
    {
      task_name: "Create Account",
      interactions: ["Fill registration form", "POST /users"],
      outcome: "Account created, logged in"
    },
    {
      task_name: "Add Items to Cart",
      interactions: ["Click Add to Cart", "POST /cart"],
      outcome: "Cart contains 3 items"
    },
    {
      task_name: "Complete Checkout",
      interactions: ["Enter payment", "POST /orders"],
      outcome: "Order placed, confirmation sent"
    }
  ]
})
```

---

#### `record_interaction_sequence`
**Purpose:** Define the atomic steps that compose a task.

**Parameters:**
```typescript
{
  task_name: string,               // "Submit Order"
  interactions: Array<{
    name: string,                  // "POST /api/orders"
    description?: string,
    preconditions?: string[],      // ["Cart not empty", "User authenticated"]
    effects?: string[],            // ["Order created", "Inventory updated"]
  }>
}
```

**Behavior:**
- Find or create task by name
- For each interaction: find or create by name
- Add interactions to task.composed_of
- Validate that preconditions of step N are satisfied by effects of steps 1..N-1 (warn if not)

**Example:**
```javascript
record_interaction_sequence({
  task_name: "Process Refund",
  interactions: [
    {
      name: "Verify refund eligibility",
      preconditions: ["Order exists", "Within refund window"],
      effects: ["Eligibility confirmed"]
    },
    {
      name: "POST /refunds",
      preconditions: ["Eligibility confirmed", "Payment method on file"],
      effects: ["Refund initiated", "Email queued"]
    },
    {
      name: "Update order status",
      preconditions: ["Refund initiated"],
      effects: ["Order marked as refunded"]
    }
  ]
})
```

---

### Category 4: Query & Discovery

#### `what_can_actor_do`
**Purpose:** Discover all capabilities, goals, and tasks for an actor.

**Parameters:**
```typescript
{
  actor_name: string               // "Sarah"
}
```

**Returns:**
```typescript
{
  actor: Actor,
  abilities: string[],
  assigned_goals: Goal[],
  performable_tasks: Task[],       // Tasks actor has abilities for
  missing_abilities_for: {         // Tasks they can't do yet
    task: Task,
    missing: string[]
  }[]
}
```

**Example:**
```javascript
what_can_actor_do({actor_name: "Customer Service Rep"})
// Returns:
// {
//   actor: {name: "Customer Service Rep", ...},
//   abilities: ["access_crm", "issue_refunds", "escalate_cases"],
//   assigned_goals: [{name: "Resolve Customer Issues", ...}],
//   performable_tasks: [{name: "Issue Refund", ...}],
//   missing_abilities_for: [
//     {task: "Access Admin Panel", missing: ["admin_access"]}
//   ]
// }
```

---

#### `how_is_goal_achieved`
**Purpose:** Trace how a goal is accomplished.

**Parameters:**
```typescript
{
  goal_name: string                // "Complete Purchase"
}
```

**Returns:**
```typescript
{
  goal: Goal,
  assigned_to: Actor[],
  tasks: Task[],
  interactions: Interaction[],
  journeys: Journey[],             // Example flows achieving this goal
  gaps: Gap[]                      // Missing pieces
}
```

**Example:**
```javascript
how_is_goal_achieved({goal_name: "Generate Monthly Report"})
// Returns full dependency tree showing:
// - Who can do it (actors)
// - How to do it (tasks → interactions)
// - Example scenarios (journeys)
// - What's missing (gaps)
```

---

#### `show_workflow`
**Purpose:** Get detailed view of a journey/workflow.

**Parameters:**
```typescript
{
  workflow_name: string            // "Customer Checkout Flow"
}
```

**Returns:**
```typescript
{
  journey: Journey,
  actor: Actor,
  goals: Goal[],
  steps: Array<{
    task: Task,
    interactions: Interaction[],
    outcome: string
  }>,
  precondition_violations: string[], // Gaps in flow logic
}
```

---

### Category 5: Model Health & Maintenance

#### `find_duplicates`
**Purpose:** Identify entities with identical or very similar names.

**Parameters:**
```typescript
{
  type?: 'actor' | 'goal' | 'task' | 'interaction',  // Optional filter
  similarity_threshold?: number    // 0-100, default 85
}
```

**Returns:**
```typescript
Array<{
  entities: Entity[],              // Grouped duplicates
  similarity_score: number,
  suggestion: 'merge' | 'rename' | 'keep_separate'
}>
```

**Example:**
```javascript
find_duplicates({type: 'actor'})
// Returns:
// [
//   {
//     entities: [
//       {id: "uuid1", name: "Payment Gateway", ...},
//       {id: "uuid2", name: "payment gateway", ...}
//     ],
//     similarity_score: 100,
//     suggestion: 'merge'
//   }
// ]
```

---

#### `merge_entities`
**Purpose:** Combine duplicate entities into one.

**Parameters:**
```typescript
{
  type: 'actor' | 'goal' | 'task' | 'interaction',
  keep_id: string,                 // UUID to keep
  remove_ids: string[],            // UUIDs to merge and delete
  merge_strategy?: {
    abilities: 'union' | 'keep_primary',
    constraints: 'union' | 'keep_primary',
    description: 'concat' | 'keep_primary'
  }
}
```

**Behavior:**
- Merge attributes according to strategy
- Update all references (goal.assigned_to, task.composed_of, etc.) to point to keep_id
- Delete merged entities
- Return merged entity

---

#### `validate_model`
**Purpose:** Comprehensive model health check.

**Parameters:**
```typescript
{
  checks?: Array<'duplicates' | 'gaps' | 'orphans' | 'cycles' | 'abilities'>
}
```

**Returns:**
```typescript
{
  duplicates: Array<{...}>,        // From find_duplicates
  gaps: Gap[],                     // Missing references
  orphans: {                       // Entities not referenced anywhere
    actors: Actor[],
    goals: Goal[],
    tasks: Task[],
    interactions: Interaction[]
  },
  cycles: Array<{                  // Circular dependencies
    type: 'goal_depends_on_itself',
    entities: Entity[]
  }>,
  ability_mismatches: Array<{      // Tasks requiring abilities actors don't have
    actor: Actor,
    task: Task,
    missing: string[]
  }>
}
```

---

## Migration Strategy

### Phase 1: Parallel Implementation (Weeks 1-2)
1. Implement 5 core compositional tools alongside existing CRUD tools:
   - `introduce_human_actor`
   - `introduce_system_actor`
   - `establish_business_objective`
   - `define_workflow`
   - `what_can_actor_do`

2. Add tool descriptions encouraging use of new tools for new models

3. Keep all existing CRUD tools unchanged for backward compatibility

### Phase 2: Data Collection (Weeks 3-6)
1. Monitor which tools are used in practice
2. Collect metrics:
   - Tool call frequency
   - Duplication rates (new tools vs old)
   - User feedback on API clarity
   - Conversation flow naturalness

### Phase 3: Expand Coverage (Weeks 7-10)
1. Implement remaining compositional tools based on usage data
2. Add tool descriptions noting "Prefer X (compositional) over Y (CRUD) for new work"
3. Create migration guide for converting old models to new API

### Phase 4: Deprecation (Weeks 11-14)
1. Mark CRUD tools as deprecated in descriptions
2. Implement automatic suggestions: "Consider using `establish_business_objective` instead"
3. Maintain CRUD tools for backward compatibility but hide from primary documentation

### Phase 5: Cleanup (Optional, Month 4+)
1. If adoption is high (>90%), consider removing CRUD tools
2. Provide conversion tool to migrate old saved models
3. Major version bump (v2.0.0)

---

## Implementation Checklist

### Core Infrastructure
- [ ] Add name-based lookup functions to `src/lib/queries.ts` (✅ Done in Step 1)
- [ ] Create `src/lib/compositional.ts` with helper functions:
  - [ ] `findOrCreateActor(name, defaults)`
  - [ ] `findOrCreateGoal(name, defaults)`
  - [ ] `linkActorToGoal(actorName, goalName)`
  - [ ] `decomposeGoalIntoTasks(goalName, taskDefs)`
  - [ ] `buildWorkflow(actorName, goalName, steps)`

### Tool Registration (in `src/mcp-server/tools.ts`)
- [ ] Category 1 (Actor Introduction):
  - [ ] `introduce_human_actor`
  - [ ] `introduce_system_actor`
  - [ ] `grant_ability_to_actor`

- [ ] Category 2 (Goals):
  - [ ] `establish_business_objective`
  - [ ] `decompose_goal_into_tasks`

- [ ] Category 3 (Workflows):
  - [ ] `define_workflow`
  - [ ] `record_interaction_sequence`

- [ ] Category 4 (Query):
  - [ ] `what_can_actor_do`
  - [ ] `how_is_goal_achieved`
  - [ ] `show_workflow`

- [ ] Category 5 (Maintenance):
  - [ ] `find_duplicates`
  - [ ] `merge_entities`
  - [ ] `validate_model`

### Testing
- [ ] Add test scenario using only compositional tools
- [ ] Compare tool call count vs CRUD approach
- [ ] Verify duplication prevention
- [ ] Test idempotency (call same tool 3x, verify single entity)

### Documentation
- [ ] Update `README.md` with compositional API examples
- [ ] Update `SPEC.md` tool catalog
- [ ] Update `CLAUDE.md` with preferred patterns
- [ ] Create `MIGRATION.md` guide for transitioning models

---

## Expected Outcomes

### Quantitative Improvements
- **60-80% reduction** in tool calls for common scenarios
- **90%+ reduction** in duplication (from ~20-40% to <5%)
- **50% reduction** in "entity not found" errors
- **3x faster** modeling sessions (fewer round-trips)

### Qualitative Improvements
- More natural conversation flow with LLMs
- Reduced cognitive load on ensemble teams
- Better alignment with domain language
- Self-documenting tool names and parameters
- Easier onboarding (fewer tools to learn)

### Example Impact

**Modeling a simple e-commerce checkout flow:**

| Metric | CRUD Tools (Current) | Compositional Tools (Proposed) |
|--------|---------------------|-------------------------------|
| Tool calls | 18 | 4 |
| Lines in conversation | ~50 | ~15 |
| Entities created | 12 | 12 |
| Duplicates (typical) | 2-3 | 0 |
| UUIDs to track | 12 | 0 |
| Time (estimated) | 8-10 min | 3-4 min |

---

## Open Questions

1. **Naming conflicts:** How to handle when user says "add another Payment Gateway" (intentional duplicate vs typo)?
   - **Proposal:** Ask for clarification: "Actor 'Payment Gateway' already exists. Did you mean to: (a) Update existing, (b) Create 'Payment Gateway 2', (c) Something else?"

2. **Partial matches:** "payment gateway" vs "Payment Gateway API" - same or different?
   - **Proposal:** Fuzzy matching with confirmation: "Found 'Payment Gateway' (85% match). Use existing or create new?"

3. **Bulk operations:** Should we support creating multiple actors at once?
   - **Proposal:** Yes, add `introduce_team({members: [...], shared_goal: "..."})` for common pattern

4. **Undo/merge:** If LLM creates duplicate despite prevention, how to fix?
   - **Proposal:** `merge_entities` tool (Category 5) handles this

5. **Visualization impact:** Do compositional tools change what's displayed?
   - **Proposal:** No change to visualization - same entities, just different creation path

---

## Appendix: Full Example Comparison

### Scenario: Model a bookkeeping system with 2 actors, 2 goals, 2 tasks, 4 interactions

#### Current CRUD Approach (11 tool calls):
```javascript
1. define_actor({name: "Accountant", abilities: ["review_financials", "approve_reports"], ...})
   → {id: "uuid-a1", ...}

2. define_actor({name: "Bookkeeper", abilities: ["record_transactions", "reconcile"], ...})
   → {id: "uuid-a2", ...}

3. define_goal({name: "Monthly Financial Reporting", priority: "high", ...})
   → {id: "uuid-g1", ...}

4. assign_goal_to_actor({actor_id: "uuid-a1", goal_id: "uuid-g1"})

5. define_goal({name: "Daily Transaction Recording", priority: "high", ...})
   → {id: "uuid-g2", ...}

6. assign_goal_to_actor({actor_id: "uuid-a2", goal_id: "uuid-g2"})

7. define_task({name: "Reconcile Accounts", required_abilities: ["reconcile"], goal_ids: ["uuid-g2"]})
   → {id: "uuid-t1", ...}

8. define_interaction({name: "Match Transactions", preconditions: [...], effects: [...]})
   → {id: "uuid-i1", ...}

9. define_interaction({name: "Verify Balance", preconditions: [...], effects: [...]})
   → {id: "uuid-i2", ...}

10. add_interaction_to_task({task_id: "uuid-t1", interaction_id: "uuid-i1"})

11. add_interaction_to_task({task_id: "uuid-t1", interaction_id: "uuid-i2"})
```

**Problems:**
- Must track 7 UUIDs across 11 calls
- Easy to assign wrong ID or forget a link
- No duplication prevention
- Verbose and error-prone

---

#### Proposed Compositional Approach (3 tool calls):
```javascript
1. introduce_human_actor({
     name: "Accountant",
     responsibilities: ["Monthly Financial Reporting"],
     abilities: ["review_financials", "approve_reports"]
   })
   // Internally: creates actor + goal "Monthly Financial Reporting" + links them

2. introduce_human_actor({
     name: "Bookkeeper",
     responsibilities: ["Daily Transaction Recording"],
     abilities: ["record_transactions", "reconcile_accounts"]
   })
   // Internally: creates actor + goal + links

3. record_interaction_sequence({
     task_name: "Reconcile Accounts",
     interactions: [
       {name: "Match Transactions", preconditions: ["bank_statement_imported"], effects: ["transactions_matched"]},
       {name: "Verify Balance", preconditions: ["transactions_matched"], effects: ["balance_verified"]}
     ]
   })
   // Internally: creates task + 2 interactions + links to goal
```

**Benefits:**
- Zero UUIDs to track
- 3 calls instead of 11 (73% reduction)
- Automatic name-based deduplication
- Natural language flow
- Fewer opportunities for error

---

## Conclusion

The domain-oriented compositional tools represent a fundamental shift from "how to build the model" (CRUD) to "what to model" (domain concepts). This approach:

1. **Eliminates duplication** by design through find-or-create semantics
2. **Reduces complexity** with 60-80% fewer tool calls
3. **Improves conversation flow** with natural, intention-revealing names
4. **Maintains backward compatibility** through parallel implementation
5. **Enables gradual migration** with clear phases and metrics

Implementation should proceed incrementally (Step 1 → Step 2 → Step 3) with each phase validated through real ensemble coding sessions before moving forward.

The current Step 1 implementation (name-based lookup tools) provides the foundation for this compositional approach and can coexist with CRUD tools during the transition period.
