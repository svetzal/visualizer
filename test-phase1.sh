#!/bin/bash
echo "=== Phase 1 Acceptance Test ==="
echo ""

# Reset data
echo "0. Clearing all existing data..."
RESET=$(curl -s -X POST http://localhost:3001/test/reset)
echo "   ✓ $(echo "$RESET" | jq -r '.message')"
sleep 2

# Test 1: Create actor
echo "1. Creating Admin actor..."
ACTOR=$(curl -s -X POST http://localhost:3001/test/define_actor \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","description":"System administrator","abilities":["manage_users"],"constraints":[]}')
ACTOR_ID=$(echo "$ACTOR" | jq -r '.data.id')
echo "   ✓ Admin created"
echo "   → Should see blue circle labeled 'Admin'"
sleep 3

# Test 2: Create goal assigned to actor
echo ""
echo "2. Creating User Management goal..."
GOAL=$(curl -s -X POST http://localhost:3001/test/define_goal \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"User Management\",\"description\":\"Manage users\",\"success_criteria\":[\"Can create users\"],\"priority\":\"high\",\"assigned_to\":[\"$ACTOR_ID\"]}")
echo "   ✓ User Management created"
echo "   → Should see green square with GRAY edge to Admin"
sleep 3

# Test 3: Create goal with fake actor (gap)
echo ""
echo "3. Creating Analytics goal with FAKE actor (creates gap)..."
GAP_GOAL=$(curl -s -X POST http://localhost:3001/test/define_goal \
  -H "Content-Type: application/json" \
  -d '{"name":"Analytics","description":"Analytics","success_criteria":["Fast"],"priority":"medium","assigned_to":["fake-999"]}')
echo "   ✓ Analytics created"
echo "   → Should see green square with RED DASHED edge to gap node '?'"
sleep 3

# Test 4: Delete actor
echo ""
echo "4. Deleting Admin actor..."
DELETE=$(curl -s -X POST http://localhost:3001/test/delete_actor \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"$ACTOR_ID\"}")
echo "   ✓ Admin deleted"
echo "   → Admin should FADE OUT"
echo "   → Edge to User Management should turn RED/DASHED (gap)"
sleep 2

echo ""
echo "=== Phase 1 Complete! ==="
echo "Expected final state:"
echo "  - 0 actors"
echo "  - 2 goals (green squares)"
echo "  - 2 gaps (red dashed '?' circles)"
echo "  - 2 red dashed edges"
