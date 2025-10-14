console.log('[Renderer] App.js loading...');

// Global state
let currentModel = {
  actors: [],
  goals: [],
  tasks: [],
  interactions: [],
  questions: [],
  journeys: [],
};

let simulation;
let svg;
let g; // Main group for zoom/pan
let nodes = [];
let edges = [];

// Initialize app
async function init() {
  console.log('[Renderer] Initializing...');

  // Set up SVG
  setupSVG();
  console.log('[Renderer] SVG setup complete');

  // Listen for server start
  window.screenplay.onServerStarted((url) => {
    document.getElementById('server-url').textContent = url;
  });

  // Listen for model updates
  window.screenplay.onModelUpdate((event) => {
    handleModelUpdate(event);
  });

  // Load initial model
  await loadModel();

  // Start visualization
  updateVisualization();
}

// Set up SVG with zoom/pan
function setupSVG() {
  const width = window.innerWidth;
  const height = window.innerHeight - 150; // Account for header

  svg = d3.select('#force-layout')
    .attr('width', width)
    .attr('height', height);

  // Create main group for zoom/pan
  g = svg.append('g');

  // Add zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([0.5, 2])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

  svg.call(zoom);

  // Create force simulation with improved layout parameters
  simulation = d3.forceSimulation()
    .force('link', d3.forceLink()
      .id(d => d.id)
      .distance(120)       // Increased for larger nodes
      .strength(1)         // Stronger links keep connections tight
    )
    .force('charge', d3.forceManyBody()
      .strength(-200)      // Increased repulsion for larger nodes
      .distanceMax(300)    // Limit repulsion distance to keep graph compact
    )
    .force('center', d3.forceCenter(width / 2, height / 2)
      .strength(0.05)      // Gentle centering to avoid overcrowding center
    )
    .force('collision', d3.forceCollide()
      .radius(50)          // Larger collision radius for bigger nodes
      .strength(0.8)       // Strong collision to prevent node overlap
    )
    .force('x', d3.forceX(width / 2).strength(0.02))  // Gentle horizontal pull toward center
    .force('y', d3.forceY(height / 2).strength(0.02)) // Gentle vertical pull toward center
    .velocityDecay(0.4)    // Faster settling (default is 0.4, lower = faster)
    .alphaDecay(0.02)      // Slower cooling for smoother transitions
    .on('tick', ticked);
}

// Load model from storage
async function loadModel() {
  currentModel = await window.screenplay.getModel();
  updateStats();
}

// Handle incremental model updates
function handleModelUpdate(event) {
  console.log('[Renderer] Model update received:', event);
  const { type, entity, data } = event;

  if (type === 'create') {
    // Add new entity to model
    console.log(`[Renderer] Creating ${entity}:`, data);
    currentModel[`${entity}s`].push(data);
  } else if (type === 'update') {
    // Update existing entity
    console.log(`[Renderer] Updating ${entity}:`, data);
    const entities = currentModel[`${entity}s`];
    const index = entities.findIndex(e => e.id === data.id);
    if (index !== -1) {
      entities[index] = data;
    }
  } else if (type === 'delete') {
    // Remove entity
    console.log(`[Renderer] Deleting ${entity}:`, data);
    const entities = currentModel[`${entity}s`];
    currentModel[`${entity}s`] = entities.filter(e => e.id !== data.id);
  }

  updateStats();
  updateVisualization();
}

// Update statistics display
function updateStats() {
  document.getElementById('actor-count').textContent = `Actors: ${currentModel.actors.length}`;
  document.getElementById('goal-count').textContent = `Goals: ${currentModel.goals.length}`;
  document.getElementById('task-count').textContent = `Tasks: ${currentModel.tasks.length}`;
  document.getElementById('interaction-count').textContent = `Interactions: ${currentModel.interactions.length}`;

  const gaps = computeGaps();
  document.getElementById('gap-count').textContent = `Gaps: ${gaps.length}`;
}

// Compute gaps from current model
function computeGaps() {
  const allIds = new Set([
    ...currentModel.actors.map(e => e.id),
    ...currentModel.goals.map(e => e.id),
    ...currentModel.tasks.map(e => e.id),
    ...currentModel.interactions.map(e => e.id),
  ]);

  const gapsMap = new Map();

  // Check goal.assigned_to for missing actors
  currentModel.goals.forEach(goal => {
    goal.assigned_to.forEach(actor_id => {
      if (!allIds.has(actor_id)) {
        const existing = gapsMap.get(actor_id);
        if (existing) {
          existing.referenced_by.push(goal.id);
        } else {
          gapsMap.set(actor_id, {
            id: 'gap-' + actor_id,  // Use different ID for gaps
            originalId: actor_id,   // Keep track of what's missing
            type: 'gap',
            expected_type: 'actor',
            referenced_by: [goal.id],
          });
        }
      }
    });
  });

  // Check task.composed_of for missing interactions
  currentModel.tasks.forEach(task => {
    task.composed_of.forEach(interaction_id => {
      if (!allIds.has(interaction_id)) {
        const existing = gapsMap.get(interaction_id);
        if (existing) {
          existing.referenced_by.push(task.id);
        } else {
          gapsMap.set(interaction_id, {
            id: 'gap-' + interaction_id,  // Use different ID for gaps
            originalId: interaction_id,   // Keep track of what's missing
            type: 'gap',
            expected_type: 'interaction',
            referenced_by: [task.id],
          });
        }
      }
    });
  });

  // Check task.goal_ids for missing goals
  const allGoalIds = new Set(currentModel.goals.map(g => g.id));
  currentModel.tasks.forEach(task => {
    if (task.goal_ids && task.goal_ids.length > 0) {
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
}

// Build edges from model
function buildEdges() {
  const edgeList = [];

  // Build a map to check if IDs are actors or gaps
  const allActorIds = new Set(currentModel.actors.map(a => a.id));

  // Goal assignments (Actor → Goal or Gap → Goal)
  currentModel.goals.forEach(goal => {
    goal.assigned_to.forEach(actor_id => {
      // If actor doesn't exist, it's a gap, use gap- prefix
      const sourceId = allActorIds.has(actor_id) ? actor_id : 'gap-' + actor_id;
      edgeList.push({
        source: sourceId,
        target: goal.id,
        type: allActorIds.has(actor_id) ? 'assignment' : 'gap',
      });
    });
  });

  // Goal → Task (Task helps achieve Goal)
  const allGoalIds = new Set(currentModel.goals.map(g => g.id));

  currentModel.tasks.forEach(task => {
    if (task.goal_ids && task.goal_ids.length > 0) {
      task.goal_ids.forEach(goal_id => {
        // If goal doesn't exist, it's a gap, use gap- prefix for the SOURCE (goal)
        const sourceId = allGoalIds.has(goal_id) ? goal_id : 'gap-' + goal_id;
        edgeList.push({
          source: sourceId,
          target: task.id,
          type: allGoalIds.has(goal_id) ? 'goal_task' : 'gap',
        });
      });
    }
  });

  // Task composition (Task → Interaction or Task → Gap)
  const allInteractionIds = new Set(currentModel.interactions.map(i => i.id));

  currentModel.tasks.forEach(task => {
    task.composed_of.forEach(interaction_id => {
      // If interaction doesn't exist, it's a gap, use gap- prefix
      const targetId = allInteractionIds.has(interaction_id) ? interaction_id : 'gap-' + interaction_id;
      edgeList.push({
        source: task.id,
        target: targetId,
        type: allInteractionIds.has(interaction_id) ? 'composition' : 'gap',
      });
    });
  });

  return edgeList;
}

// Update visualization with new data
function updateVisualization() {
  console.log('[Renderer] updateVisualization called');

  // Compute gaps
  const gaps = computeGaps();
  console.log('[Renderer] Computed gaps:', gaps.length);

  // Build new node list from model
  const newNodes = [
    ...currentModel.actors.map(e => ({ ...e, type: 'actor' })),
    ...currentModel.goals.map(e => ({ ...e, type: 'goal' })),
    ...currentModel.tasks.map(e => ({ ...e, type: 'task' })),
    ...currentModel.interactions.map(e => ({ ...e, type: 'interaction' })),
    ...gaps,
  ];

  // Create a map of existing nodes to preserve their simulation state (x, y, vx, vy)
  const existingNodesMap = new Map(nodes.map(node => [node.id, node]));

  // Update nodes array: preserve existing nodes or add new ones
  nodes = newNodes.map(newNode => {
    const existingNode = existingNodesMap.get(newNode.id);
    if (existingNode) {
      // Preserve simulation state and update properties
      // Keep x, y, vx, vy, fx, fy (if they exist) from the simulation
      return {
        ...newNode,
        x: existingNode.x,
        y: existingNode.y,
        vx: existingNode.vx,
        vy: existingNode.vy,
        fx: existingNode.fx,
        fy: existingNode.fy,
      };
    } else {
      // New node - let simulation initialize it
      return newNode;
    }
  });

  console.log('[Renderer] Total nodes:', nodes.length, {
    actors: currentModel.actors.length,
    goals: currentModel.goals.length,
    tasks: currentModel.tasks.length,
    interactions: currentModel.interactions.length,
    gaps: gaps.length
  });

  // Build edge list
  edges = buildEdges();
  console.log('[Renderer] Total edges:', edges.length);

  // Update D3 visualization (render edges first so they appear underneath nodes)
  renderEdges();
  renderNodes();

  // Update simulation
  simulation.nodes(nodes);
  simulation.force('link').links(edges);
  // Use a lower alpha for updates to make transitions smoother
  // Only use higher alpha when there are new nodes
  const hasNewNodes = newNodes.some(n => !existingNodesMap.has(n.id));
  simulation.alpha(hasNewNodes ? 0.3 : 0.1).restart();

  console.log('[Renderer] Visualization update complete');
}

// Render edges
function renderEdges() {
  const edgeSelection = g.selectAll('.edge')
    .data(edges, d => `${d.source.id || d.source}-${d.target.id || d.target}`)
    .join(
      enter => enter.append('line')
        .attr('class', d => `edge edge-${d.type}`)
        .style('opacity', 0)
        .call(enter => enter.transition().duration(500).style('opacity', 1)),
      update => update,
      exit => exit.transition().duration(300).style('opacity', 0).remove()
    );
}

// Render nodes
function renderNodes() {
  console.log('[Renderer] renderNodes called with', nodes.length, 'nodes');
  console.log('[Renderer] Node IDs:', nodes.map(n => ({ id: n.id, type: n.type, name: n.name })));

  // Check what's currently in the DOM
  const existingNodes = g.selectAll('.node');
  console.log('[Renderer] Existing DOM nodes:', existingNodes.size());
  const domIds = [];
  existingNodes.each(function(d) {
    console.log('[Renderer] DOM node:', d ? d.id : 'NO DATA', d ? d.type : 'NO TYPE', d ? d.name : 'NO NAME');
    if (d && d.id) domIds.push(d.id);
  });

  console.log('[Renderer] DOM IDs:', domIds);
  console.log('[Renderer] Data IDs:', nodes.map(n => n.id));
  console.log('[Renderer] IDs to remove (in DOM but not in data):', domIds.filter(id => !nodes.find(n => n.id === id)));

  const nodeSelection = g.selectAll('.node')
    .data(nodes, d => {
      console.log('[Renderer] Key function called for:', d ? d.id : 'undefined');
      return d.id;
    })
    .join(
      enter => {
        console.log('[Renderer] Enter selection:', enter.size(), 'nodes');
        enter.each(function(d) {
          console.log('[Renderer] Entering node:', d.id, d.type, d.name);
        });

        const nodeGroup = enter.append('g')
          .attr('class', 'node')
          .style('opacity', 0)
          .call(drag(simulation))
          .on('click', handleNodeClick);

        // Append shapes based on type
        nodeGroup.each(function(d) {
          const node = d3.select(this);

          if (d.type === 'actor') {
            // Larger circle to accommodate text
            node.append('circle')
              .attr('class', 'actor-node')
              .attr('r', 40);

            // Name inside circle with wrapping
            const nameLines = wrapText(d.name, 70);
            const nameGroup = node.append('g').attr('class', 'label-group');
            const lineHeight = 14;
            const startY = -5 - ((nameLines.length - 1) * lineHeight / 2);

            nameLines.forEach((line, i) => {
              nameGroup.append('text')
                .attr('class', 'node-label-inside')
                .attr('dy', startY + (i * lineHeight))
                .text(line);
            });

            // Abilities below name
            if (d.abilities && d.abilities.length > 0) {
              node.append('text')
                .attr('class', 'node-meta')
                .attr('dy', 10 + (nameLines.length > 1 ? (nameLines.length - 1) * 7 : 0))
                .text(`${d.abilities.length} abilities`);
            }

          } else if (d.type === 'goal') {
            // Larger rectangle to accommodate text
            node.append('rect')
              .attr('class', 'goal-node')
              .attr('x', -50)
              .attr('y', -30)
              .attr('width', 100)
              .attr('height', 60)
              .attr('rx', 5);

            // Name inside rectangle with wrapping
            const nameLines = wrapText(d.name, 90);
            const nameGroup = node.append('g').attr('class', 'label-group');
            const lineHeight = 14;
            const startY = -5 - ((nameLines.length - 1) * lineHeight / 2);

            nameLines.forEach((line, i) => {
              nameGroup.append('text')
                .attr('class', 'node-label-inside')
                .attr('dy', startY + (i * lineHeight))
                .text(line);
            });

            // Assigned count or constraints
            let metaText = '';
            if (d.assigned_to && d.assigned_to.length > 0) {
              metaText = `→ ${d.assigned_to.length} actors`;
            }
            if (d.constraints && d.constraints.length > 0) {
              metaText += (metaText ? ' • ' : '') + `${d.constraints.length} constraints`;
            }
            if (metaText) {
              node.append('text')
                .attr('class', 'node-meta')
                .attr('dy', 12 + (nameLines.length > 1 ? (nameLines.length - 1) * 7 : 0))
                .text(metaText);
            }

          } else if (d.type === 'task') {
            // Larger triangle
            node.append('polygon')
              .attr('class', 'task-node')
              .attr('points', '0,-30 26,30 -26,30');

            // Name inside triangle with wrapping
            const nameLines = wrapText(d.name, 40);
            const nameGroup = node.append('g').attr('class', 'label-group');
            const lineHeight = 14;
            const startY = 0 - ((nameLines.length - 1) * lineHeight / 2);

            nameLines.forEach((line, i) => {
              nameGroup.append('text')
                .attr('class', 'node-label-inside')
                .attr('dy', startY + (i * lineHeight))
                .text(line);
            });

            // Composition count
            if (d.composed_of && d.composed_of.length > 0) {
              node.append('text')
                .attr('class', 'node-meta')
                .attr('dy', 15 + (nameLines.length > 1 ? (nameLines.length - 1) * 7 : 0))
                .text(`${d.composed_of.length} interactions`);
            }

          } else if (d.type === 'interaction') {
            // Larger diamond
            node.append('polygon')
              .attr('class', 'interaction-node')
              .attr('points', '0,-35 35,0 0,35 -35,0');

            // Name inside diamond with wrapping
            const nameLines = wrapText(d.name, 55);
            const nameGroup = node.append('g').attr('class', 'label-group');
            const lineHeight = 14;
            const startY = 5 - ((nameLines.length - 1) * lineHeight / 2);

            nameLines.forEach((line, i) => {
              nameGroup.append('text')
                .attr('class', 'node-label-inside')
                .attr('dy', startY + (i * lineHeight))
                .text(line);
            });

          } else if (d.type === 'gap') {
            node.append('circle')
              .attr('class', 'gap-node')
              .attr('r', 30);

            node.append('text')
              .attr('class', 'gap-label')
              .attr('dy', -5)
              .text('?');

            // Show what type is missing
            node.append('text')
              .attr('class', 'node-meta')
              .attr('dy', 15)
              .text(d.expected_type);
          }
        });

        return nodeGroup.transition().duration(500).style('opacity', 1);
      },
      update => {
        console.log('[Renderer] Update selection:', update.size(), 'nodes');
        update.each(function(d) {
          console.log('[Renderer] Updating node:', d.id, d.type, d.name);
        });

        // Update visual elements for changed data
        update.each(function(d) {
          const node = d3.select(this);

          // Update text labels based on node type
          if (d.type === 'actor') {
            // Update name text with wrapping
            const nameLines = wrapText(d.name, 70);
            const labelGroup = node.select('.label-group');

            // Remove old text elements
            labelGroup.selectAll('text').remove();

            // Add updated text
            const lineHeight = 14;
            const startY = -5 - ((nameLines.length - 1) * lineHeight / 2);
            nameLines.forEach((line, i) => {
              labelGroup.append('text')
                .attr('class', 'node-label-inside')
                .attr('dy', startY + (i * lineHeight))
                .text(line);
            });

            // Update abilities metadata
            const metaText = node.select('.node-meta');
            if (d.abilities && d.abilities.length > 0) {
              if (metaText.empty()) {
                node.append('text')
                  .attr('class', 'node-meta')
                  .attr('dy', 10 + (nameLines.length > 1 ? (nameLines.length - 1) * 7 : 0))
                  .text(`${d.abilities.length} abilities`);
              } else {
                metaText
                  .attr('dy', 10 + (nameLines.length > 1 ? (nameLines.length - 1) * 7 : 0))
                  .text(`${d.abilities.length} abilities`);
              }
            } else {
              metaText.remove();
            }

          } else if (d.type === 'goal') {
            // Update name text with wrapping
            const nameLines = wrapText(d.name, 90);
            const labelGroup = node.select('.label-group');

            // Remove old text elements
            labelGroup.selectAll('text').remove();

            // Add updated text
            const lineHeight = 14;
            const startY = -5 - ((nameLines.length - 1) * lineHeight / 2);
            nameLines.forEach((line, i) => {
              labelGroup.append('text')
                .attr('class', 'node-label-inside')
                .attr('dy', startY + (i * lineHeight))
                .text(line);
            });

            // Update metadata
            let metaText = '';
            if (d.assigned_to && d.assigned_to.length > 0) {
              metaText = `→ ${d.assigned_to.length} actors`;
            }
            if (d.constraints && d.constraints.length > 0) {
              metaText += (metaText ? ' • ' : '') + `${d.constraints.length} constraints`;
            }

            const metaElement = node.select('.node-meta');
            if (metaText) {
              if (metaElement.empty()) {
                node.append('text')
                  .attr('class', 'node-meta')
                  .attr('dy', 12 + (nameLines.length > 1 ? (nameLines.length - 1) * 7 : 0))
                  .text(metaText);
              } else {
                metaElement
                  .attr('dy', 12 + (nameLines.length > 1 ? (nameLines.length - 1) * 7 : 0))
                  .text(metaText);
              }
            } else {
              metaElement.remove();
            }

          } else if (d.type === 'task') {
            // Update name text with wrapping
            const nameLines = wrapText(d.name, 40);
            const labelGroup = node.select('.label-group');

            // Remove old text elements
            labelGroup.selectAll('text').remove();

            // Add updated text
            const lineHeight = 14;
            const startY = 0 - ((nameLines.length - 1) * lineHeight / 2);
            nameLines.forEach((line, i) => {
              labelGroup.append('text')
                .attr('class', 'node-label-inside')
                .attr('dy', startY + (i * lineHeight))
                .text(line);
            });

            // Update composition count
            const metaElement = node.select('.node-meta');
            if (d.composed_of && d.composed_of.length > 0) {
              if (metaElement.empty()) {
                node.append('text')
                  .attr('class', 'node-meta')
                  .attr('dy', 15 + (nameLines.length > 1 ? (nameLines.length - 1) * 7 : 0))
                  .text(`${d.composed_of.length} interactions`);
              } else {
                metaElement
                  .attr('dy', 15 + (nameLines.length > 1 ? (nameLines.length - 1) * 7 : 0))
                  .text(`${d.composed_of.length} interactions`);
              }
            } else {
              metaElement.remove();
            }

          } else if (d.type === 'interaction') {
            // Update name text with wrapping
            const nameLines = wrapText(d.name, 55);
            const labelGroup = node.select('.label-group');

            // Remove old text elements
            labelGroup.selectAll('text').remove();

            // Add updated text
            const lineHeight = 14;
            const startY = 5 - ((nameLines.length - 1) * lineHeight / 2);
            nameLines.forEach((line, i) => {
              labelGroup.append('text')
                .attr('class', 'node-label-inside')
                .attr('dy', startY + (i * lineHeight))
                .text(line);
            });

          } else if (d.type === 'question') {
            // Update name text with wrapping
            const nameLines = wrapText(d.name, 55);
            const labelGroup = node.select('.label-group');

            // Remove old text elements
            labelGroup.selectAll('text').remove();

            // Add updated text
            const lineHeight = 14;
            const startY = 5 - ((nameLines.length - 1) * lineHeight / 2);
            nameLines.forEach((line, i) => {
              labelGroup.append('text')
                .attr('class', 'node-label-inside')
                .attr('dy', startY + (i * lineHeight))
                .text(line);
            });
          }
        });

        return update;
      },
      exit => {
        console.log('[Renderer] Exit selection:', exit.size(), 'nodes to remove');
        exit.each(function(d) {
          console.log('[Renderer] Exiting node:', d ? d.id : 'undefined', d ? d.type : 'undefined', d ? d.name : 'undefined');
        });
        return exit.transition().duration(300).style('opacity', 0).remove();
      }
    );
}

// Tick function for force simulation
function ticked() {
  g.selectAll('.edge')
    .attr('x1', d => d.source.x)
    .attr('y1', d => d.source.y)
    .attr('x2', d => d.target.x)
    .attr('y2', d => d.target.y);

  g.selectAll('.node')
    .attr('transform', d => `translate(${d.x},${d.y})`);
}

// Text wrapping utility
function wrapText(text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = '';

  // Create a temporary SVG text element to measure text width
  const tempText = g.append('text')
    .attr('class', 'node-label-inside')
    .style('visibility', 'hidden');

  words.forEach(word => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    tempText.text(testLine);
    const testWidth = tempText.node().getComputedTextLength();

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  tempText.remove();
  return lines;
}

// Drag behavior
function drag(simulation) {
  function dragstarted(event) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragended(event) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }

  return d3.drag()
    .on('start', dragstarted)
    .on('drag', dragged)
    .on('end', dragended);
}

// Handle node click (show tooltip)
function handleNodeClick(event, d) {
  const tooltip = document.getElementById('tooltip');
  const tooltipContent = document.getElementById('tooltip-content');

  // Build tooltip content
  let content = '';

  if (d.type === 'gap') {
    content = `
      <h3>Gap: Missing ${d.expected_type}</h3>
      <p><strong>Referenced by:</strong></p>
      <ul>
        ${d.referenced_by.map(id => {
          const entity = findEntityById(id);
          return `<li>${entity ? entity.name : id}</li>`;
        }).join('')}
      </ul>
    `;
  } else {
    content = `<h3>${d.name}</h3>`;
    content += `<p><strong>Type:</strong> ${d.type}</p>`;
    content += `<p><strong>Description:</strong> ${d.description || 'N/A'}</p>`;

    if (d.abilities && d.abilities.length > 0) {
      content += `<p><strong>Abilities:</strong></p><ul>${d.abilities.map(a => `<li>${a}</li>`).join('')}</ul>`;
    }

    if (d.constraints && d.constraints.length > 0) {
      content += `<p><strong>Constraints:</strong></p><ul>${d.constraints.map(c => `<li>${c}</li>`).join('')}</ul>`;
    }

    if (d.success_criteria && d.success_criteria.length > 0) {
      content += `<p><strong>Success Criteria:</strong></p><ul>${d.success_criteria.map(s => `<li>${s}</li>`).join('')}</ul>`;
    }

    if (d.assigned_to && d.assigned_to.length > 0) {
      content += `<p><strong>Assigned to:</strong></p><ul>`;
      d.assigned_to.forEach(actorId => {
        const actor = findEntityById(actorId);
        content += `<li>${actor ? actor.name : actorId}</li>`;
      });
      content += `</ul>`;
    }

    if (d.composed_of && d.composed_of.length > 0) {
      content += `<p><strong>Composed of:</strong></p><ul>`;
      d.composed_of.forEach(interactionId => {
        const interaction = findEntityById(interactionId);
        content += `<li>${interaction ? interaction.name : interactionId}</li>`;
      });
      content += `</ul>`;
    }
  }

  tooltipContent.innerHTML = content;

  // Position tooltip near mouse
  tooltip.style.left = `${event.pageX + 10}px`;
  tooltip.style.top = `${event.pageY + 10}px`;
  tooltip.classList.remove('hidden');

  // Hide on click outside
  setTimeout(() => {
    document.addEventListener('click', hideTooltip, { once: true });
  }, 10);
}

function hideTooltip() {
  document.getElementById('tooltip').classList.add('hidden');
}

// Helper to find entity by ID
function findEntityById(id) {
  for (const entities of Object.values(currentModel)) {
    const found = entities.find(e => e.id === id);
    if (found) return found;
  }
  return null;
}

// Handle clear button click
async function handleClearCanvas() {
  console.log('[Renderer] Clear canvas requested');

  if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
    try {
      await window.screenplay.clearModel();
      console.log('[Renderer] Model cleared successfully');

      // Reload the model to reflect the empty state
      await loadModel();
      updateVisualization();
    } catch (error) {
      console.error('[Renderer] Failed to clear model:', error);
      alert('Failed to clear canvas. Check console for details.');
    }
  }
}

// Handle window resize
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight - 150;

  svg.attr('width', width).attr('height', height);
  simulation.force('center', d3.forceCenter(width / 2, height / 2).strength(0.05));
  simulation.force('x', d3.forceX(width / 2).strength(0.02));
  simulation.force('y', d3.forceY(height / 2).strength(0.02));
  simulation.alpha(0.3).restart();
});

// Start app when DOM is ready
console.log('[Renderer] Starting init...');
init().catch(error => {
  console.error('[Renderer] Init failed:', error);
});

// Wire up clear button
document.addEventListener('DOMContentLoaded', () => {
  const clearButton = document.getElementById('clear-button');
  if (clearButton) {
    clearButton.addEventListener('click', handleClearCanvas);
    console.log('[Renderer] Clear button event listener attached');
  } else {
    console.error('[Renderer] Clear button not found');
  }
});
