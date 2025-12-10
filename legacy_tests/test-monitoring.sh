#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

echo -e "${GREEN}=== Starting Monitoring Test Script ===${NC}"
echo -e "${YELLOW}This script will generate errors and load to test Prometheus and Grafana alerts${NC}"

function make_requests() {
  local service=$1
  local endpoint=$2
  local num_requests=$3
  local method=${4:-GET}

  echo -e "${YELLOW}Making $num_requests $method requests to $service:$endpoint${NC}"
  
  for i in $(seq 1 $num_requests); do
    if [ "$method" == "GET" ]; then
      response=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost:$service$endpoint")
    else
      random_data="{\"username\":\"test$RANDOM\",\"password\":\"invalid\"}"
      response=$(curl -s -w "%{http_code}" -o /dev/null -X POST -H "Content-Type: application/json" -d "$random_data" "http://localhost:$service$endpoint")
    fi
    
    if [ "$response" -ge 400 ]; then
      echo -e "${RED}Request $i: Error $response${NC}"
    else
      echo -e "${GREEN}Request $i: Success $response${NC}"
    fi

    sleep 0.1
  done
}

echo -e "\n${GREEN}=== Test 1: High Request Rate on Auth Service ===${NC}"
echo -e "${YELLOW}This should trigger high response time alerts${NC}"
make_requests 3002 "/health" 100

echo -e "\n${GREEN}=== Test 2: Failed Login Attempts ===${NC}"
echo -e "${YELLOW}This should generate auth failures visible in metrics${NC}"
make_requests 3002 "/api/v1/login" 20 "POST"

echo -e "\n${GREEN}=== Test 3: Generate 404 Errors ===${NC}"
echo -e "${YELLOW}This should show up in error rate metrics${NC}"
make_requests 3002 "/non-existent-endpoint" 15

echo -e "\n${GREEN}=== Test 4: Generate Mixed Traffic ===${NC}"
echo -e "${YELLOW}This creates a more realistic traffic pattern${NC}"
make_requests 3002 "/health" 30
make_requests 3002 "/api/v1/login" 10 "POST"
make_requests 3002 "/metrics" 20

echo -e "\n${GREEN}=== Test 5: Pause to See Pattern Change ===${NC}"
echo -e "${YELLOW}Waiting 5 seconds...${NC}"
sleep 5

echo -e "\n${GREEN}=== Test 6: Generate More Mixed Traffic ===${NC}"
echo -e "${YELLOW}Creating another traffic burst${NC}"
make_requests 3002 "/health" 40
make_requests 3002 "/non-existent-endpoint" 15
make_requests 3002 "/api/v1/login" 15 "POST"

echo -e "\n${GREEN}=== Monitoring Test Complete ===${NC}"
echo -e "${YELLOW}You should now check Grafana at http://localhost:3006 and Prometheus at http://localhost:9090 to see the results${NC}"
echo -e "${YELLOW}Login to Grafana with username 'admin' and password 'admin'${NC}"
echo -e "${YELLOW}Check for error rates, response times, and active alerts${NC}" 