# Layout Comparison: Before and After

This document visually compares the old columnar layout with the new dagre hierarchical layout.

## Before: Columnar Layout (Rigid Structure)

```
Column 1      Column 2      Column 3      Column 4
(Actors)      (Goals)       (Tasks)       (Interactions)

Customer  ──┐
            ├──→ Purchase ──┐
Support   ──┤               ├──→ Shop    ──┐
            │               │              ├──→ Add to Cart
Admin     ──┘               ├──→ Checkout ─┤
                            │              └──→ Pay
            ├──→ Support  ──┤
            │               └──→ Contact  ──→ Submit Ticket
            │
            └──→ Manage   ──→ Configure ──→ Set Settings
```

**Problems:**
- All actors in one column (no grouping by relationships)
- Long crossing edges between columns
- Difficult to see which tasks belong to which goals
- Static structure regardless of graph topology
- Becomes messy with many nodes

## After: Dagre Hierarchical Layout (Dynamic Structure)

```
Customer
    │
    ├──→ Purchase
    │       ├──→ Shop
    │       │      └──→ Add to Cart
    │       │
    │       └──→ Checkout
    │              └──→ Pay
    │
    └──→ Support
            └──→ Contact
                   └──→ Submit Ticket

Support Agent
    └──→ Support
            └──→ Contact
                   └──→ Submit Ticket

Admin
    └──→ Manage
            └──→ Configure
                   └──→ Set Settings
```

**Benefits:**
- Actors are positioned based on their goal connections
- Tasks are visually grouped under their parent goals
- Short, direct edges (minimal crossings)
- Clear hierarchical flows
- Clusters of dependent nodes immediately obvious
- Adapts to graph structure

## Example: E-Commerce Flow

### Columnar (Hard to Follow)
```
Column 1          Column 2          Column 3          Column 4

Customer  ─────┐
               ├──→ Login     ──→ Sign In   ──→ Enter Creds
               │
               ├──→ Browse    ──→ Search    ──┐
               │                              ├──→ View Results
               │              ──→ Filter     ─┤
               │                              └──→ Sort Items
               │
               └──→ Purchase  ──→ Add Cart  ──┐
                                              ├──→ Add Item
                              ──→ Checkout  ─┤
                                              └──→ Pay Now
```

Notice how edges cross and it's hard to see the relationship between Search/Filter and View Results/Sort Items.

### Dagre (Clear Structure)
```
Customer
    │
    ├──→ Login
    │       └──→ Sign In
    │              └──→ Enter Creds
    │
    ├──→ Browse
    │       ├──→ Search
    │       │      └──→ View Results
    │       │
    │       └──→ Filter
    │              └──→ Sort Items
    │
    └──→ Purchase
            ├──→ Add Cart
            │      └──→ Add Item
            │
            └──→ Checkout
                   └──→ Pay Now
```

The hierarchical structure makes it immediately clear:
- Browse has TWO tasks: Search and Filter
- Each task has its own interaction
- Purchase has TWO tasks: Add Cart and Checkout
- The entire flow is easy to trace

## Gap Handling

### Columnar (Scattered)
```
Actor Column      Goal Column      Task Column      Gap scattered randomly
Customer  ──────→ Purchase  ─────→ Shop      ────→ [?] (missing)
                                             └────→ Add to Cart
```

### Dagre (In Context)
```
Customer
    │
    └──→ Purchase
            └──→ Shop
                   ├──→ [?] Missing Interaction
                   │    (referenced but not defined)
                   │
                   └──→ Add to Cart
```

Gaps appear in their natural position in the flow, making it obvious what's missing.

## Multi-Actor Scenarios

### Columnar (Confusing)
```
Actor 1  ─────┐
              ├──→ Shared Goal ──→ Task A ──→ Interaction X
Actor 2  ─────┤
              │    Different ───→ Task B ──→ Interaction Y
Actor 3  ─────┘
```

Hard to tell which tasks belong to which goal.

### Dagre (Clear)
```
Actor 1  ────┐
             ├──→ Shared Goal
Actor 2  ────┤       └──→ Task A
             │              └──→ Interaction X
Actor 3  ────┘

Actor 2
    └──→ Different Goal
            └──→ Task B
                   └──→ Interaction Y
```

The branching structure makes relationships obvious. Notice Actor 2 appears twice - once for the shared goal, once for its own goal.

## Layout Parameters Effect

The dagre algorithm uses these parameters:

```typescript
nodesep: 80    // Horizontal spacing between nodes
ranksep: 150   // Vertical spacing between ranks
```

### Effect of nodesep (Horizontal)
```
Small (40px):           Large (120px):
A→B→C→D                 A  →  B  →  C  →  D
(cramped)               (spacious)
```

### Effect of ranksep (Vertical)
```
Small (80px):           Large (200px):

A                       A
├─B                     │
│ └─C                   │
└─D                     ├─B
  └─E                   │ │
                        │ └─C
(compact)               │
                        └─D
                          │
                          └─E
                        (spacious)
```

Current settings (80/150) balance readability with screen space usage.

## Performance Comparison

| Scenario | Columnar | Dagre |
|----------|----------|-------|
| 10 nodes | Clean | Clean |
| 50 nodes | Cramped columns | Well distributed |
| 100 nodes | Very cramped | Still organized |
| Complex graph (many edges) | Crossed lines | Minimal crossings |

## Summary

The dagre layout provides:
✅ Better organization based on actual relationships
✅ Clearer visual grouping of dependent nodes
✅ Fewer edge crossings
✅ More scalable for complex graphs
✅ Adaptive to graph structure
✅ Professional appearance

The columnar layout was:
❌ Fixed regardless of connections
❌ Poor scalability
❌ Hard to trace relationships
❌ Many crossing edges
❌ No visual grouping
