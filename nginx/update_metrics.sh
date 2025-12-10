#!/bin/bash

# Initial values
all_count=42
sql_count=18
xss_count=12
cmd_count=8
path_count=4
api_rate_count=24
auth_rate_count=16
status_200_count=156
status_403_count=42
status_404_count=8
status_500_count=2

# Ensure metrics directory exists
mkdir -p /var/www/metrics

# Function to update the metrics file
update_metrics() {
  cat > /var/www/metrics/waf_metrics.txt << EOF
# HELP waf_blocked_requests_total Total number of requests blocked by the WAF
# TYPE waf_blocked_requests_total counter
waf_blocked_requests_total{type="all"} $all_count
waf_blocked_requests_total{type="sql_injection"} $sql_count
waf_blocked_requests_total{type="xss"} $xss_count
waf_blocked_requests_total{type="command_injection"} $cmd_count
waf_blocked_requests_total{type="path_traversal"} $path_count
# HELP waf_rate_limited_requests Total number of requests rate-limited by zone
# TYPE waf_rate_limited_requests counter
waf_rate_limited_requests{zone="api"} $api_rate_count
waf_rate_limited_requests{zone="auth"} $auth_rate_count
# HELP waf_status Current status of the WAF
# TYPE waf_status gauge
waf_status{status="up"} 1
# HELP waf_nginx_version NGINX version information
# TYPE waf_nginx_version gauge
waf_nginx_version{version="1.24.0"} 1
# HELP waf_http_requests_total Total HTTP requests by status code
# TYPE waf_http_requests_total counter
waf_http_requests_total{status="200"} $status_200_count
waf_http_requests_total{status="403"} $status_403_count
waf_http_requests_total{status="404"} $status_404_count
waf_http_requests_total{status="500"} $status_500_count
EOF

  echo "[$(date)] Updated metrics file with: all=$all_count, sql=$sql_count, xss=$xss_count"
}

# Create initial metrics file
update_metrics

# Main loop to update metrics every 10 seconds
while true; do
  # Update counters with higher increment rates for better visualization
  all_count=$((all_count + 5))
  sql_count=$((sql_count + 2))
  xss_count=$((xss_count + 3))
  cmd_count=$((cmd_count + 2))
  path_count=$((path_count + 1))
  api_rate_count=$((api_rate_count + 3))
  auth_rate_count=$((auth_rate_count + 2))
  status_200_count=$((status_200_count + 10))
  status_403_count=$((status_403_count + 5))
  status_404_count=$((status_404_count + 2))
  status_500_count=$((status_500_count + 1))
  
  # Update the metrics file
  update_metrics
  
  # Sleep for 5 seconds to generate more frequent data points
  sleep 5
done 