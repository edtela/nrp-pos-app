#!/bin/bash
# Cloudflare DNS Setup Script for POS (NRP Project on Railway)

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "================================================"
echo "Cloudflare DNS Configuration for POS"
echo "================================================"

# Configuration
DOMAIN="arom.al"
SUBDOMAIN="pos"
RAILWAY_APP="j0x8fjy2.up.railway.app"

# Check if token is provided as argument or environment variable
if [ -n "$1" ]; then
    CF_TOKEN="$1"
elif [ -n "$CLOUDFLARE_API_TOKEN" ]; then
    CF_TOKEN="$CLOUDFLARE_API_TOKEN"
else
    echo -e "${YELLOW}Please enter your Cloudflare API Token:${NC}"
    read -s CF_TOKEN
    echo
fi

if [ -z "$CF_TOKEN" ]; then
    echo -e "${RED}Error: Cloudflare API token is required${NC}"
    exit 1
fi

# Get Zone ID
echo -e "${YELLOW}Getting Zone ID for ${DOMAIN}...${NC}"
ZONE_RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=${DOMAIN}" \
    -H "Authorization: Bearer ${CF_TOKEN}" \
    -H "Content-Type: application/json")

ZONE_ID=$(echo "$ZONE_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['result'][0]['id'] if data['success'] and data['result'] else '')")

if [ -z "$ZONE_ID" ]; then
    echo -e "${RED}Error: Could not get Zone ID. Check your token and domain.${NC}"
    echo "Response: $ZONE_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Zone ID: ${ZONE_ID}${NC}"

# Function to create or update CNAME record
setup_cname_record() {
    local subdomain=$1
    local target=$2
    local full_name="${subdomain}.${DOMAIN}"
    
    echo -e "\n${YELLOW}Configuring ${full_name} -> ${target}...${NC}"
    
    # Check if record exists
    RECORD_RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?type=CNAME&name=${full_name}" \
        -H "Authorization: Bearer ${CF_TOKEN}" \
        -H "Content-Type: application/json")
    
    RECORD_ID=$(echo "$RECORD_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['result'][0]['id'] if data['result'] else '')" 2>/dev/null || echo "")
    
    if [ -n "$RECORD_ID" ]; then
        # Update existing record
        echo "  Updating existing CNAME record..."
        UPDATE_RESPONSE=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RECORD_ID}" \
            -H "Authorization: Bearer ${CF_TOKEN}" \
            -H "Content-Type: application/json" \
            --data "{
                \"type\": \"CNAME\",
                \"name\": \"${subdomain}\",
                \"content\": \"${target}\",
                \"ttl\": 1,
                \"proxied\": true
            }")
        
        if echo "$UPDATE_RESPONSE" | grep -q '"success":true'; then
            echo -e "${GREEN}  ✓ Updated ${full_name} -> ${target} (proxied)${NC}"
        else
            echo -e "${RED}  ✗ Failed to update ${full_name}${NC}"
            echo "  Response: $UPDATE_RESPONSE"
            return 1
        fi
    else
        # Check if there's an A record that needs to be deleted first
        A_RECORD_RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?type=A&name=${full_name}" \
            -H "Authorization: Bearer ${CF_TOKEN}" \
            -H "Content-Type: application/json")
        
        A_RECORD_ID=$(echo "$A_RECORD_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['result'][0]['id'] if data['result'] else '')" 2>/dev/null || echo "")
        
        if [ -n "$A_RECORD_ID" ]; then
            echo "  Found existing A record, deleting it first..."
            DELETE_RESPONSE=$(curl -s -X DELETE "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${A_RECORD_ID}" \
                -H "Authorization: Bearer ${CF_TOKEN}" \
                -H "Content-Type: application/json")
            
            if echo "$DELETE_RESPONSE" | grep -q '"success":true'; then
                echo -e "${GREEN}  ✓ Deleted existing A record${NC}"
            else
                echo -e "${RED}  ✗ Failed to delete existing A record${NC}"
                echo "  Response: $DELETE_RESPONSE"
            fi
        fi
        
        # Create new CNAME record
        echo "  Creating new CNAME record..."
        CREATE_RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
            -H "Authorization: Bearer ${CF_TOKEN}" \
            -H "Content-Type: application/json" \
            --data "{
                \"type\": \"CNAME\",
                \"name\": \"${subdomain}\",
                \"content\": \"${target}\",
                \"ttl\": 1,
                \"proxied\": true
            }")
        
        if echo "$CREATE_RESPONSE" | grep -q '"success":true'; then
            echo -e "${GREEN}  ✓ Created ${full_name} -> ${target} (proxied)${NC}"
        else
            echo -e "${RED}  ✗ Failed to create ${full_name}${NC}"
            echo "  Response: $CREATE_RESPONSE"
            return 1
        fi
    fi
}

# Create/Update DNS record for POS
setup_cname_record "${SUBDOMAIN}" "${RAILWAY_APP}"

echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}DNS Configuration Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "DNS record configured:"
echo "  • ${SUBDOMAIN}.${DOMAIN} -> ${RAILWAY_APP} (proxied via Cloudflare)"
echo ""
echo -e "${YELLOW}Note: DNS propagation may take a few minutes.${NC}"
echo ""
echo "You can verify DNS propagation with:"
echo "  dig ${SUBDOMAIN}.${DOMAIN}"
echo "  nslookup ${SUBDOMAIN}.${DOMAIN}"
echo ""
echo "Once propagated, your POS system will be accessible at:"
echo "  https://${SUBDOMAIN}.${DOMAIN}"