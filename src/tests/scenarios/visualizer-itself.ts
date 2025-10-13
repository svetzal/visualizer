/**
 * Visualizer Itself Scenario
 *
 * Models the Screenplay Visualizer itself, showing:
 * - Who the audience is (ensemble team members + Claude)
 * - What they want to achieve (goals)
 * - How the system works (tasks and interactions)
 *
 * This is useful for:
 * - Demonstrating the visualizer with a real use case
 * - Understanding the system's purpose and audience
 * - Testing the full graph with multiple entity types and relationships
 */

import { MCPClient } from '../harness/mcp-client.js';
import { ScenarioRunner, Actor, Goal, getHarnessOptions } from '../harness/runner.js';

type Task = { id: string; name: string; description: string; required_abilities: string[]; composed_of: string[]; goal_ids: string[] };
type Interaction = { id: string; name: string; description: string; preconditions: string[]; effects: string[] };

export default async function run(client: MCPClient) {
  const state = {
    actors: {
      facilitator: undefined as Actor | undefined,
      developer: undefined as Actor | undefined,
      productOwner: undefined as Actor | undefined,
      designer: undefined as Actor | undefined,
      claude: undefined as Actor | undefined,
    },
    goals: {
      sharedUnderstanding: undefined as Goal | undefined,
      systemBehavior: undefined as Goal | undefined,
      identifyGaps: undefined as Goal | undefined,
      validateJourneys: undefined as Goal | undefined,
      captureConversation: undefined as Goal | undefined,
      generateCode: undefined as Goal | undefined,
    },
    interactions: {
      teamDescribes: undefined as Interaction | undefined,
      claudeCreates: undefined as Interaction | undefined,
      vizUpdates: undefined as Interaction | undefined,
      gapAppears: undefined as Interaction | undefined,
      teamDiscusses: undefined as Interaction | undefined,
      gapResolves: undefined as Interaction | undefined,
    },
    tasks: {
      processNL: undefined as Task | undefined,
      maintainViz: undefined as Task | undefined,
      surfaceGaps: undefined as Task | undefined,
      guideResolution: undefined as Task | undefined,
      validate: undefined as Task | undefined,
    },
  };

  await new ScenarioRunner('Visualizer Itself: Audience & Purpose', getHarnessOptions())
    // Define the audience (actors)
    .step('define actors: ensemble team members', async () => {
      const facilitator = await client.callTool<{ success: boolean; data: Actor }>('define_actor', {
        name: 'Ensemble Facilitator',
        description: 'Person guiding the ensemble coding session, keeping conversation flowing and ensuring all voices are heard',
        abilities: ['facilitate_discussion', 'identify_blockers', 'manage_time', 'surface_gaps', 'guide_conversation'],
        constraints: ['needs_projected_display', 'limited_to_verbal_input'],
      });
      state.actors.facilitator = facilitator.data;

      const developer = await client.callTool<{ success: boolean; data: Actor }>('define_actor', {
        name: 'Software Developer',
        description: 'Team member who will implement the system, needs clear understanding of behavior and technical requirements',
        abilities: ['write_code', 'understand_technical_details', 'identify_edge_cases', 'ask_clarifying_questions'],
        constraints: ['needs_concrete_examples', 'focuses_on_implementation'],
      });
      state.actors.developer = developer.data;

      const productOwner = await client.callTool<{ success: boolean; data: Actor }>('define_actor', {
        name: 'Product Owner',
        description: 'Represents business needs and user perspective, validates that the specification matches intended behavior',
        abilities: ['define_business_rules', 'clarify_requirements', 'prioritize_features', 'validate_behavior'],
        constraints: ['limited_technical_knowledge', 'must_balance_scope'],
      });
      state.actors.productOwner = productOwner.data;

      const designer = await client.callTool<{ success: boolean; data: Actor }>('define_actor', {
        name: 'UX Designer',
        description: 'Designs user interfaces and experiences, needs to understand user journeys and interactions',
        abilities: ['design_interfaces', 'map_user_journeys', 'identify_usability_issues', 'create_wireframes'],
        constraints: ['needs_user_context', 'focuses_on_experience'],
      });
      state.actors.designer = designer.data;

      const claude = await client.callTool<{ success: boolean; data: Actor }>('define_actor', {
        name: 'Claude Code',
        description: 'AI assistant processing the team\'s conversation, building the model in real-time, and generating code',
        abilities: ['process_natural_language', 'create_model_entities', 'identify_relationships', 'generate_code', 'ask_clarifying_questions'],
        constraints: ['requires_clear_conversation', 'cannot_read_minds', 'needs_explicit_relationships'],
      });
      state.actors.claude = claude.data;
    })

    // Define what they want to achieve (goals)
    .step('define goals: what each actor wants', async () => {
      const sharedUnderstanding = await client.callTool<{ success: boolean; data: Goal }>('define_goal', {
        name: 'Maintain Shared Understanding',
        description: 'Keep the entire team aligned on what is being discussed and ensure everyone sees the growing model',
        success_criteria: ['All team members can see the visualization', 'Conversation stays focused on current topic', 'Gaps are surfaced immediately', 'Team can reference visual during discussion'],
        priority: 'high',
        assigned_to: [state.actors.facilitator!.id],
      });
      state.goals.sharedUnderstanding = sharedUnderstanding.data;

      const systemBehavior = await client.callTool<{ success: boolean; data: Goal }>('define_goal', {
        name: 'Understand System Behavior',
        description: 'Get clarity on what the system should do, who interacts with it, and how behaviors connect',
        success_criteria: ['All actors and their abilities are defined', 'All interactions are documented', 'Edge cases are identified', 'Dependencies are clear'],
        priority: 'high',
        assigned_to: [state.actors.developer!.id, state.actors.productOwner!.id],
      });
      state.goals.systemBehavior = systemBehavior.data;

      const identifyGaps = await client.callTool<{ success: boolean; data: Goal }>('define_goal', {
        name: 'Identify Knowledge Gaps',
        description: 'Surface what hasn\'t been discussed yet - missing actors, undefined interactions, unlinked tasks',
        success_criteria: ['Gaps are visible in real-time', 'Team notices missing pieces', 'Questions are asked to fill gaps', 'No orphaned references remain'],
        priority: 'high',
        assigned_to: [state.actors.facilitator!.id, state.actors.claude!.id],
      });
      state.goals.identifyGaps = identifyGaps.data;

      const validateJourneys = await client.callTool<{ success: boolean; data: Goal }>('define_goal', {
        name: 'Validate User Journeys',
        description: 'Ensure the modeled behavior matches actual user needs and flows make sense',
        success_criteria: ['User journeys are complete', 'Interactions are in logical order', 'Preconditions and effects make sense', 'Users can accomplish their goals'],
        priority: 'high',
        assigned_to: [state.actors.designer!.id, state.actors.productOwner!.id],
      });
      state.goals.validateJourneys = validateJourneys.data;

      const captureConversation = await client.callTool<{ success: boolean; data: Goal }>('define_goal', {
        name: 'Capture Conversation as Structured Model',
        description: 'Convert natural language discussion into formal entities, relationships, and behaviors in real-time',
        success_criteria: ['All mentioned actors are created', 'Goals are linked to actors', 'Tasks decompose into interactions', 'Model reflects current conversation state'],
        priority: 'high',
        assigned_to: [state.actors.claude!.id],
      });
      state.goals.captureConversation = captureConversation.data;

      const generateCode = await client.callTool<{ success: boolean; data: Goal }>('define_goal', {
        name: 'Generate Working Code',
        description: 'Transform the specification model into executable code that implements the discussed behavior',
        success_criteria: ['Code matches specification', 'All actors are implemented', 'All interactions work', 'Tests validate behavior'],
        priority: 'medium',
        assigned_to: [state.actors.claude!.id, state.actors.developer!.id],
      });
      state.goals.generateCode = generateCode.data;
    })

    // Define how the system works (interactions)
    .step('define interactions: atomic actions', async () => {
      const teamDescribes = await client.callTool<{ success: boolean; data: Interaction }>('define_interaction', {
        name: 'Team Member Describes Actor',
        description: 'Someone in the ensemble says "We have a customer who can browse products and add items to cart"',
        preconditions: ['ensemble_session_active', 'conversation_flowing'],
        effects: ['actor_mentioned', 'abilities_described', 'claude_hears_description'],
      });
      state.interactions.teamDescribes = teamDescribes.data;

      const claudeCreates = await client.callTool<{ success: boolean; data: Interaction }>('define_interaction', {
        name: 'Claude Creates Entity',
        description: 'Claude Code calls MCP tool to create actor, goal, task, or interaction based on conversation',
        preconditions: ['entity_mentioned_in_conversation', 'sufficient_detail_provided'],
        effects: ['entity_created_in_model', 'storage_updated', 'change_event_emitted'],
      });
      state.interactions.claudeCreates = claudeCreates.data;

      const vizUpdates = await client.callTool<{ success: boolean; data: Interaction }>('define_interaction', {
        name: 'Visualization Updates',
        description: 'D3 force layout animates new node appearing on projected screen within 1 second',
        preconditions: ['change_event_emitted', 'renderer_listening'],
        effects: ['new_node_visible', 'layout_recomputed', 'team_sees_update'],
      });
      state.interactions.vizUpdates = vizUpdates.data;

      const gapAppears = await client.callTool<{ success: boolean; data: Interaction }>('define_interaction', {
        name: 'Gap Appears',
        description: 'Red dashed circle with \'?\' appears when entity references something not yet defined',
        preconditions: ['entity_references_missing_id', 'gap_detected'],
        effects: ['gap_node_rendered', 'team_notices_gap', 'discussion_triggered'],
      });
      state.interactions.gapAppears = gapAppears.data;

      const teamDiscusses = await client.callTool<{ success: boolean; data: Interaction }>('define_interaction', {
        name: 'Team Discusses Gap',
        description: 'Facilitator or team member points at screen and says "What\'s that red node? We haven\'t defined that yet"',
        preconditions: ['gap_visible', 'team_looking_at_visualization'],
        effects: ['gap_acknowledged', 'conversation_shifts_to_missing_concept', 'detail_added'],
      });
      state.interactions.teamDiscusses = teamDiscusses.data;

      const gapResolves = await client.callTool<{ success: boolean; data: Interaction }>('define_interaction', {
        name: 'Gap Resolves',
        description: 'Missing entity is defined, gap node morphs into real node with smooth transition',
        preconditions: ['missing_entity_created', 'same_uuid_used'],
        effects: ['gap_node_removed', 'real_node_appears', 'edges_reconnect', 'model_more_complete'],
      });
      state.interactions.gapResolves = gapResolves.data;
    })

    // Define tasks that compose interactions to achieve goals
    .step('define tasks: how goals are achieved', async () => {
      const processNL = await client.callTool<{ success: boolean; data: Task }>('define_task', {
        name: 'Process Natural Language into Model',
        description: 'Listen to conversation, identify entities and relationships, create them in real-time',
        required_abilities: ['process_natural_language', 'create_model_entities', 'identify_relationships'],
        composed_of: [state.interactions.teamDescribes!.id, state.interactions.claudeCreates!.id],
        goal_ids: [state.goals.captureConversation!.id],
      });
      state.tasks.processNL = processNL.data;

      const maintainViz = await client.callTool<{ success: boolean; data: Task }>('define_task', {
        name: 'Maintain Real-Time Visualization',
        description: 'Update projected display within 1 second of any model change so team stays synchronized',
        required_abilities: ['surface_gaps', 'guide_conversation'],
        composed_of: [state.interactions.claudeCreates!.id, state.interactions.vizUpdates!.id],
        goal_ids: [state.goals.sharedUnderstanding!.id],
      });
      state.tasks.maintainViz = maintainViz.data;

      const surfaceGaps = await client.callTool<{ success: boolean; data: Task }>('define_task', {
        name: 'Surface Knowledge Gaps',
        description: 'Detect when entities reference undefined concepts and make gaps visible to trigger discussion',
        required_abilities: ['identify_relationships', 'surface_gaps'],
        composed_of: [state.interactions.gapAppears!.id, state.interactions.teamDiscusses!.id],
        goal_ids: [state.goals.identifyGaps!.id],
      });
      state.tasks.surfaceGaps = surfaceGaps.data;

      const guideResolution = await client.callTool<{ success: boolean; data: Task }>('define_task', {
        name: 'Guide Gap Resolution',
        description: 'Help team notice gaps and facilitate discussion to fill in missing details',
        required_abilities: ['facilitate_discussion', 'identify_blockers', 'guide_conversation'],
        composed_of: [state.interactions.teamDiscusses!.id, state.interactions.gapResolves!.id],
        goal_ids: [state.goals.identifyGaps!.id, state.goals.sharedUnderstanding!.id],
      });
      state.tasks.guideResolution = guideResolution.data;

      const validate = await client.callTool<{ success: boolean; data: Task }>('define_task', {
        name: 'Validate System Completeness',
        description: 'Review model to ensure all actors, goals, tasks, and interactions are defined and connected',
        required_abilities: ['validate_behavior', 'identify_edge_cases', 'map_user_journeys'],
        composed_of: [],
        goal_ids: [state.goals.systemBehavior!.id, state.goals.validateJourneys!.id],
      });
      state.tasks.validate = validate.data;
    })

    // Verify the complete model
    .step('verify complete model', async () => {
      const response = await client.callTool<{ actors: any[]; goals: any[]; tasks: Task[]; interactions: any[] }>('get_full_model', {});

      // Check counts
      if (response.actors.length !== 5) throw new Error(`Expected 5 actors, got ${response.actors.length}`);
      if (response.goals.length !== 6) throw new Error(`Expected 6 goals, got ${response.goals.length}`);
      if (response.interactions.length !== 6) throw new Error(`Expected 6 interactions, got ${response.interactions.length}`);
      if (response.tasks.length !== 5) throw new Error(`Expected 5 tasks, got ${response.tasks.length}`);

      // Verify key relationships exist
      const maintainVizTask = response.tasks.find((t: Task) => t.name === 'Maintain Real-Time Visualization');
      if (!maintainVizTask) throw new Error('Maintain Real-Time Visualization task not found');
      if (!maintainVizTask.goal_ids.includes(state.goals.sharedUnderstanding!.id)) {
        throw new Error('Maintain Real-Time Visualization task should link to Maintain Shared Understanding goal');
      }

      const sharedGoal = response.goals.find((g: Goal) => g.name === 'Maintain Shared Understanding');
      if (!sharedGoal) throw new Error('Maintain Shared Understanding goal not found');
      if (!sharedGoal.assigned_to.includes(state.actors.facilitator!.id)) {
        throw new Error('Maintain Shared Understanding goal should be assigned to Facilitator');
      }

      console.log('✓ Model verified: 5 actors, 6 goals, 6 interactions, 5 tasks with proper relationships');
    })

    .run();
}
