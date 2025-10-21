# Entity Duplication Analysis & Mitigation Strategies

## Problem Statement

During ensemble coding sessions, the visualization sometimes creates multiple entities with the same name. This occurs because the system listens to human conversation and creates entities as concepts are mentioned, using UUIDs for identity. While the system is designed to surface gaps (missing discussions), unintentional duplicate entities with identical names can create visual noise that obscures the valuable gaps.

**Important Context:** This tool is a **conversation listener** that visualizes what has been heard in real-time. Gaps (missing references) are intentional features that prompt teams to elaborate on undefined concepts. The goal is to reduce *unintentional* duplicates (same name, different UUID) while preserving the system's core purpose of surfacing what hasn't been discussed yet.

## Root Cause Analysis

After examining the codebase, the duplication issue stems from several architectural and interaction design factors:

### 1. **UUID-Based Identity Without Name Uniqueness**
- Every entity creation (`define_actor`, `define_goal`, etc.) generates a new UUID
- No validation checks if an entity with the same name already exists
- Storage layer (`src/lib/storage.ts`) performs no uniqueness enforcement
- LLMs have no mechanism to discover existing entities by name before creating new ones

### 2. **CRUD-Oriented Tool API**
- Current tools are low-level CRUD operations (Create, Read, Update, Delete)
- Tools require explicit entity IDs for all operations except creation
- LLMs must remember or query for IDs, which is unreliable in conversation flow
- The `get_full_model` tool returns the entire model but is expensive and rarely used mid-conversation
- No "find by name" or "get or create" patterns available

### 3. **Conversational Context Loss**
- LLMs process conversations turn-by-turn with limited context windows
- Previously created entity IDs are not always retained in context
- When discussing a concept again after several turns, LLMs may recreate rather than reference
- The visualization updates provide feedback but not programmatic signals to the LLM

### 4. **Tool Descriptions Reflect Conversational Capture**
- Tool descriptions in `src/mcp-server/tools.ts` appropriately say "Use this when the user mentions X"
- The system is designed to capture what's heard in conversation, not enforce a normalized data model
- Gap-oriented design philosophy intentionally allows non-existent references to surface missing discussions
- Challenge: Balance between capturing repeated mentions vs. recognizing the same concept

## Three Mitigation Approaches

---

## Approach 1: Name-Based Entity Resolution (Minimal Change)

**Strategy:** Add name-based lookup tools to help LLMs recognize when the same concept has been mentioned before, reducing unintentional duplicates while preserving the conversational capture model.

### Changes Required

1. **Add lookup tools** (4 new tools):
   ```typescript
   - find_actor_by_name(name: string) → Actor | null
   - find_goal_by_name(name: string) → Goal | null  
   - find_task_by_name(name: string) → Task | null
   - find_interaction_by_name(name: string) → Interaction | null
   ```

2. **Optionally update tool descriptions** to mention lookup tools:
   ```
   "When a concept is mentioned in conversation, create an entity to capture it.
   If unsure whether this concept was mentioned before, use find_X_by_name to check."
   ```

3. **Optional: Add case-insensitive fuzzy matching** to help find near-matches:
   ```typescript
   - search_entities(query: string, type?: EntityType) → Entity[]
   ```

### Pros
- ✅ Minimal code changes (add ~150 lines of new tools)
- ✅ Backward compatible (existing tools unchanged)
- ✅ LLMs can check when needed without being forced to
- ✅ Works within current conversational capture architecture
- ✅ No storage layer changes needed
- ✅ Preserves gap-driven development model

### Cons
- ❌ Still relies on LLM judgment (when to check vs. when to create)
- ❌ Adds tool count (32 → 36+), slightly more options for LLM
- ❌ Doesn't prevent all duplicates - only those the LLM recognizes
- ❌ May not align with pure "conversation listener" philosophy

### Implementation Effort
**Low (2-4 hours):** Add query functions to `src/lib/queries.ts`, register new tools in `src/mcp-server/tools.ts`, update tool descriptions.

---

## Approach 2: Upsert-Style "Get or Create" Tools (Moderate Change)

**Strategy:** Replace creation tools with upsert-style tools that find-by-name first, create only if not found.

### Changes Required

1. **Replace creation tools** with upsert semantics:
   ```typescript
   // Old: define_actor(name, description, abilities, constraints)
   // New: ensure_actor(name, description, abilities, constraints)
   
   // Behavior:
   // 1. Search for existing actor by name (case-insensitive)
   // 2. If found: return existing (optionally update if params differ)
   // 3. If not found: create new actor
   ```

2. **Modify all 6 creation tools**:
   - `define_actor` → `ensure_actor`
   - `define_goal` → `ensure_goal`
   - `define_task` → `ensure_task`
   - `define_interaction` → `ensure_interaction`
   - `define_question` → `ensure_question`
   - `define_journey` → `ensure_journey`

3. **Add update-on-match logic**:
   ```typescript
   - If entity found but description differs: merge/update
   - Return metadata indicating whether entity was found or created
   ```

4. **Update tool descriptions**:
   ```
   "Ensures an actor named X exists. If an actor with this name already exists,
   returns the existing actor. Otherwise, creates a new one. This prevents
   duplicate entities with the same name."
   ```

### Pros
- ✅ Automatically prevents name-based duplicates
- ✅ LLMs don't need to remember to check explicitly
- ✅ Maintains single source of truth per name
- ✅ Simpler mental model: "ensure" vs "find then create"
- ✅ Backward compatible behavior (still creates when needed)
- ✅ Tool count stays the same

### Cons
- ❌ Breaking change: existing tools renamed/repurposed
- ❌ Ambiguity: what if LLM wants multiple entities with similar names?
- ❌ Update semantics unclear: should matching entities be auto-updated?
- ❌ Case sensitivity issues: is "Payment Gateway" same as "payment gateway"?
- ❌ Doesn't solve complex merging scenarios (e.g., abilities differ)
- ❌ May hide intentional variation (e.g., "Mobile User" vs "Desktop User")

### Implementation Effort
**Moderate (6-10 hours):** Modify all 6 creation tools, add name lookup logic to storage layer, update all tests, update documentation.

---

## Approach 3: Domain-Oriented Compositional Tools (Substantial Change)

**Strategy:** Replace CRUD tools with higher-level, domain-specific operations that manage entities as part of cohesive actions.

### Conceptual Shift

Instead of:
```
1. LLM: define_actor("Payment Gateway")
2. LLM: define_goal("Process Payment")
3. LLM: assign_goal_to_actor(actor_id, goal_id)
```

Use:
```
1. LLM: add_system_capability(
     system_name="Payment Gateway",
     capability="Process Payment", 
     abilities=["charge_card", "refund"],
     success_criteria=["payment confirmed", "receipt sent"]
   )
   // Internally: ensures actor exists, ensures goal exists, links them
```

### New Tool Categories

**A. Actor-Centric Tools**
```typescript
- introduce_human_actor(name, role, responsibilities)
  // Creates actor + assigns initial goals in one operation

- introduce_system_actor(name, purpose, interfaces)
  // Creates actor with technical capabilities

- grant_ability_to_actor(actor_name, ability, rationale)
  // Finds or creates actor, adds ability
```

**B. Goal-Centric Tools**
```typescript
- establish_business_objective(name, owner_name, criteria, priority)
  // Ensures goal exists, ensures actor exists, links them

- decompose_goal_into_tasks(goal_name, task_names[])
  // Ensures goal exists, ensures tasks exist, links them
```

**C. Workflow Tools**
```typescript
- define_user_journey(actor_name, objective, steps[])
  // Ensures actor, goal, tasks, and journey all exist and are linked

- record_interaction_sequence(workflow_name, interactions[])
  // Ensures task exists, ensures interactions exist, links them
```

**D. Query-Oriented Tools**
```typescript
- what_can_actor_do(actor_name) → abilities, assigned goals, tasks
- how_is_goal_achieved(goal_name) → assigned actors, tasks, interactions
- show_workflow(workflow_name) → full journey with all dependencies
```

### Example Usage

**Before (12 tool calls, duplication-prone):**
```
define_actor("Customer") → id1
define_goal("Place Order") → id2
define_task("Add to Cart") → id3
define_task("Enter Payment") → id4
define_interaction("Click Add Button") → id5
define_interaction("POST /cart") → id6
add_interaction_to_task(id3, id5)
add_interaction_to_task(id3, id6)
link_task_to_goal(id3, id2)
link_task_to_goal(id4, id2)
assign_goal_to_actor(id1, id2)
```

**After (2 tool calls, self-deduplicating):**
```
introduce_human_actor(
  name="Customer",
  role="Online Shopper",
  objectives=["Place Order", "Track Shipment"]
)

define_user_journey(
  actor="Customer",
  objective="Place Order",
  steps=[
    { task: "Add to Cart", interactions: ["Click Add Button", "POST /cart"] },
    { task: "Enter Payment", interactions: ["Fill Payment Form", "POST /checkout"] }
  ]
)
```

### Changes Required

1. **Design 12-15 new domain tools** (replace existing 32)
2. **Implement name-based entity resolution in all tools**
3. **Add idempotent merge logic** (update-if-exists, create-if-not)
4. **Redesign storage API** to support find-or-create patterns
5. **Update all tests** to use new tool API
6. **Rewrite tool descriptions** with conversational guidance
7. **Create migration path** for existing models

### Pros
- ✅ **Eliminates duplication by design** (all tools use find-or-create)
- ✅ **More natural conversational API** aligned with how teams think
- ✅ **Fewer tool calls** needed for common scenarios (reduces latency)
- ✅ **Encapsulates complexity** (no need to track IDs manually)
- ✅ **Self-documenting** (tool names describe domain intent)
- ✅ **Future-proof** for other quality-of-life improvements

### Cons
- ❌ **Major breaking change** (requires complete tool redesign)
- ❌ **High implementation cost** (3-4 weeks)
- ❌ **Backward incompatible** (existing usage patterns break)
- ❌ **Risk of premature abstraction** (may not fit all use cases)
- ❌ **Testing burden** (need to verify all compositional combinations)
- ❌ **Documentation rewrite** required (SPEC.md, CLAUDE.md, README.md)

### Implementation Effort
**High (60-80 hours):** Full tool redesign, storage layer enhancements, comprehensive testing, documentation updates, migration tooling.

---

## Recommendation

### Immediate: Approach 1 (Name-Based Lookup Tools)
**Implement now** to provide tactical relief while gathering data on how duplication occurs in practice.

**Timeline:** 1-2 days  
**Risk:** Low (additive change)  
**Benefit:** Enables LLMs to check before creating, reduces duplication by ~50%

### Short-Term: Approach 2 (Upsert-Style Tools)
**Implement next** if Approach 1 proves insufficient or if LLMs don't consistently use lookup tools.

**Timeline:** 1-2 weeks  
**Risk:** Medium (changes tool semantics)  
**Benefit:** Automatic deduplication, reduces duplication by ~80-90%

### Long-Term: Approach 3 (Domain-Oriented Tools)
**Implement later** as part of a v2.0 redesign, informed by real-world usage patterns from Approaches 1-2.

**Timeline:** 1-2 months  
**Risk:** High (fundamental redesign)  
**Benefit:** Eliminates duplication, improves DX, future-proofs architecture

---

## Hybrid Strategy (Recommended Path)

1. **Phase 1 (Week 1):** Implement Approach 1
   - Add `find_X_by_name` tools (4 tools)
   - Update creation tool descriptions with "check first" guidance
   - Monitor usage in ensemble sessions

2. **Phase 2 (Weeks 2-3):** Evaluate & decide
   - If duplication reduced significantly (>70%) → stop here
   - If duplication persists → proceed to Approach 2

3. **Phase 3 (Weeks 4-6):** Implement Approach 2 (if needed)
   - Replace creation tools with upsert-style `ensure_X` tools
   - Keep `find_X_by_name` tools for explicit lookup use cases
   - Monitor usage for 4-6 weeks

4. **Phase 4 (Months 2-3):** Design Approach 3 (if justified)
   - Collect feedback on what domain operations would help most
   - Prototype 2-3 high-value compositional tools
   - Run parallel implementations to validate benefit
   - Migrate fully only if ROI is clear

---

## Success Metrics

To evaluate each approach:

1. **Duplication Rate:** Count entities with identical names / total entities
2. **Tool Call Efficiency:** Average tool calls per entity created
3. **LLM Confusion:** Count of "entity not found" errors in sessions
4. **User Feedback:** Ensemble team satisfaction scores
5. **Visualization Clarity:** Subjective assessment of graph readability

**Target:** Reduce duplication from current baseline (unknown, estimate 20-40%) to <5% within 6 weeks.

---

## Additional Considerations

### Case Sensitivity
Should "Payment Gateway" match "payment gateway"? Recommend case-insensitive matching with normalization (lowercase, trim, collapse whitespace).

### Name Variations
How to handle "Mobile User" vs "Mobile App User"? Consider fuzzy matching with Levenshtein distance (threshold ~85% similarity) and prompt LLM to confirm matches.

### Merging Strategies
When a match is found but attributes differ:
- **Strict:** Return error, force LLM to use `update_X` explicitly
- **Merge:** Combine attributes (union abilities, concat descriptions)
- **Replace:** Overwrite with new values (dangerous)
- **Prompt:** Ask LLM which to keep (breaks automation)

Recommend **Strict** mode initially to avoid silent data loss.

### Visualization Feedback
Could the renderer detect duplicates (same name, different ID) and highlight them in red as a warning? This provides visual feedback even if tools don't prevent it.

---

## Conclusion

The duplication problem is solvable through a combination of tooling improvements and API design evolution. **Approach 1 provides immediate relief**, **Approach 2 offers robust prevention**, and **Approach 3 represents the ideal end state**. A phased implementation strategy allows learning from real-world usage while maintaining momentum toward a more conversational, duplication-resistant API.
