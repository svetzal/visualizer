import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  NodeTypes,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

import ActorNode from './nodes/ActorNode';
import GoalNode from './nodes/GoalNode';
import TaskNode from './nodes/TaskNode';
import InteractionNode from './nodes/InteractionNode';
import GapNode from './nodes/GapNode';

// Import model types
interface Actor {
  id: string;
  name: string;
  description: string;
  abilities: string[];
  constraints: string[];
  created_at: string;
  updated_at: string;
}

interface Goal {
  id: string;
  name: string;
  description: string;
  success_criteria: string[];
  priority: 'low' | 'medium' | 'high';
  assigned_to: string[];
  created_at: string;
  updated_at: string;
}

interface Task {
  id: string;
  name: string;
  description: string;
  required_abilities: string[];
  composed_of: string[];
  goal_ids: string[];
  created_at: string;
  updated_at: string;
}

interface Interaction {
  id: string;
  name: string;
  description: string;
  preconditions: string[];
  effects: string[];
  created_at: string;
  updated_at: string;
}

interface Gap {
  id: string;
  originalId: string;
  type: 'gap';
  expected_type: 'actor' | 'goal' | 'task' | 'interaction';
  referenced_by: string[];
}

interface FullModel {
  actors: Actor[];
  goals: Goal[];
  tasks: Task[];
  interactions: Interaction[];
  questions: any[];
  journeys: any[];
}

// Define node types
const nodeTypes: NodeTypes = {
  actor: ActorNode,
  goal: GoalNode,
  task: TaskNode,
  interaction: InteractionNode,
  gap: GapNode,
};

const ReactFlowApp: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [model, setModel] = useState<FullModel>({
    actors: [],
    goals: [],
    tasks: [],
    interactions: [],
    questions: [],
    journeys: [],
  });
  const [serverUrl, setServerUrl] = useState('Starting...');
  const layoutEngineRef = useRef<any>(null);

  // Statistics
  const stats = {
    actors: model.actors.length,
    goals: model.goals.length,
    tasks: model.tasks.length,
    interactions: model.interactions.length,
    gaps: nodes.filter(n => n.type === 'gap').length,
  };

  // Load initial model
  useEffect(() => {
    const loadInitialModel = async () => {
      try {
        const initialModel = await (window as any).screenplay.getModel();
        setModel(initialModel);
      } catch (error) {
        console.error('[ReactFlow] Failed to load initial model:', error);
      }
    };

    loadInitialModel();
  }, []);

  // Listen for server start
  useEffect(() => {
    (window as any).screenplay.onServerStarted((url: string) => {
      setServerUrl(url);
    });
  }, []);

  // Listen for model updates
  useEffect(() => {
    (window as any).screenplay.onModelUpdate((event: any) => {
      console.log('[ReactFlow] Model update received:', event);
      const { type, entity, data } = event;

      setModel(prevModel => {
        const newModel = { ...prevModel };
        const entityKey = `${entity}s` as keyof FullModel;

        if (type === 'create') {
          (newModel[entityKey] as any[]).push(data);
        } else if (type === 'update') {
          const entities = newModel[entityKey] as any[];
          const index = entities.findIndex((e: any) => e.id === data.id);
          if (index !== -1) {
            entities[index] = data;
          }
        } else if (type === 'delete') {
          (newModel[entityKey] as any[]) = (newModel[entityKey] as any[]).filter(
            (e: any) => e.id !== data.id
          );
        }

        return newModel;
      });
    });
  }, []);

  // Compute gaps from model
  const computeGaps = useCallback((): Gap[] => {
    const allIds = new Set([
      ...model.actors.map(e => e.id),
      ...model.goals.map(e => e.id),
      ...model.tasks.map(e => e.id),
      ...model.interactions.map(e => e.id),
    ]);

    const gapsMap = new Map<string, Gap>();

    // Check goal.assigned_to for missing actors
    model.goals.forEach(goal => {
      goal.assigned_to.forEach(actor_id => {
        if (!allIds.has(actor_id)) {
          const existing = gapsMap.get(actor_id);
          if (existing) {
            existing.referenced_by.push(goal.id);
          } else {
            gapsMap.set(actor_id, {
              id: 'gap-' + actor_id,
              originalId: actor_id,
              type: 'gap',
              expected_type: 'actor',
              referenced_by: [goal.id],
            });
          }
        }
      });
    });

    // Check task.composed_of for missing interactions
    model.tasks.forEach(task => {
      if (Array.isArray(task.composed_of) && task.composed_of.length > 0) {
        task.composed_of.forEach(interaction_id => {
          if (!allIds.has(interaction_id)) {
            const existing = gapsMap.get(interaction_id);
            if (existing) {
              existing.referenced_by.push(task.id);
            } else {
              gapsMap.set(interaction_id, {
                id: 'gap-' + interaction_id,
                originalId: interaction_id,
                type: 'gap',
                expected_type: 'interaction',
                referenced_by: [task.id],
              });
            }
          }
        });
      }
    });

    // Check task.goal_ids for missing goals
    const allGoalIds = new Set(model.goals.map(g => g.id));
    model.tasks.forEach(task => {
      if (Array.isArray(task.goal_ids) && task.goal_ids.length > 0) {
        task.goal_ids.forEach(goal_id => {
          if (!allGoalIds.has(goal_id)) {
            const existing = gapsMap.get(goal_id);
            if (existing) {
              existing.referenced_by.push(task.id);
            } else {
              gapsMap.set(goal_id, {
                id: 'gap-' + goal_id,
                originalId: goal_id,
                type: 'gap',
                expected_type: 'goal',
                referenced_by: [task.id],
              });
            }
          }
        });
      }
    });

    return Array.from(gapsMap.values());
  }, [model]);

  // Build edges from model
  const buildEdges = useCallback((): Edge[] => {
    const edgeList: Edge[] = [];
    const allActorIds = new Set(model.actors.map(a => a.id));
    const allGoalIds = new Set(model.goals.map(g => g.id));
    const allInteractionIds = new Set(model.interactions.map(i => i.id));

    // Goal assignments (Actor → Goal or Gap → Goal)
    model.goals.forEach(goal => {
      goal.assigned_to.forEach(actor_id => {
        const sourceId = allActorIds.has(actor_id) ? actor_id : 'gap-' + actor_id;
        edgeList.push({
          id: `${sourceId}-${goal.id}`,
          source: sourceId,
          target: goal.id,
          type: allActorIds.has(actor_id) ? 'default' : 'straight',
          style: allActorIds.has(actor_id) ? {} : { stroke: '#DC2626', strokeDasharray: '5,5' },
          animated: false,
        });
      });
    });

    // Goal → Task (Task helps achieve Goal)
    model.tasks.forEach(task => {
      if (Array.isArray(task.goal_ids) && task.goal_ids.length > 0) {
        task.goal_ids.forEach(goal_id => {
          const goalExists = allGoalIds.has(goal_id);
          const sourceId = goalExists ? goal_id : 'gap-' + goal_id;
          edgeList.push({
            id: `${sourceId}-${task.id}`,
            source: sourceId,
            target: task.id,
            type: goalExists ? 'default' : 'straight',
            style: goalExists ? {} : { stroke: '#DC2626', strokeDasharray: '5,5' },
            animated: false,
          });
        });
      }
    });

    // Task composition (Task → Interaction or Task → Gap)
    model.tasks.forEach(task => {
      if (Array.isArray(task.composed_of) && task.composed_of.length > 0) {
        task.composed_of.forEach(interaction_id => {
          const targetId = allInteractionIds.has(interaction_id)
            ? interaction_id
            : 'gap-' + interaction_id;
          edgeList.push({
            id: `${task.id}-${targetId}`,
            source: task.id,
            target: targetId,
            type: allInteractionIds.has(interaction_id) ? 'default' : 'straight',
            style: allInteractionIds.has(interaction_id)
              ? {}
              : { stroke: '#DC2626', strokeDasharray: '5,5' },
            animated: false,
          });
        });
      }
    });

    return edgeList;
  }, [model]);

  // Dynamic layout algorithm using dagre for hierarchical graph layout
  const computeLayout = useCallback((nodeList: any[], edgeList: Edge[]) => {
    // Create a new directed graph
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // Configure the graph layout
    dagreGraph.setGraph({
      rankdir: 'LR', // Left to right layout
      align: 'UL',   // Align to upper-left
      nodesep: 80,   // Horizontal spacing between nodes
      ranksep: 150,  // Vertical spacing between ranks
      marginx: 50,
      marginy: 50,
    });

    // Define node dimensions based on type
    const getNodeDimensions = (type: string) => {
      switch (type) {
        case 'actor':
          return { width: 140, height: 140 }; // Circle
        case 'goal':
          return { width: 170, height: 100 }; // Rectangle
        case 'task':
          return { width: 150, height: 90 }; // Hexagon
        case 'interaction':
          return { width: 140, height: 140 }; // Diamond
        case 'gap':
          return { width: 110, height: 110 }; // Dashed circle
        default:
          return { width: 150, height: 100 };
      }
    };

    // Add nodes to the graph
    nodeList.forEach((node) => {
      const dimensions = getNodeDimensions(node.type);
      dagreGraph.setNode(node.id, dimensions);
    });

    // Add edges to the graph
    edgeList.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    // Calculate the layout
    dagre.layout(dagreGraph);

    // Apply the calculated positions to nodes
    const layoutedNodes: Node[] = nodeList.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - nodeWithPosition.width / 2,
          y: nodeWithPosition.y - nodeWithPosition.height / 2,
        },
        // Set handle positions based on layout direction
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });

    return layoutedNodes;
  }, []);

  // Update visualization when model changes
  useEffect(() => {
    console.log('[ReactFlow] Updating visualization');

    const gaps = computeGaps();
    
    // Build node list
    const nodeList = [
      ...model.actors.map(e => ({ id: e.id, type: 'actor', data: e })),
      ...model.goals.map(e => ({ id: e.id, type: 'goal', data: e })),
      ...model.tasks.map(e => ({ id: e.id, type: 'task', data: e })),
      ...model.interactions.map(e => ({ id: e.id, type: 'interaction', data: e })),
      ...gaps.map(e => ({ id: e.id, type: 'gap', data: e })),
    ];

    // Build edges (needed for layout calculation)
    const edgeList = buildEdges();

    // Apply dynamic layout based on graph structure
    const layoutedNodes = computeLayout(nodeList, edgeList);
    setNodes(layoutedNodes);
    setEdges(edgeList);
  }, [model, computeGaps, buildEdges, computeLayout, setNodes, setEdges]);

  // Clear canvas handler
  const handleClearCanvas = async () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      try {
        await (window as any).screenplay.clearModel();
        const emptyModel = await (window as any).screenplay.getModel();
        setModel(emptyModel);
      } catch (error) {
        console.error('[ReactFlow] Failed to clear model:', error);
        alert('Failed to clear canvas. Check console for details.');
      }
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {/* Header */}
      <header style={{
        background: '#1f2937',
        color: 'white',
        padding: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Screenplay Visualizer</h1>
          <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
            MCP Server: {serverUrl}
          </div>
          <div style={{ fontSize: '0.875rem', marginTop: '0.5rem', display: 'flex', gap: '1rem' }}>
            <span>Actors: {stats.actors}</span>
            <span>Goals: {stats.goals}</span>
            <span>Tasks: {stats.tasks}</span>
            <span>Interactions: {stats.interactions}</span>
            <span>Gaps: {stats.gaps}</span>
          </div>
        </div>
        <button
          onClick={handleClearCanvas}
          style={{
            padding: '0.5rem 1rem',
            background: '#DC2626',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer',
          }}
        >
          Clear Canvas
        </button>
      </header>

      {/* ReactFlow Canvas */}
      <div style={{ width: '100%', height: 'calc(100vh - 120px)' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
};

export default ReactFlowApp;
