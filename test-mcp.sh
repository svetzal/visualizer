#!/bin/bash

# Test script for Phase 1 MCP server functionality
# Make sure the Electron app is running first with: npm start

PORT=3000
BASE_URL="http://localhost:$PORT/mcp"

echo "Testing Screenplay MCP Server..."
echo "================================"
echo ""

# Test 1: Create an actor
echo "1. Creating an Actor..."
ACTOR_RESPONSE=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "define_actor",
      "arguments": {
        "name": "Admin",
        "description": "System administrator with full access",
        "abilities": ["manage_users", "configure_system", "view_logs"],
        "constraints": ["requires_authentication", "audit_logged"]
      }
    }
  }')

echo "$ACTOR_RESPONSE" | jq '.'
ACTOR_ID=$(echo "$ACTOR_RESPONSE" | jq -r '.result.content[0].text' | jq -r '.data.id')
echo "Actor ID: $ACTOR_ID"
echo ""
sleep 1

# Test 2: Create a goal assigned to the actor
echo "2. Creating a Goal assigned to Actor..."
GOAL_RESPONSE=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "define_goal",
      "arguments": {
        "name": "User Management",
        "description": "Complete user lifecycle management",
        "success_criteria": ["Users can be created", "Users can be updated", "Users can be deleted"],
        "priority": "high",
        "assigned_to": ["'"$ACTOR_ID"'"]
      }
    }
  }')

echo "$GOAL_RESPONSE" | jq '.'
GOAL_ID=$(echo "$GOAL_RESPONSE" | jq -r '.result.content[0].text' | jq -r '.data.id')
echo "Goal ID: $GOAL_ID"
echo ""
sleep 1

# Test 3: Create a goal with non-existent actor (creates gap)
echo "3. Creating a Goal with fake Actor (creates gap)..."
GAP_GOAL_RESPONSE=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "define_goal",
      "arguments": {
        "name": "Advanced Analytics",
        "description": "Provide analytics dashboards and reports",
        "success_criteria": ["Dashboard loads in <2s", "Reports are accurate"],
        "priority": "medium",
        "assigned_to": ["fake-actor-id-123"]
      }
    }
  }')

echo "$GAP_GOAL_RESPONSE" | jq '.'
echo ""
sleep 1

# Test 4: Get full model
echo "4. Getting full model..."
MODEL_RESPONSE=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "get_full_model",
      "arguments": {}
    }
  }')

echo "$MODEL_RESPONSE" | jq '.'
echo ""
sleep 1

# Test 5: Delete the actor
echo "5. Deleting the Actor (should create gap)..."
DELETE_RESPONSE=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "delete_actor",
      "arguments": {
        "id": "'"$ACTOR_ID"'"
      }
    }
  }')

echo "$DELETE_RESPONSE" | jq '.'
echo ""

echo "================================"
echo "Testing complete!"
echo ""
echo "Check the Electron window - you should see:"
echo "- Blue circle 'Admin' appeared, then disappeared"
echo "- Green square 'User Management' remains with red dashed gap edge"
echo "- Green square 'Advanced Analytics' with red dashed gap edge"
echo "- Two red dashed circle gap nodes with '?'"
