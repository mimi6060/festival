# Festival Platform Monitoring

Complete Prometheus + Grafana monitoring stack for the Festival Platform.

## Quick Start

### 1. Install Prometheus Stack

```bash
# Add Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Create monitoring namespace
kubectl create namespace monitoring

# Install kube-prometheus-stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  -f k8s/monitoring/prometheus-stack-values.yaml \
  -n monitoring

# Apply Festival-specific resources
kubectl apply -f k8s/monitoring/
```

### 2. Apply ServiceMonitors and PrometheusRules

```bash
# ServiceMonitors (scrape configs)
kubectl apply -f k8s/monitoring/servicemonitor.yaml

# AlertingRules
kubectl apply -f k8s/monitoring/prometheusrule.yaml

# Alertmanager config
kubectl apply -f k8s/monitoring/alertmanager-config.yaml
```

### 3. Import Dashboards

Dashboards are automatically provisioned via ConfigMaps. To manually import:

1. Go to Grafana → Dashboards → Import
2. Upload JSON files from `grafana/dashboards/`

## Components

### Dashboards

| Dashboard               | Description                              |
| ----------------------- | ---------------------------------------- |
| `api-overview.json`     | API requests, latency, errors, endpoints |
| `database.json`         | PostgreSQL connections, queries, locks   |
| `redis.json`            | Cache hit rates, memory, connections     |
| `business-metrics.json` | Tickets, payments, cashless, zones       |

### Metrics

#### HTTP Metrics

- `http_requests_total` - Total HTTP requests (method, path, status)
- `http_request_duration_ms` - Request latency histogram
- `http_errors_total` - HTTP errors count

#### Database Metrics

- `db_queries_total` - Database queries (operation, model)
- `db_query_duration_ms` - Query latency histogram
- `pg_stat_*` - PostgreSQL statistics

#### Cache Metrics

- `cache_hits_total` - Cache hits
- `cache_misses_total` - Cache misses
- `redis_*` - Redis statistics

#### Business Metrics

- `tickets_sold_total` - Tickets sold (festival, type)
- `tickets_validated_total` - Tickets validated (festival, zone)
- `payments_total` - Payment count (status, provider)
- `payments_amount_total` - Payment amounts
- `cashless_*` - Cashless transactions
- `zone_occupancy_*` - Zone occupancy

## Alert Channels

| Channel              | Purpose                     |
| -------------------- | --------------------------- |
| `#festival-critical` | Critical alerts (immediate) |
| `#festival-warnings` | Warning alerts              |
| `#festival-business` | Business metric alerts      |
| `#festival-database` | Database alerts             |
| `#festival-infra`    | Infrastructure alerts       |

## Configuration

### Environment Variables

Set these in your Helm values or secrets:

```yaml
SLACK_WEBHOOK_URL: 'https://hooks.slack.com/services/...'
PAGERDUTY_SERVICE_KEY: 'your-key'
SMTP_PASSWORD: 'your-password'
```

### Retention

Default retention: 30 days / 45GB

To modify, update `prometheus-stack-values.yaml`:

```yaml
prometheus:
  prometheusSpec:
    retention: 30d
    retentionSize: 45GB
```

## Accessing Dashboards

### Production

- Grafana: https://grafana.festival.fr
- Prometheus: https://prometheus.festival.fr
- Alertmanager: https://alertmanager.festival.fr

### Local Development

```bash
# Port forward Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# Port forward Prometheus
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090

# Port forward Alertmanager
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-alertmanager 9093:9093
```

## Troubleshooting

### Check Prometheus Targets

```bash
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090
# Open http://localhost:9090/targets
```

### Check ServiceMonitor Status

```bash
kubectl get servicemonitor -A -l release=prometheus
```

### Check Alertmanager Configuration

```bash
kubectl exec -n monitoring prometheus-kube-prometheus-alertmanager-0 -- cat /etc/alertmanager/config/alertmanager.yaml
```

### View Active Alerts

```bash
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-alertmanager 9093:9093
# Open http://localhost:9093
```
