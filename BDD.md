# Behavior-Driven Scenarios (Phase 1)

Document scope
- Audience: advanced developers building tests for this repository.
- Goal: plain-English scenarios describing current tool behavior so they can be trivially translated into shell scripts (curl/jq) or other harnesses.
- Current tools (MCP): define_actor, define_goal, delete_actor, get_full_model
- Convenience HTTP endpoints (:3001/test) mirror a subset of those operations for rapid testing.

Conventions used below
- “Simple Test API” refers to http://localhost:3001/test endpoints.
- “MCP endpoint” refers to http://localhost:3000/mcp using FastMCP httpStream JSON-RPC envelopes.
- Placeholders in ALL_CAPS (e.g., ACTOR_ID) should be captured from previous responses.
- Timing expectation: visualization updates within ~1 second after each mutation.

Background
- Given the Electron app is running (npm start)
- And the visualization window is open
- And the MCP server is listening on http://localhost:3000/mcp
- And the Simple Test API is listening on http://localhost:3001/test
- Optionally, when using the Simple Test API, reset the model: POST /test/reset

Feature: Define an actor
- Scenario: Create a new actor
  - Given no actor with the name "Admin" exists yet
  - When I create an actor with
    - name: "Admin"
    - description: "System administrator"
    - abilities: at least ["manage_users"]
    - constraints: any array
  - Then the API returns success and an actor object with a UUID id
  - And the visualization shows a blue circle labeled "Admin" within ~1s
  - And the header counters increment Actors by 1

  - Simple Test API mapping
    - Endpoint: POST /test/define_actor
    - Body: { name, description, abilities[], constraints[] }

  - MCP endpoint mapping
    - Tool: define_actor
    - Envelope: JSON-RPC 2.0, method: tools/call, name: "define_actor"

Feature: Define a goal linked to an existing actor
- Scenario: Create a goal assigned to an actor
  - Given an existing ACTOR_ID captured from the actor creation response
  - When I create a goal with
    - name: "User Management"
    - description: any string
    - success_criteria: a non-empty array (e.g., ["Users can be created"])
    - priority: "high" | "medium" | "low"
    - assigned_to: [ACTOR_ID]
  - Then the API returns success and a goal object with a UUID id
  - And the visualization shows a green square labeled with the goal name within ~1s
  - And a gray solid edge connects the actor node to the goal node
  - And header counters increment Goals by 1

  - Simple Test API mapping
    - Endpoint: POST /test/define_goal
    - Body: { name, description, success_criteria[], priority, assigned_to: [ACTOR_ID] }

  - MCP endpoint mapping
    - Tool: define_goal
    - Note: parameters.assigned_to requires UUID strings (Zod uuid). Use a syntactically valid UUID for existing actors.

Feature: Define a goal that references a missing actor (gap)
- Scenario: Create a goal assigned to a non-existent actor
  - Given no actor exists with the id MISSING_ACTOR_ID
  - When I create a goal with assigned_to: [MISSING_ACTOR_ID]
  - Then the API returns success and a goal object
  - And the visualization shows the goal node
  - And a red dashed edge connects the goal to a red dashed circle gap node labeled "?" (expected_type: actor)
  - And header counters show Gaps incremented appropriately

  - Simple Test API mapping
    - Endpoint: POST /test/define_goal
    - Body: { ..., assigned_to: ["any-string-id"] } (no UUID requirement at this layer)

  - MCP endpoint mapping
    - Tool: define_goal
    - Important: assigned_to requires UUID strings. To create a gap via MCP, provide a syntactically valid UUID that does not correspond to any existing actor.

Feature: Delete an actor and preserve goals as gaps
- Scenario: Deleting an actor converts its goal edges to gaps
  - Given an existing actor ACTOR_ID and at least one goal assigned_to contains ACTOR_ID
  - When I delete the actor by id
  - Then the API returns success
  - And the actor node fades out and disappears (~300ms transition)
  - And each edge from that actor to its goals becomes a red dashed gap edge
  - And the goal nodes remain visible
  - And header counters decrement Actors and increment Gaps as needed

  - Simple Test API mapping
    - Endpoint: POST /test/delete_actor
    - Body: { id: ACTOR_ID }

  - MCP endpoint mapping
    - Tool: delete_actor

Feature: Retrieve the full model for assertions
- Scenario: Get the complete model and computed gaps
  - Given the model may contain actors, goals, and gaps
  - When I request the full model
  - Then I receive all persisted entities (actors, goals, tasks, interactions, questions, journeys)
  - And I receive a computed gaps collection when using the MCP tool
  - And I can assert counts match what the visualization shows

  - Simple Test API mapping
    - Endpoint: GET /test/model
    - Returns persisted entities only (no computed gaps in this endpoint)

  - MCP endpoint mapping
    - Tool: get_full_model
    - Returns persisted entities plus gaps[] computed from missing references

Feature: Reset model for deterministic tests (Simple Test API only)
- Scenario: Clear all data quickly between runs
  - Given I am preparing to run an acceptance script
  - When I POST /test/reset
  - Then all entities across types are deleted
  - And the visualization clears to an empty canvas (after ~1s as events propagate)

End-to-end narrative: Bookkeeping screenplay
- Scenario: Model the bookkeeping conversation and confirm final gaps
  - Given I start from a reset model
  - When I define actors: Jennifer (Accountant), Maria (Bookkeeper), AP System (System), Sarah (Owner)
  - And I define goals with priorities and assignments
    - Accurate Daily Transaction Recording → Maria (HIGH)
    - Monthly Financial Reporting → Maria + Jennifer (HIGH)
    - Tax Compliance → Jennifer (HIGH)
    - Vendor Payment Processing → AP System (MEDIUM)
    - Annual Audit Preparation → External Auditor (MEDIUM, missing actor → gap)
    - Budget Planning & Analysis → Sarah + CFO (HIGH, missing actor → gap)
  - And I delete Maria (Bookkeeper)
  - Then the final state contains
    - Actors: Jennifer, AP System, Sarah (3)
    - Goals: 6
    - Gaps: 3 total (2 due to deleted Maria assignments, 1 external auditor, 1 CFO)
  - And the visualization shows corresponding green squares (goals), blue circles (remaining actors), and red dashed gap nodes/edges

  - Implementation notes
    - Simple Test API: can assign non-UUID placeholder ids for external roles to induce gaps
    - MCP endpoint: use syntactically valid UUIDs for placeholder assignments to satisfy Zod; ensure no matching actor exists

Translation guidance for shell scripts
- Capture IDs with jq (e.g., ACTOR_ID=$(... | jq -r '.data.id'))
- Sleep 1-3 seconds between steps in demos to make transitions observable
- For MCP, wrap tool calls in the provided JSON-RPC envelope (see test-mcp.sh for concrete examples)
- For deterministic tests, always call /test/reset (Simple API) before starting a sequence

Out-of-scope for Phase 1
- CRUD for task/interaction/question/journey (planned for Phase 2+)
- Composition and query tools (planned)
- Non-happy-path validation tests (e.g., schema errors) beyond UUID note for MCP assigned_to
