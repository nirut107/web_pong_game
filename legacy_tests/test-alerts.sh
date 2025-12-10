#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

echo -e "${GREEN}=== Starting Alert Test Script ===${NC}"
echo -e "${YELLOW}This script will simulate a service outage to test Prometheus alerts${NC}"

check_container() {
  local container=$1
  if [ "$(docker ps -q -f name=$container)" ]; then
    echo -e "${GREEN}$container is running${NC}"
    return 0
  else
    echo -e "${RED}$container is not running${NC}"
    return 1
  fi
}

chmod +x test-monitoring.sh

echo -e "\n${GREEN}=== Step 1: Generate baseline metrics ===${NC}"
./test-monitoring.sh

echo -e "\n${GREEN}=== Step 2: Stopping auth-service to trigger an alert ===${NC}"
echo -e "${YELLOW}This should trigger a 'ServiceDown' alert in Prometheus${NC}"
docker stop transcendence-auth-service-1
echo -e "${RED}Auth service stopped. Waiting 60 seconds for the alert to fire...${NC}"

for i in {1..6}; do
  echo -e "${YELLOW}Waiting... $(expr 60 - $i \* 10) seconds remaining${NC}"
  sleep 10
done

echo -e "\n${GREEN}=== Step 3: Checking if alerts fired in Prometheus ===${NC}"
echo -e "${YELLOW}Fetching active alerts from Prometheus...${NC}"
alerts=$(curl -s http://localhost:9090/api/v1/alerts)
echo "$alerts" | grep -o '"name":"[^"]*"' | sort | uniq

echo -e "\n${GREEN}=== Step 4: Restarting auth-service ===${NC}"
docker start transcendence-auth-service-1
echo -e "${GREEN}Auth service started. Waiting for it to become ready...${NC}"
sleep 10

echo -e "\n${GREEN}=== Step 5: Verifying auth-service is back up ===${NC}"
check_container transcendence-auth-service-1
response_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/health)
if [ "$response_code" -eq 200 ]; then
  echo -e "${GREEN}Auth service health check passed: $response_code${NC}"
else
  echo -e "${RED}Auth service health check failed: $response_code${NC}"
fi

echo -e "\n${GREEN}=== Step 6: Generate post-recovery metrics ===${NC}"
./test-monitoring.sh

echo -e "\n${GREEN}=== Alert Test Complete ===${NC}"
echo -e "${YELLOW}You should now check:${NC}"
echo -e "${YELLOW}1. Prometheus (http://localhost:9090) - Check 'Alerts' tab for alert history${NC}"
echo -e "${YELLOW}2. Grafana (http://localhost:3006) - Check dashboards for the service outage${NC}"
echo -e "${YELLOW}3. The auth service metrics should show a gap during the outage period${NC}" 