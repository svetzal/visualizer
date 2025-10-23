# Dagre Layout Examples

This document illustrates how the dagre hierarchical layout organizes nodes based on their connections, making clusters of dependent nodes immediately obvious.

## Example 1: Simple Linear Flow

When nodes are connected in a sequence:

```
Customer (Actor)
    │
    ├──→ Complete Purchase (Goal)
    │        │
    │        └──→ Shop for Items (Task)
    │                 │
    │                 └──→ Add to Cart (Interaction)
    │
    └──→ Get Support (Goal)
             │
             └──→ Request Help (Task)
                      │
                      └──→ Submit Ticket (Interaction)
```

The dagre layout creates a clear left-to-right hierarchy with connected nodes vertically aligned.

## Example 2: Branching Structure

When one actor has multiple goals:

```
                    ┌──→ Goal 1
                    │       └──→ Task 1a
                    │                └──→ Interaction 1a
Actor ──────────────┤
                    ├──→ Goal 2
                    │       ├──→ Task 2a
                    │       │        └──→ Interaction 2a
                    │       └──→ Task 2b
                    │                └──→ Interaction 2b
                    └──→ Goal 3
                            └──→ Task 3a
                                     └──→ Interaction 3a
```

Related nodes are grouped together, making it obvious which tasks/interactions belong to which goals.

## Example 3: Converging Paths

When multiple actors share goals:

```
Actor A ────┐
            ├──→ Shared Goal
Actor B ────┤       │
            │       ├──→ Task 1 ──→ Interaction A
Actor C ────┘       │
                    └──→ Task 2 ──→ Interaction B
```

The layout minimizes edge crossings and clearly shows the convergence point.

## Example 4: Complex Graph with Gaps

When there are missing entities (gaps):

```
Actor 1 ──→ Goal A ──→ Task X ──→ [?] Interaction (Gap)
                │
                └──→ Task Y ──→ Interaction B

Actor 2 ──→ [?] Goal (Gap) ──→ Task Z ──→ Interaction C
```

Gaps (red dashed circles with "?") are positioned in the flow where they're referenced, making it immediately obvious what's missing from the conversation.

## Real-World Example: E-Commerce System

```
┌─────────────┐
│  Customer   │ (Blue Circle)
│  🔵        │
└──────┬──────┘
       │
       ├──────────────────────────────┐
       │                              │
       ▼                              ▼
┌──────────────┐              ┌──────────────┐
│  Complete    │ (Green Rect) │  Get Support │ (Green Rect)
│  Purchase    │              │              │
│  Priority:H  │              │  Priority:M  │
└──────┬───────┘              └──────┬───────┘
       │                              │
       ├──────────┐                   │
       ▼          ▼                   ▼
┌──────────┐ ┌──────────┐      ┌──────────┐
│  Browse  │ │ Checkout │      │  Contact │
│  Items   │ │          │      │  Support │
│  🟣      │ │  🟣      │      │  🟣      │
└────┬─────┘ └────┬─────┘      └────┬─────┘
     │            │                  │
     ▼            ▼                  ▼
┌──────────┐ ┌──────────┐      ┌──────────┐
│  Add to  │ │  Process │      │  Submit  │
│  Cart    │ │  Payment │      │  Ticket  │
│  🟧      │ │  🟧      │      │  🟧      │
└──────────┘ └──────────┘      └──────────┘
```

In this example:
- **Customer** is the root actor on the left
- **Two main goals** branch from the customer
- **Tasks** are positioned in the middle, grouped by their parent goal
- **Interactions** are on the right, clearly associated with their tasks
- The vertical grouping shows which tasks belong to which goal
- Edge crossings are minimized for clarity

## Layout Algorithm Details

### Step 1: Build Graph
Dagre analyzes all nodes and edges to understand the graph structure.

### Step 2: Rank Assignment
Nodes are assigned to "ranks" (vertical positions) based on their distance from source nodes:
- **Rank 0**: Actors (no incoming edges from other entity types)
- **Rank 1**: Goals (connected to actors)
- **Rank 2**: Tasks (connected to goals)
- **Rank 3**: Interactions (connected to tasks)

### Step 3: Order Optimization
Within each rank, nodes are ordered to minimize edge crossings using heuristics.

### Step 4: Position Calculation
Final x,y coordinates are computed with proper spacing:
- `nodesep: 80px` - horizontal spacing between nodes in the same rank
- `ranksep: 150px` - vertical spacing between different ranks
- Margins added for proper framing

### Step 5: Edge Routing
Edges are routed to connect nodes with minimal overlap.

## Benefits Over Columnar Layout

| Aspect | Columnar (Old) | Dagre (New) |
|--------|---------------|-------------|
| **Organization** | Fixed columns by type | Dynamic based on connections |
| **Clustering** | All tasks in one column | Tasks grouped by related goal |
| **Scalability** | Becomes messy with >20 nodes | Clean structure up to 100+ nodes |
| **Edge clarity** | Long crossing edges | Short, direct edges |
| **Adaptability** | Static regardless of structure | Adapts to graph topology |
| **Cognitive load** | Must trace lines between columns | Immediate visual grouping |

## Configuration Options

The dagre layout can be tuned by adjusting these parameters:

```typescript
dagreGraph.setGraph({
  rankdir: 'LR',   // 'LR' (left-right) or 'TB' (top-bottom)
  align: 'UL',     // Alignment within ranks
  nodesep: 80,     // Increase for more horizontal space
  ranksep: 150,    // Increase for more vertical space
  marginx: 50,     // Edge margins
  marginy: 50,
});
```

**Current settings** are optimized for:
- Readability from across the room (ensemble coding)
- Clear visual separation between ranks
- Compact enough to fit on typical displays
- Balanced between horizontal and vertical space usage

## Interaction with Layout

Users can still interact with the graph:
- **Zoom**: Scroll wheel or control buttons
- **Pan**: Click and drag background
- **Drag nodes**: Temporarily move nodes (positions reset on reload)
- **Fit view**: Button to zoom to show all nodes

The layout recalculates on every model change, ensuring new nodes are automatically positioned correctly.

## Future: Layout Animation

In future versions, the layout transitions could be animated:
```typescript
// Planned enhancement
const animateLayout = (oldPositions, newPositions) => {
  // Smooth 500ms transition
  nodes.forEach(node => {
    node.animated = true;
    node.transition = { duration: 500 };
  });
};
```

This would make it visually obvious when nodes move due to graph structure changes.
