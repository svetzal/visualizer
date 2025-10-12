#!/bin/bash

echo "Testing Screenplay Visualizer (Simple HTTP API)"
echo "================================================"
echo ""

# Test 1: Create an actor
echo "1. Creating Actor 'Admin'..."
ACTOR_RESPONSE=$(curl -s -X POST http://localhost:3001/test/define_actor \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","description":"System administrator","abilities":["manage_users","configure_system"],"constraints":["requires_authentication"]}')
echo "$ACTOR_RESPONSE" | jq '.'
ACTOR_ID=$(echo "$ACTOR_RESPONSE" | jq -r '.data.id')
echo "Actor ID: $ACTOR_ID"
echo ""
sleep 1

# Test 2: Create a goal
echo "2. Creating Goal 'User Management' assigned to Admin..."
GOAL_RESPONSE=$(curl -s -X POST http://localhost:3001/test/define_goal \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"User Management\",\"description\":\"Manage all users\",\"success_criteria\":[\"Users can be created\",\"Users can be deleted\"],\"priority\":\"high\",\"assigned_to\":[\"$ACTOR_ID\"]}")
echo "$GOAL_RESPONSE" | jq '.'
GOAL_ID=$(echo "$GOAL_RESPONSE" | jq -r '.data.id')
echo "Goal ID: $GOAL_ID"
echo ""
sleep 1

# Test 3: Create a goal with fake actor (creates gap)
echo "3. Creating Goal 'Analytics' with fake actor (creates gap)..."
GAP_GOAL=$(curl -s -X POST http://localhost:3001/test/define_goal \
  -H "Content-Type: application/json" \
  -d '{"name":"Advanced Analytics","description":"Analytics dashboards","success_criteria":["Dashboard loads fast"],"priority":"medium","assigned_to":["fake-actor-123"]}')
echo "$GAP_GOAL" | jq '.'
echo ""
sleep 1

# Test 4: Get full model
echo "4. Getting full model..."
curl -s http://localhost:3001/test/model | jq '.'
echo ""
sleep 1

# Test 5: Delete actor
echo "5. Deleting Actor (should create gap)..."
DELETE_RESPONSE=$(curl -s -X POST http://localhost:3001/test/delete_actor \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"$ACTOR_ID\"}")
echo "$DELETE_RESPONSE" | jq '.'
echo ""

echo "================================================"
echo "Testing complete!"
echo ""
echo "Check the Electron window - you should see:"
echo "- Blue circle 'Admin' appeared, then disappeared"
echo "- Green square 'User Management' with red dashed gap edge"
echo "- Green square 'Advanced Analytics' with red dashed gap edge"
echo "- Two red dashed gap nodes with '?'"
