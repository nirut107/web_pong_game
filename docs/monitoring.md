# Monitoring System Documentation

This document provides detailed information about the monitoring system implemented for the Transcendence application using Prometheus and Grafana.

## Architecture Overview

The monitoring system consists of:

1. **Prometheus**: Central metrics collection and alerting system
2. **Grafana**: Visualization and dashboard platform
3. **Node Exporter**: System-level metrics collector
4. **Service Metrics**: Application-specific metrics exposed by each service

```
                   ┌─────────────┐
                   │             │
                   │   Grafana   │───┐
                   │             │   │
                   └─────────────┘   │
                          │          │
                          │          │
                          ▼          │
┌─────────────┐    ┌─────────────┐   │    ┌─────────────┐
│             │    │             │   │    │             │
│Node Exporter│◄───│  Prometheus │◄──┘    │AlertManager │
│             │    │             │────────►             │
└─────────────┘    └─────────────┘        └─────────────┘
       ▲                  ▲
       │                  │
┌──────┴──────┐   ┌──────┴──────┐
│  System     │   │  Services   │
│  Metrics    │   │  Metrics    │
└─────────────┘   └─────────────┘
```

## Components

### Prometheus

- **Purpose**: Collects and stores metrics as time series data
- **Location**: http://localhost:9090
- **Configuration**: `/prometheus/prometheus.yml`
- **Data Retention**: 15 days

### Grafana

- **Purpose**: Visualizes metrics through dashboards
- **Location**: http://localhost:3006
- **Login**: admin/admin
- **Dashboards**: Pre-configured dashboards for services and system metrics

### Node Exporter

- **Purpose**: Collects system-level metrics (CPU, memory, disk, network)
- **Metrics Path**: http://node-exporter:9100/metrics (internal)

### Service Metrics

Each service exposes metrics endpoints at `/metrics` that Prometheus scrapes.

## Metrics Implementation

### Auth Service Metrics

The auth-service has been instrumented to expose the following metrics:

1. **HTTP Request Metrics**:
   - Request counts by endpoint and status
   - Request duration histograms
   - Active connections

2. **Authentication Metrics**:
   - Login attempts (success/failure)
   - Registration attempts (success/failure)
   - Two-factor auth attempts (success/failure)

## Alert Rules

Alert rules are defined in `/prometheus/rules/service_alerts.yml`:

1. **ServiceDown**: Fires when a service is unavailable
   - Condition: `up == 0`
   - Severity: Critical
   - Duration: 30s

2. **HighResponseTime**: Fires when service response time is too high
   - Condition: 95th percentile latency > 1s
   - Severity: Warning
   - Duration: 2m

## Usage Examples

### Basic Monitoring Tasks

1. **Check service health**:
   - Open Prometheus UI
   - Enter query: `up`
   - Or use Grafana's Services Dashboard

2. **View request rates**:
   - Open Grafana
   - Navigate to Services Dashboard
   - Or use Prometheus query: `sum(rate(http_requests_total[5m]))`

3. **Check response times**:
   - Open Grafana
   - Navigate to Auth Service Dashboard
   - Or use Prometheus query: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))`

### Advanced Monitoring Tasks

1. **Setting up custom alerts**:
   - Add alert rules to `/prometheus/rules/service_alerts.yml`
   - Restart Prometheus to apply changes

2. **Creating custom dashboards**:
   - Log into Grafana
   - Create a new dashboard
   - Add panels with Prometheus queries
   - Save the dashboard

## Testing Monitoring

Two test scripts are provided to help test the monitoring system:

1. **test-monitoring.sh**: Generates traffic with different types of requests
   ```bash
   ./test-monitoring.sh
   ```

2. **test-alerts.sh**: Simulates a service outage to test alert functionality
   ```bash
   ./test-alerts.sh
   ```
