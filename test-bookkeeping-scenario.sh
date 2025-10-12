#!/bin/bash

echo "=== Bookkeeping System Exploration ==="
echo "This script models a small business bookkeeping system using the Screenplay model."
echo ""
echo "Note: Using test HTTP endpoints (port 3001) for easier scripting."
echo "      The MCP server (port 3000) provides the same tools via JSON-RPC 2.0"
echo "      and requires session management (used by Claude Code)."
echo ""

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test endpoint base URL
TEST_URL="http://localhost:3001/test"

# Helper function to call tools via test endpoint
call_tool_define_actor() {
  local args=$1
  curl -s -X POST "$TEST_URL/define_actor" \
    -H "Content-Type: application/json" \
    -d "$args"
}

call_tool_define_goal() {
  local args=$1
  curl -s -X POST "$TEST_URL/define_goal" \
    -H "Content-Type: application/json" \
    -d "$args"
}

call_tool_delete_actor() {
  local actor_id=$1
  curl -s -X POST "$TEST_URL/delete_actor" \
    -H "Content-Type: application/json" \
    -d "{\"id\": \"$actor_id\"}"
}

call_tool_get_model() {
  curl -s -X GET "$TEST_URL/model"
}

# Reset using test endpoint (MCP doesn't have reset tool yet)
echo -e "${BLUE}0. Clearing existing data...${NC}"
curl -s -X POST http://localhost:3001/test/reset > /dev/null
echo "   ✓ Data cleared"
echo ""
sleep 2

# ============================================================
# STEP 1: Define the Actors (People and Systems)
# ============================================================
echo -e "${BLUE}1. Defining Actors (Who's involved?)${NC}"
echo ""

echo "   Creating: Bookkeeper"
BOOKKEEPER=$(call_tool_define_actor '{
  "name": "Bookkeeper",
  "description": "Records daily financial transactions and maintains ledgers",
  "abilities": ["record_transactions", "reconcile_accounts", "generate_reports"],
  "constraints": ["requires_transaction_documentation", "cannot_approve_own_work"]
}')
BOOKKEEPER_ID=$(echo "$BOOKKEEPER" | jq -r '.data.id')
echo -e "   ${GREEN}✓${NC} Bookkeeper created (ID: ${BOOKKEEPER_ID:0:8}...)"
sleep 1

echo "   Creating: Accountant"
ACCOUNTANT=$(call_tool_define_actor '{
  "name": "Accountant",
  "description": "Reviews financial reports and ensures compliance",
  "abilities": ["review_financials", "prepare_tax_returns", "audit_transactions", "approve_reports"],
  "constraints": ["requires_bookkeeper_data", "must_follow_gaap"]
}')
ACCOUNTANT_ID=$(echo "$ACCOUNTANT" | jq -r '.data.id')
echo -e "   ${GREEN}✓${NC} Accountant created (ID: ${ACCOUNTANT_ID:0:8}...)"
sleep 1

echo "   Creating: Business Owner"
OWNER=$(call_tool_define_actor '{
  "name": "Business Owner",
  "description": "Makes strategic decisions based on financial insights",
  "abilities": ["view_reports", "approve_budgets", "make_strategic_decisions"],
  "constraints": ["requires_monthly_reports", "limited_technical_knowledge"]
}')
OWNER_ID=$(echo "$OWNER" | jq -r '.data.id')
echo -e "   ${GREEN}✓${NC} Business Owner created (ID: ${OWNER_ID:0:8}...)"
sleep 1

echo "   Creating: Accounts Payable System"
AP_SYSTEM=$(call_tool_define_actor '{
  "name": "AP System",
  "description": "Automated system for managing vendor payments",
  "abilities": ["track_invoices", "schedule_payments", "send_reminders"],
  "constraints": ["requires_approval_workflow", "must_maintain_audit_trail"]
}')
AP_SYSTEM_ID=$(echo "$AP_SYSTEM" | jq -r '.data.id')
echo -e "   ${GREEN}✓${NC} AP System created (ID: ${AP_SYSTEM_ID:0:8}...)"
echo ""
sleep 2

# ============================================================
# STEP 2: Define Goals (What needs to be achieved?)
# ============================================================
echo -e "${BLUE}2. Defining Goals (What needs to be achieved?)${NC}"
echo ""

echo "   Creating: Accurate Daily Transaction Recording"
GOAL1=$(call_tool_define_goal "{
  \"name\": \"Accurate Daily Transaction Recording\",
  \"description\": \"All financial transactions must be recorded accurately within 24 hours\",
  \"success_criteria\": [
    \"All receipts entered same day\",
    \"Bank statements reconciled weekly\",
    \"Zero discrepancies in cash accounts\"
  ],
  \"priority\": \"high\",
  \"assigned_to\": [\"$BOOKKEEPER_ID\"]
}")
echo -e "   ${GREEN}✓${NC} Goal created - assigned to Bookkeeper"
sleep 1

echo "   Creating: Monthly Financial Reporting"
GOAL2=$(call_tool_define_goal "{
  \"name\": \"Monthly Financial Reporting\",
  \"description\": \"Generate comprehensive financial reports by the 5th of each month\",
  \"success_criteria\": [
    \"P&L statement complete\",
    \"Balance sheet accurate\",
    \"Cash flow statement prepared\",
    \"Reports delivered to owner by 5th\"
  ],
  \"priority\": \"high\",
  \"assigned_to\": [\"$BOOKKEEPER_ID\", \"$ACCOUNTANT_ID\"]
}")
echo -e "   ${GREEN}✓${NC} Goal created - assigned to Bookkeeper AND Accountant"
sleep 1

echo "   Creating: Tax Compliance"
GOAL3=$(call_tool_define_goal '{
  "name": "Tax Compliance",
  "description": "Ensure all tax obligations are met accurately and on time",
  "success_criteria": [
    "Quarterly tax estimates filed",
    "Annual returns submitted before deadline",
    "All deductions properly documented",
    "Zero penalties or interest"
  ],
  "priority": "high",
  "assigned_to": ["'"$ACCOUNTANT_ID"'"]
}')
echo -e "   ${GREEN}✓${NC} Goal created - assigned to Accountant"
sleep 1

echo "   Creating: Vendor Payment Processing"
GOAL4=$(call_tool_define_goal "{
  \"name\": \"Vendor Payment Processing\",
  \"description\": \"Pay all vendor invoices accurately and on time\",
  \"success_criteria\": [
    \"All invoices paid within terms\",
    \"Early payment discounts captured\",
    \"Payment confirmations archived\",
    \"Vendor relationships maintained\"
  ],
  \"priority\": \"medium\",
  \"assigned_to\": [\"$AP_SYSTEM_ID\"]
}")
echo -e "   ${GREEN}✓${NC} Goal created - assigned to AP System"
echo ""
sleep 2

# ============================================================
# STEP 3: Demonstrate Gap Detection (Missing actors)
# ============================================================
echo -e "${BLUE}3. Creating Goal with Missing Actor (Gap Detection)${NC}"
echo ""

echo "   Creating: Annual Audit Preparation"
echo "   ${YELLOW}Note: Assigning to 'external-auditor' who doesn't exist yet${NC}"
GOAL5=$(call_tool_define_goal '{
  "name": "Annual Audit Preparation",
  "description": "Prepare all documentation for external audit",
  "success_criteria": [
    "All supporting documents organized",
    "Account reconciliations current",
    "Management representation letter prepared",
    "Audit completed within 2 weeks"
  ],
  "priority": "medium",
  "assigned_to": ["external-auditor-2024"]
}')
echo -e "   ${GREEN}✓${NC} Goal created"
echo -e "   ${RED}→ Should see RED DASHED edge to gap node '?' (missing External Auditor)${NC}"
echo ""
sleep 2

# ============================================================
# STEP 4: Create another goal with mix of existing and missing actors
# ============================================================
echo -e "${BLUE}4. Creating Goal with Mixed Actors (Some exist, some don't)${NC}"
echo ""

echo "   Creating: Budget Planning & Analysis"
echo "   ${YELLOW}Note: Assigning to Owner (exists) and CFO (doesn't exist)${NC}"
GOAL6=$(call_tool_define_goal "{
  \"name\": \"Budget Planning & Analysis\",
  \"description\": \"Develop and monitor annual budget with variance analysis\",
  \"success_criteria\": [
    \"Annual budget approved by Q4\",
    \"Monthly variance reports generated\",
    \"Forecasts updated quarterly\",
    \"Budget vs actual within 5%\"
  ],
  \"priority\": \"high\",
  \"assigned_to\": [\"$OWNER_ID\", \"cfo-position\"]
}")
echo -e "   ${GREEN}✓${NC} Goal created"
echo -e "   ${GREEN}→ Should see GRAY edge to Owner${NC}"
echo -e "   ${RED}→ Should see RED DASHED edge to gap node '?' (missing CFO)${NC}"
echo ""
sleep 2

# ============================================================
# STEP 5: Demonstrate Delete and Gap Creation
# ============================================================
echo -e "${BLUE}5. Simulating Staff Change (Delete Bookkeeper)${NC}"
echo ""

echo "   ${YELLOW}Scenario: Bookkeeper leaves the company${NC}"
echo "   Deleting Bookkeeper actor..."
DELETE=$(call_tool_delete_actor "$BOOKKEEPER_ID")
echo -e "   ${GREEN}✓${NC} Bookkeeper deleted"
echo -e "   ${RED}→ Bookkeeper node should FADE OUT${NC}"
echo -e "   ${RED}→ Goals assigned to Bookkeeper should now show RED DASHED gaps${NC}"
echo "   (This visualizes: Who will handle daily transactions and monthly reports?)"
echo ""
sleep 2

# ============================================================
# STEP 6: Get Full Model
# ============================================================
echo -e "${BLUE}6. Retrieving Full Model State${NC}"
echo ""

MODEL=$(call_tool_get_model)
echo "$MODEL" > /tmp/bookkeeping-model.json

ACTOR_COUNT=$(echo "$MODEL" | jq '.actors | length')
GOAL_COUNT=$(echo "$MODEL" | jq '.goals | length')

echo "   Current Model State:"
echo "   • Actors: $ACTOR_COUNT"
echo "   • Goals: $GOAL_COUNT"
echo ""
echo "   Full model saved to: /tmp/bookkeeping-model.json"
echo ""

# ============================================================
# Summary
# ============================================================
echo -e "${BLUE}=== Scenario Complete! ===${NC}"
echo ""
echo "Expected Visualization State:"
echo "  ${GREEN}✓${NC} 3 actors (Accountant, Business Owner, AP System)"
echo "  ${GREEN}✓${NC} 6 goals (green squares)"
echo "  ${RED}✓${NC} 3 gaps (red dashed '?' circles):"
echo "     - Missing: Deleted Bookkeeper (referenced by 2 goals)"
echo "     - Missing: External Auditor (referenced by 1 goal)"
echo "     - Missing: CFO Position (referenced by 1 goal)"
echo "  ${YELLOW}✓${NC} Mix of gray edges (valid assignments) and red dashed edges (gaps)"
echo ""
echo "Business Insights from Gaps:"
echo "  1. Need to hire replacement bookkeeper urgently (2 critical goals affected)"
echo "  2. Need to engage external auditor for annual audit"
echo "  3. Consider hiring CFO for strategic financial planning"
echo ""
echo "You can view the full model JSON at: /tmp/bookkeeping-model.json"
