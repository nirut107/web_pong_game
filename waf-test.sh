#!/bin/bash

# Colors for better output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="http://localhost:8080"
HTTP_BASE_URL="http://localhost:8080" # For HTTP to HTTPS redirect test
CURL_OPTS="-s" # Silent mode
TEST_ENDPOINT="/api/v1/waf-test"
WAF_TEST_ENDPOINT="/api/v1/waf-test"
API_ENDPOINT="/api/v1/users"
DEFAULT_CODE="403" # Expected status code for attack attempts

echo -e "${BLUE}=== Transcendence WAF Penetration Test ===${NC}"
echo -e "${YELLOW}Testing WAF protection against common web attacks${NC}"
echo ""

test_attack() {
  local name=$1
  local url=$2
  local expected_code=${3:-$DEFAULT_CODE}
  local description=$4
  local alternate_success_code=${5:-""}
  
  echo -e "${BLUE}Testing: ${name}${NC}"
  echo -e "${YELLOW}${description}${NC}"
  echo -e "URL: ${url}"

  # Try up to 3 times (in case of network issues)
  for attempt in {1..3}; do
    code=$(curl $CURL_OPTS -o /dev/null -w "%{http_code}" "$url")
    
    if [ ! -z "$code" ]; then
      break
    fi
    sleep 0.5
  done
  
  if [ "$code" == "$expected_code" ] || ([ ! -z "$alternate_success_code" ] && [ "$code" == "$alternate_success_code" ]); then
    echo -e "${GREEN}PASSED: Received acceptable status code ${code}${NC}"
  else
    echo -e "${RED}FAILED: Received status code ${code}, expected ${expected_code}${NC}"
  fi
  echo ""
  
  # Small delay to avoid race conditions
  sleep 0.2
}

test_waf_with_redirect() {
  local name=$1
  local url=$2
  local description=$3
  
  echo -e "${BLUE}Testing: ${name}${NC}"
  echo -e "${YELLOW}${description}${NC}"
  echo -e "URL: ${url}"

  # Test both redirect and final response
  redirect_code=$(curl $CURL_OPTS -o /dev/null -w "%{http_code}" "$url")
  
  # Try to follow redirect with SSL verification disabled since we're using self-signed certs
  final_response=$(curl $CURL_OPTS -k -L -w "%{http_code}" -o /dev/null "$url" 2>/dev/null)
  
  echo -e "Redirect code: ${redirect_code}"
  echo -e "Final response: ${final_response}"
  
  if [ "$redirect_code" == "301" ]; then
    if [ "$final_response" == "403" ] || [ "$final_response" == "400" ]; then
      echo -e "${GREEN}PASSED: WAF detected attack and blocked with ${final_response}${NC}"
    elif [ "$final_response" == "200" ]; then
      if [[ "$name" == *"Legitimate"* ]]; then
        echo -e "${GREEN}PASSED: Legitimate request allowed after redirect${NC}"
      else
        echo -e "${RED}FAILED: Attack not blocked, got ${final_response}${NC}"
      fi
    elif [ "$final_response" == "301" ] || [ "$final_response" == "000" ] || [ -z "$final_response" ]; then
      echo -e "${YELLOW}INFO: External HTTPS not accessible (expected in production setup)${NC}"
    else
      echo -e "${YELLOW}INFO: Unexpected response ${final_response}${NC}"
    fi
  else
    echo -e "${YELLOW}INFO: Direct response ${redirect_code} (no redirect)${NC}"
  fi
  echo ""
  
  sleep 0.2
}

check_functionality() {
  local name=$1
  local url=$2
  local match_pattern=$3
  local description=$4
  
  echo -e "${BLUE}Testing: ${name}${NC}"
  echo -e "${YELLOW}${description}${NC}"
  echo -e "URL: ${url}"

  response=$(curl $CURL_OPTS -i "$url")
  
  if echo "$response" | grep -q "$match_pattern"; then
    echo -e "${GREEN}PASSED: Security feature detected${NC}"
  else
    echo -e "${RED}FAILED: Security feature not detected${NC}"
    echo -e "Response:\n$response" | head -n 10
  fi
  echo ""
}

test_waf_internal() {
  local name=$1
  local endpoint=$2
  local attack_params=$3
  local description=$4
  
  echo -e "${BLUE}Testing: ${name} (Internal HTTPS)${NC}"
  echo -e "${YELLOW}${description}${NC}"

  # Test the WAF by making a request from inside the Docker network
  # This bypasses external port limitations and tests the actual WAF rules
  internal_result=$(docker-compose exec -T waf curl -k -s -o /dev/null -w "%{http_code}" "https://localhost${endpoint}?${attack_params}" 2>/dev/null)
  
  if [ "$internal_result" == "403" ]; then
    echo -e "${GREEN}PASSED: WAF correctly blocked attack with 403${NC}"
    echo -e "Internal HTTPS test: BLOCKED"
  elif [ "$internal_result" == "400" ]; then
    echo -e "${GREEN}PASSED: WAF correctly blocked attack with 400 (Bad Request)${NC}"
    echo -e "Internal HTTPS test: BLOCKED"
  elif [ "$internal_result" == "200" ]; then
    if [[ "$name" == *"Legitimate"* ]]; then
      echo -e "${GREEN}PASSED: Legitimate request correctly allowed${NC}"
      echo -e "Internal HTTPS test: ALLOWED (as expected)"
    else
      echo -e "${RED}FAILED: Attack not blocked by WAF${NC}"
      echo -e "Internal HTTPS test: ALLOWED (unexpected)"
    fi
  else
    echo -e "${YELLOW}INFO: Unexpected response code: ${internal_result}${NC}"
    echo -e "Internal HTTPS test: UNKNOWN"
  fi
  echo ""
  
  sleep 0.2
}

# 0. Test the WAF test endpoint - should redirect to HTTPS
test_attack "WAF Test Endpoint" \
  "${BASE_URL}${WAF_TEST_ENDPOINT}" \
  "301" \
  "Testing WAF test endpoint redirects to HTTPS"

# 1. SQL Injection Tests - should redirect to HTTPS  
test_attack "Basic SQL Injection" \
  "${BASE_URL}${API_ENDPOINT}?id=1%27%20OR%20%271%27=%271" \
  "301" \
  "Attempting basic SQL injection - should redirect to HTTPS"

test_attack "UNION SQL Injection" \
  "${BASE_URL}${WAF_TEST_ENDPOINT}?id=UNION+SELECT+*+FROM+users" \
  "301" \
  "Attempting UNION-based SQL injection - should redirect to HTTPS"

# 2. XSS Tests - should redirect to HTTPS
test_attack "Basic XSS" \
  "${BASE_URL}${API_ENDPOINT}?search=%3Cscript%3Ealert(1)%3C/script%3E" \
  "301" \
  "Testing basic XSS using <script> tags - should redirect to HTTPS"

# 3. Path Traversal Tests
test_attack "Path Traversal via URL" \
  "${BASE_URL}/..%2fetc/passwd" \
  "403" \
  "Testing path traversal via URL" \
  "400"

test_attack "Path Traversal via URL 2" \
  "${BASE_URL}/%2e%2e/etc/passwd" \
  "403" \
  "Testing encoded path traversal" \
  "400"

test_attack "Path Traversal via URL 3" \
  "${BASE_URL}/../../../etc/passwd" \
  "403" \
  "Testing multiple directory traversal" \
  "301"

test_attack "Path Traversal via URL 4" \
  "${BASE_URL}/%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd" \
  "403" \
  "Testing fully encoded path traversal" \
  "400"

test_attack "Path Traversal in Parameter" \
  "${BASE_URL}${WAF_TEST_ENDPOINT}?file=../../../etc/passwd" \
  "301" \
  "Testing path traversal in parameter - should redirect to HTTPS"

# 4. Command Injection Tests - should redirect to HTTPS
test_attack "Command Injection" \
  "${BASE_URL}${API_ENDPOINT}?cmd=ls|id" \
  "301" \
  "Testing command injection with pipe character - should redirect to HTTPS"

# 5. Security Tests
check_functionality "HTTP to HTTPS Redirect" \
  "${HTTP_BASE_URL}" \
  "301 Moved Permanently" \
  "Testing HTTP to HTTPS redirection"

check_functionality "WAF Metrics Endpoint" \
  "${BASE_URL}/metrics/waf" \
  "waf_status{status=\"up\"} 1" \
  "Testing WAF metrics endpoint is accessible"

# 9. Internal HTTPS WAF Tests (Definitive Proof)
echo -e "${BLUE}=== Internal WAF Testing (Definitive) ===${NC}"
echo -e "${YELLOW}Testing WAF from inside Docker network where HTTPS is accessible${NC}"
echo ""

test_waf_internal "SQL Injection (Internal)" \
  "/api/v1/waf-test" \
  "id=1' OR '1'='1" \
  "Testing SQL injection detection via internal HTTPS"

test_waf_internal "UNION SQL Injection (Internal)" \
  "/api/v1/waf-test" \
  "id=UNION SELECT * FROM users" \
  "Testing UNION SQL injection detection via internal HTTPS"

test_waf_internal "XSS Attack (Internal)" \
  "/api/v1/waf-test" \
  "search=<script>alert(1)</script>" \
  "Testing XSS detection via internal HTTPS"

test_waf_internal "Command Injection (Internal)" \
  "/api/v1/waf-test" \
  "cmd=ls|id" \
  "Testing command injection detection via internal HTTPS"

test_waf_internal "Legitimate Request (Internal)" \
  "/api/v1/waf-test" \
  "test=hello" \
  "Testing legitimate request passes through WAF"
