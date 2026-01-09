# Redis High Availability Configuration

This directory contains the Redis high availability setup for the Festival platform, including master-replica replication with Sentinel for automatic failover.

## Architecture Overview

```
                    ┌─────────────────┐
                    │   Application   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │    Sentinel     │
                    │   (3 nodes)     │
                    │  Quorum: 2      │
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
    ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
    │   Master    │   │  Replica 1  │   │  Replica 2  │
    │   (R/W)     │◄──│   (R/O)     │◄──│   (R/O)     │
    └─────────────┘   └─────────────┘   └─────────────┘
```

## Directory Structure

```
redis/
├── redis-master.conf           # Master Redis configuration
├── redis-replica.conf          # Replica Redis configuration
├── sentinel.conf               # Sentinel configuration
├── docker-compose.redis.yml    # Local development cluster
├── k8s/
│   ├── redis-statefulset.yaml  # Kubernetes StatefulSets
│   ├── redis-service.yaml      # Kubernetes Services
│   └── redis-configmap.yaml    # ConfigMaps and Secrets
└── README.md                   # This file
```

## Local Development Setup

### Prerequisites

- Docker and Docker Compose installed
- At least 2GB of available RAM

### Quick Start

1. **Start the Redis cluster:**

```bash
cd redis
docker-compose -f docker-compose.redis.yml up -d
```

2. **Verify the cluster is running:**

```bash
# Check all containers are up
docker-compose -f docker-compose.redis.yml ps

# Check master status
docker exec festival-redis-master redis-cli -a Festival2025!Redis INFO replication

# Check sentinel status
docker exec festival-sentinel-1 redis-cli -p 26379 SENTINEL master festival-master
```

3. **Connect to Redis:**

```bash
# Connect to master (writes)
redis-cli -h localhost -p 6379 -a Festival2025!Redis

# Connect to replicas (reads)
redis-cli -h localhost -p 6380 -a Festival2025!Redis
redis-cli -h localhost -p 6381 -a Festival2025!Redis

# Connect to sentinel
redis-cli -h localhost -p 26379
```

4. **Start with Redis Commander (Web UI):**

```bash
docker-compose -f docker-compose.redis.yml --profile debug up -d

# Access at http://localhost:8081
# Login: admin / admin
```

### Stop the Cluster

```bash
docker-compose -f docker-compose.redis.yml down

# Remove volumes (data will be lost)
docker-compose -f docker-compose.redis.yml down -v
```

## Configuration Details

### Master Configuration

| Setting            | Value                   | Description             |
| ------------------ | ----------------------- | ----------------------- |
| `maxmemory`        | 512MB                   | Maximum memory limit    |
| `maxmemory-policy` | allkeys-lru             | Eviction policy         |
| `maxclients`       | 10000                   | Maximum connections     |
| `appendonly`       | yes                     | AOF persistence enabled |
| `appendfsync`      | everysec                | AOF sync frequency      |
| `save`             | 900/1, 300/10, 60/10000 | RDB snapshot intervals  |

### Sentinel Configuration

| Setting                   | Value   | Description                           |
| ------------------------- | ------- | ------------------------------------- |
| `quorum`                  | 2       | Sentinels needed to agree on failover |
| `down-after-milliseconds` | 5000ms  | Time to detect failure                |
| `failover-timeout`        | 60000ms | Maximum failover time                 |
| `parallel-syncs`          | 1       | Replicas to sync simultaneously       |

## Production Deployment (Kubernetes)

### Prerequisites

- Kubernetes cluster (1.21+)
- kubectl configured
- StorageClass named `fast-ssd` (or modify the YAML)
- Prometheus Operator (optional, for monitoring)

### Deployment Steps

1. **Create the namespace:**

```bash
kubectl create namespace festival
```

2. **Update secrets:**

Edit `k8s/redis-configmap.yaml` and change the passwords in the Secret:

```yaml
stringData:
  redis-password: 'YOUR-SECURE-PASSWORD'
  sentinel-password: 'YOUR-SECURE-SENTINEL-PASSWORD'
```

3. **Apply the configurations:**

```bash
cd redis/k8s

# Apply ConfigMap and Secret
kubectl apply -f redis-configmap.yaml

# Apply Services
kubectl apply -f redis-service.yaml

# Apply StatefulSets
kubectl apply -f redis-statefulset.yaml
```

4. **Verify the deployment:**

```bash
# Check pods
kubectl get pods -n festival -l app=redis
kubectl get pods -n festival -l app=redis-sentinel

# Check services
kubectl get svc -n festival | grep redis

# Check replication status
kubectl exec -n festival redis-master-0 -- redis-cli -a $REDIS_PASSWORD INFO replication
```

### Connecting from Applications

```yaml
# Application environment variables
env:
  - name: REDIS_SENTINEL_HOST
    value: 'redis-sentinel.festival.svc.cluster.local'
  - name: REDIS_SENTINEL_PORT
    value: '26379'
  - name: REDIS_MASTER_NAME
    value: 'festival-master'
  - name: REDIS_PASSWORD
    valueFrom:
      secretKeyRef:
        name: redis-secret
        key: redis-password
```

## Failover Testing

### Local (Docker Compose)

1. **Simulate master failure:**

```bash
# Check current master
docker exec festival-sentinel-1 redis-cli -p 26379 SENTINEL get-master-addr-by-name festival-master

# Stop the master
docker stop festival-redis-master

# Wait 10 seconds, then check new master
docker exec festival-sentinel-1 redis-cli -p 26379 SENTINEL get-master-addr-by-name festival-master

# Verify failover occurred
docker exec festival-sentinel-1 redis-cli -p 26379 SENTINEL master festival-master
```

2. **Restore old master:**

```bash
# Start the old master (it will become a replica)
docker start festival-redis-master

# Verify it's now a replica
docker exec festival-redis-master redis-cli -a Festival2025!Redis INFO replication
```

### Kubernetes

1. **Simulate master failure:**

```bash
# Get current master
kubectl exec -n festival redis-sentinel-0 -- redis-cli -p 26379 SENTINEL get-master-addr-by-name festival-master

# Delete the master pod
kubectl delete pod -n festival redis-master-0

# Watch failover
kubectl logs -n festival redis-sentinel-0 -f
```

2. **Verify failover:**

```bash
# Check new master
kubectl exec -n festival redis-sentinel-0 -- redis-cli -p 26379 SENTINEL master festival-master
```

## Monitoring

### Key Metrics to Monitor

| Metric                                             | Alert Threshold | Description           |
| -------------------------------------------------- | --------------- | --------------------- |
| `redis_up`                                         | 0               | Instance availability |
| `redis_memory_used_bytes / redis_memory_max_bytes` | > 85%           | Memory usage          |
| `redis_connected_slaves`                           | < 1 (on master) | Replication health    |
| `redis_connected_clients`                          | > 9000          | Connection count      |
| `redis_rejected_connections_total`                 | > 0             | Rejected connections  |

### Grafana Dashboard

Import the Redis dashboard from Grafana (ID: 11835) or use the metrics endpoint at `:9121/metrics`.

### Health Check Commands

```bash
# Check master health
redis-cli -a $REDIS_PASSWORD PING
redis-cli -a $REDIS_PASSWORD INFO replication

# Check sentinel health
redis-cli -p 26379 SENTINEL master festival-master
redis-cli -p 26379 SENTINEL replicas festival-master
redis-cli -p 26379 SENTINEL sentinels festival-master

# Check memory
redis-cli -a $REDIS_PASSWORD INFO memory

# Check persistence
redis-cli -a $REDIS_PASSWORD INFO persistence
```

## Troubleshooting

### Common Issues

#### 1. Sentinel cannot connect to master

```bash
# Check if master is reachable
redis-cli -h redis-master -p 6379 -a $REDIS_PASSWORD PING

# Check sentinel logs
docker logs festival-sentinel-1
```

#### 2. Replication lag

```bash
# Check replication info on master
redis-cli -a $REDIS_PASSWORD INFO replication

# Look for: master_repl_offset and slave0:offset
```

#### 3. Memory issues

```bash
# Check memory usage
redis-cli -a $REDIS_PASSWORD INFO memory

# Clear memory (use with caution!)
redis-cli -a $REDIS_PASSWORD MEMORY PURGE
```

#### 4. Failover not triggering

```bash
# Check sentinel agreement
redis-cli -p 26379 SENTINEL master festival-master | grep -E "num-slaves|quorum"

# Force failover manually (emergency only)
redis-cli -p 26379 SENTINEL failover festival-master
```

### Debug Commands

```bash
# Slow log analysis
redis-cli -a $REDIS_PASSWORD SLOWLOG GET 10

# Client list
redis-cli -a $REDIS_PASSWORD CLIENT LIST

# Config check
redis-cli -a $REDIS_PASSWORD CONFIG GET maxmemory

# Key statistics
redis-cli -a $REDIS_PASSWORD DBSIZE
redis-cli -a $REDIS_PASSWORD INFO keyspace
```

## Security Best Practices

1. **Change default passwords** before deploying to production
2. **Enable TLS** for production deployments (uncomment TLS settings in configs)
3. **Use ACLs** (Redis 6+) for fine-grained access control
4. **Rename dangerous commands** in production (FLUSHDB, FLUSHALL, DEBUG, etc.)
5. **Use network policies** to restrict Redis access to application pods only
6. **Encrypt data at rest** using encrypted storage volumes

## Application Integration

### NestJS with ioredis-sentinel

```typescript
import Redis from 'ioredis';

const redis = new Redis({
  sentinels: [
    { host: 'sentinel-1', port: 26379 },
    { host: 'sentinel-2', port: 26379 },
    { host: 'sentinel-3', port: 26379 },
  ],
  name: 'festival-master',
  password: process.env.REDIS_PASSWORD,
  sentinelPassword: process.env.REDIS_PASSWORD,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
});
```

### Read/Write Splitting

```typescript
// For writes - use master
const masterRedis = new Redis({
  sentinels: [...],
  name: 'festival-master',
  role: 'master',
});

// For reads - use replicas
const replicaRedis = new Redis({
  sentinels: [...],
  name: 'festival-master',
  role: 'slave',
  preferredSlaves: [
    { ip: 'redis-replica-1', port: 6379, prio: 1 },
    { ip: 'redis-replica-2', port: 6379, prio: 2 },
  ],
});
```

## Performance Tuning

### Memory Optimization

```bash
# Analyze memory
redis-cli -a $REDIS_PASSWORD MEMORY DOCTOR

# Sample keys for memory usage
redis-cli -a $REDIS_PASSWORD --bigkeys

# Memory fragmentation
redis-cli -a $REDIS_PASSWORD INFO memory | grep fragmentation
```

### Connection Pooling

Recommended pool sizes:

- Small apps: 5-10 connections
- Medium apps: 20-50 connections
- Large apps: 100+ connections

### Pipelining

Use pipelining for bulk operations to reduce round trips:

```typescript
const pipeline = redis.pipeline();
pipeline.set('key1', 'value1');
pipeline.set('key2', 'value2');
await pipeline.exec();
```

## Support

For issues with this configuration, please check:

1. Redis logs for errors
2. Sentinel logs for failover issues
3. Application connection logs
4. Kubernetes events (for K8s deployments)
